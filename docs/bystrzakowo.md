# Bystrzakowo: koncepcja

Zagadki dla przedszkolaków po polsku, z lektorem. Dziecko nie musi umieć czytać, nie może przegrać, a gra sama dobiera trudność.

## Ustalenia z właścicielem (2026-11-20)

- **Wiek:** 3–6 lat, główny cel 4–5. W App Store kategoria Kids „5 lat i mniej”.
- **Rynek:** najpierw Polska (polski lektor jest naszym wyróżnikiem), wersja angielska później.
- **Treść:** jak najwięcej rodzajów zagadek i kategorii tematycznych.
- **Głosy:** dwie postacie-przewodnicy, żeńska i męska (skill `tts`: głosy `alt` i `prezenter`).
- **Ekran:** orientacja pozioma, nastawienie na tablety (iPad, tablety z Androidem), telefony też obsługiwane. Kit2d projektuje dziś w pionie (720 szerokości), więc trzeba dodać tryb poziomy.
- **Nazwa:** Bystrzakowo (slug `bystrzakowo`). Same „Bystrzaki” odrzucone, bo kolidują z „Bystrzaki do dzieła” (Wilga) i „Dzieciaki Bystrzaki” (Winning Moves).

## Świat i przewodnicy

Bystrzakowo to wioska na polanie, w której mieszkają zwierzątka-mądrale. Dziecko odwiedza ich domki, a każdy domek to jedna rodzina zagadek.

Dwoje przewodników prowadzi dziecko, chwali je i podpowiada. Imiona są robocze:
- **Lisica Lusia** (głos `alt`): ciepła, wesoła;
- **Borsuk Bazyl** (głos `prezenter`): pogodny, energiczny.

Przewodnicy zmieniają się między domkami: każdy prowadzi swoje rodzaje zagadek, a w kwestiach wspólnych (pochwały, pomoc) mówią na zmianę.

## Główny pomysł techniczny: katalog obrazków zasila wszystkie zagadki

Gdyby każda zagadka miała ręcznie robioną treść, grafiki i nagrań byłoby za dużo. Dlatego budujemy jeden **katalog obiektów**. Każdy obiekt (np. kot, jabłko, wiadro) ma:

- ilustrację (Flux na Legionie, jeden spójny styl, przezroczyste tło),
- nazwę i nagranie nazwy („kot”) oraz zdanie („To jest kot.”),
- tagi: kategoria (zwierzę, owoc, pojazd, kuchnia…), środowisko (las, wieś, morze, dom), kolor, kształt, wielkość, pierwsza głoska, liczba sylab, dźwięk, który wydaje, „mama/dziecko” (para), przeciwieństwo, pora roku.

Silniki zagadek generują pytania z tagów. Cień powstaje automatycznie z sylwetki obrazka. „Co nie pasuje” wybiera trzy obiekty z jednej kategorii i jeden spoza niej. Głoska pochodzi z nazwy. Każdy nowy obiekt w katalogu od razu zasila wszystkie zagadki, do których pasuje. Przy około 150 obiektach to tysiące różnych pytań.

## Rodzaje zagadek (silniki)

Pierwsza wersja ma dawać wrażenie dużej gry. W kolumnie MVP: P oznacza prototyp, 1.0 pierwsze wydanie, „później” aktualizacje.

| Domek | Zagadka | Co ćwiczy | MVP |
| --- | --- | --- | --- |
| Cienie | Czyj to cień? | spostrzegawczość | P |
| Co nie pasuje | 1 z 4 nie pasuje (kategoria, kolor, kształt) | logika, kategoryzacja | P |
| Liczenie | Policz i wybierz liczbę / pokaż 3 jabłka | liczenie do 5, potem do 10 | P |
| Mamy i dzieci | Gdzie jest mama kurczaczka? | wiedza o świecie | 1.0 |
| Głoski | Co zaczyna się na „sz”? | przygotowanie do czytania | 1.0 |
| Literki | Znajdź literkę żet / obrazek na literkę | litery | 1.0 |
| Kolory | Pokaż coś czerwonego | kolory | 1.0 |
| Kształty | Dopasuj do kształtu / znajdź koło | kształty | 1.0 |
| Kto tak robi? | Dźwięk zwierzęcia i wybór zwierzęcia | słuch | 1.0 |
| Sortowanie | Przeciągnij owoce do koszyka, warzywa do skrzynki | kategoryzacja, motoryka | 1.0 |
| Pary | Memory: odkryj pary | pamięć | 1.0 |
| Co dalej? | Dokończ wzór (czerwony, niebieski, czerwony…) | sekwencje | 1.0 |
| Gdzie mieszka? | Zwierzę do domu (las, morze, wieś) | wiedza o świecie | później |
| Większe/mniejsze | Pokaż największe | porównywanie | później |
| Przeciwieństwa | Dzień i noc, mokry i suchy | słownictwo | później |
| Układanka | Puzzle z 4, a potem 6 i 9 kawałków | motoryka, przestrzeń | później |
| Sylaby | Klaszczemy sylaby: ko-tek | słuch fonemowy | później |

## Rytm rozgrywki

- **Runda to 5 pytań** z jednego domku (1–2 minuty). Na koniec naklejka i krótkie świętowanie (konfetti, przewodnik tańczy).
- **Bez przegrywania:** przy pomyłce obiekt delikatnie się trzęsie, a przewodnik mówi „Ojej, spróbuj jeszcze raz”. Po drugiej pomyłce dostajemy podpowiedź: błędne odpowiedzi blakną.
- **Trudność adaptacyjna** w każdym domku osobno: na przykład 2 → 3 → 4 odpowiedzi do wyboru, liczenie do 3 → 5 → 10, bardziej podobne cienie. Kilka bezbłędnych rund podnosi poziom, pomyłki go obniżają.
- **Album z naklejkami** to kolekcja nagród. Dzieci kochają ją zapełniać, a dla rodzica jest to widoczny postęp.
- **Juice:** każdy dotyk musi coś robić (dźwięk, sprężynka, wibracja). Zwierzątka na polanie reagują na stuknięcia, nawet poza zagadkami.

## Pierwsze uruchomienie (2026-11-24)

Decyzje właściciela: krótkie powitanie rodzica, wiek ustawia start, rączka i prowadzenie do pierwszej zagadki.

- **Powitanie rodzica** (`src/scenes/welcome.ts`, bez lektora). Ma 4 karty, każdą można pominąć:
  1. czym jest gra;
  2. strefa rodzica (przytrzymaj zębatkę, potem działanie);
  3. 3 dni pełnej wersji (karty nie ma, gdy wersja jest kupiona);
  4. wiek 3/4/5/6+ i opcjonalne imię.

  Pokazuje się tylko przy świeżym zapisie (`needsWelcome`). Gracze, którzy grali przed tą wersją, go nie zobaczą.
- **Wiek ustawia poziom startowy** wszystkich zabaw (`startLevel`):
  - 3 i 4 lata: poziom 0;
  - 5 lat: poziom 1;
  - 6+: poziom 2.

  Dalej trudność dopasowuje się jak dotąd. Wiek można zmienić w strefie rodzica (Ustawienia). Zmiana nie rusza zabaw, w które dziecko już grało. Zerowanie postępów zostawia wiek, imię, język i to, że powitanie już było.
- **Rączka** (`src/hand.ts`, grafika z Fluxa `ui/raczka-d-302`, grzbiet dłoni):
  - pokazuje gest przy pierwszym razie w każdej zabawie, w pętli, aż dziecko dotknie ekranu;
  - rodzaje gestów: stuknięcie (w dobrą odpowiedź), przeciągnięcie (pierwszy element na swoje miejsce), prowadzenie palcem (kreska litery, kropki, labirynt);
  - w kolorowance pokazuje wybór koloru i stuknięcie w pole, w melodii stuka w sztabki po pokazie Lusi;
  - przy dłuższej bezczynności (16 s) zastępuje dawną podpowiedź;
  - zabawa opisuje swój gest w `gesture()` (RoundScene).
- **Pierwsza zagadka:** na świecie rączka stuka w domek „Kolory” (do 4 lat) albo „Cienie” (5+), w zgodzie z powitaniem Lusi („Wybierz domek i pobawmy się razem!”). Bazyl pokazuje zakładki krain dopiero po pierwszej rundzie, kiedy dziecko wie już, jak się gra.
- **Playtesty** (Playwright) zaczynają od świata, bez powitania. Powitanie włącza `?welcome`.

## Statystyki „Przed szkołą” (2026-11-24)

Decyzje właściciela:
- lista 13 umiejętności;
- linia pokazuje % zadań bez pomyłki;
- rodzic wybiera wykres dzienny albo tygodniowy;
- funkcja ma zachęcać do zakupu pełnej wersji.

**Model:** `src/sim/skills.ts`, czysty TS, z testami.
- **Umiejętności:** liczy przedmioty (1–8), pisze cyfry, kolory, kształty, pierwsza głoska, pisze litery, sylaby, historyjka po kolei, wzory i rytmy, segregowanie (sortowanie i „co nie pasuje”), emocje, pamięć (pary i melodia), prowadzenie linii (kropki i labirynt).
- **Opanowanie:**
  - umiejętności z elementami pokazują „x z y” (element opanowany tak jak w raporcie, `learned` lub `mastered`);
  - pozostałe mają etap: jeszcze nie było, ćwiczy, radzi sobie, idzie pewnie (z poziomu zabawy i % z 14 dni).
- **Krzywa nauki:** % zadań bez pomyłki w okresie.
  - Okresy: 14 dni albo 12 tygodni. Punkt pojawia się od 3 zadań w dniu albo 5 w tygodniu.
  - Trójkąt oznacza wejście na wyższy poziom (z `DayLog.lvl`), bo przy wyższym poziomie % może chwilowo spaść.
  - Dni sprzed zapisu `clean` liczą się w przybliżeniu: zadania minus pomyłki.
- **Tempo:** mediana czasu dobrej odpowiedzi (od końca polecenia lektora, bez pomyłek i przerw ponad 20 s) na tym samym poziomie trudności.
  - Dotyczy kolorów, liczenia, głosek i minek.
  - Przyspieszenie to porównanie pierwszej i ostatniej części wykresu.
- **Dane:**
  - `DayLog.clean` (zadania bez pomyłki);
  - `DayLog.lvl` (poziom dnia);
  - `DayLog.ms` (czasy w dziesiątych sekundy, klucz `grupa@poziom`, do 40 dziennie).

**Ekran** (`parent.ts`, wykres w `src/chart.ts`):
- W zakładce Postępy jest lista z paskiem, wynikiem, małym wykresem i „×N szybciej”.
- Dotknięcie wiersza otwiera szczegóły: dwa wykresy, siatkę elementów (opanowane, ćwiczy, kłopot, jeszcze nie), odkrycia z datami i pomysł na zabawę bez ekranu.
- Bez porównań z innymi dziećmi.

**Sprzedaż:**
- Dopóki brakuje danych, wykres pokazuje przykładowe dziecko z etykietą „Przykład”. Wykres dzienny ma punkty po 2–3 dniach, czyli jeszcze w czasie próby.
- Po próbie lista z paskami zostaje widoczna. Wykresy są lekko rozmyte (widać, że linia rośnie), z kłódką i przyciskiem „Odblokuj pełną wersję”.

**Playtest:** `eval:__ff.game.scenes.current.demoStats('kolory')` generuje 10 tygodni zabawy i otwiera szczegóły (pusty argument otwiera listę).

## Tablety i orientacja (2026-11-24)

- **Problem:** iPadOS 26 ignoruje `UIRequiresFullScreen` i nie obraca aplikacji tylko poziomej. Przy iPadzie trzymanym pionowo gra była wciśnięta w pionowy ekran z czarnymi pasami. Apple: TN3192; od iPadOS 27 (SDK 27) aplikacja musi działać w oknie dowolnego kształtu.
- **Rozwiązanie (decyzja właściciela: gra na cały ekran w każdym kształcie okna):**
  - iPad ma w `Info.plist` wszystkie orientacje; iPhone zostaje poziomy.
  - `Game` z kit2d dostał opcję `minWidth`. Bystrzakowo ma 960, więc w wysokim oknie szerokość zostaje 960, a rośnie wysokość.
  - Zabawy (`RoundScene`) układają się w `stage`: pas o proporcjach poziomego tabletu (wysokość do `0.78 × szerokość`) wyśrodkowany w pionie. Tło wypełnia cały ekran, warstwa zadania, konfetti i rączka są przesunięte o `stageY`, a przewodnik stoi na dole pasa.
  - Świat, naklejki, powitanie i strefa rodzica korzystają z całej wysokości.
- **Strefa rodzica na tablecie** (krótszy bok ekranu od 600 pt) ma skalę 0,72: mniejsze przyciski i teksty, więcej treści na ekranie. Ustawienia na szerokim panelu są w dwóch kolumnach.
- **Zrzuty na symulatorze:** build z `VITE_TOUR=1` (`src/tour.ts`) sam przechodzi po ekranach. Zrzuty robi `xcrun simctl io <udid> screenshot`. Pionowe zrzuty w przeglądarce: `pnpm shot … --size 820x1180@1`.

## Dla rodzica

- **Strefa rodzica za bramką:** prosta matematyka albo „przytrzymaj trzema palcami”. Tam są ustawienia (głośność, lektor, wybór domków), postępy dziecka i zakup.
- **Limit czasu (opcjonalny):** po N minutach przewodnik mówi „Czas na odpoczynek!”.
- **Działa offline,** bez kont i bez reklam.

## Model biznesowy

Darmowe: 3 domki w pełni (np. cienie, co nie pasuje, liczenie). Reszta po **jednorazowym zakupie „Otwórz całe Bystrzakowo”** (ok. 29–39 zł), za bramką rodzica. Później dodajemy kolejne domki i obiekty w aktualizacjach, bez abonamentu.

## Wymogi sklepów (Kids / Families)

- Bez reklam i bez analityki firm trzecich. Nasze własne statystyki (jak w Glucie) najlepiej w 1.0 **wyłączyć** albo ograniczyć do zbiorczych liczników bez ID instalacji. Do decyzji przed wydaniem.
- Bramka rodzicielska przed każdym zakupem, linkiem zewnętrznym i ustawieniem.
- Polityka prywatności na mkdev, deklaracje „Dane nie są zbierane” albo minimum.
- Google Play: program „Dla rodzin”, grupa docelowa poniżej 13 lat, zgodność z zasadami treści dla dzieci.

## Produkcja treści

- **Grafika:** Flux 2 na Legionie (`flux2-sprite`), styl **plastelina** (wybór właściciela 2026-11-20, test w `assets-raw/bystrzakowo/styl2/`): „soft 3D clay toy render, rounded chubby shapes, matte plasticine texture, soft studio lighting, bright cheerful pastel colors, cute and friendly, no face on objects”. Konkurent był wektor (czytelniejszy, spójniejszy). Jeśli plastelina się nie sprawdzi, zmieniamy styl, a katalog trzyma prompty, więc całość da się przegenerować.
  - Ryzyka plasteliny: słabsza spójność (Flux dorabia szczegóły, np. nóżki kubka) i mniej czytelne cienie (pełne koła roweru, „bryły”). Dlatego każdy obiekt przechodzi kontrolę: podgląd obiektu i jego cienia, a obiekty o mało charakterystycznej sylwetce nie trafiają do zagadki z cieniami (tag w katalogu). Na start ok. 120–150 obiektów. Przewodnicy i tła polany jako osobne ilustracje, a postacie składane z części animowanych w kodzie.
- **Lektor:** skill `tts`. Szacunkowo: nazwy obiektów (~150), zdania o obiektach (~150), polecenia zagadek (~80), pochwały i reakcje (~40 na przewodnika), głoski, litery i liczby (~70). Razem ok. 500–600 nagrań. Przy ~5 s na kwestię to około godziny generowania z automatyczną kontrolą wymowy, a potem odsłuch próbki przez właściciela.
- **Dźwięki zwierząt i efekty:** paczki CC0 (np. Freesound CC0, Kenney) albo synteza.

## Stan (2026-11-21, noc)

Gra: `games/bystrzakowo` (Vite + Pixi + Capacitor, poziomo, `designHeight: 720`).

- **6 domków:** cienie, co nie pasuje, liczenie (dotykanie i liczenie na głos), kolory (plama farby i „Pokaż coś czerwonego”), głoski (litera i „Co zaczyna się na głoskę…”, bez głosek zwartych k/p/t/b/d/g), mamy i dzieci.
- **Katalog:** 115 obiektów w 8 kategoriach (`src/sim/catalog.ts`): kolor, sylwetka, liczenie, pary mama–młode, pierwsza głoska liczona z nazwy. Obiekt bez grafiki wypada z gry, domek bez treści się chowa.
- **Rytm:** rundy po 5 pytań, naklejka na koniec, trudność adaptacyjna w każdym domku, podpowiedzi przy bezczynności (8 s: polecenie jeszcze raz, 16 s: dobra karta się kołysze), dotknięcie przewodnika powtarza polecenie.
- **Album naklejek** (brakujące jako cienie, strony gestem albo strzałkami), **strefa rodzica** (przytrzymaj zębatkę 2 s: muzyka, zerowanie postępów).
- **Lektor:** Lusia (`alt`) i Bazyl (`prezenter`), skrypty `scripts/voice.sh` i `voice/lines*.json`.
- **Grafika:** `scripts/gen-art.ts` (Flux na Legionie), `scripts/assets.sh` (WebP do `public/art`), `scripts/icon.sh` (ikona i ekran startowy).
- **Muzyka:** ACE-Step, cicha pętla 64 s.
- **Kontrola sensu zagadek** (przegląd wszystkich 115 obrazków, cieni i pytań na zrzutach):
  - obiekty podobne do siebie (kot i kotek, koń, źrebak, zebra i konik, auto i ciężarówka…) nie trafiają razem do jednego pytania (`LOOKALIKES`);
  - w „co nie pasuje” intruz pochodzi z kategorii wyraźnie innej (bez motyla wśród kwiatków ani autka wśród zabawek; owoce kontra warzywa dopiero na najwyższym poziomie);
  - głoski zmiękczone liczone poprawnie (Ziemniak = ź, Cielaczek = ć);
  - cienie tylko dla obiektów o charakterystycznym konturze, kolory tylko tam, gdzie kolor jest jednoznaczny;
  - młode zwierzęta wygenerowane jako wyraźnie małe (leżące, duża głowa), żeby nie myliły się z mamą.

## Krainy (decyzja 2026-11-21)

Właściciel: zagadki mają być różnorodne, nie tylko wybór z trzech. Gra dzieli się na krainy, a każda kraina to inny rodzaj zabawy. Krainy przewija się gestem w bok albo zakładkami u góry; album, przewodnicy i strefa rodzica są wspólne. Za każdą rundę w dowolnej krainie jest naklejka.

1. **Polana Zagadek** (dotknij i wybierz): cienie, co nie pasuje, liczenie, kolory, głoski, mamy i dzieci; później memory.
2. **Warsztat Bazyla** (przeciągnij i ułóż): segregowanie (kategorie, kolory do wiaderek, „kto gdzie mieszka”: wieś, las, woda), układanka (2/4/6 kawałków); później „co dalej?” (wzory), od najmniejszego do największego, ubieranie na pogodę.
3. **Ścieżka Lusi** (prowadź palcem): łączenie kropek, labirynt, litery po śladzie.
4. **Pracownia Malucha** (twórz, bez złych odpowiedzi): kolorowanka, naklejanka (scena z zebranych naklejek).

Kolejność budowy: nawigacja i Warsztat, potem Ścieżka, potem Pracownia, na końcu dokładki. Krainy mogą też wyznaczyć podział na część darmową i płatną (decyzja później).

Kod: `src/sim/realms.ts` (krainy i zabawy), `src/scenes/world.ts` (świat), `src/scenes/round.ts` (wspólna rama rundy: przewodnik, gwiazdki, podpowiedzi, naklejka), zabawy w `src/scenes/{puzzle,sort,jigsaw}.ts`, logika w `src/sim/{puzzles,sorting,jigsaw}.ts`.

### Stan krain (2026-11-21, popołudnie)

| Kraina | Zabawy |
|---|---|
| Polana Zagadek | cienie, co nie pasuje, liczenie, kolory, głoski, mamy i dzieci, memory (pary; na końcu obrazek i cień), emocje (minki) |
| Warsztat Bazyla | segregowanie (6 reguł), układanka, co dalej (wzory), sorter kształtów, sylaby (21 słów), historyjki obrazkowe (6 × 3 kadry) |
| Ścieżka Lusi | łączenie kropek, labirynt, litery po śladzie (12), cyfry po śladzie (0–9, potem liczenie) |
| Pracownia Malucha | kolorowanka (12 stron), naklejanka (scena z zebranych naklejek), melodia (cymbałki, powtórz) |

Strefa rodzica: muzyka, limit czasu zabawy (15/30/45 min, potem „Dobranoc”, odblokowanie zębatką), zerowanie postępów. Przy pierwszym uruchomieniu Bazyl pokazuje zakładki krain.

Dźwięk: kontekst 24 kHz, na starcie tylko polecenia; nazwy obiektów dekoduje runda (`roundItems`) i zwalnia po wyjściu (ok. 40 MB zamiast 130 MB w pamięci).

Do odsłuchu: czytanie sylabami (`lusia-czytaj-*`), Whisper nie umie tego ocenić; „Romb” (Bazyl) z twardym „p” na końcu; „Dzięcioł” (Bazyl) z miękkim „ł”.

Research oczekiwań rodziców: `docs/bystrzakowo-rodzice.md`.

## Języki (2026-11-21)

Polski (podstawowy), angielski, niemiecki i hiszpański (latynoamerykański, słownictwo meksykańskie) w jednej aplikacji. Język: z telefonu (spoza listy: angielski),
rodzic zmienia go w Ustawieniach strefy rodzica; w playtestach `?lang=en|de|pl`.

- **Teksty na ekranie**: `tr('polski tekst')` (`src/sim/i18n.ts`), słowniki `src/sim/locales/{en,de}.ts`.
  Test `i18n.test.ts` pilnuje, żeby każdy tekst miał tłumaczenie i żeby w kodzie ekranów nie było polskich napisów poza `tr()`.
- **Raport dla rodzica**: zdania w `src/sim/report-text.ts` (każdy język osobno, z własną gramatyką liczebników).
- **Nazwy obiektów**: `src/sim/names.ts`.
- **Zabawy zależne od języka**: „Głoski” po angielsku i niemiecku to pierwsza litera słowa (tak uczą tamtejsze przedszkola;
  słowa z dwuznakiem na początku są pomijane), sylaby (`WORDS_EN`, `WORDS_DE`), literki z obiektami z danego języka
  (po angielsku bez „I”, po hiszpańsku bez „I”, „K” i „W”, bo w katalogu nie ma do nich obiektów; po hiszpańsku „H” pominięte, bo jest nieme).
- **Lektor**: `node games/bystrzakowo/scripts/voice-i18n.ts` → `voice/{en,de}.json`, nagrania `scripts/voice-lang.sh en|de`
  → `public/audio/<język>/<głos>/`. Głosy: rodzime wzorce `lusia-en`, `bazyl-en`, `lusia-de`, `bazyl-de`, `lusia-es`, `bazyl-es` (z opisu w VoxCPM2);
  polskie wzorce czytały angielskie słowa z akcentem („Cat” jak „Cut”). Bazyl to po angielsku i niemiecku Basil.
- **Do zrobienia przed wydaniem**: odsłuch przez rodzimego użytkownika (Whisper sprawdza tylko zrozumiałość),
  opisy i zrzuty do sklepów w obu językach.

## Testy (2026-11-23)

- `pnpm check`: logika (Vitest), w tym różnorodność i jednoznaczność zagadek.
- `node games/bystrzakowo/scripts/variety.ts`: ile różnych treści widzi dziecko w każdej zabawie, jak często rundy się powtarzają.
- `node games/bystrzakowo/scripts/monkey.ts [zabawy] [--taps 50]`: test „małpki” – losowe stuknięcia i przeciągnięcia w każdej zabawie, wyłapuje błędy JS i zawieszenia (zrzuty w `.shots/monkey/`).
- `node tools/playtest/drive.ts games/bystrzakowo --port 7777 --query "full&lang=pl"`: gra działa w tle i przyjmuje polecenia HTTP (`/shot`, `/tap`, `/drag`, `/wait`, `/eval`) we współrzędnych zrzutu. Na tym działa „agent-dziecko”: subagent, który gra jak 4-latek i raportuje, co dziecko zatrzyma lub zmyli (opis zadania: w historii sesji z 2026-11-22/23). Pierwsze rundy znalazły m.in.: blokadę przeciągania po przerwanym dotyku (`pointercancel`, naprawione w kit2d), za słabą bramkę rodzica (2026-11-24, decyzja właściciela: strefa rodzica otwiera się samym przytrzymaniem zębatki, a mnożenie z 4 odpowiedziami chroni zakup, przywracanie zakupu i każde „Wyślij”), sylaby rozwiązywalne bez czytania, niejednoznaczne historyjki.
- Nagrania lektora: skill `tts`, automatyczny wybór wariantów (`syl/cb-best.mjs`, `syl/select.mjs`, `syl/sound.mjs`) – powtórzenia, krzyk, szum, budowa kwestii. Właściciel słucha tylko tego, co przeszło.
- Pojedyncze słowa z Chatterboxa przycina `syl/word.mjs` (model potrafi coś dopowiedzieć po słowie, a rozpoznawanie mowy tego nie zgłasza); przycięte wersje przechodzą drugą kontrolę (`check.py`) przed instalacją.
- Niemiecki i hiszpański: cały lektor z Chatterboxa na polskich próbkach Lusi i Bazyla (`voice/<język>.json`: `engine: chatterbox`, `seed`, próbka). `scripts/voice-i18n.ts` nie nadpisuje takich wpisów.
- Czcionka: w Baloo 2 kreska w „ł” była prawie pozioma i dzieci myliły ł z t; `scripts/font-slash.py` obraca ją o 32°.

## Plan

1. **Prototyp (3 domki: cienie, co nie pasuje, liczenie):** katalog z ~20 obiektami, silniki zagadek w czystym TS z testami, polana z trzema domkami, lektor, naklejka po rundzie. Cel: sprawdzić na dziecku, czy jest zabawnie i zrozumiale.
2. **Styl graficzny:** 2–3 warianty stylu z Fluxa (obiekt, przewodnik, polana) do wyboru przez właściciela, przed masową produkcją katalogu.
3. **Rozbudowa do 1.0:** 12 domków, ~150 obiektów, album, strefa rodzica, zakup, adaptacyjna trudność.
4. **Wydanie:** jak Glut (`docs/release.md`), plus wymogi Kids/Families.

## Otwarte pytania

- Imiona i gatunki przewodników (lisica i borsuk to propozycja).
- Cena i podział darmowe/płatne.
- Statystyki w 1.0: wyłączone czy zbiorcze bez ID?
