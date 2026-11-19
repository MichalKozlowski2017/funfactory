#!/usr/bin/env bash
# Zrzuty Gluta do sklepów: 8 scen × rozmiary × języki → assets-raw/glut-store/shots/<rozmiar>-<lang>/<n>.png
# Wymaga serwera dev (shot.ts). Potem tools/store/glut-cards.sh składa karty. SIZES/LANGS zawężają zestaw.
set -u
cd "$(dirname "$0")/../.."
OUT=assets-raw/glut-store/shots
DRESS="eval:__glut.bank=20000
eval:__glut.owned=['crown','pirate','wizard','party','chef','mint','grape','lemon','stars','hearts','rainbow','shades','bow','headphones','monocle']
eval:__glut.tapItem('crown')
eval:__glut.tapItem('rainbow')
eval:__glut.tapItem('shades')"
DAILY="eval:__glut.daily=[{day:'2026-11-13',best:84,tries:3},{day:'2026-11-14',best:142,tries:5},{day:'2026-11-15',best:118,tries:2},{day:'2026-11-17',best:121,tries:2},{day:'2026-11-18',best:205,tries:7},{day:'2026-11-19',best:167,tries:4}]"
for size in ${SIZES:-"ios-6.9:440x956@3" "ios-6.5:414x896@3" "android:360x640@3"}; do
  name=${size%%:*}; dim=${size#*:}
  for lang in ${LANGS:-pl en}; do
    dir=$OUT/$name-$lang; rm -rf $dir; mkdir -p $dir
    run() { rm -rf .shots/store-tmp; node tools/playtest/shot.ts games/glut --gpu --seed ${SEED:-7} --size $dim --query "$1" --out .shots/store-tmp --steps "$2" >/dev/null 2>&1 || echo "FAIL $name $lang $3"; cp .shots/store-tmp/*.png $dir/$3.png 2>/dev/null; }
    # 1. Rozgrywka: skoki, cukierki, seria.
    run "bot&lang=$lang" "wait:1200
$DRESS
wait:15000
shot:s" 1
    # 2. Syrop tuż pod glutem.
    run "bot&lang=$lang" "wait:1200
$DRESS
wait:2500
wait:7000
eval:__glut.earned=['h50','h100','h200','h300','h400','h500','h600','h700','s5','s10','s15','s20','air3','air6','combo4','combo6','rescue1','rescue25','bounce50','crumble30','powers','fast100','fast200','fast300','candies60','candies60b','live120','live300','runs10','runs100','runs500','candy1k','candy10k','candy50k','daily1','daily3','daily7','dressed']
eval:__glut.run.syrupY = Math.max(__glut.run.slime.y + 160, __glut.camera.y + __glut.game.view.height - 230)
wait:400
shot:s" 2
    # 3. Mroczny świat z kolcami.
    run "bot&lang=$lang" "wait:1200
$DRESS
wait:2500
eval:__glut.reachedBiome=7
eval:__glut.teleport(708)
wait:1600
shot:s" 3
    # 4. Fabryka: taśmociągi, bąble z mocami.
    run "bot&lang=$lang" "wait:1200
$DRESS
wait:2500
eval:__glut.reachedBiome=6
eval:__glut.teleport(612)
wait:1800
shot:s" 4
    # 5. Nowy rekord (ranking).
    run "lang=$lang" "wait:1200
$DRESS
eval:__glut.best=231
eval:__glut.earned=['h50','h100','h200','h300','h400','h500','h600','h700','s5','s10','s15','s20','air3','air6','combo4','combo6','rescue1','rescue25','bounce50','crumble30','powers','fast100','fast200','fast300','candies60','candies60b','live120','live300','runs10','runs100','runs500','candy1k','candy10k','candy50k','daily1','daily3','daily7','dressed']
wait:800
eval:__glut.reachedBiome=2
eval:__glut.teleport(246)
wait:3500
eval:__glut.bank=1240
eval:__glut.run.time=187.4
eval:__glut.run.syrupY = __glut.run.slime.y - 80
wait:2600
shot:s" 5
    # 6. Wyzwanie dnia.
    run "lang=$lang" "wait:2500
$DAILY
eval:__glut.earned=['daily1','daily3']
eval:__glut.title.visible=false
eval:__glut.openDaily()
wait:600
shot:s" 6
    # 7. Szafa.
    run "lang=$lang" "wait:2500
$DRESS
eval:__glut.title.visible=false
eval:__glut.openShop()
wait:600
shot:s" 7
    # 8. Osiągnięcia.
    run "lang=$lang" "wait:2500
eval:__glut.earned=['h50','h100','h200','s5','s10','air3','combo4','rescue1','runs10','candy1k','daily1','fast100']
eval:__glut.stats.bestStreak=12
eval:__glut.best=246
eval:__glut.title.visible=false
eval:__glut.openTrophies()
wait:600
shot:s" 8
    echo "done $name $lang"
  done
done
