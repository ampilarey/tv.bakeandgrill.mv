#!/bin/bash
set -e
cd "$(dirname "$0")"
git pull origin main
cp -r client/dist/* .
touch server/tmp/restart.txt
echo "Deployed: $(grep -o 'index-[^"]*\.js' index.html | head -1)"
