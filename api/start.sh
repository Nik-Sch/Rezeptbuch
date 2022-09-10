#!/bin/sh
echo "[$(date +"%Y-%m-%d %H:%M:%S %z")] Starting in 6s (waiting for db)"
# sleep 6 # wait for db to come up?
exec gunicorn app:app
