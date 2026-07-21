import json
from unittest.mock import MagicMock

import pytest
import redis

import app


def _fake_redis(monkeypatch: pytest.MonkeyPatch, pubsub: MagicMock) -> MagicMock:
    fake = MagicMock()
    fake.hvals.return_value = []
    fake.pubsub.return_value = pubsub
    monkeypatch.setattr(app, "redisShoppingListDB", fake)
    return fake


def test_stream_releases_connection_on_disconnect(monkeypatch: pytest.MonkeyPatch):
    """Client disconnect closes the generator; the pubsub connection must be
    released back to the pool (the bug: it leaked one slot per closed stream)."""
    pubsub = MagicMock()
    pubsub.listen.return_value = iter(
        [
            {"type": "subscribe", "data": 1},
            {"type": "message", "data": json.dumps({"data": "[]"})},
            {"type": "message", "data": json.dumps({"data": "[]"})},
        ]
    )
    _fake_redis(monkeypatch, pubsub)

    gen = app.shoppinglist_stream("list-1")
    assert next(gen).startswith("data:")  # initial snapshot
    assert next(gen).startswith("data:")  # first pubsub message
    gen.close()  # simulate client disconnect -> GeneratorExit

    pubsub.close.assert_called_once()


def test_stream_releases_connection_on_redis_error(monkeypatch: pytest.MonkeyPatch):
    """A redis error mid-stream is swallowed (so the client reconnects) and the
    connection is still released."""
    pubsub = MagicMock()
    fake = _fake_redis(monkeypatch, pubsub)
    fake.hvals.side_effect = redis.RedisError("boom")

    gen = app.shoppinglist_stream("list-1")

    assert list(gen) == []  # error swallowed, nothing yielded
    pubsub.close.assert_called_once()


def test_redis_error_handler_returns_503():
    """A redis failure maps to a retryable 503, not a 500."""
    with app.app.test_request_context():
        resp = app.handle_redis_error(redis.RedisError("boom"))
    assert resp.status_code == 503
