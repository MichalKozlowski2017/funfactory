#!/bin/bash
# Art from assets-raw (Flux on Legion) -> public/art: trimmed, resized, WebP/JPG.
# Each file gets a .json with the prompt and seed next to it (copied from assets-raw).
# Usage: games/bystrzakowo/scripts/assets.sh
set -euo pipefail
cd "$(dirname "$0")/.."
RAW=../../assets-raw/bystrzakowo
OUT=public/art
mkdir -p $OUT/items

# sprite: source, target (no extension), longest side in px
sprite() {
  local src="$RAW/$1" dst="$OUT/$2" size="$3"
  [ -f "$src" ] || { echo "missing: $src"; return; }
  magick "$src" -trim +repage -resize "${size}x${size}>" -quality 90 -define webp:alpha-quality=95 "$dst.webp"
  [ -f "${src%.png}.json" ] && cp "${src%.png}.json" "$dst.json"
}
background() {
  local src="$RAW/$1" dst="$OUT/$2"
  [ -f "$src" ] || { echo "missing: $src"; return; }
  magick "$src" -resize 1920x -quality 84 "$dst.jpg"
  [ -f "${src%.png}.json" ] && cp "${src%.png}.json" "$dst.json"
}

sprite style/plasticine-sitting-11.png items/cat 512
sprite style/plasticine-leaf-11.png items/apple 512
sprite style/plasticine-car-11.png items/car 512
for id in cow banana bike elephant mug; do sprite style2/plasticine-$id-21.png items/$id 512; done
for id in dog fish frog pear strawberry airplane boat ball teddy block; do sprite proto/obj-$id-21.png items/$id 512; done
sprite style2/plasticine-lisica-21.png lusia 720
sprite style2/plasticine-borsuk-21.png bazyl 720
for k in shadows matching counting; do sprite proto/house-$k-21.png house-$k 560; done
for k in colors phonemes mothers; do sprite extra/house-$k-21.png house-$k 560; done
# Catalog items (scripts/gen-art.ts): assets-raw/bystrzakowo/items/<id>-<seed>.png.
# With several versions (regenerated with another seed) the newest wins.
seen=" "
for f in $(ls -t $RAW/items/*.png 2>/dev/null); do
  base=$(basename "$f" .png); id=${base%-*}
  case "$seen" in *" $id "*) continue ;; esac
  seen="$seen$id "
  [ -f "$OUT/items/$id.webp" ] && [ "$OUT/items/$id.webp" -nt "$f" ] && continue
  sprite "items/$base.png" "items/$id" 512
done
# Music (ACE-Step): FLAC -> AAC, quiet background loop.
mus=$(ls $RAW/extra/music*.flac 2>/dev/null | head -1 || true)
if [ -n "$mus" ]; then
  mkdir -p public/audio
  ffmpeg -loglevel error -y -i "$mus" -af "loudnorm=I=-20:TP=-2,afade=t=in:d=0.05" -ac 2 -ar 44100 -c:a aac -b:a 96k public/audio/music.m4a
  cp "${mus%.flac}.json" public/audio/music.json 2>/dev/null || true
fi
# Bazyl's Workshop: realm background, activity background, stations, crate, pail (tinted in game), house signs.
mkdir -p $OUT/workshop
background workshop/background-workshop-21.png realm-workshop
background workshop/gra2-32.png game-workshop
sprite workshop/station-sorting-22.png house-sorting 560
sprite workshop/station-jigsaw-22.png house-jigsaw 560
sprite workshop/crate-21.png workshop/crate 512
sprite workshop/pail-21.png workshop/pail 512
sprite workshop/barn-21.png workshop/barn 256
sprite workshop/pond-21.png workshop/pond 256
for id in road snowman palm ice-floe; do sprite workshop/$id-21.png workshop/$id 256; done
[ -f $RAW/workshop/sea-21.png ] && sprite workshop/sea-21.png workshop/sea 256
# Lusia's Path: realm background, activity background, stations.
background path/background-path-21.png realm-path
background path/background-path-game-22.png game-path
sprite path/station-dots-21.png house-dots 560
sprite path/station-maze-22.png house-maze 560
# Little Studio and the stations of the extra activities.
background studio/background-studio-21.png realm-studio
background studio/background-studio-game-22.png game-studio
sprite studio/station-coloring-21.png house-coloring 560
sprite studio/station-stickers-22.png house-stickers 560
sprite studio/station-letters-22.png house-letters 560
sprite studio/station-patterns-22.png house-patterns 560
sprite studio/station-shapes-22.png house-shapes 560
sprite studio/station-digits-22.png house-digits 560
sprite studio/station-syllables-22.png house-syllables 560
sprite studio/station-melody-22.png house-melody 560
sprite studio/station-stories-22.png house-stories 560
# Puzzle Meadow: stations showing what the activity is about.
for x in shadows-21 emotions-22 phonemes-22 colors-22 counting-21 mothers-21 memory-22 matching-21; do sprite meadow/station-$x.png house-${x%-*} 560; done
# Emotions: faces (newest version of each).
mkdir -p $OUT/emotions
for id in happy sad angry surprised scared sleepy; do
  f=$(ls -t $RAW/emotions/$id-[0-9]*.png 2>/dev/null | head -1)
  [ -n "$f" ] && sprite "emotions/$(basename "$f")" "emotions/$id" 400
  # More characters: <emotion>-<character>-<seed>.png -> emotions/<emotion>-<character>.webp
  for c in girl kitten teddy; do
    f=$(ls -t $RAW/emotions/$id-$c-*.png 2>/dev/null | head -1)
    [ -n "$f" ] && sprite "emotions/$(basename "$f")" "emotions/$id-$c" 400
  done
done
# Stories: frames <story>-<1..3>.
mkdir -p $OUT/stories
for f in $RAW/stories/*-21.png; do
  [ -f "$f" ] || continue
  id=$(basename "$f" -21.png)
  sprite "stories/$id-21.png" "stories/$id" 400
done
# Selected newer frames (fixes without faces and new stories); they override the -21 versions.
STORY_PICKS="snowman-1-51 snowman-2-51 flower-1-62 flower-2-62 flower-3-62 chick-1-61 apple-1-61 apple-2-61 apple-3-61 ice-cream-1-62 ice-cream-2-61 froglet-2-62 froglet-3-61 sandwich-1-61 sandwich-2-61 sandwich-3-61 tower-2-61 balloon-1-61 balloon-2-61 balloon-3-61 cake-2-61 cake-3-62 castle-1-61 castle-3-61 egg-1-71 egg-2-71 egg-3-71 pizza-2-72 pizza-3-71 candle-1-72 candle-2-72 candle-3-72 cocoa-1-71 cocoa-2-71 cocoa-3-71 nest-1-71 nest-2-71 nest-3-71 small-tree-1-72 small-tree-2-72 small-tree-3-72 day-1-71 day-2-71 day-3-71 airplane-1-92 airplane-2-92 airplane-3-92 froglet-1-82 tower-1-81 tower-3-81 cake-1-81 castle-2-81 pizza-1-91"
for x in $STORY_PICKS; do sprite "stories/$x.png" "stories/${x%-*}" 400; done
# Six more stories (--stories6, fixes from --stories7).
STORY_PICKS6="banana-1-101 banana-2-102 banana-3-113 watermelon-1-102 watermelon-2-102 watermelon-3-102 aquarium-1-102 aquarium-2-102 aquarium-3-102 gift-1-102 gift-2-102 gift-3-102 car-wash-1-101 car-wash-2-101 car-wash-3-101 cupcake-1-112 cupcake-2-101 cupcake-3-101"
for x in $STORY_PICKS6; do sprite "stories/$x.png" "stories/${x%-*}" 400; done
# Coloring pages: clean black outlines on white (threshold + thicker lines so the areas are closed).
mkdir -p $OUT/coloring-pages
for f in $RAW/coloring-pages/*-21.png; do
  [ -f "$f" ] || continue
  id=$(basename "$f" -21.png)
  # Too many small parts for a toddler's finger (replaced by simpler pages below).
  case $id in dog|dinosaur|rocket|cat|car) continue;; esac
  magick "$f" -colorspace gray -resize 640x640 -threshold 55% -morphology Erode Disk:1.5 -strip "$OUT/coloring-pages/$id.png"
  cp "${f%.png}.json" "$OUT/coloring-pages/$id.json"
done
# Simpler pages (big areas for a toddler's finger) replace the first versions.
for x in little-house-32 little-flower-31 butterfly-31 fish-31 elephant-31 owl-31 turtle-32; do
  f=$RAW/coloring-pages/$x.png
  magick "$f" -colorspace gray -resize 640x640 -threshold 55% -morphology Erode Disk:1.5 -strip "$OUT/coloring-pages/${x%-*}.png"
  cp "${f%.png}.json" "$OUT/coloring-pages/${x%-*}.json"
done
# Simple scenes (--coloring-scenes2) and simplest pages (--coloring-scenes3): only big parts, picked with
# coloring-sizes.ts (all fit a phone; the busier scenes left out: small parts turned to ink on a phone).
for pair in scene2-garden-304:snail scene2-winter-303:snowman \
  simple-apple-pear-402:apple-pear simple-ball-duck-403:duck-ball simple-sun-cloud-402:sun-cloud simple-balloons-404:balloons \
  simple-boat-404:sailboat simple-ice-cream-401:ice-cream simple-mushroom-snail-404:mushroom-snail simple-rocket-moon-402:rocket-moon \
  simple-cat-402:cat simple-car-402:car; do
  x=${pair%%:*}; id=${pair##*:}; f=$RAW/coloring-pages/$x.png
  magick "$f" -colorspace gray -resize 640x640 -threshold 55% -morphology Erode Disk:1.5 -strip "$OUT/coloring-pages/$id.png"
  cp "${f%.png}.json" "$OUT/coloring-pages/$id.json"
done
# Sticker-book landscapes.
mkdir -p $OUT/landscapes
for id in farm space forest sea beach winter; do background landscapes/$id-21.png landscapes/$id; done
background proto/background-meadow-21.png meadow
background proto/background-riddle-21.png background-riddle
# Parent zone gear.
sprite extra/gear-a-22.png gear 256
# Tutorial hand (gesture demo); fingertip: HAND_TIP in src/hand.ts.
sprite ui/hand-d-302.png hand 320
# Pictures for letter tracing (src/sim/letter-pics.ts): the chosen variant (seed 401 or 402).
mkdir -p $OUT/letters
for x in emu-401 elf-402 eclair-401 flamingo-401 flag-401 igloo-401 ear-401 ufo-401 ant-402 ice-cream-401 \
  iguana-402 jam-401 nest-401 walnut-402 queen-402 quilt-401 violin-402 van-401 vase-402 yo-yo-401 \
  yacht-401 yak-402 zucchini-401 unicorn-402 clown-402 computer-402 cello-402 island-401 yogurt-401 \
  oven-402 rubber-duck-401 clock-402 submarine-401 volcano-402 dice-402 magnet-401 koala-401 kiwi-401 \
  kayak-402 nandu-402 gnu-402 soap-402; do
  sprite letters/$x.png letters/${x%-*} 512
done
du -sh $OUT
