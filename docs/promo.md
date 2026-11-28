# Klipy reklamowe (Remotion)

Pionowe klipy 1080×1920 na TikToka, Reels i Shorts. Jeden szablon `GamePromo` (`tools/promo/src/`) dla wszystkich gier i języków; klip opisują dane (props) w `tools/promo/src/Root.tsx`, jedna kompozycja na grę i język (np. `GlutPromoPL`).

## Budowa klipu

1. **Otwarcie** (ok. 2,5 s): animacja z Legiona, hasło na górze.
2. **Ujęcia z gry** (3–5 s każde): fragmenty nagrania z napisami; przejście „wjazd od góry” (kamera jedzie w górę).
3. **Zakończenie** (ok. 4 s): grafika z powolnym zoomem, logo, hasło („Za darmo w Google Play”), pulsujący przycisk.
4. **Muzyka**: jedna ścieżka z wyciszeniem na końcu; dźwięk gry domyślnie wyłączony (`gameVolume: 0`), bo muzyka gry gryzie się ze ścieżką.

Czcionki: napisy Baloo 2 (polskie znaki), logo Lilita One (czcionka Gluta, bez polskich znaków). Napisy w strefie bezpiecznej: nad dolnym paskiem TikToka (`captionTop` ok. 1330), dla ujęcia z panelem gry niżej (`captionTop` w ujęciu).

## Materiały

Pliki gier są duże, więc nie trafiają do repo: leżą w `release/<slug>/promo/src/` i są podpięte twardymi dowiązaniami w `tools/promo/public/<slug>/` (Remotion nie obsługuje dowiązań symbolicznych): `ln release/glut/promo/src/x.mp4 tools/promo/public/glut/x.mp4`.

- **Rozgrywka**: bot w grze (Glut: `?bot`), nagranie z playtestu, pionowo w rozmiarze telefonu. Każdy `pnpm shot` czyści `.shots/<slug>/`, więc nagranie od razu kopiuj.
  ```sh
  pnpm shot games/glut --gpu --size 360x640@3 --query "bot&seed=7&lang=pl" --steps "wait:1500,rec:start,wait:75000,rec:save:bot-pl-7"
  ```
  Momenty do ujęć wybieraj z klatek co sekundę (`ffmpeg -ss <t> -frames:v 1`).
- **Grafiki** (Legion, skill `comfyui`): `flux2-ref` z wycinkiem postaci z grafiki sklepowej jako referencją, pion 768×1344.
- **Animacja otwarcia** (Legion): `wan22-i2v` z grafiki otwarcia, 544×960, 81 klatek PNG → `ffmpeg -framerate 16 -i intro-<seed>-%d.png`; w klipie odtwarzana 1,5× szybciej.
- **Muzyka** (Legion): `ace15`, ok. 26 s, 128 BPM. Sprawdź ciszę (`silencedetect`) i energię na sekundę (`astats`); ACE-Step potrafi wstawić przerwy albo zamilknąć przed końcem.

## Glut (2026-11-28)

`GlutPromoPL`: otwarcie `intro-701` (z `hook-502`), ujęcia z `bot-pl-7.mp4` (4,0 s skoki, 31,8 s „100 m! Czekoladowa kopalnia”, 45,6 s „Super rytm ×10”, 55,0 s rekord 172 m), zakończenie `end-602`, muzyka `music-813` (alternatywa `music-812`). Gotowe pliki: `release/glut/promo/`.
