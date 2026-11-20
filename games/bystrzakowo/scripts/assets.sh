#!/bin/bash
# Grafiki z assets-raw (Flux na Legionie) -> public/art: przycięte, przeskalowane, WebP/JPG.
# Każdy plik dostaje obok .json z promptem i seedem (kopia z assets-raw).
# Użycie: games/bystrzakowo/scripts/assets.sh
set -euo pipefail
cd "$(dirname "$0")/.."
RAW=../../assets-raw/bystrzakowo
OUT=public/art
mkdir -p $OUT/items

# sprite: źródło, cel (bez rozszerzenia), najdłuższy bok w px
sprite() {
  local src="$RAW/$1" dst="$OUT/$2" size="$3"
  [ -f "$src" ] || { echo "brak: $src"; return; }
  magick "$src" -trim +repage -resize "${size}x${size}>" -quality 90 -define webp:alpha-quality=95 "$dst.webp"
  [ -f "${src%.png}.json" ] && cp "${src%.png}.json" "$dst.json"
}
background() {
  local src="$RAW/$1" dst="$OUT/$2"
  [ -f "$src" ] || { echo "brak: $src"; return; }
  magick "$src" -resize 1920x -quality 84 "$dst.jpg"
  [ -f "${src%.png}.json" ] && cp "${src%.png}.json" "$dst.json"
}

sprite styl/plastelina-sitting-11.png items/kot 512
sprite styl/plastelina-leaf-11.png items/jablko 512
sprite styl/plastelina-car-11.png items/auto 512
for id in krowa banan rower slon kubek kurczak; do sprite styl2/plastelina-$id-21.png items/$id 512; done
for id in pies ryba zaba kaczka gruszka truskawka samolot lodka pilka mis klocek; do sprite proto/obj-$id-21.png items/$id 512; done
sprite styl2/plastelina-lisica-21.png lusia 720
sprite styl2/plastelina-borsuk-21.png bazyl 720
for k in cienie pasuje liczenie; do sprite proto/dom-$k-21.png dom-$k 560; done
background proto/tlo-polana-21.png polana
background proto/tlo-zagadka-21.png tlo-zagadka
du -sh $OUT
