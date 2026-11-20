#!/usr/bin/env bash
# Grafika promocyjna Google Play 1024×500 z ilustracji nagłówka App Store: logo „Glut” i podtytuł z konturem (Lilita One).
#   fg.sh <ilustracja.png> "<podtytuł>" <wyjście.png>
set -euo pipefail
ART=$1; SUB=$2; OUT=$3
F=$(cd "$(dirname "$0")" && pwd)/lilita-one.ttf
[ -f "$F" ] || F=/Users/michal/Sites/funfactory/games/glut/public/fonts/lilita-one.ttf
T=$(mktemp -d)
txt() { magick -size 2000x600 xc:none -font "$F" -pointsize "$2" -fill "$3" -gravity center -annotate +0+0 "$1" -trim +repage -bordercolor none -border 60 "$4"; }
outline() { magick "$1" -alpha extract -morphology Dilate "Disk:$2" -background "$3" -alpha shape "$4"; }
# Logo: gradient różu (jaśniej u góry), biały kontur, ciemny kontur z twardym cieniem, lekki przechył.
txt "Glut" 190 '#ff7aa8' "$T/lp.png"
WH=$(magick identify -format '%wx%h' "$T/lp.png")
magick -size "$WH" gradient:'#ffc2d6'-'#ff6f9f' "$T/grad.png"
magick "$T/grad.png" "$T/lp.png" -compose copy-opacity -composite "$T/lpg.png"
outline "$T/lp.png" 7 '#fff4f8' "$T/lw.png"
outline "$T/lp.png" 12 '#2a1238' "$T/lo.png"
W=$(magick identify -format '%w' "$T/lo.png"); H=$(magick identify -format '%h' "$T/lo.png")
magick -size "${W}x$((H+10))" xc:none "$T/lo.png" -geometry +0+10 -composite "$T/lo.png" -geometry +0+0 -composite \
  "$T/lw.png" -geometry +0+0 -composite "$T/lpg.png" -geometry +0+0 -composite \
  -trim +repage -bordercolor none -border 10 -background none -rotate -4 "$T/logo.png"
# Podtytuł: biały tekst z ciemnym konturem i twardym cieniem (bez tła).
txt "$SUB" 44 white "$T/st.png"
outline "$T/st.png" 6 '#2a1238' "$T/so.png"
W=$(magick identify -format '%w' "$T/so.png"); H=$(magick identify -format '%h' "$T/so.png")
magick -size "${W}x$((H+6))" xc:none "$T/so.png" -geometry +0+6 -composite "$T/so.png" -geometry +0+0 -composite \
  "$T/st.png" -geometry +0+0 -composite -trim +repage "$T/sub.png"
# Tło: kadr przesunięty, żeby glut był w prawej części; lewa strona lekko przyciemniona.
magick "$ART" -filter Lanczos -resize 1180x -gravity center -crop 1024x500-60+0 +repage "$T/bg.png"
magick -size 500x1024 gradient:'rgba(42,18,56,0.55)'-'rgba(42,18,56,0)' -rotate -90 -resize 620x500! "$T/shade.png"
magick "$T/bg.png" "$T/shade.png" -gravity west -composite \
  \( "$T/logo.png" -resize 410x \) -gravity northwest -geometry +36+78 -composite \
  \( "$T/sub.png" -resize '440x>' \) -gravity northwest -geometry +46+296 -composite "$OUT"
