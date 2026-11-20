#!/usr/bin/env bash
# Grafika promocyjna Google Play 1024×500 z ilustracji nagłówka App Store: logo „Glut” i podtytuł na różowej wstążce (Lilita One).
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
# Podtytuł: biały tekst na różowej wstążce z białą i ciemną obwódką oraz cieniem.
txt "$SUB" 40 white "$T/st.png"; magick "$T/st.png" -trim +repage "$T/st.png"
tw=$(magick identify -format '%w' "$T/st.png"); th=$(magick identify -format '%h' "$T/st.png"); W=$((tw+64)); H=$((th+32))
magick -size "$((W+12))x$((H+18))" xc:none \
  -fill '#2a1238' -draw "roundrectangle 0,7 $((W+11)),$((H+17)) 28,28" \
  -fill '#2a1238' -draw "roundrectangle 0,0 $((W+11)),$((H+11)) 28,28" \
  -fill '#fff4f8' -draw "roundrectangle 4,4 $((W+7)),$((H+7)) 25,25" \
  -fill '#ff7aa8' -draw "roundrectangle 8,8 $((W+3)),$((H+3)) 21,21" \
  "$T/st.png" -gravity center -geometry +0-4 -composite "$T/sub.png"
# Tło: kadr przesunięty, żeby glut był w prawej części; lewa strona lekko przyciemniona.
magick "$ART" -filter Lanczos -resize 1180x -gravity center -crop 1024x500-60+0 +repage "$T/bg.png"
magick -size 500x1024 gradient:'rgba(42,18,56,0.55)'-'rgba(42,18,56,0)' -rotate -90 -resize 620x500! "$T/shade.png"
magick "$T/bg.png" "$T/shade.png" -gravity west -composite \
  \( "$T/logo.png" -resize 410x \) -gravity northwest -geometry +36+78 -composite \
  \( "$T/sub.png" -resize '440x>' \) -gravity northwest -geometry +42+298 -composite "$OUT"
