#!/usr/bin/env bash
# Karty Bystrzakowa do sklepów, pisane dla rodzica: hasło z korzyścią, podpis, zrzut gry w ramce.
# Karta 1 (okładka): tło z Fluxa (store/keyart), znaczki zaufania, Lusia i Bazyl.
# Karta 8: „bezpieczna dla dziecka” ze znaczkami.
# Wejście: assets-raw/bystrzakowo-store/shots/<rozmiar>-<lang>/<scena>.png (bystrzakowo-shots.sh, z ?nohand)
# Wyjście: games/bystrzakowo/store/screens/<rozmiar>-<lang>/<n>.jpg
# Zawężanie: LANGS="pl en", SIZES="ios-6.9", CARDS="1 8".
set -euo pipefail
cd "$(dirname "$0")/../.."
IN=assets-raw/bystrzakowo-store/shots
OUT=games/bystrzakowo/store/screens
ART=games/bystrzakowo/public/art
KEY=games/bystrzakowo/store/keyart # tła z Fluxa (JPG + JSON z promptem i seedem)
FONT=tools/store/baloo2-800.ttf # Baloo 2 ExtraBold (czcionka gry, OFL)

# Karta → scena zrzutu, tło i przechylenie zrzutu.
SCENE=("" 1 4 2 7 3 6 8 9)
BG=("" "$KEY/keyart-blocks-11.jpg" "$KEY/keyart-book-21.jpg" "$ART/landscapes/forest.jpg" "$KEY/keyart-village-31.jpg" "$ART/realm-workshop.jpg" "$ART/realm-studio.jpg" "$KEY/keyart-blocks-12.jpg" "$ART/meadow.jpg")
TILT=("" -3 2 -2 2 -2 2 -2 2)
# Postać obok ekranu (store/poses: wskazuje w prawo; po prawej stronie karty odbita, żeby wskazywała ekran) i jej strona.
POSES=games/bystrzakowo/store/poses
CHAR=("" "" lusia-teacher lusia-wow bazyl-curious bazyl-laugh lusia-brush bazyl-wink bazyl-thumbs)
SIDE=("" "" left left right left left right left)
# Cards with a game scene: the game shows the same character in the bottom left corner of the screen.
# The big character stands over that corner and covers it, as if it stepped out of the screen.
COVER=("" "" 1 1 "" 1 1 "" "")

# Hasło | podpis (karty 2–7); hasło | podtytuł | 3 znaczki (karta 1); hasło | 3 znaczki (karta 8).
text() {
  case "$1-$2" in
    pl-1) echo "Mądra zabawa|dla dzieci 3–6 lat|Bez reklam|Działa bez internetu|Lektor czyta polecenia" ;;
    en-1) echo "Smart play|for kids aged 3–6|No ads|Works offline|Every instruction read aloud" ;;
    de-1) echo "Kluges Spielen|für Kinder von 3–6|Ohne Werbung|Funktioniert offline|Alles wird vorgelesen" ;;
    es-1) echo "Juego inteligente|para niños de 3 a 6 años|Sin anuncios|Funciona sin internet|Todo se lee en voz alta" ;;
    pl-2) echo "Pierwsze literki i cyferki|Dziecko pisze palcem, Lusia podpowiada" ;;
    en-2) echo "First letters and numbers|Trace with a finger, Lusia helps" ;;
    de-2) echo "Erste Buchstaben und Zahlen|Mit dem Finger nachspuren, Lusia hilft" ;;
    es-2) echo "Primeras letras y números|Traza con el dedo, Lusia ayuda" ;;
    pl-3) echo "Uczy przez zabawę|Kolory, kształty, liczenie i 18 innych zabaw" ;;
    en-3) echo "Learning through play|Colors, shapes, counting and 18 more games" ;;
    de-3) echo "Lernen durch Spielen|Farben, Formen, Zählen und 18 weitere Spiele" ;;
    es-3) echo "Aprender jugando|Colores, formas, números y 18 juegos más" ;;
    pl-4) echo "Widzisz, czego dziecko się uczy|Postępy na wykresach, dzień po dniu" ;;
    en-4) echo "See what your child is learning|Progress charts, day by day" ;;
    de-4) echo "Sehen, was Ihr Kind lernt|Fortschritte im Diagramm, Tag für Tag" ;;
    es-4) echo "Mira lo que aprende tu hijo|Progreso en gráficos, día a día" ;;
    pl-5) echo "Rośnie razem z dzieckiem|Zadania dopasowują się do umiejętności dziecka" ;;
    en-5) echo "Grows with your child|Tasks get harder as your child improves" ;;
    de-5) echo "Wächst mit Ihrem Kind|Die Aufgaben wachsen mit dem Können" ;;
    es-5) echo "Crece con tu hijo|Las tareas se adaptan a su progreso" ;;
    pl-6) echo "Twórcza zabawa|Kolorowanki i obrazki z naklejek" ;;
    en-6) echo "Creative play|Coloring pages and sticker pictures" ;;
    de-6) echo "Kreatives Spielen|Ausmalbilder und Stickerbilder" ;;
    es-6) echo "Juego creativo|Dibujos para colorear y calcomanías" ;;
    pl-7) echo "Pocztówka z sukcesami|Co tydzień: czego nauczyło się dziecko" ;;
    en-7) echo "A weekly postcard|What your child learned this week" ;;
    de-7) echo "Die Wochenpostkarte|Was Ihr Kind diese Woche gelernt hat" ;;
    es-7) echo "Una postal semanal|Lo que tu hijo aprendió esta semana" ;;
    pl-8) echo "Bezpieczna dla dziecka|Bez reklam i bez zbierania danych|Strefa rodzica za bramką|Działa offline" ;;
    en-8) echo "Safe for your child|No ads, no data collected|Parent zone behind a gate|Works offline" ;;
    de-8) echo "Sicher für Ihr Kind|Ohne Werbung, ohne Datensammeln|Elternbereich gesichert|Funktioniert offline" ;;
    es-8) echo "Seguro para tu hijo|Sin anuncios ni recopilación de datos|Zona de padres protegida|Funciona sin internet" ;;
  esac
}

T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
# Napis w stylu gry: białe wypełnienie, kolorowy kontur, ciemny brzeg.
title() { # tekst wielkość wyjście [wypełnienie] [kontur]
  local fill=${4:-white} st=${5:-'#ff9f40'}
  magick -background none -fill "$fill" -font "$FONT" -pointsize "$2" label:"$1" -bordercolor none -border $(($2 / 5)) "$T/t.png"
  magick "$T/t.png" -alpha extract -morphology Dilate "Disk:$(($2 / 9))" -background "$st" -alpha shape "$T/s.png"
  magick "$T/s.png" -alpha extract -morphology Dilate "Disk:$(($2 / 18))" -background '#5a3c28' -alpha shape "$T/k.png"
  magick "$T/k.png" "$T/s.png" -gravity center -composite "$T/t.png" -gravity center -composite -trim +repage "$3"
}
# Podpis: biały z ciemnym brzegiem (czytelny na każdym tle).
sub() { # tekst wielkość wyjście
  magick -background none -fill white -font "$FONT" -pointsize "$2" label:"$1" -bordercolor none -border $(($2 / 4)) "$T/u.png"
  magick "$T/u.png" -alpha extract -morphology Dilate "Disk:$(($2 / 9))" -background '#5a3c28' -alpha shape "$T/uk.png"
  magick "$T/uk.png" "$T/u.png" -gravity center -composite -trim +repage "$3"
}
# Znaczek z ptaszkiem.
badge() { # tekst wielkość kolor wyjście
  local fs=$2
  magick -background none -fill white -font "$FONT" -pointsize "$fs" label:"$1" -trim +repage "$T/bt.png"
  read -r bw bh < <(magick identify -format "%w %h\n" "$T/bt.png")
  local pw=$((bw + fs * 26 / 10)) ph=$((bh + fs)) c=$fs d=$((fs / 6))
  magick -size ${pw}x$((ph + d)) xc:none -fill '#5a3c28' -draw "roundrectangle 0,$d $((pw - 1)),$((ph + d - 1)) $((ph / 2)),$((ph / 2))" \
    -fill "$3" -draw "roundrectangle 0,0 $((pw - 1)),$((ph - 1)) $((ph / 2)),$((ph / 2))" \
    -fill white -draw "circle $c,$((ph / 2)) $c,$((ph / 2 - fs * 45 / 100))" \
    -stroke "$3" -strokewidth $((fs / 6)) -fill none -draw "polyline $((c - fs / 4)),$((ph / 2)) $((c - fs / 20)),$((ph / 2 + fs / 5)) $((c + fs / 4)),$((ph / 2 - fs / 5))" \
    \( "$T/bt.png" \) -gravity west -geometry +$((fs * 18 / 10))-$((fs / 15)) -composite "$4"
}
# Zrzut w ramce z cieniem, lekko przechylony. FRAME: device (grafitowa obudowa), none (same zaokrąglone rogi),
# clay (ciemnobrązowa ramka w kolorze konturów gry), white (dawna biała).
framed() { # wejście maxW maxH wyjście kąt
  local style=${FRAME:-device}
  magick "$1" -resize "${2}x${3}" "$T/sh.png"
  read -r sw sh < <(magick identify -format "%w %h\n" "$T/sh.png")
  local r=$((sh / 14)) b col
  case $style in
    device) b=$((sh / 26 + 2)); col='#1f2128' ;;
    clay) b=$((sh / 30 + 2)); col='#5a3c28' ;;
    white) b=$((sh / 40 + 2)); col='#ffffff' ;;
    *) b=0; col='none' ;;
  esac
  magick "$T/sh.png" \( +clone -alpha extract -fill black -colorize 100 -fill white -draw "roundrectangle 0,0 $((sw - 1)),$((sh - 1)) $r,$r" \) -alpha off -compose CopyOpacity -composite "$T/rd.png"
  if [ "$b" -gt 0 ]; then
    local W2=$((sw + 2 * b)) H2=$((sh + 2 * b))
    magick -size ${W2}x$H2 xc:none -fill "$col" -draw "roundrectangle 0,0 $((W2 - 1)),$((H2 - 1)) $((r + b)),$((r + b))" "$T/bz.png"
    if [ "$style" = device ]; then # cienka jaśniejsza krawędź obudowy
      local q=$((b / 4))
      magick "$T/bz.png" -fill none -stroke '#4a4d57' -strokewidth $((b / 6 + 1)) -draw "roundrectangle $q,$q $((W2 - 1 - q)),$((H2 - 1 - q)) $((r + b - q)),$((r + b - q))" "$T/bz.png"
    fi
    magick "$T/bz.png" "$T/rd.png" -geometry +$b+$b -composite -background none -rotate "$5" +repage "$T/fr.png"
  else
    magick "$T/rd.png" -background none -rotate "$5" +repage "$T/fr.png"
  fi
  magick "$T/fr.png" \( +clone -background black -shadow 55x$((sh / 40))+0+$((sh / 50)) \) +swap -background none -layers merge +repage "$4"
}
# Postać z pliku pozy, wysokość h; strona right = odbicie (wskazuje w lewo, w stronę ekranu).
pose() { # nazwa strona h wyjście
  magick "$POSES/$1.png" -trim +repage -resize x$3 $([ "$2" = right ] && echo -flop) "$4"
}
fit() { # obraz maxW: zmniejsz, gdy szerszy (brak pliku: nic nie rób)
  [ -f "$1" ] || return 0
  local w; w=$(magick identify -format %w "$1")
  if [ "$w" -gt "$2" ]; then magick "$1" -resize "${2}x" "$1"; fi
}
hgt() { magick identify -format %h "$1"; }
# x of the character's left edge so that its feet stand over the in-game character
# (rel % of the screenshot width: 10 = bottom left corner, 90 = bottom right corner on the world map).
over() { # character screen_x screen_w [rel]
  local sw fx fwid; sw=$(magick identify -format %w "$T/sh.png")
  read -r fwid fx < <(magick "$1" -gravity south -crop 100%x5%+0+0 +repage -alpha extract -format "%@" info: | sed -E 's/^([0-9]+)x[0-9]+\+([0-9]+)\+.*/\1 \2/')
  echo $(($2 + $3 / 2 + sw * (${4:-10} - 50) / 100 - fx - fwid / 2))
}

card() { # n lang W H raw out
  local n=$1 lang=$2 W=$3 H=$4 raw=$5 out=$6 wide=1
  rm -f "$T/h2.png" # karta 8 nie ma podpisu: bez resztek po poprzedniej karcie
  [ $((W * 10 / H)) -lt 16 ] && wide=0
  IFS='|' read -r h1 h2 x1 x2 x3 <<<"$(text "$lang" "$n")"
  local u=$H; [ $wide = 0 ] && u=$((W * 1320 / 2868)) # jednostka: wysokość karty iPhone'a o tej szerokości
  magick "${BG[$n]}" -resize "${W}x${H}^" -gravity center -extent "${W}x${H}" "$T/bg.png"
  local shot=$raw
  if [ "$n" = 1 ]; then
    # Okładka: środek ekranu świata (kafelki), bo Lusia i Bazyl stoją obok.
    read -r rw rh < <(magick identify -format "%w %h\n" "$raw")
    # Ile szerokości zostawić: ekran świata na węższym telefonie ma kafelki bliżej krawędzi.
    local keep=$((100 - (W * 100 / H - 100) * 27 / 100)); [ $wide = 0 ] && keep=100 # iPad: kafelki na całą szerokość, postaci ledwo wystają
    magick "$raw" -crop $((rw * keep / 100))x$rh+$((rw * (100 - keep) / 200))+0 +repage "$T/crop.png"
    shot=$T/crop.png
  fi
  if [ "$n" = 1 ] || [ "$n" = 8 ]; then
    title "$h1" $((u * 15 / 100)) "$T/h1.png"
    local bs=$((u * 44 / 1000)) b1=$h2 b2=$x1 b3=$x2
    if [ "$n" = 1 ]; then title "$h2" $((u * 10 / 100)) "$T/h2.png" white '#7ac943'; b1=$x1 b2=$x2 b3=$x3; fi
    badge "$b1" $bs '#ff8f3f' "$T/b1.png"; badge "$b2" $bs '#4fa9e8' "$T/b2.png"; badge "$b3" $bs '#9b7be0' "$T/b3.png"
  else
    title "$h1" $((u * 11 / 100)) "$T/h1.png"
    sub "$h2" $((u * 58 / 1000)) "$T/h2.png"
  fi
  local ch=50; [ $wide = 1 ] && [ $((W * 10 / H)) -lt 20 ] && ch=42 # węższy ekran (Android 16:9): mniejsze postaci
  magick "$ART/lusia.webp" -trim +repage -resize x$((u * ch / 100)) "$T/lusia.png"
  magick "$ART/bazyl.webp" -trim +repage -resize x$((u * (ch - 4) / 100)) "$T/bazyl.png"
  # Okładka: Lusia i Bazyl wskazują ekran z obu stron; karta 8: Bazyl z kciukiem w górę (iPad: obok Lusia).
  if [ "$n" = 1 ]; then
    pose lusia-point left $((u * ch / 100)) "$T/lusia.png"; pose bazyl-point right $((u * (ch - 4) / 100)) "$T/bazyl.png"
  elif [ "$n" = 8 ]; then
    pose bazyl-thumbs left $((u * ch / 100)) "$T/lusia.png"; pose lusia-teacher right $((u * (ch - 4) / 100)) "$T/bazyl.png"
  fi
  local m=$((u * 9 / 100))
  if [ $wide = 1 ]; then
    case $n in
      1)
        # Duży ekran gry po prawej; hasło i znaczki w kolumnie po lewej; Lusia i Bazyl wyglądają zza ekranu.
        fit "$T/h1.png" $((W * 40 / 100)); fit "$T/h2.png" $((W * 40 / 100))
        framed "$shot" $((W * 56 / 100)) $((H * 72 / 100)) "$T/f.png" "${TILT[$n]}"
        local fw; fw=$(magick identify -format %w "$T/f.png")
        local fx=$((W - W * 3 / 100 - fw)) # lewa krawędź ekranu
        magick "$T/lusia.png" -resize 112% "$T/lusia.png"
        local lw bw lx; lw=$(magick identify -format %w "$T/lusia.png")
        bw=$(magick identify -format "%w\n" "$T/b1.png" "$T/b2.png" "$T/b3.png" | sort -n | tail -1)
        lx=$((fx - lw * 62 / 100)); [ $lx -lt $((m + bw)) ] && lx=$((m + bw)) # never over the badges
        magick "$T/bg.png" "$T/f.png" -gravity northwest -geometry +$fx+$((H - $(hgt "$T/f.png") - u * 4 / 100)) -composite \
          "$T/h1.png" -gravity northwest -geometry +$m+$((u * 5 / 100)) -composite \
          "$T/h2.png" -gravity northwest -geometry +$((m + u / 100))+$((u * 23 / 100)) -composite \
          "$T/b1.png" -gravity northwest -geometry +$m+$((u * 40 / 100)) -composite \
          "$T/b2.png" -gravity northwest -geometry +$m+$((u * 51 / 100)) -composite \
          "$T/b3.png" -gravity northwest -geometry +$m+$((u * 62 / 100)) -composite \
          "$T/lusia.png" -gravity southwest -geometry +$lx-$((u * 2 / 100)) -composite \
          \( "$T/bazyl.png" -resize 108% \) -gravity southeast -geometry -$((W * 2 / 100))-$((u * 2 / 100)) -composite "$T/c.png" ;;
      8)
        fit "$T/h1.png" $((W * 45 / 100))
        # Long badges (Spanish, German) push the screen and Bazyl to the right.
        local bw sw8 bx; bw=$(magick identify -format "%w\n" "$T/b1.png" "$T/b2.png" "$T/b3.png" | sort -n | tail -1)
        sw8=$((W - m - bw - W * 6 / 100)); [ $sw8 -gt $((W * 58 / 100)) ] && sw8=$((W * 58 / 100))
        # Bazyl's head is level with the two lower badges, so only they push him.
        bx=$(magick identify -format "%w\n" "$T/b2.png" "$T/b3.png" | sort -n | tail -1); bx=$((m + bx + W / 100))
        [ $bx -lt $((W * 25 / 100)) ] && bx=$((W * 25 / 100))
        framed "$shot" $sw8 $((H * 74 / 100)) "$T/f.png" "${TILT[$n]}"
        magick "$T/bg.png" "$T/f.png" -gravity east -geometry +$((W * 3 / 100))+$((u * 4 / 100)) -composite \
          "$T/h1.png" -gravity northwest -geometry +$m+$((u * 7 / 100)) -composite \
          "$T/b1.png" -gravity northwest -geometry +$m+$((u * 30 / 100)) -composite \
          "$T/b2.png" -gravity northwest -geometry +$m+$((u * 42 / 100)) -composite \
          "$T/b3.png" -gravity northwest -geometry +$m+$((u * 54 / 100)) -composite \
          \( "$T/lusia.png" -resize 112% \) -gravity southwest -geometry +$bx-$((u * 2 / 100)) -composite "$T/c.png" ;;
      *)
        # Ekran przy jednej krawędzi, po drugiej stronie postać, która na niego wskazuje (lekko na niego nachodzi).
        fit "$T/h1.png" $((W * 92 / 100)); fit "$T/h2.png" $((W * 92 / 100))
        if [ -n "${COVER[$n]}" ]; then
          framed "$shot" $((W * 70 / 100)) $((H * 68 / 100)) "$T/f.png" "${TILT[$n]}"
          pose "${CHAR[$n]}" left $((H * 80 / 100)) "$T/ch.png"
          local fw fh fx fy cx; read -r fw fh < <(magick identify -format "%w %h\n" "$T/f.png")
          fx=$((W - W * 2 / 100 - fw)); fy=$(((H - fh) / 2 + u * 9 / 100)); cx=$(over "$T/ch.png" $fx $fw)
          magick "$T/bg.png" "$T/f.png" -gravity northwest -geometry +$fx+$fy -composite \
            "$T/ch.png" -geometry "$(printf '%+d%+d' $cx $((H - $(hgt "$T/ch.png") + u * 2 / 100)))" -composite \
            "$T/h1.png" -gravity north -geometry +0+$((u * 3 / 100)) -composite \
            "$T/h2.png" -gravity north -geometry +0+$((u * 155 / 1000)) -composite "$T/c.png"
          magick "$T/c.png" -alpha off -strip -quality 90 "$out"; return
        fi
        framed "$shot" $((W * 65 / 100)) $((H * 66 / 100)) "$T/f.png" "${TILT[$n]}"
        pose "${CHAR[$n]}" "${SIDE[$n]}" $((H * 74 / 100)) "$T/ch.png"
        local fg=east cg=southwest; [ "${SIDE[$n]}" = right ] && fg=west cg=southeast
        magick "$T/bg.png" "$T/f.png" -gravity $fg -geometry +$((W * 2 / 100))+$((u * 9 / 100)) -composite \
          "$T/ch.png" -gravity $cg -geometry +$((W * 1 / 100))-$((u * 2 / 100)) -composite \
          "$T/h1.png" -gravity north -geometry +0+$((u * 3 / 100)) -composite \
          "$T/h2.png" -gravity north -geometry +0+$((u * 155 / 1000)) -composite "$T/c.png" ;;
    esac
  else
    # iPad (4:3): wszystko w kolumnie, wyśrodkowane.
    fit "$T/h1.png" $((W * 90 / 100)); fit "$T/h2.png" $((W * 90 / 100))
    local top=$((H * 3 / 100))
    case $n in
      1 | 8)
        magick "$T/b1.png" "$T/b2.png" "$T/b3.png" -background none +smush $((u * 3 / 100)) "$T/badges.png"; fit "$T/badges.png" $((W * 92 / 100))
        local y2=$((top + $(hgt "$T/h1.png") + u * 2 / 100)) y3
        if [ "$n" = 1 ]; then y3=$((y2 + $(hgt "$T/h2.png") + u * 3 / 100)); else y3=$y2; magick -size 1x1 xc:none "$T/h2.png"; fi
        # Ekran gry wypełnia miejsce pod znaczkami (pełny zrzut, bez przycinania).
        local room=$((H - y3 - $(hgt "$T/badges.png") - H * 8 / 100 - W * 6 / 100)) # minus zapas na przechylenie i cień
        framed "$shot" $((W * 86 / 100)) $room "$T/f.png" "${TILT[$n]}"
        # Card 1 (world map) and card 8 (adult gate over the map): the shots have no in-game guides
        # (bystrzakowo-shots.sh hides them), so the two characters stand at the card edges and only slightly overlap the screen.
        magick "$T/lusia.png" -resize x$((H * 47 / 100)) "$T/lusia.png"; magick "$T/bazyl.png" -resize x$((H * 43 / 100)) "$T/bazyl.png"
        local lx=$((-W * 4 / 100)) bx=$((-W * 3 / 100))
        [ "$n" = 8 ] && lx=$((W / 100)) bx=$((W / 100)) # Bazyl's thumb and Lusia's tail stay on the card
        magick "$T/bg.png" "$T/h1.png" -gravity north -geometry +0+$top -composite \
          "$T/h2.png" -gravity north -geometry +0+$y2 -composite \
          "$T/f.png" -gravity south -geometry +0+$((H * 3 / 100)) -composite \
          "$T/badges.png" -gravity north -geometry +0+$y3 -composite \
          "$T/lusia.png" -gravity southwest -geometry "$(printf '%+d' $lx)-$((u * 2 / 100))" -composite \
          "$T/bazyl.png" -gravity southeast -geometry "$(printf '%+d' $bx)-$((u * 2 / 100))" -composite "$T/c.png" ;;
      *)
        framed "$shot" $((W * 88 / 100)) $((H * 66 / 100)) "$T/f.png" "${TILT[$n]}"
        if [ -n "${COVER[$n]}" ]; then
          pose "${CHAR[$n]}" left $((H * 56 / 100)) "$T/ch.png"
          local fw fh fx fy cx; read -r fw fh < <(magick identify -format "%w %h\n" "$T/f.png")
          fx=$(((W - fw) / 2)); fy=$((H - H * 4 / 100 - fh)); cx=$(over "$T/ch.png" $fx $fw)
          magick "$T/bg.png" "$T/f.png" -gravity northwest -geometry +$fx+$fy -composite \
            "$T/ch.png" -geometry "$(printf '%+d%+d' $cx $((H - $(hgt "$T/ch.png") + u * 2 / 100)))" -composite \
            "$T/h1.png" -gravity north -geometry +0+$top -composite \
            "$T/h2.png" -gravity north -geometry +0+$((top + $(hgt "$T/h1.png") + u / 100)) -composite "$T/c.png"
          magick "$T/c.png" -alpha off -strip -quality 90 "$out"; return
        fi
        pose "${CHAR[$n]}" "${SIDE[$n]}" $((H * 46 / 100)) "$T/ch.png"
        local cg=southwest; [ "${SIDE[$n]}" = right ] && cg=southeast
        magick "$T/bg.png" "$T/f.png" -gravity south -geometry +0+$((H * 4 / 100)) -composite \
          "$T/ch.png" -gravity $cg -geometry +$((W * 1 / 100))-$((u * 2 / 100)) -composite \
          "$T/h1.png" -gravity north -geometry +0+$top -composite \
          "$T/h2.png" -gravity north -geometry +0+$((top + $(hgt "$T/h1.png") + u / 100)) -composite "$T/c.png" ;;
    esac
  fi
  magick "$T/c.png" -alpha off -strip -quality 90 "$out"
}

for dir in "$IN"/*; do
  [ -d "$dir" ] || continue
  set_name=$(basename "$dir"); lang=${set_name##*-}; size=${set_name%-*}
  case " ${LANGS:-pl en de es} " in *" $lang "*) ;; *) continue ;; esac
  case " ${SIZES:-ios-6.9 ipad-13 android} " in *" $size "*) ;; *) continue ;; esac
  case $size in ios-6.9) W=2868 H=1320 ;; ipad-13) W=2752 H=2064 ;; android) W=1920 H=1080 ;; *) continue ;; esac
  mkdir -p "$OUT/$set_name"
  for n in ${CARDS:-1 2 3 4 5 6 7 8}; do
    raw="$dir/${SCENE[$n]}.png"
    [ -f "$raw" ] || { echo "brak zrzutu: $raw"; continue; }
    card "$n" "$lang" $W $H "$raw" "$OUT/$set_name/$n.jpg"
  done
  echo "$set_name: $(ls "$OUT/$set_name" | wc -l | tr -d ' ') kart"
done
