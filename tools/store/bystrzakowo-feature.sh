#!/usr/bin/env bash
# Grafika Google Play 1024×500: tło z Fluxa (klocki ABC 123, tęcza), Lusia i Bazyl, logo z nazwą w języku (Bystrzakowo, Smartyville, Schlaudorf, Listolandia) i podtytuł.
#   bystrzakowo-feature.sh → games/bystrzakowo/store/feature-graphic-<lang>.png
set -euo pipefail
cd "$(dirname "$0")/../.."
ART=games/bystrzakowo/public/art
FONT=tools/store/baloo2-800.ttf  # Baloo 2 ExtraBold (statyczny wariant z czcionki gry, OFL)
OUT=games/bystrzakowo/store
T=$(mktemp -d)
W=1024; H=500
magick games/bystrzakowo/store/keyart/keyart-blocks-11.jpg -resize "${W}x${H}^" -gravity center -extent "${W}x${H}" "$T/bg.png"
magick "$ART/lusia.webp" -trim +repage -resize x235 "$T/lusia.png"
magick "$ART/bazyl.webp" -trim +repage -resize x280 "$T/bazyl.png"
txt() { # tekst, wielkość, kolor wypełnienia, kontur, wyjście
  magick -background none -fill "$3" -font "$FONT" -weight 800 -pointsize "$2" label:"$1" -bordercolor none -border 24 "$T/t.png"
  magick "$T/t.png" -alpha extract -morphology Dilate "Disk:$(( $2 / 11 ))" -background "$4" -alpha shape "$T/s.png"
  magick "$T/s.png" -alpha extract -morphology Dilate "Disk:$(( $2 / 22 ))" -background '#5a3c28' -alpha shape "$T/k.png"
  magick "$T/k.png" "$T/s.png" -gravity center -composite "$T/t.png" -gravity center -composite "$5"
}
for lang in pl en de es; do
  case $lang in
    pl) name="Bystrzakowo" sub="Mądra zabawa dla dzieci 3–6 lat" ;;
    en) name="Smartyville" sub="Smart play for kids aged 3–6" ;;
    de) name="Schlaudorf" sub="Kluges Spielen für Kinder von 3–6" ;;
    es) name="Listolandia" sub="Juego inteligente de 3 a 6 años" ;;
  esac
  txt "$name" 112 '#ffb347' '#ffffff' "$T/logo.png"
  txt "$sub" 44 '#ffffff' '#ff9f40' "$T/sub.png"
  # Logo i podtytuł po lewej stronie (prawą zajmują klocki z tęczą i Bazyl), Lusia na dole po lewej.
  magick "$T/logo.png" -resize '560x>' "$T/logo.png"
  magick "$T/sub.png" -resize "560x>" "$T/sub.png"
  magick "$T/bg.png" \
    "$T/logo.png" -gravity northwest -geometry +30+40 -composite \
    "$T/sub.png" -gravity northwest -geometry +40+190 -composite \
    "$T/lusia.png" -gravity southwest -geometry +390-12 -composite \
    "$T/bazyl.png" -gravity southeast -geometry +10-15 -composite \
    -alpha off -strip "$OUT/feature-graphic-$lang.png"
done
rm -rf "$T"
ls -la $OUT/feature-graphic-*.png
