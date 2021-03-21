FROM python:3.8

WORKDIR /usr/src/app
RUN apt-get update \
  && apt-get install -y --no-install-recommends libsodium-dev mariadb-client \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . ./
# COPY ./*.sh ./
CMD [ "./entrypoint.sh" ]