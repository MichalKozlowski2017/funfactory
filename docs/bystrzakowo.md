# Bystrzakowo: koncepcja

Zagadki dla przedszkolaków po polsku, z lektorem. Dziecko nie musi umieć czytać, nie może przegrać, a gra sama dobiera trudność.

## Ustalenia z właścicielem (2026-11-20)

- **Wiek:** 3–6 lat, główny cel 4–5. W App Store kategoria Kids „5 lat i mniej”.
- **Rynek:** najpierw Polska (polski lektor jest naszym wyróżnikiem), wersja angielska później.
- **Treść:** jak najwięcej rodzajów zagadek i kategorii tematycznych.
- **Głosy:** dwie postacie-przewodnicy, żeńska i męska (skill `tts`: głosy `alt` i `prezenter`).
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

- **Grafika:** Flux 2 na Legionie (`flux2-sprite`), jeden styl dla całego katalogu (miękkie, okrągłe kształty, grube kontury, paleta pastelowa z mocnymi akcentami). Na start ok. 120–150 obiektów. Przewodnicy i tła polany jako osobne ilustracje, a postacie składane z części animowanych w kodzie.
- **Lektor:** skill `tts`. Szacunkowo: nazwy obiektów (~150), zdania o obiektach (~150), polecenia zagadek (~80), pochwały i reakcje (~40 na przewodnika), głoski, litery i liczby (~70). Razem ok. 500–600 nagrań. Przy ~5 s na kwestię to około godziny generowania z automatyczną kontrolą wymowy, a potem odsłuch próbki przez właściciela.
- **Dźwięki zwierząt i efekty:** paczki CC0 (np. Freesound CC0, Kenney) albo synteza.

## Plan

1. **Prototyp (3 domki: cienie, co nie pasuje, liczenie):** katalog z ~20 obiektami, silniki zagadek w czystym TS z testami, polana z trzema domkami, lektor, naklejka po rundzie. Cel: sprawdzić na dziecku, czy jest zabawnie i zrozumiale.
2. **Styl graficzny:** 2–3 warianty stylu z Fluxa (obiekt, przewodnik, polana) do wyboru przez właściciela, przed masową produkcją katalogu.
3. **Rozbudowa do 1.0:** 12 domków, ~150 obiektów, album, strefa rodzica, zakup, adaptacyjna trudność.
4. **Wydanie:** jak Glut (`docs/release.md`), plus wymogi Kids/Families.

## Otwarte pytania

- Imiona i gatunki przewodników (lisica i borsuk to propozycja).
- Cena i podział darmowe/płatne.
- Statystyki w 1.0: wyłączone czy zbiorcze bez ID?
- Pozioma czy pionowa orientacja? Proponuję **poziomą**: tablety, wygodne dla małych rąk, więcej miejsca na 4 odpowiedzi. Kit2d projektuje dziś w pionie (720 szerokości), więc trzeba to dodać.
