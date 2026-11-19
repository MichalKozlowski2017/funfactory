#!/usr/bin/env bash
# Karty do sklepów Gluta: zrzuty z assets-raw/glut-store/shots + tła z Fluxa → games/glut/store/screens.
set -euo pipefail
cd "$(dirname "$0")/../.."
R=assets-raw/glut-store
OUT=games/glut/store/screens
PL=("Skacz, łap cukierki, rób serie!" "Uciekaj przed syropem!" "8 światów, każdy z nową pułapką" "Taśmociągi, trampoliny i moce" "Pobij rekord w rankingu światowym" "Wyzwanie dnia z własnym rankingiem" "Szafa pełna czapek i dodatków" "38 osiągnięć, także na czas")
EN=("Jump, grab candy, chain combos!" "Outrun the rising syrup!" "8 worlds, each with a new twist" "Conveyors, bounce pads and power-ups" "Top the global leaderboard" "A daily challenge with its own leaderboard" "A wardrobe full of hats and extras" "38 achievements, some against the clock")
# Tło karty n: plik bg<numer> z assets-raw/glut-store.
BG=(1 7 6 2 8 3 4 5)
for spec in "ios-6.9:1320:2868" "ios-6.5:1242:2688" "android:1080:1920"; do
  IFS=: read -r name W H <<<"$spec"
  for lang in pl en; do
    dir=$OUT/$name; [ "$lang" = en ] && dir=$OUT/$name-en
    rm -rf "$dir"; mkdir -p "$dir"
    for i in 1 2 3 4 5 6 7 8; do
      bg=$(ls $R/bg${BG[$((i - 1))]}-*.png | head -1)
      if [ "$lang" = pl ]; then cap=${PL[$((i - 1))]}; else cap=${EN[$((i - 1))]}; fi
      tools/store/card.sh "$R/shots/$name-$lang/$i.png" "$bg" "$cap" "$W" "$H" "$dir/$i.jpg"
    done
    echo "$dir"
  done
done
