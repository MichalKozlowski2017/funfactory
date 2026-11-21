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
for id in krowa banan rower slon kubek; do sprite styl2/plastelina-$id-21.png items/$id 512; done
for id in pies ryba zaba gruszka truskawka samolot lodka pilka mis klocek; do sprite proto/obj-$id-21.png items/$id 512; done
sprite styl2/plastelina-lisica-21.png lusia 720
sprite styl2/plastelina-borsuk-21.png bazyl 720
for k in cienie pasuje liczenie; do sprite proto/dom-$k-21.png dom-$k 560; done
for k in kolory gloski mamy; do sprite extra/dom-$k-21.png dom-$k 560; done
# Obiekty katalogu (scripts/gen-art.ts): assets-raw/bystrzakowo/items/<id>-<seed>.png.
# Przy kilku wersjach (przegenerowanie z innym seedem) wygrywa najnowsza.
seen=" "
for f in $(ls -t $RAW/items/*.png 2>/dev/null); do
  base=$(basename "$f" .png); id=${base%-*}
  case "$seen" in *" $id "*) continue ;; esac
  seen="$seen$id "
  [ -f "$OUT/items/$id.webp" ] && [ "$OUT/items/$id.webp" -nt "$f" ] && continue
  sprite "items/$base.png" "items/$id" 512
done
# Muzyka (ACE-Step): FLAC -> AAC, cicha pętla w tle.
mus=$(ls $RAW/extra/muzyka*.flac 2>/dev/null | head -1 || true)
if [ -n "$mus" ]; then
  mkdir -p public/audio
  ffmpeg -loglevel error -y -i "$mus" -af "loudnorm=I=-20:TP=-2,afade=t=in:d=0.05" -ac 2 -ar 44100 -c:a aac -b:a 96k public/audio/muzyka.m4a
  cp "${mus%.flac}.json" public/audio/muzyka.json 2>/dev/null || true
fi
# Warsztat Bazyla: tło krainy, tło zabaw, stanowiska, skrzynka, wiaderko (barwione w grze), znaki domów.
mkdir -p $OUT/warsztat
background warsztat/tlo-warsztat-21.png kraina-warsztat
background warsztat/gra2-32.png gra-warsztat
sprite warsztat/stacja-sortowanie-22.png dom-sortowanie 560
sprite warsztat/stacja-ukladanka-22.png dom-ukladanka 560
sprite warsztat/skrzynka-21.png warsztat/skrzynka 512
sprite warsztat/wiadro-21.png warsztat/wiadro 512
sprite warsztat/stodola-21.png warsztat/stodola 256
sprite warsztat/staw-21.png warsztat/staw 256
for id in droga balwan palma kra; do sprite warsztat/$id-21.png warsztat/$id 256; done
background proto/tlo-polana-21.png polana
background proto/tlo-zagadka-21.png tlo-zagadka
du -sh $OUT
