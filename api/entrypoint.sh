#!/bin/sh
[ "$(ls -A $IMAGE_DIRECTORY/)" ] && exec ./start.sh
git clone $BACKUP_REPO $IMAGE_DIRECTORY
chown -R www-data:www-data $IMAGE_DIRECTORY
git config --global user.email "rezeptbuch@posteo.de"
git config --global user.name "Rezeptbuch"
echo "cloned, waiting 10s for db to come up"
sleep 10
mysql -h "$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" < $IMAGE_DIRECTORY/backup.sql
rm $IMAGE_DIRECTORY/backup.sql
echo "restored backup, starting api"

exec ./start.sh