#!/usr/bin/env bash
# Grafika Google Play 1024×500: tło Polany, Lusia i Bazyl, logo „Bystrzakowo” i podtytuł w języku.
#   bystrzakowo-feature.sh → games/bystrzakowo/store/feature-graphic-<lang>.png
set -euo pipefail
cd "$(dirname "$0")/../.."
ART=games/bystrzakowo/public/art
FONT=tools/store/baloo2-800.ttf  # Baloo 2 ExtraBold (statyczny wariant z czcionki gry, OFL)
OUT=games/bystrzakowo/store
T=$(mktemp -d)
W=1024; H=500
magick "$ART/polana.jpg" -resize "${W}x${H}^" -gravity center -extent "${W}x${H}" "$T/bg.png"
magick "$ART/lusia.webp" -trim +repage -resize x330 "$T/lusia.png"
magick "$ART/bazyl.webp" -trim +repage -resize x330 "$T/bazyl.png"
txt() { # tekst, wielkość, kolor wypełnienia, kontur, wyjście
  magick -background none -fill "$3" -font "$FONT" -weight 800 -pointsize "$2" label:"$1" -bordercolor none -border 24 "$T/t.png"
  magick "$T/t.png" -alpha extract -morphology Dilate "Disk:$(( $2 / 11 ))" -background "$4" -alpha shape "$T/s.png"
  magick "$T/s.png" -alpha extract -morphology Dilate "Disk:$(( $2 / 22 ))" -background '#5a3c28' -alpha shape "$T/k.png"
  magick "$T/k.png" "$T/s.png" -gravity center -composite "$T/t.png" -gravity center -composite "$5"
}
txt "Bystrzakowo" 112 '#ffb347' '#ffffff' "$T/logo.png"
for lang in pl en de es; do
  case $lang in
    pl) sub="Zagadki i zabawy dla dzieci 3–6 lat" ;;
    en) sub="Learning games for kids aged 3–6" ;;
    de) sub="Lernspiele für Kinder von 3–6" ;;
    es) sub="Juegos para aprender, de 3 a 6 años" ;;
  esac
  txt "$sub" 44 '#ffffff' '#ff9f40' "$T/sub.png"
  # Podtytuł mieści się między Lusią a Bazylem.
  magick "$T/sub.png" -resize '600x>' "$T/sub.png"
  magick "$T/bg.png" \
    "$T/lusia.png" -gravity southwest -geometry +10-20 -composite \
    "$T/bazyl.png" -gravity southeast -geometry +10-20 -composite \
    "$T/logo.png" -gravity north -geometry +0+70 -composite \
    "$T/sub.png" -gravity north -geometry +0+232 -composite \
    -alpha off -strip "$OUT/feature-graphic-$lang.png"
done
rm -rf "$T"
ls -la $OUT/feature-graphic-*.png
