#!/bin/bash

export PATH="/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"

cd /Users/sajithminrutha/Documents/photo_website || exit 1

sleep 10

/opt/homebrew/bin/node scripts/prime_gallery.cjs

exec /opt/homebrew/bin/npm run watch