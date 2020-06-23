#!/bin/sh
gunicorn --workers=4 -b 0.0.0.0:80 --worker-tmp-dir /dev/shm --access-logfile - --reload app:app
