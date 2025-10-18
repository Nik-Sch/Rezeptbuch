#!/bin/sh
cd $IMAGE_DIRECTORY
git checkout -- backup.sql
git pull
mysql --ssl=off -h "$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" < $IMAGE_DIRECTORY/backup.sql
rm $IMAGE_DIRECTORY/backup.sql