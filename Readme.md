# Rezeptbuch
This is a recipe book webpage which can uses a mariadb and redis as db backend with a react based PWA web client. The client communicates with a Flask REST API.
It includes a node front end proxy for server side rendering.

The API docker also serves as the backup/restore docker and is used to initially configure the DBs.
## Configuration for Deployment
To deploy, several environment files need to be populated with proper env variables:
### db.env
Access to the database
- `MYSQL_ROOT_PASSWORD=...`: root password for the db, used by `mariadb` docker
- `MYSQL_USER=...`: secure access to the db from the api. The user/password is created on first connect.
- `MYSQL_PASSWORD=...`: secure access to the db from the api. The user/password is created on first connect.
- `MYSQL_DATABASE=...`: secure access to the db from the api. The user/password is created on first connect.

### api/.env
- `FLASK_KEY=...` secret bytes which are used to securely sign the session cookie (reference https://flask.palletsprojects.com/en/2.3.x/config/#SECRET_KEY)
- `PUSH_PUBLIC_KEY=...`: vapid key for notification pushing ([generator](https://vapidkeys.com/)) *You need to change the mail address in api/app.py:176 accordingly*
- `PUSH_PRIVATE_KEY=...`: vapid key for notification pushing ([generator](https://vapidkeys.com/)) *You need to change the mail address in api/app.py:176 accordingly*
- `BACKUP_REPO=https://user:password@some_git.repository` A repository which is used to backup the sql db and all uploaded images. This should be a private repo which will be pushed everytime the `api/backup.sh` script is called. (You may want to make a crontab in the host similiarly to: `0 0 * * * /usr/bin/docker exec rezeptbuch_api_1 ./backup.sh`)
The repository should contain a `backup.sql` file which creates the tables accordingly in order for the initial db setup to work. You may want to clone https://github.com/rezeptbuch/backup-example

### ui/.env
- `PORT=80` defines the port to serve the ui
- `API_URI=http://api/` the docker local uri to access the api
- `STATIC_DIR=./static` defines the directory to be used for static files


## Docker Compose
The `docker-compose.yml` expects a global, external docker network called `system-proxy` to exist which is used for the front end only. In my setup, this network will be served with a public facing reverse proxy which is used for TLS/SSL and subdomain management.
The `docker-compose-dev.yml` can be used for developement deployment:
```bash
docker compose -f docker-compose-dev.yml up --build --force-recreate
```