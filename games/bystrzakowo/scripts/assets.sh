#!/bin/bash
# Grafiki z assets-raw (Flux na Legionie) -> public/art: przycięte, przeskalowane, WebP/JPG.
# Każdy plik dostaje obok .json z promptem i seedem (kopia z assets-raw).
# Użycie: games/bystrzakowo/scripts/assets.sh
set -euo pipefail
cd "$(dirname "$0")/.."
RAW=../../assets-raw/bystrzakowo
OUT=public/art
mkdir -p $OUT/items

# sprite: źródło, cel (bez rozszerzenia), najdłuższy bok w px
sprite() {
  local src="$RAW/$1" dst="$OUT/$2" size="$3"
  [ -f "$src" ] || { echo "brak: $src"; return; }
  magick "$src" -trim +repage -resize "${size}x${size}>" -quality 90 -define webp:alpha-quality=95 "$dst.webp"
  [ -f "${src%.png}.json" ] && cp "${src%.png}.json" "$dst.json"
}
background() {
  local src="$RAW/$1" dst="$OUT/$2"
  [ -f "$src" ] || { echo "brak: $src"; return; }
  magick "$src" -resize 1920x -quality 84 "$dst.jpg"
  [ -f "${src%.png}.json" ] && cp "${src%.png}.json" "$dst.json"
}

sprite styl/plastelina-sitting-11.png items/kot 512
sprite styl/plastelina-leaf-11.png items/jablko 512
sprite styl/plastelina-car-11.png items/auto 512
for id in krowa banan rower slon kubek; do sprite styl2/plastelina-$id-21.png items/$id 512; done
for id in pies ryba zaba gruszka truskawka samolot lodka pilka mis klocek; do sprite proto/obj-$id-21.png items/$id 512; done
sprite styl2/plastelina-lisica-21.png lusia 720
sprite styl2/plastelina-borsuk-21.png bazyl 720
for k in cienie pasuje liczenie; do sprite proto/dom-$k-21.png dom-$k 560; done
for k in kolory gloski mamy; do sprite extra/dom-$k-21.png dom-$k 560; done
# Obiekty katalogu (scripts/gen-art.ts): assets-raw/bystrzakowo/items/<id>-<seed>.png.
# Przy kilku wersjach (przegenerowanie z innym seedem) wygrywa najnowsza.
seen=" "
for f in $(ls -t $RAW/items/*.png 2>/dev/null); do
  base=$(basename "$f" .png); id=${base%-*}
  case "$seen" in *" $id "*) continue ;; esac
  seen="$seen$id "
  [ -f "$OUT/items/$id.webp" ] && [ "$OUT/items/$id.webp" -nt "$f" ] && continue
  sprite "items/$base.png" "items/$id" 512
done
# Muzyka (ACE-Step): FLAC -> AAC, cicha pętla w tle.
mus=$(ls $RAW/extra/muzyka*.flac 2>/dev/null | head -1 || true)
if [ -n "$mus" ]; then
  mkdir -p public/audio
  ffmpeg -loglevel error -y -i "$mus" -af "loudnorm=I=-20:TP=-2,afade=t=in:d=0.05" -ac 2 -ar 44100 -c:a aac -b:a 96k public/audio/muzyka.m4a
  cp "${mus%.flac}.json" public/audio/muzyka.json 2>/dev/null || true
fi
# Warsztat Bazyla: tło krainy, tło zabaw, stanowiska, skrzynka, wiaderko (barwione w grze), znaki domów.
mkdir -p $OUT/warsztat
background warsztat/tlo-warsztat-21.png kraina-warsztat
background warsztat/gra2-32.png gra-warsztat
sprite warsztat/stacja-sortowanie-22.png dom-sortowanie 560
sprite warsztat/stacja-ukladanka-22.png dom-ukladanka 560
sprite warsztat/skrzynka-21.png warsztat/skrzynka 512
sprite warsztat/wiadro-21.png warsztat/wiadro 512
sprite warsztat/stodola-21.png warsztat/stodola 256
sprite warsztat/staw-21.png warsztat/staw 256
for id in droga balwan palma kra; do sprite warsztat/$id-21.png warsztat/$id 256; done
[ -f $RAW/warsztat/morze-21.png ] && sprite warsztat/morze-21.png warsztat/morze 256
# Ścieżka Lusi: tło krainy, tło zabaw, stanowiska.
background sciezka/tlo-sciezka-21.png kraina-sciezka
background sciezka/tlo-sciezka-gra-22.png gra-sciezka
sprite sciezka/stacja-kropki-21.png dom-kropki 560
sprite sciezka/stacja-labirynt-22.png dom-labirynt 560
# Pracownia Malucha i stanowiska dodatkowych zabaw.
background pracownia/tlo-pracownia-21.png kraina-pracownia
background pracownia/tlo-pracownia-gra-22.png gra-pracownia
sprite pracownia/stacja-kolorowanka-21.png dom-kolorowanka 560
sprite pracownia/stacja-naklejanka-22.png dom-naklejanka 560
sprite pracownia/stacja-litery-22.png dom-litery 560
sprite pracownia/stacja-wzory-22.png dom-wzory 560
sprite pracownia/stacja-ksztalty-22.png dom-ksztalty 560
sprite pracownia/stacja-cyfry-22.png dom-cyfry 560
sprite pracownia/stacja-sylaby-22.png dom-sylaby 560
sprite pracownia/stacja-melodia-22.png dom-melodia 560
sprite pracownia/stacja-historyjki-22.png dom-historyjki 560
# Polana Zagadek: stanowiska mówiące, na czym polega zabawa.
for x in cienie-21 emocje-22 gloski-22 kolory-22 liczenie-21 mamy-21 memory-22 pasuje-21; do sprite polana/stacja-$x.png dom-${x%-*} 560; done
# Emocje: minki (najnowsza wersja każdej).
mkdir -p $OUT/emocje
for id in wesoly smutny zly zdziwiony przestraszony spiacy; do
  f=$(ls -t $RAW/emocje/$id-[0-9]*.png 2>/dev/null | head -1)
  [ -n "$f" ] && sprite "emocje/$(basename "$f")" "emocje/$id" 400
  # Kolejne postaci: <emocja>-<postać>-<seed>.png -> emocje/<emocja>-<postać>.webp
  for c in dziewczynka kotek mis; do
    f=$(ls -t $RAW/emocje/$id-$c-*.png 2>/dev/null | head -1)
    [ -n "$f" ] && sprite "emocje/$(basename "$f")" "emocje/$id-$c" 400
  done
done
# Historyjki: kadry <historyjka>-<1..3>.
mkdir -p $OUT/historyjki
for f in $RAW/historyjki/*-21.png; do
  [ -f "$f" ] || continue
  id=$(basename "$f" -21.png)
  sprite "historyjki/$id-21.png" "historyjki/$id" 400
done
# Wybrane nowsze kadry (poprawki bez twarzy i nowe historyjki); nadpisują wersje -21.
STORY_PICKS="balwan-1-51 balwan-2-51 kwiat-1-62 kwiat-2-62 kwiat-3-62 kurczak-1-61 jablko-1-61 jablko-2-61 jablko-3-61 lody-1-62 lody-2-61 zabka-2-62 zabka-3-61 kanapka-1-61 kanapka-2-61 kanapka-3-61 wieza-2-61 balon-1-61 balon-2-61 balon-3-61 tort-2-61 tort-3-62 zamek-1-61 zamek-3-61 jajko-1-71 jajko-2-71 jajko-3-71 pizza-2-72 pizza-3-71 swieca-1-72 swieca-2-72 swieca-3-72 kakao-1-71 kakao-2-71 kakao-3-71 gniazdo-1-71 gniazdo-2-71 gniazdo-3-71 drzewko-1-72 drzewko-2-72 drzewko-3-72 dzien-1-71 dzien-2-71 dzien-3-71 samolot-1-92 samolot-2-92 samolot-3-92 zabka-1-82 wieza-1-81 wieza-3-81 tort-1-81 zamek-2-81 pizza-1-91"
for x in $STORY_PICKS; do sprite "historyjki/$x.png" "historyjki/${x%-*}" 400; done
# Sześć kolejnych historyjek (--historyjki6, poprawki --historyjki7).
STORY_PICKS6="banan-1-101 banan-2-102 banan-3-113 arbuz-1-102 arbuz-2-102 arbuz-3-102 akwarium-1-102 akwarium-2-102 akwarium-3-102 prezent-1-102 prezent-2-102 prezent-3-102 myjnia-1-101 myjnia-2-101 myjnia-3-101 babeczka-1-112 babeczka-2-101 babeczka-3-101"
for x in $STORY_PICKS6; do sprite "historyjki/$x.png" "historyjki/${x%-*}" 400; done
# Kolorowanki: czyste czarne kontury na białym (próg + pogrubienie linii, żeby obszary były zamknięte).
mkdir -p $OUT/kolorowanki
for f in $RAW/kolorowanki/*-21.png; do
  [ -f "$f" ] || continue
  id=$(basename "$f" -21.png)
  magick "$f" -colorspace gray -resize 640x640 -threshold 55% -morphology Erode Disk:1.5 -strip "$OUT/kolorowanki/$id.png"
  cp "${f%.png}.json" "$OUT/kolorowanki/$id.json"
done
# Prostsze strony (duże pola dla palca malucha) zastępują pierwsze wersje.
for x in domek-32 kwiatek-31 motyl-31 ryba-31 slon-31 sowa-31 zolw-32; do
  f=$RAW/kolorowanki/$x.png
  magick "$f" -colorspace gray -resize 640x640 -threshold 55% -morphology Erode Disk:1.5 -strip "$OUT/kolorowanki/${x%-*}.png"
  cp "${f%.png}.json" "$OUT/kolorowanki/${x%-*}.json"
done
# Krajobrazy naklejanki.
mkdir -p $OUT/krajobrazy
for id in farma kosmos las morze plaza zima; do background krajobrazy/$id-21.png krajobrazy/$id; done
background proto/tlo-polana-21.png polana
background proto/tlo-zagadka-21.png tlo-zagadka
# Zębatka strefy rodzica.
sprite extra/zebatka-a-22.png zebatka 256
# Rączka z samouczka (pokaz gestów); czubek palca: HAND_TIP w src/hand.ts.
sprite ui/raczka-d-302.png raczka 320
# Obrazki do „Pisze litery” (src/sim/letter-pics.ts): wybrany wariant (seed 401 albo 402).
mkdir -p $OUT/litery
for x in emu-401 elf-402 ekler-401 flaming-401 flaga-401 igloo-401 ucho-401 ufo-401 mrowka-402 lody-401 \
  iguana-402 dzem-401 gniazdo-401 orzech-402 krolowa-402 koldra-401 skrzypce-402 van-401 wazon-402 jojo-401 \
  jacht-401 jak-402 cukinia-401 jednorozec-402 klaun-402 komputer-402 wiolonczela-402 wyspa-401 jogurt-401 \
  piekarnik-402 kaczuszka-401 zegar-402 lodz-podwodna-401 wulkan-402 kostka-402 magnes-401 koala-401 kiwi-401 \
  kajak-402 nandu-402 gnu-402 mydlo-402; do
  sprite litery/$x.png litery/${x%-*} 512
done
du -sh $OUT
