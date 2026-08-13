#!/bin/bash
# Upload a local folder into the existing Nextcloud share structure via WebDAV.
# Usage: ./nextcloud-upload.sh <local-dir> <remote-subfolder-under-03_ThirdHome>

set -e

USER="FWbp8dKzAFt4AZ8"
PASS="xAqeqpSzPt"
BASE="https://nextcloud.uni-weimar.de/public.php/webdav"

LOCAL_DIR="$1"
REMOTE_PREFIX="$2"  # e.g. "03_ThirdHome/site"

if [ -z "$LOCAL_DIR" ] || [ -z "$REMOTE_PREFIX" ]; then
  echo "Usage: $0 <local-dir> <remote-subfolder>"
  exit 1
fi

# URL-encode a path: encode each segment, keep the "/" separators intact
urlencode_path() {
  local path="$1" IFS='/' seg out=""
  read -ra parts <<< "$path"
  for seg in "${parts[@]}"; do
    enc=$(curl -Gs -o /dev/null -w '%{url_effective}' --data-urlencode "x=$seg" "http://x" | sed 's/^http:\/\/x\/?x=//')
    out="$out/${enc//+/%20}"
  done
  echo "${out#/}"
}

# create remote directories first (MKCOL is idempotent-ish; 405 = already exists, fine)
find "$LOCAL_DIR" -type d | while read -r d; do
  rel="${d#$LOCAL_DIR}"
  remote_path="$REMOTE_PREFIX$rel"
  encoded=$(urlencode_path "$remote_path")
  curl -s -u "$USER:$PASS" -X MKCOL "$BASE/$encoded/" -o /dev/null -w ""
done

total=$(find "$LOCAL_DIR" -type f | wc -l)
count=0
find "$LOCAL_DIR" -type f | while read -r f; do
  rel="${f#$LOCAL_DIR}"
  remote_path="$REMOTE_PREFIX$rel"
  encoded=$(urlencode_path "$remote_path")
  count=$((count+1))
  code=$(curl -s -u "$USER:$PASS" -T "$f" "$BASE/$encoded" -o /dev/null -w "%{http_code}")
  echo "[$code] $remote_path"
done
echo "done: $total files"
