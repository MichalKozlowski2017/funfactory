# Glut: źródła grafiki i dźwięku

- Slime, powierzchnie, syrop, cząsteczki: kod (SVG / Pixi Graphics), `src/fx/`.
- `public/art/*`: wygenerowane lokalnie Flux 2 Dev (ComfyUI na Legionie). Obok każdego pliku `.json` z promptem, seedem i obróbką.
- Efekty dźwiękowe: syntezowane w kodzie (`src/fx/sfx.ts`).
- Muzyka: proceduralna, składana w kodzie na żywo (`src/fx/score.ts`). Instrumenty to próbki (poniżej); do czasu ich wczytania gra synteza.
- Tła i cukierki światów (`public/art/biomes/*`): Flux 2 Dev, obok każdego pliku `.json`.
- Paczki CC0:
  - **VSCO 2 Community Edition** (Versilian Studios / Sam Gossner, https://versilian-studios.com/vsco-community/, https://github.com/sgossner/VSCO-2-CE), licencja **CC0 1.0** (plik `LICENSE` w repozytorium). Autorzy proszą o wzmiankę i o nieodsprzedawanie samych próbek.
    Wybrane próbki w `public/audio/samples/` (mono AAC, przycięte, znormalizowane; pady z pętlą) robi `node tools/audio/samples.ts`, który zapisuje też `manifest.json` (plik, wysokość MIDI, głośność). Użyte: dzwonki (glockenspiel), marimba, ksylofon, harfa, pizzicato skrzypiec i wiolonczel, smyczki trzymane (altówki, wiolonczele), tuba, puzon, trąbka, kotły, bęben basowy, bęben etniczny, werble, tenor drum, talerze, tamburyn, shaker, trójkąt, kowadło, bęben hamulcowy, klawesy.

- Tekstury ścian (lód, lukier, karmel) i kolec: wygenerowane lokalnie Flux 2 (ComfyUI), parametry w `public/art/walls/*.json`.
- Font **Lilita One** (Juan Montoreano), licencja **SIL Open Font License 1.1** (`public/fonts/OFL-lilita-one.txt`, https://github.com/google/fonts/tree/main/ofl/lilitaone): napisy na tabliczkach z metrami w studni.
- Tabliczki z metrami (`public/art/signs/*`): Flux 2 Dev (ComfyUI na Legionie), obok każdego pliku `.json`.
