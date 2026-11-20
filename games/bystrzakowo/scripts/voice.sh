#!/bin/bash
# Lektor: voice/lines.json -> Legion (skill tts: VoxCPM2 + kontrola Whisperem) -> public/audio/<głos>/<kwestia>.m4a
# Nazwy w lines.json: "<lusia|bazyl>-<kwestia>". Użycie: games/bystrzakowo/scripts/voice.sh [lines.json]
set -euo pipefail
cd "$(dirname "$0")/.."
LINES="${1:-voice/lines.json}"
RAW=../../assets-raw/bystrzakowo/voice
~/.claude/skills/tts/tts.sh "$LINES" "$RAW"
for f in "$RAW"/*.wav; do
  n=$(basename "$f" .wav); guide=${n%%-*}; line=${n#*-}
  mkdir -p public/audio/$guide
  # Głośność wyrównana (EBU R128), mono, AAC 64 kb/s.
  ffmpeg -loglevel error -y -i "$f" -af "loudnorm=I=-16:TP=-1.5:LRA=11" -ac 1 -ar 44100 -c:a aac -b:a 64k "public/audio/$guide/$line.m4a"
done
cp "$RAW/report.json" voice/report.json
python3 -c "import json;r=json.load(open('voice/report.json'));bad=[x['name']+': '+x['heard'] for x in r if not x['ok']];print(len(r)-len(bad),'/',len(r),'OK');print('\n'.join(bad))"
