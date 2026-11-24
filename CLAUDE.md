# Funfactory: zasady pracy

Monorepo do tworzenia mobilnych gier 2D (iOS + Android). Claude projektuje, koduje i weryfikuje gry sam. Właściciel decyduje, co budujemy.

## Stack

- TypeScript + Vite, pnpm workspaces, Node ≥ 22.18 (skrypty `.ts` uruchamiane bezpośrednio przez `node`)
- Renderowanie 2D: PixiJS v8 (WebGL)
- Natywnie: Capacitor 8 (iOS w Xcode, Android w Android Studio / Gradle)
- Testy: Vitest (logika), Playwright (zrzuty i gesty w emulowanym telefonie)
- Grafika: SVG z kodu (`@funfactory/art`), paczki CC0, ComfyUI z Flux 2 na Legionie (skill `comfyui`, w repo: `pnpm comfy`)

## Układ

```
packages/core     logika niezależna od renderera: Loop, Tweens, Spring, Rng, Emitter, Timers, SaveStore, haptics, Sound
packages/art      kolory (OKLab), palety, builder SVG, szum. Bez zależności od Pixi
packages/kit2d    Pixi: Game (skalowanie, safe area), Scene/SceneManager, juice, Particles, Button, gestures, svgTexture
lab/              stanowisko testowe zestawu (nie gra). Tu sprawdzamy nowe elementy kit2d
templates/game/   szablon dla `pnpm new-game`
games/<slug>/     gry. Każda to aplikacja Vite + Capacitor
tools/            playtest (shot.ts), new-game
```

## Zasady

1. **Nie twórz gier bez ustaleń z właścicielem.** Koncepcję gry planujemy osobno przed kodowaniem.
2. **Kod gry trzymaj w `games/<slug>/`.** Do `packages/` przenoś tylko rzeczy, których potrzebują co najmniej dwie gry albo które są ewidentnie ogólne. Pakiety nie mogą importować z gier ani z lab.
3. **Projektuj w jednostkach gry:** szerokość 720, wysokość zmienna (`game.view.height`). UI przyklejaj do krawędzi z uwzględnieniem `view.safe`. Pola dotyku mają minimum 88 jednostek.
4. **Animacje w scenie robią `this.tweens` i `this.timers`**, nie `setTimeout`. Wtedy działają pauza, slow-motion i sprzątanie przy zmianie sceny. W `enter()` nie czekaj na `tween.done`.
5. **Losowość tylko przez `game.rng`** (seed z `?seed=`), żeby playtesty były powtarzalne.
6. **Każda scena woła `this.game.markReady()`**, gdy jest gotowa do zrzutu.
7. **Zapis gry przez `SaveStore`**, haptyka przez `haptics`. Nie wołaj Capacitora bezpośrednio w grach.
8. **Tylko składnia „wymazywalna” TypeScriptu** (`erasableSyntaxOnly`): bez `enum` i bez właściwości w parametrach konstruktora. Dzięki temu logikę gier (symulacje, boty do strojenia) da się uruchomić wprost przez `node plik.ts`.
9. **Logikę gry trzymaj w czystym TS bez Pixi** (`games/<slug>/src/sim/`): testy Vitest, a do strojenia trudności bot grający w symulację (wzór: `games/glut/src/sim/bot.ts`).

## Pętla weryfikacji (obowiązkowa)

Po każdej zmianie wizualnej albo w rozgrywce:

```sh
pnpm check                                   # typecheck wszystkiego + testy jednostkowe
pnpm shot <lab|games/slug> --steps "..."     # zrzuty do .shots/<nazwa>/, potem obejrzyj je (Read)
pnpm shot games/slug --browser webkit        # silnik Safari: łapie błędy specyficzne dla iOS
```

Opcje: `--gpu` (płynnie, do nagrań), `--size 440x956@3` (dokładny rozmiar ekranu, np. zrzuty do sklepu 1320×2868). Kroki dodatkowe: `eval:<js>`, `rec:start` / `rec:save:<nazwa>` (nagranie mp4). Kroki: `wait:<ms>`, `shot:<nazwa>`, `tap:x:y`, `drag:x1:y1:x2:y2`, `swipe:x1:y1:x2:y2`, `hold:x1:y1:x2:y2` + `release` (współrzędne w jednostkach gry). `--query diag` dokleja parametry do URL. Jeśli shot kończy się kodem 1, to na stronie był błąd JS albo scena nie zgłosiła gotowości. Nie zgłaszaj, że coś działa, dopóki nie obejrzysz zrzutu. Pamiętaj, że gest startujący w polu przycisku trafia do przycisku.

**Emulacja nie zastępuje telefonu.** Playwright i symulator iOS nie odtwarzają wszystkich błędów prawdziwego iPhone'a. Przykład: wgranie dużego canvasa do WebGL dawało na urządzeniu przezroczystą teksturę. Dlatego:
- tekstur nie twórz przez `Texture.from(canvas)`; rysuj na canvasie i przekazuj piksele przez `pixelsToTexture` (ImageBitmap); `svgTexture` robi to sam,
- gdy coś nie wygląda dobrze tylko na telefonie, poproś o `?diag` (tryb diagnostyczny gry) i zrzut ekranu, zamiast zgadywać.

Natywnie:

```sh
pnpm --filter @funfactory-game/<slug> ios       # build + sync + otwiera Xcode
IOS_DEVICE="<nazwa|UDID>" pnpm --filter @funfactory-game/<slug> ios:device   # build + instalacja na podłączonym iPhonie (bez Xcode)
pnpm --filter @funfactory-game/<slug> apk       # debug APK (Gradle z JDK 21 z Android Studio)
xcodebuild -project games/<slug>/ios/App/App.xcodeproj -scheme App -sdk iphonesimulator CODE_SIGNING_ALLOWED=NO build
```

Wydanie do sklepów (podpisany AAB, archiwum iOS, grafiki, teksty, kroki dla właściciela): `docs/release.md`. `pnpm --filter @funfactory-game/<slug> aab` buduje podpisany pakiet dla Google Play (klucz uploadu poza repo, w `~/.funfactory-keys/`).

Capacitor 8 wymaga JDK 21. Systemowa Java to 17, więc buildy Gradle z CLI muszą mieć `JAVA_HOME` ustawione na JBR z Android Studio (skrypt `apk` robi to sam).

## Grafika

Kolejność wyboru:

1. **SVG z kodu**: postaci składane z części (ciało, oczy, kończyny jako osobne sprite'y), animowane w kodzie. Wzorzec: `lab/src/blob-character.ts`. Tekstury renderuj przez `svgTexture(markup, game.pixelRatio)`.
2. **Proceduralnie**: tła i tekstury z `Noise2D`, cząsteczki, Graphics.
3. **Paczki CC0** (Kenney, Quaternius, KayKit itp.): tylko CC0 albo licencje wprost pozwalające na użycie komercyjne. Każde źródło wpisz do `games/<slug>/CREDITS.md`.
4. **ComfyUI / Flux 2** (`pnpm comfy gen`, workflow `flux2`, `flux2-sprite`, `flux2-klein`): sprite'y z przezroczystym tłem, tła, ilustracje, ikony, grafiki do sklepu. Po sesji `pnpm comfy free`. Surowe wyniki trafiają do `assets-raw/` (ignorowane). Wybrane pliki kopiuj do `games/<slug>/public/` razem z plikiem `.json` z promptem i seedem.

Jedna gra ma jedną paletę (`palettes` albo własna w tym samym formacie). Grafika z każdego źródła ma się do niej stosować.

## Juice: minimum dla każdej interakcji

Reakcja wizualna (squash/pop/pulse), dźwięk, haptyka, a przy mocnych zdarzeniach cząsteczki i trzęsienie (`Shaker`) albo `game.hitstop()`. Gra bez tego wydaje się martwa.

## Język

Zero polskiego w kodzie: identyfikatory, wartości w danych (id obiektów, zabaw, kluczy zapisu), nazwy plików (także grafik i nagrań) i komentarze po angielsku. Teksty na ekranie trzymaj w słownikach (`locales/pl.ts` itd., klucze po angielsku), nie w kodzie. Dokumentacja (`docs/`) zostaje po polsku.

Wyjątek na razie: Glut (wersja w recenzji sklepu) i pakiety, z których korzysta. Nowy kod pisz już po angielsku.
