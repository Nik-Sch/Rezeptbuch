#!/usr/bin/env python3
"""One-time migration: namespace shared shopping lists under a "shared:" prefix.

Before the access-control fix, shared shopping lists were stored in redis (db 2)
under their bare UUID, sharing a keyspace with private lists (keyed by the bare
username) and flask sessions (keyed "session:..."). This script renames each
bare-UUID hash key to "shared:<uuid>" so the new key-resolution logic in app.py
finds them again.

Safe to run repeatedly: already-prefixed keys and non-UUID / non-hash keys are
skipped. Run once after deploying the fix, e.g.:

    docker compose exec api python migrate_shopping_lists.py

If skipped, shared lists simply start empty and repopulate as items are re-added.
"""

import re

import redis

SHOPPING_LIST_ID_RE = re.compile(
    r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", re.IGNORECASE
)


def main() -> None:
    r = redis.StrictRedis(host="redis", port=6379, db=2, decode_responses=True)

    migrated = 0
    for key in r.scan_iter():
        if not SHOPPING_LIST_ID_RE.fullmatch(key):
            continue
        if r.type(key) != "hash":
            continue
        target = f"shared:{key}"
        if r.exists(target):
            print(f"skip {key}: {target} already exists")
            continue
        r.rename(key, target)
        migrated += 1
        print(f"renamed {key} -> {target}")

    print(f"done, migrated {migrated} shared list(s)")


if __name__ == "__main__":
    main()
