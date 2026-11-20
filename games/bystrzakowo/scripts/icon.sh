#!/bin/bash
# Ikona aplikacji z grafiki Fluxa (assets-raw/bystrzakowo/extra/ikona-21.png) -> sklep, iOS, Android.
# Flux rysuje zaokrąglone rogi na białym tle, więc wycinamy środek i skalujemy do pełnego kwadratu.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=../../assets-raw/bystrzakowo/extra/ikona-21.png
BG='#fbd978'
mkdir -p store
magick "$SRC" -gravity center -crop 880x880+0+0 +repage -resize 1024x1024 -background "$BG" -alpha remove -alpha off store/icon-1024.png
cp "${SRC%.png}.json" store/icon.json
magick store/icon-1024.png -resize 512x512 store/icon-512.png
# iOS: jeden plik 1024 bez kanału alfa.
cp store/icon-1024.png ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png
# Android: klasyczna, okrągła i warstwa pierwszego planu ikony adaptacyjnej (108 dp, treść w środkowych 66%).
RES=android/app/src/main/res
for d in mdpi:48:108 hdpi:72:162 xhdpi:96:216 xxhdpi:144:324 xxxhdpi:192:432; do
  IFS=: read name size fg <<< "$d"
  magick store/icon-1024.png -resize ${size}x${size} $RES/mipmap-$name/ic_launcher.png
  magick store/icon-1024.png -resize ${size}x${size} \( +clone -alpha extract -fill black -colorize 100 -fill white -draw "circle $((size/2)),$((size/2)) $((size/2)),0" \) -alpha off -compose copy_opacity -composite $RES/mipmap-$name/ic_launcher_round.png
  inner=$((fg * 66 / 100))
  magick store/icon-1024.png -resize ${inner}x${inner} -background none -gravity center -extent ${fg}x${fg} $RES/mipmap-$name/ic_launcher_foreground.png
done
cat > $RES/values/ic_launcher_background.xml <<XML
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">$BG</color>
</resources>
XML
echo "ikony gotowe"

# Ekran startowy: kremowe tło gry, ikona w zaokrąglonym kafelku na środku.
SPLASH_BG='#fff6e8'
magick -size 2732x2732 "xc:$SPLASH_BG" \( store/icon-1024.png -resize 640x640 \( +clone -alpha extract -fill black -colorize 100 -fill white -draw "roundrectangle 0,0 639,639 140,140" \) -alpha off -compose copy_opacity -composite \) -gravity center -compose over -composite /tmp/bz-splash.png
for f in ios/App/App/Assets.xcassets/Splash.imageset/*.png; do cp /tmp/bz-splash.png "$f"; done
for f in $(find android/app/src/main/res -name splash.png); do
  w=$(magick identify -format "%w" "$f"); h=$(magick identify -format "%h" "$f")
  magick /tmp/bz-splash.png -gravity center -resize "${w}x${h}^" -extent "${w}x${h}" "$f"
done
rm -f /tmp/bz-splash.png
echo "ekran startowy gotowy"
