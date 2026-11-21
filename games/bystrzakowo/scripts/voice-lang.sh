#!/bin/bash
# Lektor w innym języku: voice/<język>.json (z scripts/voice-i18n.ts) -> Legion -> public/audio/<język>/<głos>/<kwestia>.m4a
# Użycie: games/bystrzakowo/scripts/voice-lang.sh en
set -euo pipefail
cd "$(dirname "$0")/.."
L="$1"
RAW=../../assets-raw/bystrzakowo/voice-$L
~/.claude/skills/tts/tts.sh "voice/$L.json" "$RAW"
for f in "$RAW"/*.wav; do
  n=$(basename "$f" .wav); guide=${n%%-*}; line=${n#*-}
  mkdir -p public/audio/$L/$guide
  ffmpeg -loglevel error -y -i "$f" -af "loudnorm=I=-16:TP=-1.5:LRA=11" -ac 1 -ar 44100 -c:a aac -b:a 64k "public/audio/$L/$guide/$line.m4a"
done
cp "$RAW/report.json" "voice/report-$L.json"
python3 -c "import json,sys;r=json.load(open(sys.argv[1]));bad=[x['name']+': '+x['heard'] for x in r if not x['ok']];print(len(r)-len(bad),'/',len(r),'OK');print('\n'.join(bad))" "voice/report-$L.json"
