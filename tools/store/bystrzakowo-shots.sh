#!/usr/bin/env bash
# Zrzuty Bystrzakowa do sklepów: 8 scen × rozmiary × języki → assets-raw/bystrzakowo-store/shots/<rozmiar>-<lang>/<n>.png
# Gra jest pozioma. Potem tools/store/bystrzakowo-cards.sh składa karty z podpisami. SIZES/LANGS zawężają zestaw.
set -u
cd "$(dirname "$0")/../.."
OUT=assets-raw/bystrzakowo-store/shots
C="__ff.game.scenes.current"
# Imię dziecka w pocztówce i raporcie (base64 z UTF-8, bo kroki playtestu nie lubią przecinków i znaków spoza ASCII).
name_for() { case $1 in pl) echo Zosia ;; en) echo Emma ;; de) echo Lena ;; es) echo Sofía ;; esac; }
b64() { printf "%s" "$1" | base64; }
for size in ${SIZES:-"ios-6.9:956x440@3" "ipad-13:1376x1032@2" "android:640x360@3"}; do
  name=${size%%:*}; dim=${size#*:}
  for lang in ${LANGS:-pl en de es}; do
    dir=$OUT/$name-$lang; [ -z "${ONLY:-}" ] && rm -rf $dir; mkdir -p $dir
    kid=$(name_for $lang)
    parent=$(b64 "$C.demoParent('TAB', decodeURIComponent(escape(atob('$(b64 "$kid")'))))")
    run() {
      # ONLY="6 7": tylko wybrane sceny.
      case " ${ONLY:-$1} " in *" $1 "*) ;; *) return ;; esac
      rm -rf .shots/store-tmp
      if node tools/playtest/shot.ts games/bystrzakowo --gpu --size $dim --query "lang=$lang&seed=${SEED:-5}&full" --out .shots/store-tmp --steps "$2" >/dev/null 2>&1; then
        cp .shots/store-tmp/*.png $dir/$1.png 2>/dev/null
      else
        echo "FAIL $name $lang $1"
      fi
    }
    # 1. Polana Zagadek: krainy i kafelki zabaw.
    run 1 "wait:2500
shot:s"
    # 2. Zagadka: czyj to cień?
    run 2 "wait:1500
eval:$C.play('shadows')
wait:3500
shot:s"
    # 3. Historyjki do ułożenia.
    run 3 "wait:1500
eval:$C.play('stories')
wait:3500
shot:s"
    # 4. Rysowanie literki palcem.
    run 4 "wait:1500
eval:$C.play('letters')
wait:3500
shot:s"
    # 5. Naklejanka: obrazek z naklejek.
    run 5 "wait:1500
eval:$C.play('stickers')
wait:3000
eval:$C.demo()
wait:800
shot:s"
    # 6. Kolorowanka w trakcie malowania.
    run 6 "wait:1500
eval:$C.play('coloring')
wait:3500
eval:$C.paintDemo(9)
wait:800
shot:s"
    # 7. Raport dla rodzica.
    run 7 "wait:1500
eval:eval(atob('$(b64 "$C.demoParent('postepy', decodeURIComponent(escape(atob('$(b64 "$kid")'))))")'))
wait:1500
shot:s"
    # 8. Pocztówka tygodnia.
    run 8 "wait:1500
eval:eval(atob('$(b64 "$C.demoParent('pocztowka', decodeURIComponent(escape(atob('$(b64 "$kid")'))))")'))
wait:1800
shot:s"
    unset parent
  done
done
