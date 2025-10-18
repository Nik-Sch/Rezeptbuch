#!/bin/sh
git config --global --add safe.directory $IMAGE_DIRECTORY
git config --global user.email "rezeptbuch@posteo.de"
git config --global user.name "Rezeptbuch"
echo $(date)
cd $IMAGE_DIRECTORY
mysqldump --ssl=off -h $MYSQL_HOST -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" > $IMAGE_DIRECTORY/backup.sql
git add .
git commit -m "$(date +"%Y-%m-%d %H:%M:%S")"
git push
rm $IMAGE_DIRECTORY/backup.sql
