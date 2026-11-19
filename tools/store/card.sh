#!/usr/bin/env bash
# Karta do sklepu: tło (obraz, np. z Fluxa), podpis u góry i zrzut z gry w ramce jak telefon.
#   card.sh <zrzut.png> <tło.png> "<podpis>" <szer> <wys> <wyjście>
# Wyjście .jpg albo .png (sklepy przyjmują oba; JPEG jest dużo mniejszy).
set -euo pipefail
raw=$1; bg=$2; caption=$3; W=$4; H=$5; out=$6
FONT="/System/Library/Fonts/Supplemental/Arial Bold.ttf"
tmp=$(mktemp -d)
capH=$((H * 18 / 100))
# Tło: wypełnij i przytnij do rozmiaru, przyciemnij górę pod podpisem.
magick "$bg" -resize "${W}x${H}^" -gravity center -extent "${W}x${H}" "$tmp/bg.png"
magick -size "${W}x${H}" gradient:'rgba(20,12,34,0.72)'-'rgba(20,12,34,0)' "$tmp/shade.png"
magick "$tmp/bg.png" \( "$tmp/shade.png" -resize "${W}x$((capH * 3 / 2))!" \) -gravity north -composite "$tmp/bg2.png"
# Zrzut: zmieść pod podpisem, zaokrąglone rogi, biała ramka (jak telefon), cień.
maxW=$((W * 82 / 100)); maxH=$((H - capH - H * 5 / 100))
magick "$raw" -resize "${maxW}x${maxH}" "$tmp/shot.png"
read -r sw sh < <(magick identify -format "%w %h\n" "$tmp/shot.png")
r=$((sw / 11)); b=$((sw / 40))
magick "$tmp/shot.png" \( +clone -alpha extract -fill black -colorize 100 -fill white -draw "roundrectangle 0,0 $((sw-1)),$((sh-1)) $r,$r" \) -alpha off -compose CopyOpacity -composite "$tmp/round.png"
magick -size $((sw + 2 * b))x$((sh + 2 * b)) xc:none -fill white -draw "roundrectangle 0,0 $((sw + 2 * b - 1)),$((sh + 2 * b - 1)) $((r + b)),$((r + b))" \
  "$tmp/round.png" -geometry +$b+$b -composite "$tmp/framed.png"
magick "$tmp/framed.png" \( +clone -background black -shadow 70x40+0+30 \) +swap -background none -layers merge +repage "$tmp/shadow.png"
# Podpis: biały, gruby różowy kontur (z poszerzonej alfy), ciemny cień pod spodem.
# Stała wielkość czcionki w całym zestawie. Gdy nie mieści się w linii, łamiemy w spacji najbliżej środka
# (dwie równe linie zamiast jednego słowa na dole).
pt=$((W * 90 / 1000))
one=$(magick -font "$FONT" -pointsize $pt label:"$caption" -format %w info:)
if [ "$one" -gt $((W * 88 / 100)) ]; then
  caption=$(python3 -c 'import sys
t=sys.argv[1]; m=len(t)/2
i=min((k for k,c in enumerate(t) if c==" "), key=lambda k: abs(k-m))
print(t[:i]+"\n"+t[i+1:])' "$caption")
fi
# Za szeroka linia nawet po złamaniu: tylko ten podpis trochę mniejszy.
wide=$(magick -font "$FONT" -pointsize $pt -interline-spacing $((-pt / 10)) label:"$caption" -format %w info:)
if [ "$wide" -gt $((W * 86 / 100)) ]; then pt=$((pt * W * 86 / 100 / wide)); fi
magick -background none -fill white -font "$FONT" -pointsize $pt -interline-spacing $((-pt / 10)) -gravity center label:"$caption" -bordercolor none -border $((W / 50)) "$tmp/cap.png"
magick "$tmp/cap.png" -alpha extract -morphology Dilate Disk:$((W / 140)) -background '#ff6f9f' -alpha shape "$tmp/cap-stroke.png"
magick "$tmp/cap-stroke.png" -alpha extract -morphology Dilate Disk:$((W / 260)) -background '#2a1a3a' -alpha shape "$tmp/cap-ink.png"
# Podpis na środku pasa nad zrzutem.
capHt=$(magick identify -format %h "$tmp/cap-ink.png")
top=$(((capH - capHt) / 2 + H / 200))
magick "$tmp/bg2.png" \
  "$tmp/cap-ink.png" -gravity north -geometry +0+$((top + W / 160)) -composite \
  "$tmp/cap-stroke.png" -gravity north -geometry +0+$top -composite \
  "$tmp/cap.png" -gravity north -geometry +0+$top -composite \
  "$tmp/shadow.png" -gravity north -geometry +0+$((capH + H / 200)) -composite \
  -alpha off -strip -quality 90 "$out"
rm -rf "$tmp"
