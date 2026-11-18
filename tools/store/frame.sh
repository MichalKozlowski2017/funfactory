#!/usr/bin/env bash
# Grafika do sklepu: tło (gradient), podpis u góry i zrzut z gry z zaokrąglonymi rogami.
#   frame.sh <zrzut.png> "<podpis>" <szer> <wys> <wyjście.png> [kolor_góra] [kolor_dół]
set -euo pipefail
raw=$1; caption=$2; W=$3; H=$4; out=$5; top=${6:-#3a2458}; bottom=${7:-#140c22}
FONT="/System/Library/Fonts/Supplemental/Arial Bold.ttf"
tmp=$(mktemp -d)
capH=$((H * 17 / 100))
# Zrzut: zmieść w (W*0.86) x (H - podpis - margines), zaokrąglone rogi, cień.
maxW=$((W * 86 / 100)); maxH=$((H - capH - H * 4 / 100))
magick "$raw" -resize "${maxW}x${maxH}" "$tmp/shot.png"
read -r sw sh < <(magick identify -format "%w %h\n" "$tmp/shot.png")
r=$((sw / 14))
magick "$tmp/shot.png" \( +clone -alpha extract -fill black -colorize 100 -fill white -draw "roundrectangle 0,0 $((sw-1)),$((sh-1)) $r,$r" \) -alpha off -compose CopyOpacity -composite "$tmp/round.png"
magick "$tmp/round.png" \( +clone -background black -shadow 60x30+0+20 \) +swap -background none -layers merge +repage "$tmp/shadow.png"
# Podpis: biały, gruby różowy kontur, zawijany do szerokości.
magick -background none -fill white -font "$FONT" -size $((W * 88 / 100))x$((capH * 80 / 100)) -gravity center caption:"$caption" "$tmp/cap.png"
# Kontur z tego samego napisu (poszerzona alfa), więc zawsze leży idealnie pod literami.
magick "$tmp/cap.png" -alpha extract -morphology Dilate Disk:$((W / 150)) -background '#ff7aa8' -alpha shape "$tmp/cap-stroke.png"
magick -size "${W}x${H}" gradient:"$top"-"$bottom" \
  "$tmp/cap-stroke.png" -gravity north -geometry +0+$((capH * 12 / 100)) -composite \
  "$tmp/cap.png" -gravity north -geometry +0+$((capH * 12 / 100)) -composite \
  "$tmp/shadow.png" -gravity north -geometry +0+$((capH + H / 100)) -composite \
  -alpha off -strip "$out"
rm -rf "$tmp"
