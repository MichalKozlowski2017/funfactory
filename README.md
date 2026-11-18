# Funfactory

Fabryka mobilnych gier 2D na iOS i Androida. Gry pisze się w TypeScripcie, renderuje w PixiJS i pakuje do aplikacji przez Capacitor. Jedno repo zawiera wspólny zestaw narzędzi i wszystkie gry.

## Start

```sh
pnpm install
pnpm dev            # lab w przeglądarce (http://localhost:5173, działa też z telefonu w tej samej sieci)
pnpm check          # typecheck + testy
pnpm shot lab       # zrzuty z emulowanego iPhone'a do .shots/lab/
```

## Co gdzie jest

| Katalog | Zawartość |
| --- | --- |
| `packages/core` | Pętla gry, tweeny, sprężyny, RNG z seedem, zdarzenia, timery, zapis, haptyka, dźwięk |
| `packages/art` | Palety, kolory (OKLab), budowanie grafik SVG w kodzie, szum proceduralny |
| `packages/kit2d` | Warstwa Pixi: skalowanie na telefon, sceny z przejściami, juice (squash, pop, shake), cząsteczki, przycisk, gesty |
| `lab/` | Stanowisko testowe narzędzi (postać wektorowa, cząsteczki, gesty). To nie jest gra |
| `templates/game` | Szablon nowej gry (Vite + Capacitor) |
| `games/` | Gry (na razie pusto) |
| `tools/` | `shot` (playtest Playwright), `new-game` |

## Nowa gra

```sh
pnpm new-game slime-jump --title "Slime Jump" --native
pnpm --filter @funfactory-game/slime-jump ios       # Xcode
pnpm --filter @funfactory-game/slime-jump apk       # Android debug APK
```

`--native` od razu dodaje projekty iOS i Android. Domyślny identyfikator aplikacji to `com.funfactory.<slug>`. Inny ustawisz przez `--app-id`.

## ComfyUI (Flux 2 na Legionie)

Klient jest globalny (skill `comfyui` w `~/.claude/skills/comfyui`), a `pnpm comfy` go wywołuje. Łączy się z Legionem przez Tailscale (`http://legion-michala:8188`).

```sh
pnpm comfy ping
pnpm comfy gen --workflow flux2-sprite --prompt "..." --count 4 --out assets-raw/hero
pnpm comfy free     # zwalnia VRAM na Legionie
```

Workflow: `flux2` (jakość), `flux2-sprite` (przezroczyste tło, BiRefNet), `flux2-klein` (szybkie szkice).

## Wymagania

Node ≥ 22.18, pnpm 9, Xcode (iOS) oraz Android Studio (Android, potrzebny JDK 21 z jego JBR).
