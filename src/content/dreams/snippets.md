---
title: "Matthias' Snippet Corner"
summary: "Some useful code snippets/bash things"
date: 2025-03-17
author: Matthias Metzger
tags: []
---

### Pipe Remote Postgres to Local Docker Container

Using an `.ssh/config` with a port-forward for `my-remote`, you 
can first connect to the remote machine in the background and
then just `pg_dump` all the things.

```sh
$ sudo apt install postgresql-client
$ ssh my-remote -N &
$ pg_dump --create --host localhost --port 7087 --username duck pond \
  | docker compose exec -i --no-TTY db psql --username duck pond

```

### Useful functions and settings

Some useful shell functions and settings

```shell
set -o errexit   # abort on nonzero exitstatus
set -o nounset   # abort on unbound variable
set -o pipefail  # don't hide errors within pipes

# alias for echo - can be changed later to log to file
function log {
  echo -e "${*}"
}

# exit process with red error
function die {
  red='\033[0;31m'
  no_color='\033[0m'

  >&2 log "${red}${*}${no_color}"
  exit 1
}

```