#!/bin/bash
echo "[$(date +"%Y-%m-%d %H:%M:%S %z")] Starting in 6s (waiting for db)"
# sleep 6 # wait for db to come up?
# exec gunicorn app:app
source $(poetry env info --path)/bin/activate
echo $(which python3)
[[ -n $DEBUG ]] && exec python3 app.py || exec gunicorn app:app