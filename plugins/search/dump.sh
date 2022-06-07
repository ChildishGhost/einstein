#!/bin/sh

# Usage: ./dump.sh > ~/.config/einstein/config/tw.childish.einstein.plugins.search.config.json
# paste the output into plugins/saerch/index.ts

# This script dumps user defined search engines in Chromium.
# It replaces {inputEncoding}, which appears in some search engine definitions, with
# UTF-8, {google:baseURL} with the Google URL, and omits other such tokens.

# Location of Chromium's 'Web Data' SQLite3 file
#CHROMIUM_WEB_DATA="$HOME/.config/chromium/Default/Web Data"
CHROMIUM_WEB_DATA="$HOME/.config/microsoft-edge-dev/Default/Web Data"

# Location to create temporary copy of 'Web Data', since the database is locked while
# Chromium is running
COPY=$(mktemp)

cp "$CHROMIUM_WEB_DATA" "$COPY"

echo "{"
echo "  \"engines\": ["
sqlite3 "$COPY" <<COMMANDS |
.echo off
select keyword, url, short_name from keywords;
.quit
COMMANDS
    sed -e \ '
s#{searchTerms}#%s#g
s#{google:baseURL}#https://google.com/#g
s#{inputEncoding}#UTF-8#g
s#&?[^{}?&]\+={[^}]\+}##g
s#{[^}]\+}##g
' |
    awk -v FS='|' -v q='"' '{ print "    { \"trigger\": "q$1q", \"url\": "q$2q", \"description\": "q$3q" },"}'
rm "$COPY"
echo "  ]"
echo "}"
