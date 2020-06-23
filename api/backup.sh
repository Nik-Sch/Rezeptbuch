#!/bin/sh
cd $IMAGE_DIRECTORY
mysqldump -h $MYSQL_HOST -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" > $IMAGE_DIRECTORY/backup.sql
git add .
git commit -m "$(date +"%Y-%m-%d %H:%M:%S")"
git push
rm $IMAGE_DIRECTORY/backup.sql