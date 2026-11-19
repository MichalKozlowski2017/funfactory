# Glut: projekt gry (smoke test)

Status (2026-11-18): **kroki 1–4 gotowe.** Prototyp, pętla gry z syropem, grafika, dźwięk, cukierki, ekran startowy i sklep z czapkami.
Odłożone: buildy natywne (testujemy w przeglądarce).

Ceny czapek (bot w ludzkim tempie zbiera ok. 15 cukierków na bieg): imprezowa 30, kucharska 60, korona 120, czarodzieja 200.

## Cel

Glut to pierwsza gra Funfactory. Jej główne zadanie to przetestowanie łańcucha: pomysł → kod na `kit2d` → grafika z kodu i z Flux → playtesty. Testujemy w przeglądarce (także na telefonie); buildy iOS i Android na razie pomijamy. Monetyzacji i publikacji w sklepie na razie nie ma.

## Pomysł w jednym zdaniu

Kleisty slime wspina się po cukierkowej studni: przeciągasz palcem jak procą, slime leci i przykleja się do ścian, a od dołu goni go podnoszący się syrop.

## Główna pętla (5–60 s na podejście)

1. Slime wisi przyklejony do ściany albo platformy.
2. **Celowanie:** przytrzymaj palec w dowolnym miejscu ekranu i przeciągnij do tyłu. Siła rośnie z długością przeciągnięcia (z limitem), a kropki pokazują tor lotu.
3. **Strzał:** puszczasz palec, slime leci po paraboli i rozciąga się w locie.
4. **Przyklejenie:** przy dotknięciu powierzchni slime się spłaszcza, zostaje kleks, a telefon lekko wibruje.
5. Przez cały czas od dołu podnosi się **syrop**, coraz szybciej z wysokością. Gdy dogoni slime'a albo slime dotknie kolców, podejście się kończy.
6. Wynik to osiągnięta wysokość, a po drodze zbiera się **cukierki**.

Strzał możliwy jest tylko wtedy, gdy slime jest przyklejony, więc nie da się „latać” w powietrzu. Ruch palca z powrotem do punktu startu anuluje celowanie.

## Świat

- Pionowa studnia o szerokości 720 jednostek. Ściany po bokach i półki wystające do środka.
- Świat generuje się kawałkami (ok. 1 ekran na kawałek) z `game.rng`. Ten sam seed daje tę samą studnię, co jest ważne dla playtestów.
- **Powierzchnie (MVP):**
  - **lukier**: zwykła, klei się
  - **lód cukrowy**: slime powoli zjeżdża w dół, trzeba szybko strzelić
  - **kolce z karmelu**: śmierć. Tylko na ścianach (kolce pod półkami usunięte po testach na telefonie: zabijały zza kadru)
- Trudność rośnie z wysokością: większe odstępy, więcej lodu i kolców, szybszy syrop.

## Ekrany

1. **Start:** tytuł, slime na dnie studni, napis „Dotknij, aby zacząć” i najlepszy wynik.
2. **Gra:** u góry wysokość i liczba cukierków, poza tym czysty ekran.
3. **Koniec:** wysokość, rekord (z animacją, jeśli jest nowy), cukierki i przycisk „Jeszcze raz”. Od śmierci do nowego podejścia ma minąć mniej niż sekunda.
4. **Szafa** (ekran startowy): czapki, kolory, ślady i dodatki za cukierki. Obok **Wyzwanie dnia** i Ustawienia.

## Grafika (paleta `candy`)

| Element | Źródło | Uwagi |
| --- | --- | --- |
| Slime (ciało, oczy, kleks) | SVG z kodu | Pełna kontrola animacji: squash/stretch, mruganie, oczy patrzą w kierunku celowania |
| Czapki (4 szt.) | Flux `flux2-sprite` | Test spójnej serii sprite'ów z przezroczystym tłem |
| Tło studni (2–3 warstwy paralaksy) | Flux `flux2` | Cukierkowa jaskinia, pastelowe, mało detali, kafelkowane w pionie |
| Powierzchnie (lukier, lód, kolce) | SVG z kodu | Czytelność gameplayu jest ważniejsza niż detal |
| Cukierek do zbierania | Flux `flux2-sprite` albo SVG | Do wyboru po teście |
| Syrop | Kod (Graphics + shader fali) | Animowana fala z bąblami |
| Ikona aplikacji | Flux `flux2` | 1024×1024 |

Projekt slime'a to rozwinięcie tego z lab: różowy, błyszczący, z grubym konturem, w stylu próbnej grafiki z Flux.

## Juice (minimum)

- Lądowanie: squash proporcjonalny do prędkości, rozbryzg kropli w kolorze slime'a, kleks na ścianie, haptyka `hit`.
- Lot: rozciągnięcie wzdłuż wektora prędkości, ślad z cząsteczek.
- Celowanie: slime ściska się w stronę przeciągnięcia (napięcie), drży przy pełnej sile.
- Cukierek: pyknięcie, cząsteczki, licznik pulsuje, dźwięk z rosnącą wysokością przy serii.
- Śmierć: hit-stop, trzęsienie ekranu, slime rozpryskuje się na krople.
- Nowy rekord: konfetti i haptyka `success`.

## Dźwięk

Efekty syntezowane w kodzie (Web Audio, styl sfxr): strzał, plaśnięcie, cukierek, śmierć, rekord. Muzyki w MVP nie ma.

## Technika

- Własna prosta fizyka: slime to koło, ściany i półki to prostokąty, w kroku stałym 1/60 s z podkrokami, żeby szybki slime nie przelatywał przez ściany. Rapier nie jest potrzebny.
- Kamera płynnie podąża w górę i nigdy nie zjeżdża w dół.
- Zapis (`SaveStore`): rekord, cukierki, kupione i założone rzeczy z szafy, ustawienia, wyniki wyzwań dnia.

**Dodatki do frameworka, które wyjdą przy tej grze** (trafią do `packages/`, bo są ogólne):
- `kit2d`: kamera z podążaniem i paralaksą
- `core`: syntezator efektów dźwiękowych (sfxr-like)
- `kit2d`: kropki toru lotu (helper do celowania procą)

## Poza zakresem MVP

Buildy natywne (iOS, Android), powierzchnie odbijające i ruchome, bossy, misje, ranking online, reklamy, muzyka, lokalizacja poza polskim.

## Plan pracy

1. **Szary prototyp:** fizyka, proca, przyklejanie, kamera, ręcznie ułożony poziom. *Czy samo strzelanie daje frajdę?* Tu jest punkt kontrolny z Tobą: zagrasz w przeglądarce na telefonie.
2. **Pętla gry:** generator studni, syrop, śmierć i restart, wysokość, rekord.
3. **Grafika i juice:** slime z SVG, generowanie teł, czapek i cukierka na Legionie, efekty, dźwięki.
4. **Ekrany i zapis:** start, koniec, skórki.
5. ~~Telefon: buildy iOS i Android~~: odłożone, na razie gramy w przeglądarce.

## Kryteria „gotowe”

- Gra działa płynnie w przeglądarce na komputerze i na telefonie (Safari na iOS, Chrome na Androidzie).
- `pnpm check` przechodzi, a testy obejmują deterministyczny generator i fizykę (brak przelatywania przez ściany).
- Scenariusze `pnpm shot` (start, strzał, lądowanie, śmierć, restart) przechodzą w Chromium i WebKit.
- Wszystkie grafiki z Flux mają w repo obok siebie plik `.json` z promptem i seedem.

## Krok 5: power-upy

Power-upy zdobywa się w trakcie biegu: świecące bańki w studni, rzadsze od cukierków, często w ryzykownych miejscach. **Każdy działa od razu po zebraniu** (decyzja: większa dynamika).

| Power-up | Działanie |
| --- | --- |
| Gumowa skorupka | 10 s ochrony: uderzenie w kolce odbija slime'a zamiast zabić (zużywa skorupkę) |
| Drugi oddech | Przez 10 s skoki w locie nie słabną |
| Magnes | 10 s: cukierki z dużego promienia lecą do slime'a |
| Lodowy oddech | Syrop zamarza na 6 s i opada o 4 m |
| Pieprzowa rakieta | 1,4 s lotu w górę przez wszystko, bez obrażeń |
| Lepkie łapki | 10 s: lód klei zamiast ślizgać się, także lodowe sufity |

## Światy co 100 m

Glut wspina się przez Cukrową Wieżę: im wyżej, tym starsze i bardziej zapomniane piętra. Mrok dopiero od 400 m (większość biegów kończy się wcześniej; mrok to nagroda dla dobrych graczy). Od drugiego świata część lukrowanych półek ma **mechanikę** (osobny strumień losowy: układ półek się nie zmienia, a dla danego seedu wszyscy mają to samo, więc ranking zostaje uczciwy).

| Od | Świat | Nastrój | Półki (szansa na lukrowanej półce) |
|---|---|---|---|
| 0 m | Kryształowa jaskinia | jasno, słodko | zwykłe |
| 100 m | Czekoladowa kopalnia | ciepło | czekolada 45% |
| 200 m | Żelkowy las | kolorowo | galaretka 40%, czekolada 10% |
| 300 m | Chmury z waty cukrowej | zachód słońca | chmury 50% |
| 400 m | Spalony karmel | noc, żar, dym | czekolada 35%, galaretka 20% |
| 500 m | Lukrecjowe bagno | czerń, mgła, zielone światełka | chmury 30%, czekolada 25% |
| 600 m | Opuszczona fabryka | rdza, migające lampy | taśmociągi 50%, czekolada 15% |
| 700 m+ | Cukrowy koszmar | ciemność, wiśniowa galareta | wszystko po trochu |

Mechaniki (`sim/physics.ts`, `FEATURE`; wygląd `fx/features.ts`, kolory stałe we wszystkich światach jak lód i kolce):

- **Czekolada** kruszy się po 1,3 s stania (trzeszczy, pęka, drży coraz mocniej), potem znika i slime spada. Pasuje do serii: nie wolno się zawahać.
- **Galaretka** odbija jak trampolina (z góry min. 1500, czyli ok. 4 m w górę) i zaczyna nowy lot: skoki w locie znów mają pełną siłę.
- **Chmura** przepuszcza od dołu i z boku, trzyma tylko lądowanie z góry.
- **Taśmociąg** wiezie stojącego slime'a (130/s) zawsze od ściany do środka (nigdy na ścianę z kolcami) i zrzuca z krawędzi.

Baner przy wejściu do świata ma podpowiedź o nowej mechanice. Bot: mediana 261 m przed zmianą 276 m (szybki), 153 wobec 156 m (wolny), więc trudność prawie bez zmian.

Każdy świat: tło (`public/art/biomes/<id>/bg.jpg`, ten sam przepis co `bg.jpg`), cukierek (`candy.png`), paleta ścian i półek (lód i kolce wszędzie te same, dla czytelności), kolor syropu i poświaty, cząsteczki w powietrzu, mrok przy krawędziach, migotanie (fabryka). Na ostatnich 8 m tło przenika w następne; przy wejściu baner z nazwą i akord (niższy w mroczniejszych światach). Kod: `sim/biomes.ts` (granice), `fx/biome-look.ts` (wygląd).

## Muzyka proceduralna (w duchu Tetris Effect)

Muzyka składa się na żywo w kodzie (`src/fx/score.ts`). Barwy to próbki prawdziwych instrumentów z VSCO 2 CE (CC0, ok. 1 MB w `public/audio/samples/`, skrypt `tools/audio/samples.ts`); do czasu ich wczytania (albo gdy się nie wczytają) gra synteza, `?synth` wymusza syntezę. Każdy świat ma tempo, kolejkę akordów (jasne np. Am–F–C–G, mroczne Am–Dm–E, Am–B♭–Am–E) i własne barwy (dzwonki, marimba, pady, bas, perkusja, pozytywka, metaliczne uderzenia). Wszystko w a-moll.

- **Warstwy wg intensywności** (zmiana na początku taktu): menu = pad; bieg = bas i stopa; seria ×2 = hi-hat i arpeggio; ×5 = werbel, pełna perkusja, drugie arpeggio; ×10 = melodia.
- **Akcje grają nuty z aktualnego akordu**: strzał (wyższa nuta = mocniejszy), cukierki w locie (wznosząca się melodia), seria (melodia w górę), skok w locie (błysk oktawę wyżej), lądowanie (pryma w basie), kamień milowy (przebieg w górę + talerz w takt), zerwanie serii (dwie opadające nuty), śmierć (akord rozpada się w dół).
- **Napięcie**: syrop blisko = bicie serca, niepokojąca sekunda i zamknięty filtr; slow-motion zwalnia tempo i przytłumia.

Płynność: pętla wyrównuje drgający czas klatek (zawsze 1 krok fizyki na klatkę przy 60 Hz), slime, kamera i syrop są rysowane między krokami, liczniki to tekst bitmapowy (`fx/hud-font.ts`). Ukryty licznik wydajności: Ustawienia → 5 stuknięć w numer wersji (albo `?perf`).

Próba z gotowymi utworami z ACE-Step 1.5 (Legion) odrzucona: nagrań nie da się rozebrać na ścieżki reagujące na grę. Model zostaje na Legionie (np. na muzykę do menu).

## Rywalizacja: zasady równe dla wszystkich

Decyzja właściciela: rozgrywka ma być kompetytywna i zawsze taka sama, bo planujemy leaderboard. Za cukierki kupuje się **tylko kosmetykę**, nigdy nic, co wpływa na grę: bez ulepszeń power-upów, bez boosterów na start. Wypróbowane ulepszenia leżą na gałęzi `archiwum-ulepszenia`.

### Szafa (kosmetyka)

Cztery działy po 6 rzeczy, po jednej założonej z każdego (`sim/shop.ts`, grafika `fx/cosmetics.ts` z kodu SVG, czapki z Fluxa). Ceny 400 / 1000 / 2500 / 5000 / 10 000: przeciętny gracz zbiera ok. 1500–2500 cukierków na godzinę (bot: 1700–6700/h zależnie od refleksu), więc to od kwadransa do kilku godzin na rzecz, a cała szafa to kilkadziesiąt godzin (decyzja właściciela: „coś, na co trzeba zapracować długą grą”). Szósta rzecz w każdym dziale jest tylko za osiągnięcie.

- **Czapki:** imprezowa, kucharska, piracka, korona, czarodzieja; **rogi** za 700 m.
- **Kolory:** miętowy, cytrynowy, lodowy, winogronowy, złoty; **tęczowy** (animowany) za serię ×20. Kolor przechodzi na ślad, kleksy i cząsteczki.
- **Ślady w locie:** bąbelki, serduszka, nutki, gwiazdki, tęcza; **ogień** za 25 ratunków.
- **Dodatki:** kokarda, wąsy, słuchawki, okulary, monokl; **medal** za wyzwanie dnia 7 dni z rzędu.

### Osiągnięcia

38 osiągnięć (`sim/achievements.ts`): wysokości 50–700 m (każdy świat), na czas (100 m w 30 s, 200 m w minutę, 300 m w 1:30, 50 i 100 cukierków w pierwszej minucie, przetrwanie 2 i 5 minut; progi z pomiaru botem, czas gry, więc slow-motion nie oszukuje zegara), serie ×5–×20, skoki w locie, cukierki w jednym skoku, ratunki, odbicia od galaretki, pokruszone czekolady, wszystkie power-upy, liczba biegów (10/100/500), zebrane cukierki (1 tys. / 10 tys. / 50 tys.), wyzwanie dnia (pierwsze, 3 i 7 dni z rzędu), coś z każdego działu szafy. Nagrody w cukierkach (100–3000), cztery dają rzeczy do szafy. Liczniki w zapisie (`stats`), postęp w panelu (przycisk „Osiągnięcia” na ekranie startowym), powiadomienie z pucharem w trakcie gry (tekst bitmapowy, bez zacięć).

### Tryb pokazowy (ekran startowy)

Na ekranie startowym bot gra prawdziwy bieg w tle (autopilot jak w `?bot`, bez slow-motion), a muzyka reaguje na jego akcje. Bieg pokazowy (`demoRun`) niczego nie zapisuje: bez rekordu, cukierków na konto (`wallet()`), statystyk, osiągnięć, rankingu i reklam; efekty dźwiękowe i wibracje milczą (`sfx()` / `buzz()`, dźwięki interfejsu grają), bez napisów nad menu. Po śmierci bota po cichu startuje kolejny pokaz; przycisk „Graj” (albo wyzwanie dnia) daje graczowi świeży bieg. Kamera trzyma slime'a niżej, pod przyciskami.

### Przejścia i kamera

- **Przesłona** (`fx/iris.ts`): po „Graj” logo odlatuje, przyciski znikają, ciemne koło z cukierkowym obrzeżem zamyka się na przycisku, bieg się podmienia, koło otwiera się wokół slime'a, który „wyskakuje” (dźwięk, iskry, haptyka). To samo przy wyzwaniu dnia, „Jeszcze raz”, „Menu” i wyjściu z pauzy. W trakcie blokuje dotyk.
- **Kamera** podąża za slime'em w obie strony: w górę jak wcześniej (z wyprzedzaniem w szybkim locie), w dół tylko poza strefą spokoju (gdy slime schodzi poniżej 75% ekranu) albo żeby pokazać syrop (slime zostaje co najmniej 30% od góry). Dzięki temu przy upadku slime i poziom syropu są zawsze w kadrze.

### Pauza

Przycisk w lewym górnym rogu w trakcie biegu (power-upy są pod nim). Panel: „Wróć do gry” albo „Menu”. Wyjście do menu kończy bieg tak jak śmierć (`recordRunEnd`: rekord, ranking, statystyki, wyzwanie dnia, cukierki), tylko bez ekranu końca. Gra pauzuje się sama, gdy aplikacja schodzi w tło w trakcie biegu.

### Samouczek

`ui/coach.ts` + `updateCoach` w scenie: animowany palec pokazuje gest właściwy dla sterowania (swipe, proca, tap) i napis. Wskazówki pojawiają się, gdy są potrzebne, i znikają na zawsze po zaliczeniu (`Save.tips`): celowanie (do pierwszego strzału), skok w locie (przy pierwszym opadaniu, do pierwszego skoku w locie), seria (po pierwszym skoku w górę), syrop (gdy pierwszy raz widać go w kadrze), bańka z mocą (gdy pierwsza jest na ekranie). Bot i tryb `?bot` ich nie widzą.

### Języki

Polski i angielski (`src/i18n.ts`): `t('klucz', {zmienne})`, liczba mnoga cukierków, daty. Język z telefonu (polski dla `pl`, angielski dla reszty), zmiana w Ustawieniach (zapisana w `Save.lang`), `?lang=en` wymusza w playtestach. Nazwy z danych (osiągnięcia, szafa, światy, power-upy) zostają po polsku w `sim/`, angielskie są w `EN_DATA` po id; test pilnuje kompletności. Na iOS tekst pytania o śledzenie (ATT) jest w `en.lproj` / `pl.lproj/InfoPlist.strings`. Przyciski same zmniejszają za długi napis (`Button.fit`).

### Timer i gesty systemowe

Czas biegu (czas gry) pod licznikiem cukierków i na ekranie końca. Na iOS widok gry (`GameViewController` w `AppDelegate.swift`) odracza systemowe gesty przy górnej i dolnej krawędzi (bez tego przesunięcie w dół włączało „Reachability” i ekran zjeżdżał do połowy); WebView nie przewija się.

### Reklama a układ

Baner zgłasza swoją wysokość (`ads.bannerHeight`, `ads.onBanner`); szafa, ustawienia, osiągnięcia i ekran startowy rezerwują nad nim miejsce, więc nic nie chowa się pod reklamą. W przeglądarce `?banner=62` udaje baner o tej wysokości (punkty CSS).

### Wyzwanie dnia i ranking

- **Wyzwanie dnia** (przycisk na ekranie startowym otwiera panel `ui/daily-panel.ts`: data i odliczanie do następnego, dzisiejszy wynik i próby, seria dni z postępem do medalu, wykres ostatnich 7 dni, najlepszy wynik dnia, przyciski Graj i Ranking dnia): seed z daty (`sim/daily.ts`, `dailySeed('RRRR-MM-DD')`), więc w danym dniu wszyscy grają tę samą studnię. Nowe o północy UTC (w Polsce o 1:00 albo 2:00), razem z dzienną tablicą w Game Center. Liczy się najlepszy wynik dnia; zapis trzyma 30 ostatnich dni (najlepszy wynik, liczba prób) i serię dni z rzędu.
- **Powtórki** (`sim/replay.ts`): każdy bieg nagrywa seed, długości kroków symulacji (RLE, bo slow-motion zmienia krok) i strzały. `verifyReplay` odtwarza bieg w Node i porównuje wynik; odrzuca też kroki dłuższe niż 1/60 s i strzały mocniejsze niż w grze. Sprawdzone: powtórka z przeglądarki daje w Node ten sam wynik co do metra. Powtórka ma kilka KB.
- **Ranking** (decyzja właściciela): Game Center (iOS) i Google Play Games (Android), nick z konta gracza, bez własnego serwera. Tablice: `best` (rekord) i `daily` (wyzwanie dnia, na iOS tablica cykliczna co dzień od 00:00 UTC; wyzwanie też zmienia się o północy UTC). Przycisk „Ranking” na ekranie startowym otwiera systemowy ekran tablic. Wtyczka natywna `GameServices` (Swift w `AppDelegate.swift`, Java `GameServicesPlugin.java`), API `gameServices` w `@funfactory/core`. Powtórki zostają w kodzie: gdyby oszustwa stały się problemem, można dołożyć własny serwer z weryfikacją.

## Krok 6: serie

Premie idą w cukierki, rekord zostaje w metrach (decyzja właściciela).

- **Rytm:** strzał w ciągu 1 s od lądowania i lądowanie wyżej (min. 60 jednostek) podbija serię. Skoki w bok jej nie zrywają, zawahanie tak. Pierścień wokół slime'a pokazuje pozostały czas. Każdy skok gra kolejną nutę pentatoniki, co 5 skoków oktawa wyżej.
- **Kamienie milowe** co 5: premia 3 / 5 / 8 / maks. 10, baner z promieniami, błysk, fala, konfetti, cukierki lecą do licznika. Poziomy: Rytm (róż), Super rytm od 10 (złoto), Szał od 15 (mięta), Cukrowy szał od 20 (tęcza).
- **Combo w locie:** „×2”, „×3” przy kolejnych cukierkach w jednym skoku; od 3 premia n−2.
- **Skoki w locie:** bez limitu, ale każdy kolejny w tym samym locie słabszy (60% strzału z półki, potem ×0,8 za każdy następny), po lądowaniu siła wraca; skrzydełka pokazują siłę następnego skoku. Nagrody po bezpiecznym lądowaniu: akrobacja (wyżej niż start) = liczba skoków, ratunek (skok przy opadaniu, syrop bliżej niż 5 m) = liczba skoków + 1, maks. 6. Drugi oddech: przez 10 s skoki w locie nie słabną. Syrop 50–165. Slow-motion płynny (krok symulacji skalowany co klatkę zamiast co kilka klatek).
- Strojenie botem (120 biegów, reakcja 0,4–1,4 s; bez skoków w locie mediana 114 m, z jednym 141 m, bez limitu ok. 175 m przy szybkiej reakcji w slow-motion): seria 5 w 72% biegów, 10 w 12%; premie ok. +40% cukierków (wolniejszy gracz ok. +20%).



- Nazwa: Glut.
- Celowanie: przeciąganie w dowolnym miejscu ekranu.
