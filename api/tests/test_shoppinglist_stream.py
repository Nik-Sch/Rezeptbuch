import json
from unittest.mock import MagicMock

import pymysql
import pytest
import redis

import app


def _fake_redis(monkeypatch: pytest.MonkeyPatch, pubsub: MagicMock) -> MagicMock:
    fake = MagicMock()
    fake.hvals.return_value = []
    fake.pubsub.return_value = pubsub
    monkeypatch.setattr(app, "redisShoppingListDB", fake)
    return fake


def _messages(pubsub: MagicMock, *messages: object) -> None:
    """Feed get_message() a script; None stands for an idle timeout."""
    pubsub.get_message.side_effect = list(messages)


def test_stream_releases_connection_on_disconnect(monkeypatch: pytest.MonkeyPatch):
    """Client disconnect closes the generator; the pubsub connection must be
    released back to the pool (the bug: it leaked one slot per closed stream)."""
    pubsub = MagicMock()
    _messages(
        pubsub,
        {"type": "subscribe", "data": 1},
        {"type": "message", "data": json.dumps({"data": "[]"})},
        {"type": "message", "data": json.dumps({"data": "[]"})},
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


def test_idle_stream_emits_keepalive(monkeypatch: pytest.MonkeyPatch):
    """A list nobody is editing must still produce writes. Without them the
    generator parks in redis forever: the reverse proxy cuts the idle connection,
    the client reconnects, and the abandoned greenlet keeps its pooled connection
    for the lifetime of the process."""
    pubsub = MagicMock()
    _messages(
        pubsub, None, None, {"type": "message", "data": json.dumps({"data": "[]"})}
    )
    _fake_redis(monkeypatch, pubsub)

    gen = app.shoppinglist_stream("list-1")

    assert next(gen).startswith("data:")  # initial snapshot
    assert next(gen) == ": keepalive\n\n"
    assert next(gen) == ": keepalive\n\n"
    assert next(gen).startswith("data:")
    gen.close()

    # The read must be bounded, otherwise a disconnect is never noticed.
    assert pubsub.get_message.call_args.kwargs["timeout"] == app.SSE_KEEPALIVE_SECONDS
    pubsub.close.assert_called_once()


def test_keepalive_beats_reverse_proxy_read_timeout():
    """SWAG's proxy_read_timeout defaults to 240s and the in-repo nginx uses 600s;
    the keepalive has to stay comfortably under the tightest of them."""
    assert app.SSE_KEEPALIVE_SECONDS < 240


def test_redis_error_handler_returns_503():
    """A redis failure maps to a retryable 503, not a 500."""
    with app.app.test_request_context():
        resp = app.handle_redis_error(redis.RedisError("boom"))
    assert resp.status_code == 503


def test_db_error_handler_returns_503():
    """A db failure maps to a retryable 503, not a 500."""
    with app.app.test_request_context():
        resp = app.handle_db_error(pymysql.Error("boom"))
    assert resp.status_code == 503


def test_error_router_sends_backend_outages_to_flask(monkeypatch: pytest.MonkeyPatch):
    """flask-restful turns anything raised inside a Resource into its own generic
    500 before flask's errorhandlers run, so the 503 handlers above would never
    fire on /recipes and friends. Only backend outages bypass it."""
    monkeypatch.setattr(
        app, "_flask_restful_error_router", lambda handler, e: "flask-restful"
    )

    def original_handler(e: Exception) -> str:
        return "flask"

    assert app._error_router(original_handler, pymysql.Error("boom")) == "flask"
    assert app._error_router(original_handler, redis.RedisError("boom")) == "flask"
    assert app._error_router(original_handler, ValueError("boom")) == "flask-restful"
