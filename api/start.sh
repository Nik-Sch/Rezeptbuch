#!/bin/sh
gunicorn --worker-class=gevent --graceful-timeout 10 -t 9999 -b 0.0.0.0:80 --worker-tmp-dir /dev/shm --access-logfile - --reload app:app
