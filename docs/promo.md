# Klipy reklamowe (Remotion)

Pionowe klipy 1080×1920 na TikToka, Reels i Shorts. Jeden szablon `GamePromo` (`tools/promo/src/`) dla wszystkich gier i języków; klip opisują dane (props) w `tools/promo/src/Root.tsx`, jedna kompozycja na grę i język (np. `GlutPromoPL`).

## Budowa klipu (15 s)

1. **Od razu gra** (bez otwarcia): pierwsza klatka pokazuje zagrożenie, hasło wskakuje od razu. Animowane otwarcie (`intro`) jest opcjonalne.
2. **Ujęcia z gry** (2,5–4,5 s): najbardziej nerwowe momenty, napisy wskakują; między ujęciami „wjazd od góry” (kamera jedzie w górę), a ujęcie z tego samego ciągłego fragmentu nagrania doklejone twardym cięciem (`cut: 'hard'`). `danger: true`: pulsująca poświata od dołu (zagrożenie tuż za bohaterem).
3. **Puenta**: porażka na krawędzi + pytanie do widza (Glut: „Syrop cię dopadł!” + „Ile wytrzymasz?”).
4. **Zakończenie** (ok. 2,6 s): grafika z powolnym zoomem, logo, „Za darmo w Google Play”, pulsujący przycisk.
5. **Muzyka**: jedna ścieżka z wyciszeniem na końcu; dźwięk gry domyślnie wyłączony (`gameVolume: 0`).

Emocje: zagrożenie ma być stale w kadrze. W Glucie służy do tego `?chase=<m>` (tylko do nagrań): syrop trzyma się ok. tylu metrów pod slime'em (`Run` opcja `chase`, mocniejsze doganianie), a kamera nie wyprzedza slime'a w locie, więc syrop zawsze jest w kadrze (także w kolejnych światach), a przy zawahaniu bota podchodzi tuż pod niego („Drugi oddech!”). 4,5 m: bieg do 115 m z ratunkami i Czekoladową kopalnią; mniej metrów daje szybszą porażkę.

Czcionki: napisy Baloo 2 (polskie znaki), logo Lilita One (czcionka Gluta, bez polskich znaków). Napisy w strefie bezpiecznej: nad dolnym paskiem TikToka (`captionTop` ok. 1330), dla ujęcia z panelem gry niżej (`captionTop` w ujęciu).

## Materiały

Pliki gier są duże, więc nie trafiają do repo: leżą w `release/<slug>/promo/src/` i są podpięte twardymi dowiązaniami w `tools/promo/public/<slug>/` (Remotion nie obsługuje dowiązań symbolicznych): `ln release/glut/promo/src/x.mp4 tools/promo/public/glut/x.mp4`.

- **Rozgrywka**: bot w grze (Glut: `?bot`), nagranie z playtestu, pionowo w rozmiarze telefonu. Każdy `pnpm shot` czyści `.shots/<slug>/`, więc nagranie od razu kopiuj.
  ```sh
  pnpm shot games/glut --gpu --size 360x640@3 --query "bot&seed=7&lang=pl&chase=4" --steps "wait:1500,rec:start,wait:50000,rec:save:chase-4"
  ```
  Momenty do ujęć wybieraj z klatek co sekundę (`ffmpeg -ss <t> -frames:v 1`).
- **Grafiki** (Legion, skill `comfyui`): `flux2-ref` z wycinkiem postaci z grafiki sklepowej jako referencją, pion 768×1344.
- **Animacja otwarcia** (Legion): `wan22-i2v` z grafiki otwarcia, 544×960, 81 klatek PNG → `ffmpeg -framerate 16 -i intro-<seed>-%d.png`; w klipie odtwarzana 1,5× szybciej.
- **Muzyka** (Legion): `ace15`, ok. 26 s, 128 BPM. Sprawdź ciszę (`silencedetect`) i energię na sekundę (`astats`); ACE-Step potrafi wstawić przerwy albo zamilknąć przed końcem.

## Glut (2026-11-28)

`GlutPromoPL` (15 s): jeden bieg `chase2-45a.mp4` (`chase=4.5`): 19,4 s syrop tuż pod Glutem, 22,6 s „Drugi oddech!”, 28,6 s „Rytm ×5” i „100 m! Czekoladowa kopalnia”, 34,6 s ratunki w kopalni i porażka na 115 m; zakończenie `end-602`, muzyka `music-813` (alternatywa `music-812`). Gotowe pliki: `release/glut/promo/`.

`GlutPromoEN` (15 s): ten sam bieg nagrany z `lang=en` (`chase2-45-en.mp4`, bot gra powtarzalnie, więc momenty wypadają w tych samych sekundach), hasła: „The syrup is coming!”, „Just in time!”, „Reach new worlds!”, „How far can you go?”, zakończenie „Free on Google Play” / „Get it now”. Hasła po angielsku krótkie (do ok. 20 znaków), żeby mieściły się w jednej linii. Wcześniejsza wersja 20 s z animowanym otwarciem (`intro-701`, rekord 172 m z `bot-pl-7.mp4`) jest w historii repo.

## Bystrzakowo (2026-11-28): gra pozioma w pionowym klipie

Szablon `TabletPromo` (`tools/promo/src/TabletPromo.tsx`): tło z Legiona (`flux2`, pion 768×1344, styl plasteliny), hasło na górze przez cały klip, rozgrywka na tablecie w środku (ujęcia przenikają się), napis pod tabletem, Lusia i Bazyl (wycięte pozy z `store/poses`) wyskakują obok, na końcu plansza z wioską, logo i przyciskiem. Klip jest dla rodziców, więc spokojny: przenikanie zamiast wjazdów, zostaje głos lektora z gry (`gameVolume: 1`, wyciszany na cięciach), muzyka gry cicho pod spodem (`music: 0.35`).

Nagranie: `?promo=<zabawa>:<ile gestów>,...` (tylko w dev, `games/bystrzakowo/src/promo.ts`) gra jak dziecko: wchodzi do zabawy ze świata, czeka na polecenie przewodnika, wykonuje gest z podpowiedzi (prawdziwe dotknięcia, więc gra reaguje głosem i pochwałą), a plastelinowa rączka pokazuje palec. Kolorowanka bierze co raz inną farbę i na końcu się kończy (obrazek ożywa); `stats:<s>` pokazuje wykresy w strefie rodzica.
```sh
pnpm shot games/bystrzakowo --gpu --size 1280x720@1.5 --query "full&nohand&lang=pl&page=cat&letters=A&promo=letters:3,shadows:2,sorting:2,coloring:4,jigsaw:2,stats:4" --steps "wait:1000,rec:start,wait:85000,rec:save:promo-pl"
```
`BystrzakowoPromoPL` (15 s): litera A, cienie, kolorowanka, układanka, postępy dla rodzica; zakończenie „Bez reklam · offline” i „Wkrótce w sklepach” (zmienić na sklep po wydaniu). Gotowe pliki: `release/bystrzakowo/promo/`.
