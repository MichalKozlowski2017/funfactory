#!/usr/bin/env bash
# Karty do sklepów Gluta: zrzuty z assets-raw/glut-store/shots + tła z Fluxa → games/glut/store/screens.
set -euo pipefail
cd "$(dirname "$0")/../.."
R=assets-raw/glut-store
OUT=games/glut/store/screens
PL=("Skacz, łap cukierki, rób serie!" "8 światów z własnymi pułapkami" "Codzienne wyzwanie dla wszystkich" "Szafa pełna czapek i dodatków" "38 osiągnięć do zdobycia" "Im wyżej, tym mroczniej")
EN=("Jump, grab candy, chain combos!" "8 worlds, each with its own twist" "A new daily challenge for everyone" "A wardrobe full of hats and extras" "38 achievements to unlock" "The higher you go, the darker it gets")
for spec in "ios-6.9:1320:2868" "ios-6.5:1242:2688" "android:1080:1920"; do
  IFS=: read -r name W H <<<"$spec"
  for lang in pl en; do
    dir=$OUT/$name; [ "$lang" = en ] && dir=$OUT/$name-en
    rm -rf "$dir"; mkdir -p "$dir"
    for i in 1 2 3 4 5 6; do
      bg=$(ls $R/bg$i-*.png | head -1)
      if [ "$lang" = pl ]; then cap=${PL[$((i - 1))]}; else cap=${EN[$((i - 1))]}; fi
      tools/store/card.sh "$R/shots/$name-$lang/$i.png" "$bg" "$cap" "$W" "$H" "$dir/$i.jpg"
    done
    echo "$dir"
  done
done
