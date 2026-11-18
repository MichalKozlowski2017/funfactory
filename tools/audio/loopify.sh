#!/usr/bin/env bash
# Pętla muzyczna bez szwu z wygenerowanego utworu:
#   loopify.sh <wejście.flac> <bpm> <wyjście.mp3> [sekundy_przenikania=0.5]
# Tnie na pełnych taktach 4/4 przed końcowym wyciszeniem (pierwsza cisza > 0,5 s po 30. sekundzie),
# a ostatnie pół sekundy przed cięciem przenika w początek utworu, więc zapętlenie nie klika.
set -euo pipefail
in=$1; bpm=$2; out=$3; x=${4:-0.5}
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$in")
fade=$(ffmpeg -hide_banner -i "$in" -af silencedetect=n=-40dB:d=0.5 -f null - 2>&1 | grep -oE 'silence_start: [0-9.]+' | awk -v d="$dur" '$2>30{print $2; exit} END{}')
fade=${fade:-$dur}
read -r L Lx bars < <(python3 -c "b=4*60/$bpm; n=int(($fade-1.0)//b); L=round(n*b,4); print(L, round(L+$x,4), n)")
ffmpeg -hide_banner -loglevel error -y -i "$in" -filter_complex "
[0:a]atrim=0:$x,asetpts=PTS-STARTPTS,afade=t=in:d=$x[head];
[0:a]atrim=$L:$Lx,asetpts=PTS-STARTPTS,afade=t=out:d=$x[tail];
[head][tail]amix=inputs=2:normalize=0[seam];
[0:a]atrim=$x:$L,asetpts=PTS-STARTPTS[body];
[seam][body]concat=n=2:v=0:a=1,asetpts=N/SR/TB,loudnorm=I=-14:TP=-1.5:LRA=11[o]" -map "[o]" -ar 44100 -c:a libmp3lame -b:a 160k "$out"
echo "$out: $bars taktów, $(printf %.1f "$L") s (wyciszenie od $(printf %.1f "$fade") s)"
