#!/bin/bash
echo "[$(date +"%Y-%m-%d %H:%M:%S %z")] Starting in 3s (waiting for db)"
sleep 3 # wait for db to come up?
source $(poetry env info --path)/bin/activate
[[ -n $DEBUG ]] && exec python3 app.py || exec gunicorn app:app