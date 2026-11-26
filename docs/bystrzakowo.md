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
- **Rączka** (`src/hand.ts`, grafika z Fluxa `ui/hand-d-302`, grzbiet dłoni):
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

**Playtest:** `eval:__ff.game.scenes.current.demoStats('colors')` generuje 10 tygodni zabawy i otwiera szczegóły (pusty argument otwiera listę).

## Tablety i orientacja (2026-11-24)

- **Problem:** iPadOS 26 ignoruje `UIRequiresFullScreen` i nie obraca aplikacji tylko poziomej. Przy iPadzie trzymanym pionowo gra była wciśnięta w pionowy ekran z czarnymi pasami. Apple: TN3192; od iPadOS 27 (SDK 27) aplikacja musi działać w oknie dowolnego kształtu.
- **Rozwiązanie (decyzja właściciela: gra na cały ekran w każdym kształcie okna):**
  - iPad ma w `Info.plist` wszystkie orientacje; iPhone zostaje poziomy.
  - `Game` z kit2d dostał opcję `minWidth`. Bystrzakowo ma 960, więc w wysokim oknie szerokość zostaje 960, a rośnie wysokość.
  - Zabawy (`RoundScene`) układają się w `stage`: pas o proporcjach poziomego tabletu (wysokość do `0.78 × szerokość`) wyśrodkowany w pionie. Tło wypełnia cały ekran, warstwa zadania, konfetti i rączka są przesunięte o `stageY`, a przewodnik stoi na dole pasa.
  - Świat, naklejki, powitanie i strefa rodzica korzystają z całej wysokości.
- **Strefa rodzica na tablecie** (krótszy bok ekranu od 600 pt) ma skalę 0,72: mniejsze przyciski i teksty, więcej treści na ekranie. Ustawienia na szerokim panelu są w dwóch kolumnach.
- **Zrzuty na symulatorze:** build z `VITE_TOUR=1` (`src/tour.ts`) sam przechodzi po ekranach. Zrzuty robi `xcrun simctl io <udid> screenshot`. Pionowe zrzuty w przeglądarce: `pnpm shot … --size 820x1180@1`.

## Pisze litery: pełne alfabety (2026-11-24)

Decyzje właściciela:
- wszystkie litery alfabetu w każdym języku;
- 3 przykłady na literę;
- litery problematyczne pomijamy w każdym języku: takie, od których nie zaczyna się żadne słowo dla przedszkolaka (po polsku Ą, Ę, Ń, Y, po niemiecku Ü, ß), i takie, dla których nie ma dobrych przykładów (po polsku Ć, Ó, Ź; po angielsku X; po niemiecku Ä, Ö, X; po hiszpańsku Q, W, X);
- bez Q, V, X po polsku.

Alfabety:

| Język | Liter | Mniej niż 3 przykłady |
|---|---|---|
| polski | 25 | I |
| angielski | 25 | N, Q, Z |
| niemiecki | 25 | Q, Y |
| hiszpański | 24 (z Ñ) | Ñ, U |

- **Kształty:** `LETTERS` w `sim/letters.ts`. Nowe są Ł, V, Y, Q oraz litery ze znakiem nad sobą: Ś (kreska), Ż (kropka) i Ñ (falka). Podstawa litery jest ściśnięta w dół pola (`accented`), znak rysuje się na końcu.
- **Przykłady:** `LETTER_EXAMPLES[język][litera] = [obiekt, słowo][]`, w sumie 289, co najmniej 2 na literę. Kolejna runda z tą samą literą pokazuje następny przykład.
- **Obrazki tylko do liter:** `sim/letter-pics.ts` (42 z Fluxa, `gen-art.ts --letters`, 2 warianty, wybrany w `scripts/assets.sh`, pliki `public/art/letters/`). Nie trafiają do innych zagadek ani naklejek. Odrzucone po wygenerowaniu: igła, zamek błyskawiczny, nos (nieczytelne).
- **Playtest:** `?letters=ŁŚŻ` (tylko dev) wymusza te litery w rundzie.
- **Nagrania:** `letter-<litera>-<obiekt>`. Polskie znaki w nazwach są zamienione: ł→lw, ś→si, ż→zh, ñ→ny.
  - Wczytują się na rundę, a nie przy starcie, bo jest ich około 300.
  - Teksty i lista braków: `scripts/letters-voice.ts`. Po polsku lektor czyta nazwę litery („Eś... jak ślimak.”), w innych językach „S is for…”, „Ku wie Qualle.”, „Eñe de ñandú.”.
  - Silniki: Chatterbox z próbką Lusi (pl, de, es), VoxCPM `lusia-en-calm` (en).

## Rotacja treści w rundach (2026-11-24)

Prośba właściciela: w „Pisze litery” trzy razy z rzędu wypadło S; litery mają się zmieniać naturalnie, a te sprawiające kłopot mogą wracać częściej.
- `sim/rotation.ts`: runda bierze elementy, których dziecko najdłużej nie widziało (przy remisie: pokazywane najrzadziej), nic z poprzedniej rundy, chyba że pula jest za mała. Nowe litery po wejściu na wyższy poziom idą pierwsze.
- Kłopot (ostatnia próba z pomyłką albo 2 pomyłki w 4) = traktowane jak widziane pół cyklu wcześniej, więc wracają ok. 2× częściej, nigdy w dwóch rundach z rzędu.
- Pamięć w zapisie: `Progress.rotation` (klucze `letters:<język>`, `digits`, `syllables:<język>`). Działa dla liter, cyfr i sylab.
- Cyfry na poziomie 0 to 4 elementy przy rundzie 3: w każdej rundzie odpoczywa jedna, po kolei.

## Kolorowanka: mądry dotyk i magiczne detale (2026-11-26)

Uwaga od testerów: małych pól nie da się trafić, a dotknięcie koloruje też sąsiednie części. Przyczyny: łączenie wąskich pól sklejało osobne części (uszy z głową, ogon z kadłubem), przesunięcie palca o kilka milimetrów kolorowało sąsiada, a dotknięcie linii wybierało „najbliższe” pole. Teraz (`sim/fill.ts`: `buildRegions`, `pickRegion`, `detailShade`, testy w `fill.test.ts`):
- każda część rysunku to osobne pole (tylko drobinki poniżej 40 px łączą się z linią);
- **mądry dotyk**: każdy piksel pod opuszkiem palca (promień 30 jednostek) głosuje na swoje pole, bliższe środka mocniej; dotknięcie linii wybiera część, której jest więcej pod palcem, a celne dotknięcie małego pola nadal je koloruje;
- **magiczne detale**: pola za małe dla palca (wąskie i małe, leżące na innej części) same dostają jaśniejszy odcień części, na której leżą (ciemniejszy dla jasnych kolorów), z iskierkami; najmniejsze (np. błyski w oczach) zostają białe; detal pokolorowany ręcznie zachowuje swój kolor;
- przesuwanie palca koloruje dalsze części dopiero po wyraźnym ruchu (28 jednostek) i tylko tam, gdzie palec jest wyraźnie w jednej części.
- **odcienie**: pod paletą 12 kolorów rząd trzech odcieni wybranego koloru (jasny, zwykły, ciemny; `shadesOf`), razem 36; przycisk „gotowe” w prawym górnym rogu;
- **sceny** (2026-11-26): 9 całych scen do kolorowania obok 12 pojedynczych obrazków (plaża, las, ogród, plac zabaw, staw, podwodny świat, kosmos, pociąg, zima), `gen-art.ts --coloring-scenes`; z 30 wariantów wybrane po liczbie pól do dotknięcia i drobiazgów oraz symulacji pokolorowania (farma odpadła: stodoła zamalowana na czarno).
- **sama lupa** (2026-11-26): była krótko (dotknięcie w gąszczu drobnych części powiększało fragment, szczypanie), ale właściciel uznał ją za niewygodną dla dziecka. Usunięta po analizie konkurencji (niżej).
- **gładkie linie**: obrazek pracuje w 640 px, ale wyświetla się w 1280 px z wygładzonymi konturami (`smoothLines`, `composeSmooth`).

### Po analizie konkurencji (2026-11-26)

Kolorowanki dla przedszkolaków (Bimi Boo, „Tap & Fill”, Disney Coloring World, TegTap, PaintyPix, Baba Scribbles) nie powiększają obrazka (to pomysł z kolorowanek „według numerów” dla dorosłych). Mają duże, proste rysunki, wypełnianie jednym dotknięciem i „magiczną kredkę”, która nie wychodzi za linie. Nielsen Norman Group zaleca dla małych dzieci pola co najmniej 2 × 2 cm. Zmiany:
- **dotknięcie** wypełnia część pod palcem po oderwaniu palca (mądry dotyk wybiera część przy przyłożeniu);
- **kredka**: ruch palcem (od 18 jednostek) rysuje kredką tylko w części, w której zaczął się dotyk (maska z pikseli części, `stamp` w `sim/fill.ts`); bazgranie nie psuje sąsiadów; gdy kredka pokryje 60% części, reszta wypełnia się sama (iskierki); po oderwaniu palca kreska zostaje na obrazku;
- **obrazek ożywa**: po „gotowe” największe pokolorowane części (z konturem i detalami, `cutout`) po kolei podskakują i się kiwają, z dźwiękiem i iskierkami, potem pochwała;
- **strony na miarę ekranu**: `scripts/coloring-sizes.ts` mierzy każdą stronę (jak w grze: przycięcie, 640 px, `buildRegions`) i zapisuje w `src/sim/coloring-sizes.ts` najmniejszą szerokość obrazka (pt), przy której części mają co najmniej 14 pt średnicy (2 najmniejsze mogą być mniejsze, szczeliny < 4 px pomijane). Gra pokazuje tylko strony mieszczące się na danym ekranie (`pagesFor`): iPhone ok. 325 pt, iPad ok. 670 pt. Pojedyncze obrazki wymagają 87–374 pt, stare sceny 300–1120 pt (las, ogród, plac zabaw, staw, kosmos, pociąg, zima nie nadają się nawet na iPada);
- **proste sceny** dla maluchów: `gen-art.ts --coloring-scenes2` (2–3 duże obiekty, 8–12 dużych pól). Z 47 wariantów (12 tematów) wybrane po pomiarze i obejrzeniu: zamek z piasku, krowa, jeż, ślimak, rakieta z planetą, bałwan, rybka z rozgwiazdą, kaczka (na telefon, 160–320 pt) oraz auto z domkiem, piknik i pociąg (tylko tablet, 374–560 pt). Plac zabaw odpadł (wszystkie warianty ≥ 896 pt). Ze starych scen zostały plaża i podwodny świat; las, ogród, plac zabaw, staw, kosmos, pociąg i zima usunięte. Razem 25 stron: iPhone pokazuje 20, iPad wszystkie.
- **drobne części w tusz** (2026-11-26, uwaga właściciela: promyki słońca i kropki na rozgwieździe zostawały białe i nie dało się ich pokolorować): części mniejsze od opuszki palca na danym ekranie (powierzchnia mniejsza niż koło o promieniu 12 pt albo pasek węższy niż 4 pt) gra zamienia w czarny tusz, jak kontur (`inkSmallParts`, `tooSmall` w `sim/fill.ts`, `FINGER_RADIUS_PT` w `sim/coloring.ts`). Na obrazku nie ma już białych pól, których nie da się pokolorować. Na iPadzie obrazek jest większy, więc w tusz zamienia się mniej. `coloring-sizes.ts` dobiera teraz strony tak, żeby tusz zajął najwyżej 4% rysunku (`--preview <katalog>` zapisuje strony tak, jak wyglądają na telefonie);
- **najprostsze strony**: `gen-art.ts --coloring-scenes3` (1–2 obiekty, 5–8 dużych pól, słońce bez promieni, bez łat i kropek). Z 48 wariantów wybrane: jabłko z gruszką, kaczuszka z piłką, słońce z chmurką, baloniki, żaglówka, lody, grzybek ze ślimakiem, rakieta z księżycem oraz nowy kot i nowe autko. Usunięte strony z ponad 20 częściami: pies, dinozaur, stara rakieta, zamek z piasku, krowa, jeż, rakieta z planetą, rybka z rozgwiazdą, kaczka, auto z domkiem, piknik, pociąg, plaża i podwodny świat. Razem 19 stron, wszystkie mieszczą się na telefonie (tusz najwyżej 3%).

## Lektor z ElevenLabs (2026-11-26)

Niemieckie kwestie czytały wcześniej polskie głosy (klon „alt” i „prezenter” w VoxCPM/Chatterbox), co dawało polski akcent („Bazyl jak menel z dworca”, uwaga od rodzimej użytkowniczki). Teraz czytają je rodzimi lektorzy z biblioteki ElevenLabs, wybrani przez właściciela w castingu: **Lusia: Julia – Cheerful and Fun**, **Basil: Ben Smile – Friendly Storyteller** (model Eleven v4).
- Skrypt: `scripts/voice-eleven.ts <język>`: po 2 warianty każdej kwestii, kontrola wymowy na Legionie (`check.py`), wybór lepszego, przycięcie ciszy, normalizacja głośności, AAC. Wybór (głos, model, seed) zapisany w `voice/eleven-<język>.json`, surowe nagrania w `assets-raw/bystrzakowo/eleven/`.
- Słabe pojedyncze słowa: `--seeds 1,2,3,4,5 --only ...` (warianty już nagrane się nie powtarzają).
- Klucz API: `~/.funfactory-keys/elevenlabs.key` (plan Creator, 131 tys. kredytów/mies.; niemiecki ×2 to ok. 23 tys.).
- Wynik dla niemieckiego: mediana błędu głosek i liter 0,14 (wcześniej 0,29).
- Hiszpański (2026-11-26): **Lusia: Gaby – Warm, Tender and Inviting**, **Basil: Alejandro Ballesteros – Warm and Joyful** (akcent latynoamerykański/meksykański, jak wariant gry), 626 kwestii.
- Angielski (2026-11-26): **Lusia: Hope – Vibrant, Warm and Innocent**, **Basil: Josh – Teacher for Kids** (amerykański), 627 kwestii; mediana błędu 0,14 (wcześniej 0,20).
- Sylabowanie we wszystkich językach z ElevenLabs wyrównywane przez `scripts/voice-syllables.ts` (każda sylaba tak głośna i szybka jak pierwsza, pauzy 0,45 s i 0,85 s przed słowem). Litery: 4 warianty, wybór tego z pełną nazwą litery (rozpoznawanie bywa zawodne, ostatecznie decyduje odsłuch).
- **Polski zostaje bez zmian** (decyzja właściciela 2026-11-26): casting polskich głosów ElevenLabs i próba zamiany głosu (Voice Changer) na sylabach nie dały wyraźnej poprawy; sylabowanie z ElevenLabs brzmiało gorzej niż obecne nagrania z Chatterboxa.

## Sprawdzanie nagrań lektora (2026-11-24)

Strona odsłuchu: https://claude.ai/artifact/Q5E8oLERasRL9weZYReRmK (wszystkie ~2530 nagrań, skala podejrzeń 0–100, przycisk „Wzór”, oceny Dobrze/Źle zapisywane w bazie strony; Claude je odczytuje).
- **Skala podejrzeń:** kontrola głosek i liter (`check.py`) porównana z tekstem **i** z wymową wzorcową z Pipera (natywny syntezator na Legionie) słuchaną tymi samymi „uszami”; gdy rozpoznawanie myli się już na wzorcu, jego wynik waży mniej. Do tego pomiar dźwięku: długość względem wzoru, powtórzone słowa, doklejone dźwięki, krzyk na końcu, pauzy.
- **Poprawki:** podejrzane nagrania przegenerowane w 6 wariantach, wybór najbliższego wzorowi; podmiana tylko przy wyraźnej poprawie (61 nagrań). Potem poprawki z odsłuchu właściciela (9 polskich, m.in. „Jabłko” czytane przez VoxCPM jako „jabuko”: zapis lektora „Japko.”).
- **Szum i krzyk po końcu mowy:** koniec mowy = ostatnia głoska rozpoznana przez model głosek (`tail.py`); próbne przycięcie przed dźwiękiem po końcu mowy i ponowna kontrola, przycięcie przyjęte tylko, gdy rozpoznawanie słyszy ten sam tekst (19 nagrań, m.in. niemieckie „In Afrika” z 2 s krzyku). Głoski i pojedyncze litery wyłączone z tej poprawki.
- Szczegóły narzędzi: skill `tts` (sekcje „Wzorcowa wymowa: Piper” i „Szum po końcu mowy”).
- Do zrobienia: odsłuch przez native speakerów (de, en, es); strona ma interfejs PL/EN/DE.

## Dla rodzica

- **Strefa rodzica za bramką:** prosta matematyka albo „przytrzymaj trzema palcami”. Tam są ustawienia (głośność, lektor, wybór domków), postępy dziecka i zakup.
- **Limit czasu (opcjonalny):** po N minutach przewodnik mówi „Czas na odpoczynek!”.
- **Działa offline,** bez kont i bez reklam.

## Model biznesowy

Darmowe: 3 domki w pełni (np. cienie, co nie pasuje, liczenie). Reszta po **jednorazowym zakupie „Otwórz całe Bystrzakowo”** (ok. 29–39 zł), za bramką rodzica. Później dodajemy kolejne domki i obiekty w aktualizacjach, bez abonamentu.

## Wymogi sklepów (Kids / Families)

- Bez reklam i bez analityki. **1.0 nie zbiera żadnych danych** (sprawdzone 2026-11-24: w kodzie nie ma połączeń sieciowych poza zakupem w sklepie przez StoreKit / Google Play Billing). App Privacy: „Dane nie są zbierane”; Data safety: brak zbieranych i udostępnianych danych.
- Bramka rodzicielska przed każdym zakupem, linkiem zewnętrznym i ustawieniem.
- Polityka prywatności na mkdev, deklaracje „Dane nie są zbierane” albo minimum.
- Google Play: program „Dla rodzin”, grupa docelowa poniżej 13 lat, zgodność z zasadami treści dla dzieci.

## Produkcja treści

- **Grafika:** Flux 2 na Legionie (`flux2-sprite`), styl **plastelina** (wybór właściciela 2026-11-20, test w `assets-raw/bystrzakowo/style2/`): „soft 3D clay toy render, rounded chubby shapes, matte plasticine texture, soft studio lighting, bright cheerful pastel colors, cute and friendly, no face on objects”. Konkurent był wektor (czytelniejszy, spójniejszy). Jeśli plastelina się nie sprawdzi, zmieniamy styl, a katalog trzyma prompty, więc całość da się przegenerować.
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
| Pracownia Malucha | kolorowanka (19 prostych stron, drobiazgi w tusz, strony na miarę ekranu), naklejanka (scena z zebranych naklejek), melodia (cymbałki, powtórz) |

Strefa rodzica: muzyka, limit czasu zabawy (15/30/45 min, potem „Dobranoc”, odblokowanie zębatką), zerowanie postępów. Przy pierwszym uruchomieniu Bazyl pokazuje zakładki krain.

Dźwięk: kontekst 24 kHz, na starcie tylko polecenia; nazwy obiektów dekoduje runda (`roundItems`) i zwalnia po wyjściu (ok. 40 MB zamiast 130 MB w pamięci).

Do odsłuchu: czytanie sylabami (`lusia-read-*`), Whisper nie umie tego ocenić; „Romb” (Bazyl) z twardym „p” na końcu; „Dzięcioł” (Bazyl) z miękkim „ł”.

Research oczekiwań rodziców: `docs/bystrzakowo-rodzice.md`.

## Języki (2026-11-21)

**Nazwa w językach (decyzja 2026-11-25):** „Bystrzakowo” zostaje tylko po polsku. Po angielsku **Smartyville**, po niemiecku **Schlaudorf**, po hiszpańsku **Listolandia** (wszystkie oznaczają „krainę bystrzaków”; w dniu decyzji wolne w App Store i Google Play, „Brainyville” było zajęte). Nazwa zmienia się w tekstach gry (`locales/*.ts`), pod ikoną (iOS `ios/App/App/<język>.lproj/InfoPlist.strings`, Android `res/values-<język>/strings.xml`; domyślnie Smartyville), w kartach sklepów (`store/listing.md`) i na grafice Google Play. Adres polityki prywatności (`/apps/bystrzakowo/…`) i identyfikator aplikacji `com.mkdev.bystrzakowo` zostają.

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
