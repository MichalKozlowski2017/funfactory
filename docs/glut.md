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
4. **Skórki** (prosta szuflada na ekranie startowym): 4 czapki do kupienia za cukierki.

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
- Zapis (`SaveStore`): rekord, cukierki, kupione czapki, wybrana czapka.

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

Otwarte: ulepszenia power-upów za cukierki oraz start z power-upem za cukierki (decyzja po teście samych power-upów).

## Krok 6: serie

Premie idą w cukierki, rekord zostaje w metrach (decyzja właściciela).

- **Rytm:** strzał w ciągu 1 s od lądowania i lądowanie wyżej (min. 60 jednostek) podbija serię. Skoki w bok jej nie zrywają, zawahanie tak. Pierścień wokół slime'a pokazuje pozostały czas. Każdy skok gra kolejną nutę pentatoniki, co 5 skoków oktawa wyżej.
- **Kamienie milowe** co 5: premia 3 / 5 / 8 / maks. 10, baner z promieniami, błysk, fala, konfetti, cukierki lecą do licznika. Poziomy: Rytm (róż), Super rytm od 10 (złoto), Szał od 15 (mięta), Cukrowy szał od 20 (tęcza).
- **Combo w locie:** „×2”, „×3” przy kolejnych cukierkach w jednym skoku; od 3 premia n−2.
- **Skoki w locie:** bez limitu, ale każdy kolejny w tym samym locie słabszy (60% strzału z półki, potem ×0,8 za każdy następny), po lądowaniu siła wraca; skrzydełka pokazują siłę następnego skoku. Nagrody po bezpiecznym lądowaniu: akrobacja (wyżej niż start) = liczba skoków, ratunek (skok przy opadaniu, syrop bliżej niż 5 m) = liczba skoków + 1, maks. 6. Drugi oddech: przez 10 s skoki w locie nie słabną. Syrop 50–165. Slow-motion płynny (krok symulacji skalowany co klatkę zamiast co kilka klatek).
- Strojenie botem (120 biegów, reakcja 0,4–1,4 s; bez skoków w locie mediana 114 m, z jednym 141 m, bez limitu ok. 175 m przy szybkiej reakcji w slow-motion): seria 5 w 72% biegów, 10 w 12%; premie ok. +40% cukierków (wolniejszy gracz ok. +20%).



- Nazwa: Glut.
- Celowanie: przeciąganie w dowolnym miejscu ekranu.
