#!/bin/bash
set -e
USER="FWbp8dKzAFt4AZ8"
PASS="xAqeqpSzPt"
BASE="https://nextcloud.uni-weimar.de/public.php/webdav"
SRC="/d/BAUHAUS/SEM 2/VS CODE FILES/THIRD HOME INTERFACE/third-home-consolidated/Presentation"
REMOTE="03_ThirdHome/Presentation"

urlencode_path() {
  local path="$1" seg out=""
  local IFS='/'
  read -ra parts <<< "$path"
  for seg in "${parts[@]}"; do
    enc=$(curl -Gs -o /dev/null -w '%{url_effective}' --data-urlencode "x=$seg" "http://x" | sed 's/^http:\/\/x\/?x=//')
    out="$out/${enc//+/%20}"
  done
  echo "${out#/}"
}

FILES=(
  "35.png"
  "36.png"
  "37.png"
  "figure ground map.pdf"
  "To Do card poster.pdf"
  "Floor plans.pdf"
  "ground floor plan.pdf"
  "web.pdf"
)

total=${#FILES[@]}
n=0
for name in "${FILES[@]}"; do
  n=$((n+1))
  remote_path="$REMOTE/$name"
  encoded=$(urlencode_path "$remote_path")
  echo "[$n/$total] uploading: $name"
  code=$(curl -s -u "$USER:$PASS" -T "$SRC/$name" "$BASE/$encoded" -o /dev/null -w "%{http_code}")
  echo "[$n/$total] [$code] $name"
done
echo "done: $total files"
