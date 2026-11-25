#!/usr/bin/env bash
# Karty Bystrzakowa do sklepów, pisane dla rodzica: hasło z korzyścią, podpis, zrzut gry w ramce.
# Karta 1 (okładka): tło z Fluxa (store/keyart), znaczki zaufania, Lusia i Bazyl.
# Karta 2: cztery krainy w siatce 2×2 (zrzuty 1, 10, 11, 12).
# Karta 8: „Dziecko gra samo”: Bazyl wychodzi z zagadki i czyta polecenie (dymek), znaczki zaufania.
# Wejście: assets-raw/bystrzakowo-store/shots/<rozmiar>-<lang>/<scena>.png (bystrzakowo-shots.sh, z ?nohand)
# Wyjście: games/bystrzakowo/store/screens/<rozmiar>-<lang>/<n>.jpg
# Zawężanie: LANGS="pl en", SIZES="ios-6.9", CARDS="1 8".
set -euo pipefail
cd "$(dirname "$0")/../.."
export MAGICK_THREAD_LIMIT=1
IN=assets-raw/bystrzakowo-store/shots
OUT=games/bystrzakowo/store/screens
ART=games/bystrzakowo/public/art
KEY=games/bystrzakowo/store/keyart # tła z Fluxa (JPG + JSON z promptem i seedem)
FONT=tools/store/baloo2-800.ttf # Baloo 2 ExtraBold (czcionka gry, OFL)

# Karta → scena zrzutu, tło i przechylenie zrzutu.
# Karta 2 (4 krainy) składa się ze scen 1, 10, 11 i 12 (mapa każdej krainy).
SCENE=("" 1 1 4 2 7 3 6 9)
BG=("" "$KEY/keyart-blocks-11.jpg" "$KEY/keyart-village-31.jpg" "$KEY/keyart-book-21.jpg" "$ART/landscapes/forest.jpg" "$KEY/keyart-blocks-12.jpg" "$ART/realm-workshop.jpg" "$ART/realm-studio.jpg" "$ART/meadow.jpg")
TILT=("" -3 0 2 -2 2 -2 2 2)
# Postać obok ekranu (store/poses: wskazuje w prawo; po prawej stronie karty odbita, żeby wskazywała ekran) i jej strona.
POSES=games/bystrzakowo/store/poses
CHAR=("" "" "" lusia-teacher lusia-point bazyl-curious bazyl-laugh lusia-brush "")
SIDE=("" "" "" left left right left left "")
# Cards with a game scene: the game shows the same character in the bottom left corner of the screen.
# The big character stands over that corner and covers it, as if it stepped out of the screen.
COVER=("" "" "" 1 1 "" 1 1 "")

# Hasło | podpis (karty 2–7); hasło | podtytuł | 3 znaczki (karta 1); hasło | podpis | dymek lektora | 3 znaczki (karta 8).
text() {
  case "$1-$2" in
    pl-1) echo "Mądra zabawa|dla dzieci 3–6 lat|Bez reklam|Działa bez internetu|Lektor czyta polecenia" ;;
    en-1) echo "Smart play|for kids aged 3–6|No ads|Works offline|Every instruction read aloud" ;;
    de-1) echo "Kluges Spielen|für Kinder von 3–6|Ohne Werbung|Funktioniert offline|Alles wird vorgelesen" ;;
    es-1) echo "Juego inteligente|para niños de 3 a 6 años|Sin anuncios|Funciona sin internet|Todo se lee en voz alta" ;;
    pl-2) echo "4 krainy, 21 zabaw|Zagadki, układanki, rysowanie i kolorowanki" ;;
    en-2) echo "4 lands, 21 games|Puzzles, sorting, tracing and coloring" ;;
    de-2) echo "4 Länder, 21 Spiele|Rätsel, Sortieren, Nachspuren und Ausmalen" ;;
    es-2) echo "4 mundos, 21 juegos|Acertijos, clasificar, trazar y colorear" ;;
    pl-3) echo "Pierwsze literki i cyferki|Dziecko pisze palcem, Lusia podpowiada" ;;
    en-3) echo "First letters and numbers|Trace with a finger, Lusia helps" ;;
    de-3) echo "Erste Buchstaben und Zahlen|Mit dem Finger nachspuren, Lusia hilft" ;;
    es-3) echo "Primeras letras y números|Traza con el dedo, Lusia ayuda" ;;
    pl-4) echo "Uczy przez zabawę|Kolory, kształty, liczenie i 18 innych zabaw" ;;
    en-4) echo "Learning through play|Colors, shapes, counting and 18 more games" ;;
    de-4) echo "Lernen durch Spielen|Farben, Formen, Zählen und 18 weitere Spiele" ;;
    es-4) echo "Aprender jugando|Colores, formas, números y 18 juegos más" ;;
    pl-5) echo "Widzisz, czego dziecko się uczy|Postępy na wykresach, dzień po dniu" ;;
    en-5) echo "See what your child is learning|Progress charts, day by day" ;;
    de-5) echo "Sehen, was Ihr Kind lernt|Fortschritte im Diagramm, Tag für Tag" ;;
    es-5) echo "Mira lo que aprende tu hijo|Progreso en gráficos, día a día" ;;
    pl-6) echo "Rośnie razem z dzieckiem|Zadania dopasowują się do umiejętności dziecka" ;;
    en-6) echo "Grows with your child|Tasks get harder as your child improves" ;;
    de-6) echo "Wächst mit Ihrem Kind|Die Aufgaben wachsen mit dem Können" ;;
    es-6) echo "Crece con tu hijo|Las tareas se adaptan a su progreso" ;;
    pl-7) echo "Twórcza zabawa|Kolorowanki i obrazki z naklejek" ;;
    en-7) echo "Creative play|Coloring pages and sticker pictures" ;;
    de-7) echo "Kreatives Spielen|Ausmalbilder und Stickerbilder" ;;
    es-7) echo "Juego creativo|Dibujos para colorear y calcomanías" ;;
    pl-8) echo "Dziecko gra samo, Ty masz spokój|Lektor czyta każde polecenie, nie trzeba umieć czytać|Gdzie jest mama cielaczka?|Bez reklam|Bez zbierania danych|Działa offline" ;;
    en-8) echo "They play on their own, you get a break|Every instruction is read aloud, no reading needed|Where is the calf's mommy?|No ads|No data collected|Works offline" ;;
    de-8) echo "Ihr Kind spielt allein, Sie haben Ruhe|Alle Anweisungen werden vorgelesen, Lesen nicht nötig|Wo ist die Mama vom Kälbchen?|Ohne Werbung|Keine Datensammlung|Funktioniert offline" ;;
    es-8) echo "Tu hijo juega solo y tú descansas|Todas las instrucciones se leen en voz alta|¿Dónde está la mamá del ternero?|Sin anuncios|Sin recopilar datos|Funciona sin internet" ;;
  esac
}

T="" # katalog roboczy: osobny dla każdego zestawu (zestawy liczą się równolegle)
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
# Dymek z poleceniem lektora: biały, brązowy brzeg jak w grze, ogonek w prawo (do ust postaci) albo w dół.
bubble() { # tekst wielkość maxW ogonek(right|down) wyjście
  local fs=$2
  magick -background none -fill '#5a3c28' -font "$FONT" -pointsize "$fs" -interline-spacing $((-fs * 35 / 100)) -gravity center -size "$(($3 - fs * 2))x" caption:"$1" -trim +repage "$T/bq.png"
  read -r qw qh < <(magick identify -format "%w %h\n" "$T/bq.png")
  local pw=$((qw + fs * 2)) ph=$((qh + fs * 3 / 2)) t=$((fs * 3 / 2)) o=$((fs / 7 + 3)) cw ch poly
  if [ "$4" = right ]; then cw=$((pw + t)); ch=$ph; poly="$((pw - fs)),$((ph * 40 / 100)) $((pw + t)),$((ph * 58 / 100)) $((pw - fs)),$((ph * 78 / 100))"
  else cw=$pw; ch=$((ph + t)); poly="$((pw * 22 / 100)),$((ph - fs)) $((pw * 14 / 100)),$((ph + t)) $((pw * 44 / 100)),$((ph - fs))"; fi
  # Shape mask (rounded body + tail), then a brown outline around it and the text on top.
  magick -size $((cw + 2 * o))x$((ch + 2 * o)) xc:none -fill white -draw "translate $o,$o roundrectangle 0,0 $((pw - 1)),$((ph - 1)) $fs,$fs" -draw "translate $o,$o polygon $poly" "$T/bm.png"
  magick "$T/bm.png" -alpha extract -morphology Dilate "Disk:$o" -background '#5a3c28' -alpha shape "$T/bo.png"
  magick "$T/bo.png" "$T/bm.png" -composite "$T/bq.png" -gravity northwest -geometry +$((o + fs))+$((o + fs * 3 / 4)) -composite "$5"
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

# Karta 2 „4 krainy”: mapy czterech krain w siatce 2×2, lekko przechylone jak zdjęcia na stole; Lusia i Bazyl po bokach.
card2() { # lang W H wide u katalog_zrzutów wyjście
  local lang=$1 W=$2 H=$3 wide=$4 u=$5 dir=$6 out=$7
  IFS='|' read -r h1 h2 <<<"$(text "$lang" 2)"
  local top=$((u * 3 / 100)) y2 sb gap=$((u * 3 / 100)) cw rh hc i=0 gw gh
  title "$h1" $((u * 11 / 100)) "$T/h1.png"; sub "$h2" $((u * 58 / 1000)) "$T/h2.png"
  fit "$T/h1.png" $((W * 92 / 100)); fit "$T/h2.png" $((W * 92 / 100))
  y2=$((top + $(hgt "$T/h1.png") + u / 100)); sb=$((y2 + $(hgt "$T/h2.png")))
  if [ $wide = 1 ]; then cw=$((W * 33 / 100)); hc=$((H * 60 / 100)); else cw=$((W * 43 / 100)); hc=$((H * 31 / 100)); fi
  rh=$(((H - sb - gap * 3) / 2))
  local tilts=(-3 2 2 -2) xs=() ys=()
  for sc in 1 10 11 12; do
    framed "$dir/$sc.png" $cw $((rh - gap)) "$T/g$i.png" "${tilts[$i]}"
    read -r gw gh < <(magick identify -format "%w %h\n" "$T/g$i.png")
    # Cell centres: two columns around the middle, two rows under the subtitle.
    local ccx=$((W / 2 + (i % 2 == 0 ? -1 : 1) * (cw / 2 + gap))) ccy=$((sb + gap + rh / 2 + (i / 2) * (rh + gap / 2)))
    xs+=($((ccx - gw / 2))); ys+=($((ccy - gh / 2)))
    i=$((i + 1))
  done
  pose lusia-wow left $hc "$T/l.png"; pose bazyl-thumbs left $((hc * 92 / 100)) "$T/b.png"
  magick "$T/bg.png" \
    "$T/g0.png" -gravity northwest -geometry +${xs[0]}+${ys[0]} -composite \
    "$T/g1.png" -geometry +${xs[1]}+${ys[1]} -composite \
    "$T/g2.png" -geometry +${xs[2]}+${ys[2]} -composite \
    "$T/g3.png" -geometry +${xs[3]}+${ys[3]} -composite \
    "$T/l.png" -gravity southwest -geometry +$((W / 100))-$((u * 2 / 100)) -composite \
    "$T/b.png" -gravity southeast -geometry +$((W / 100))-$((u * 2 / 100)) -composite \
    "$T/h1.png" -gravity north -geometry +0+$top -composite \
    "$T/h2.png" -gravity north -geometry +0+$y2 -composite "$T/c.png"
  magick "$T/c.png" -alpha off -strip -quality 90 "$out"
}

# Karta 8 „Dziecko gra samo”: zagadka, z której wychodzi Bazyl i czyta polecenie (dymek), znaczki zaufania.
card8() { # lang W H wide u shot out
  local lang=$1 W=$2 H=$3 wide=$4 u=$5 shot=$6 out=$7 q b1 b2 b3
  IFS='|' read -r h1 h2 q b1 b2 b3 <<<"$(text "$lang" 8)"
  local m=$((u * 7 / 100)) bs=$((u * 40 / 1000)) top=$((u * 3 / 100)) y2 sb fw fh fx fy cx cy cw ch qw qh qx qy fs
  title "$h1" $((u * 11 / 100)) "$T/h1.png"; sub "$h2" $((u * 58 / 1000)) "$T/h2.png"
  fit "$T/h1.png" $((W * 92 / 100)); fit "$T/h2.png" $((W * 92 / 100))
  badge "$b1" $bs '#ff8f3f' "$T/b1.png"; badge "$b2" $bs '#4fa9e8' "$T/b2.png"; badge "$b3" $bs '#9b7be0' "$T/b3.png"
  y2=$((top + $(hgt "$T/h1.png") + u / 100)); sb=$((y2 + $(hgt "$T/h2.png")))
  fs=$((u * 52 / 1000))
  if [ $wide = 1 ]; then
    # Ekran po prawej, Bazyl wychodzi z jego lewego dolnego rogu, dymek obok jego głowy, znaczki w kolumnie po lewej.
    framed "$shot" $((W * 62 / 100)) $((H - sb - u * 5 / 100)) "$T/f.png" 2
    read -r fw fh < <(magick identify -format "%w %h\n" "$T/f.png")
    fx=$((W - W * 2 / 100 - fw)); fy=$((sb + u * 3 / 100))
    pose bazyl-point left $((H * 72 / 100)) "$T/ch.png"
  else
    # iPad: znaczki w rzędzie pod podpisem, ekran pod nimi, Bazyl w lewym dolnym rogu, dymek nad jego głową.
    magick "$T/b1.png" "$T/b2.png" "$T/b3.png" -background none +smush $((u * 3 / 100)) "$T/badges.png"; fit "$T/badges.png" $((W * 92 / 100))
    local yb=$((sb + u * 2 / 100)); local ft=$((yb + $(hgt "$T/badges.png") + u * 3 / 100))
    framed "$shot" $((W * 88 / 100)) $((H - ft - H * 5 / 100 - W * 6 / 100)) "$T/f.png" 2 # minus zapas na ramkę, przechylenie i cień
    read -r fw fh < <(magick identify -format "%w %h\n" "$T/f.png")
    fx=$(((W - fw) / 2)); fy=$((H - H * 4 / 100 - fh))
    pose bazyl-point left $((H * 48 / 100)) "$T/ch.png"
  fi
  read -r cw ch < <(magick identify -format "%w %h\n" "$T/ch.png")
  cx=$(over "$T/ch.png" $fx $fw); cy=$((H - ch + u * 2 / 100))
  if [ $wide = 1 ]; then
    local mx=$((cx + cw * 14 / 100)) my=$((cy + ch * 24 / 100)) maxw # just left of Bazyl's face
    maxw=$((mx - m)); [ $maxw -gt $((W * 26 / 100)) ] && maxw=$((W * 26 / 100))
    bubble "$q" $fs $maxw right "$T/bub.png"
    read -r qw qh < <(magick identify -format "%w %h\n" "$T/bub.png")
    qx=$((mx - qw)); qy=$((my - qh * 58 / 100))
    local by=$((H - u * 8 / 100 - $(hgt "$T/b3.png")))
    magick "$T/bg.png" "$T/f.png" -gravity northwest -geometry +$fx+$fy -composite \
      "$T/ch.png" -geometry "$(printf '%+d%+d' $cx $cy)" -composite \
      "$T/bub.png" -geometry "$(printf '%+d%+d' $qx $qy)" -composite \
      "$T/b1.png" -geometry +$m+$((by - u * 20 / 100)) -composite \
      "$T/b2.png" -geometry +$m+$((by - u * 10 / 100)) -composite \
      "$T/b3.png" -geometry +$m+$by -composite \
      "$T/h1.png" -gravity north -geometry +0+$top -composite \
      "$T/h2.png" -gravity north -geometry +0+$y2 -composite "$T/c.png"
  else
    bubble "$q" $fs $((W * 36 / 100)) down "$T/bub.png"
    read -r qw qh < <(magick identify -format "%w %h\n" "$T/bub.png")
    qx=$((cx + cw * 36 / 100 - qw * 14 / 100)); qy=$((cy - qh + ch * 2 / 100))
    magick "$T/bg.png" "$T/f.png" -gravity northwest -geometry +$fx+$fy -composite \
      "$T/ch.png" -geometry "$(printf '%+d%+d' $cx $cy)" -composite \
      "$T/bub.png" -geometry "$(printf '%+d%+d' $qx $qy)" -composite \
      "$T/h1.png" -gravity north -geometry +0+$top -composite \
      "$T/h2.png" -gravity north -geometry +0+$y2 -composite \
      "$T/badges.png" -gravity north -geometry +0+$yb -composite "$T/c.png"
  fi
  magick "$T/c.png" -alpha off -strip -quality 90 "$out"
}

card() { # n lang W H raw out
  local n=$1 lang=$2 W=$3 H=$4 raw=$5 out=$6 wide=1
  [ $((W * 10 / H)) -lt 16 ] && wide=0
  IFS='|' read -r h1 h2 x1 x2 x3 <<<"$(text "$lang" "$n")"
  local u=$H; [ $wide = 0 ] && u=$((W * 1320 / 2868)) # jednostka: wysokość karty iPhone'a o tej szerokości
  magick "${BG[$n]}" -resize "${W}x${H}^" -gravity center -extent "${W}x${H}" "$T/bg.png"
  if [ "$n" = 2 ]; then card2 "$lang" $W $H $wide $u "$(dirname "$raw")" "$out"; return; fi
  if [ "$n" = 8 ]; then card8 "$lang" $W $H $wide $u "$raw" "$out"; return; fi
  local shot=$raw
  if [ "$n" = 1 ]; then
    # Okładka: środek ekranu świata (kafelki), bo Lusia i Bazyl stoją obok.
    read -r rw rh < <(magick identify -format "%w %h\n" "$raw")
    # Ile szerokości zostawić: ekran świata na węższym telefonie ma kafelki bliżej krawędzi.
    local keep=$((100 - (W * 100 / H - 100) * 27 / 100)); [ $wide = 0 ] && keep=100 # iPad: kafelki na całą szerokość, postaci ledwo wystają
    magick "$raw" -crop $((rw * keep / 100))x$rh+$((rw * (100 - keep) / 200))+0 +repage "$T/crop.png"
    shot=$T/crop.png
  fi
  if [ "$n" = 1 ]; then
    title "$h1" $((u * 15 / 100)) "$T/h1.png"
    local bs=$((u * 44 / 1000)) b1=$x1 b2=$x2 b3=$x3
    title "$h2" $((u * 10 / 100)) "$T/h2.png" white '#7ac943'
    badge "$b1" $bs '#ff8f3f' "$T/b1.png"; badge "$b2" $bs '#4fa9e8' "$T/b2.png"; badge "$b3" $bs '#9b7be0' "$T/b3.png"
  else
    title "$h1" $((u * 11 / 100)) "$T/h1.png"
    sub "$h2" $((u * 58 / 1000)) "$T/h2.png"
  fi
  local ch=50; [ $wide = 1 ] && [ $((W * 10 / H)) -lt 20 ] && ch=42 # węższy ekran (Android 16:9): mniejsze postaci
  magick "$ART/lusia.webp" -trim +repage -resize x$((u * ch / 100)) "$T/lusia.png"
  magick "$ART/bazyl.webp" -trim +repage -resize x$((u * (ch - 4) / 100)) "$T/bazyl.png"
  # Okładka: Lusia i Bazyl wskazują ekran z obu stron.
  if [ "$n" = 1 ]; then
    pose lusia-point left $((u * ch / 100)) "$T/lusia.png"; pose bazyl-point right $((u * (ch - 4) / 100)) "$T/bazyl.png"
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
      1)
        magick "$T/b1.png" "$T/b2.png" "$T/b3.png" -background none +smush $((u * 3 / 100)) "$T/badges.png"; fit "$T/badges.png" $((W * 92 / 100))
        local y2=$((top + $(hgt "$T/h1.png") + u * 2 / 100)) y3
        y3=$((y2 + $(hgt "$T/h2.png") + u * 3 / 100))
        # Ekran gry wypełnia miejsce pod znaczkami (pełny zrzut, bez przycinania).
        local room=$((H - y3 - $(hgt "$T/badges.png") - H * 8 / 100 - W * 6 / 100)) # minus zapas na przechylenie i cień
        framed "$shot" $((W * 86 / 100)) $room "$T/f.png" "${TILT[$n]}"
        # The world map shot has no in-game guides (bystrzakowo-shots.sh hides them),
        # so the two characters stand at the card edges and only slightly overlap the screen.
        magick "$T/lusia.png" -resize x$((H * 47 / 100)) "$T/lusia.png"; magick "$T/bazyl.png" -resize x$((H * 43 / 100)) "$T/bazyl.png"
        local lx=$((-W * 4 / 100)) bx=$((-W * 3 / 100))
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
  # Każdy zestaw (rozmiar × język) w osobnym procesie, z własnym katalogiem roboczym; ImageMagick po 1 wątku na proces.
  (
    T=$(mktemp -d)
    for n in ${CARDS:-1 2 3 4 5 6 7 8}; do
      raw="$dir/${SCENE[$n]}.png"
      [ -f "$raw" ] || { echo "brak zrzutu: $raw"; continue; }
      card "$n" "$lang" $W $H "$raw" "$OUT/$set_name/$n.jpg"
    done
    rm -rf "$T"
    echo "$set_name: $(ls "$OUT/$set_name" | wc -l | tr -d ' ') kart"
  ) &
done
wait
