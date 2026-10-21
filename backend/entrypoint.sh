#!/bin/sh
# Volumes created by older (root) images stay root-owned: hand them to the app user once, then drop root.
set -e
if [ "$(id -u)" = 0 ]; then
  for d in /srv/data /srv/media; do
    [ "$(stat -c %u "$d")" = 10001 ] || chown -R qaab:qaab "$d"
  done
  exec setpriv --reuid=qaab --regid=qaab --init-groups "$@"
fi
exec "$@"
