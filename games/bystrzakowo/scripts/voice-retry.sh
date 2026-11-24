#!/bin/bash
# Re-records lines that failed the Whisper check: voice/report-<lang>.json → new attempts (different seeds,
# more tries) → replaces in public/audio/<lang>/ only the ones that pass now.
# Skips syllable reading ("-read-") and lines with Lusia's name (Whisper writes "Lucia", the recording is fine).
# Usage: games/bystrzakowo/scripts/voice-retry.sh en
set -euo pipefail
cd "$(dirname "$0")/.."
L="$1"
RAW=../../assets-raw/bystrzakowo/voice-$L-retry
JOB=$(mktemp -t retry).json
python3 - "$L" "$JOB" <<'PY'
import json, sys
l, job = sys.argv[1], sys.argv[2]
src = {x['name']: x for x in json.load(open(f'voice/{l}.json'))['lines']}
bad = [x['name'] for x in json.load(open(f'voice/report-{l}.json')) if not x['ok'] and '-read-' not in x['name'] and 'Lusia' not in x['text']]
lines = [{**src[n], 'tries': 16, 'seed': 101} for n in bad if n in src]
json.dump({'voice': f'voices/lusia-{l}', 'lang': l, 'tries': 16, 'lines': lines}, open(job, 'w'), ensure_ascii=False)
print(f'retry {l}: {len(lines)} lines')
PY
[ "$(python3 -c "import json;print(len(json.load(open('$JOB'))['lines']))")" = 0 ] && exit 0
rm -rf "$RAW"; ~/.claude/skills/tts/tts.sh "$JOB" "$RAW" | grep -E "^(OK|ZLE|GOTOWE)" || true
python3 - "$L" "$RAW" <<'PY'
import json, sys, subprocess
l, raw = sys.argv[1], sys.argv[2]
rep = json.load(open(f'{raw}/report.json'))
main = json.load(open(f'voice/report-{l}.json'))
by = {x['name']: x for x in main}
fixed = 0
for x in rep:
    if not x['ok']: continue
    n = x['name']; guide, line = n.split('-', 1)
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', f'{raw}/{n}.wav', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ac', '1', '-ar', '44100', '-c:a', 'aac', '-b:a', '64k', f'public/audio/{l}/{guide}/{line}.m4a'], check=True)
    by[n] = x; fixed += 1
json.dump(list(by.values()), open(f'voice/report-{l}.json', 'w'), ensure_ascii=False, indent=1)
print(f'fixed: {fixed} / {len(rep)}')
PY
