#!/usr/bin/env bash
# Karty Bystrzakowa do sklepów (poziome): tło krainy, podpis czcionką gry, zrzut w białej ramce z cieniem.
# Wejście: assets-raw/bystrzakowo-store/shots/<rozmiar>-<lang>/<n>.png (bystrzakowo-shots.sh)
# Wyjście: games/bystrzakowo/store/screens/<rozmiar>-<lang>/<n>.jpg
set -euo pipefail
cd "$(dirname "$0")/../.."
IN=assets-raw/bystrzakowo-store/shots
OUT=games/bystrzakowo/store/screens
ART=games/bystrzakowo/public/art
FONT=tools/store/baloo2-800.ttf  # Baloo 2 ExtraBold (statyczny wariant z czcionki gry, OFL)
BG=("" "$ART/meadow.jpg" "$ART/landscapes/forest.jpg" "$ART/realm-workshop.jpg" "$ART/realm-path.jpg" "$ART/landscapes/beach.jpg" "$ART/realm-studio.jpg" "$ART/landscapes/farm.jpg" "$ART/landscapes/winter.jpg")
caption() {
  local lang=$1 n=$2
  case "$lang-$n" in
    pl-1) echo "22 zabawy w czterech krainach" ;; en-1) echo "22 games in four lands" ;; de-1) echo "22 Spiele in vier Ländern" ;; es-1) echo "22 juegos en cuatro mundos" ;;
    pl-2) echo "Lektor czyta wszystkie polecenia" ;; en-2) echo "Every instruction read aloud" ;; de-2) echo "Alle Anweisungen vorgelesen" ;; es-2) echo "Todas las instrucciones en voz alta" ;;
    pl-3) echo "20 historyjek do ułożenia" ;; en-3) echo "20 picture stories to order" ;; de-3) echo "20 Bildergeschichten" ;; es-3) echo "20 cuentos para ordenar" ;;
    pl-4) echo "Literki i cyferki palcem" ;; en-4) echo "Trace letters and numbers" ;; de-4) echo "Buchstaben und Zahlen schreiben" ;; es-4) echo "Traza letras y números" ;;
    pl-5) echo "Obrazki z naklejek" ;; en-5) echo "Create sticker pictures" ;; de-5) echo "Stickerbilder gestalten" ;; es-5) echo "Crea imágenes con calcomanías" ;;
    pl-6) echo "Kolorowanki z dużymi polami" ;; en-6) echo "Easy coloring pages" ;; de-6) echo "Einfache Ausmalbilder" ;; es-6) echo "Dibujos fáciles de colorear" ;;
    pl-7) echo "Raport dla rodzica" ;; en-7) echo "A report for parents" ;; de-7) echo "Ein Bericht für Eltern" ;; es-7) echo "Un informe para padres" ;;
    pl-8) echo "Pocztówka z sukcesami tygodnia" ;; en-8) echo "A weekly postcard of successes" ;; de-8) echo "Wochenpostkarte mit Erfolgen" ;; es-8) echo "Postal semanal de logros" ;;
  esac
}
card() {
  local raw=$1 bg=$2 text=$3 W=$4 H=$5 out=$6
  local tmp; tmp=$(mktemp -d)
  local capH=$((H * 20 / 100))
  magick "$bg" -resize "${W}x${H}^" -gravity center -extent "${W}x${H}" -fill 'rgba(40,24,60,0.25)' -colorize 25 "$tmp/bg.png"
  # Zrzut pod podpisem: zaokrąglone rogi, biała ramka, cień.
  local maxW=$((W * 86 / 100)) maxH=$((H - capH - H * 11 / 100))
  magick "$raw" -resize "${maxW}x${maxH}" "$tmp/shot.png"
  read -r sw sh < <(magick identify -format "%w %h\n" "$tmp/shot.png")
  local r=$((sh / 14)) b=$((sh / 45))
  magick "$tmp/shot.png" \( +clone -alpha extract -fill black -colorize 100 -fill white -draw "roundrectangle 0,0 $((sw-1)),$((sh-1)) $r,$r" \) -alpha off -compose CopyOpacity -composite "$tmp/round.png"
  magick -size $((sw + 2 * b))x$((sh + 2 * b)) xc:none -fill white -draw "roundrectangle 0,0 $((sw + 2 * b - 1)),$((sh + 2 * b - 1)) $((r + b)),$((r + b))" "$tmp/round.png" -geometry +$b+$b -composite "$tmp/framed.png"
  magick "$tmp/framed.png" \( +clone -background black -shadow 60x30+0+20 \) +swap -background none -layers merge +repage "$tmp/shadow.png"
  # Podpis: biały, pomarańczowy kontur jak napisy w grze, ciemny brzeg.
  local pt=$((H * 9 / 100))
  local wide; wide=$(magick -font "$FONT" -pointsize $pt label:"$text" -format %w info:)
  [ "$wide" -gt $((W * 88 / 100)) ] && pt=$((pt * W * 88 / 100 / wide))
  magick -background none -fill white -font "$FONT" -weight 800 -pointsize $pt -gravity center label:"$text" -bordercolor none -border $((H / 30)) "$tmp/cap.png"
  magick "$tmp/cap.png" -alpha extract -morphology Dilate Disk:$((H / 110)) -background '#ff9f40' -alpha shape "$tmp/st.png"
  magick "$tmp/st.png" -alpha extract -morphology Dilate Disk:$((H / 200)) -background '#5a3c28' -alpha shape "$tmp/ink.png"
  local ch; ch=$(magick identify -format %h "$tmp/ink.png")
  local top=$(((capH - ch) / 2 + H / 100))
  magick "$tmp/bg.png" \
    "$tmp/ink.png" -gravity north -geometry +0+$((top + H / 150)) -composite \
    "$tmp/st.png" -gravity north -geometry +0+$top -composite \
    "$tmp/cap.png" -gravity north -geometry +0+$top -composite \
    "$tmp/shadow.png" -gravity north -geometry +0+$((capH + H / 100)) -composite \
    -alpha off -strip -quality 90 "$out"
  rm -rf "$tmp"
}
for dir in "$IN"/*; do
  [ -d "$dir" ] || continue
  set_name=$(basename "$dir"); lang=${set_name##*-}; size=${set_name%-*}
  case $size in ios-6.9) W=2868 H=1320 ;; ipad-13) W=2752 H=2064 ;; android) W=1920 H=1080 ;; *) continue ;; esac
  mkdir -p "$OUT/$set_name"
  for n in 1 2 3 4 5 6 7 8; do
    [ -f "$dir/$n.png" ] || continue
    card "$dir/$n.png" "${BG[$n]}" "$(caption "$lang" "$n")" $W $H "$OUT/$set_name/$n.jpg"
  done
  echo "$set_name: $(ls "$OUT/$set_name" | wc -l | tr -d ' ') kart"
done
