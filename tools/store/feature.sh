#!/usr/bin/env bash
# Grafika promocyjna Google Play 1024×500: ilustracja + logo „Glut” (jak w grze) + podtytuł po lewej.
#   feature.sh <ilustracja.png> "<podtytuł>" <wyjście.png>
set -euo pipefail
art=$1; sub=$2; out=$3
LOGO="/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf"
FONT="/System/Library/Fonts/Supplemental/Arial Bold.ttf"
tmp=$(mktemp -d)
magick "$art" -resize 1024x -gravity center -extent 1024x500 "$tmp/bg.png"
# Lewa strona przyciemniona pod napisy.
magick -size 500x1024 gradient:'rgba(20,12,34,0.75)'-'rgba(20,12,34,0)' -rotate -90 -resize 1024x500! "$tmp/shade.png"
# Logo: różowe wypełnienie, gruby biały kontur, twardy ciemny cień.
magick -background none -fill '#ff9ebb' -font "$LOGO" -pointsize 170 label:"Glut" "$tmp/logo.png"
magick "$tmp/logo.png" -alpha extract -morphology Dilate Disk:9 -background white -alpha shape "$tmp/logo-stroke.png"
magick "$tmp/logo-stroke.png" -alpha extract -background '#120a1e' -alpha shape "$tmp/logo-shadow.png"
magick -background none -fill white -font "$FONT" -size 440x120 -gravity west caption:"$sub" "$tmp/sub.png"
magick "$tmp/sub.png" -alpha extract -morphology Dilate Disk:4 -background '#2a1a3a' -alpha shape "$tmp/sub-stroke.png"
magick "$tmp/bg.png" "$tmp/shade.png" -composite \
  "$tmp/logo-shadow.png" -gravity northwest -geometry +52+86 -composite \
  "$tmp/logo-stroke.png" -gravity northwest -geometry +52+76 -composite \
  "$tmp/logo.png" -gravity northwest -geometry +61+85 -composite \
  "$tmp/sub-stroke.png" -gravity northwest -geometry +56+300 -composite \
  "$tmp/sub.png" -gravity northwest -geometry +56+300 -composite \
  -alpha off -strip "$out"
rm -rf "$tmp"
