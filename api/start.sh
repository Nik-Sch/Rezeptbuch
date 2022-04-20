#!/bin/sh
sleep 6 # wait for db to come up?
gunicorn --worker-class=gevent --graceful-timeout 2 -t 9999 -b 0.0.0.0:80 --worker-tmp-dir /dev/shm --access-logfile - --reload app:app
