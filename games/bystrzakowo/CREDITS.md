# Bystrzakowo: źródła

- **Grafika** (obiekty, przewodnicy, domki, tła): wygenerowana lokalnie modelem Flux 2 Dev (ComfyUI na Legionie). Prompt i seed każdego pliku leżą obok w `public/art/**/*.json`.
- **Lektor** (Lusia, Bazyl): VoxCPM2 (OpenBMB, Apache 2.0), głosy z opisu („voice design”), sprawdzane Whisperem large-v3 (MIT). Teksty: `voice/lines.json`.
- **Krój Baloo 2**: Ek Type, SIL Open Font License 1.1 (`public/fonts/OFL-baloo2.txt`). Kreska w ł i Ł obrócona o 32° (`scripts/font-slash.py`), bo ł wyglądało jak t.
- **Efekty dźwiękowe**: synteza w kodzie (`src/ui.ts`).
