# Ostatnia Brama: projekt gry

Status (2026-11-18): **wstrzymany po szarym prototypie.** Wrażenia z prototypu: „na razie ok”. Wracamy do tego projektu później.

## Pomysł

Mroczny świat, w którym co noc z lasu wychodzą potwory. Drużyna najemników broni ostatniej bramy osady. Tower defense z drużyną bohaterów z charakterami, elementami roguelike i RPG w równych proporcjach. Biegi są krótkie (12–15 minut).

## Rdzeń

- **Ekran pionowy.** Wrogowie schodzą krętą drogą z góry ku bramie na dole. Obrońców ustawiasz na stanowiskach wzdłuż drogi.
- **Obrońcy to postaci, nie wieże.** Mają klasę, poziom, punkty życia, ekwipunek i cechę charakteru. Obrońcy walczący wręcz mogą zostać zranieni. Śmierć jest trwała do końca biegu.
- **Między falami** przestawiasz drużynę i wybierasz jedną z trzech nagród (rekrut, trening, przedmiot).
- **Bieg** to 3 noce. Każda noc to kilka fal i boss o świcie, a między nocami jest obóz (rekrutacja, kowal, odpoczynek, wydarzenie).

## Wyróżniki

1. **Więzi:** sąsiedzi na stanowiskach zbliżają się do siebie w walce. Silna więź daje premię duetu. Gdy jeden z pary zginie, drugi wpada w żałobę albo w szał, zależnie od charakteru.
2. **Zepsucie:** klątwa daje siłę, ale gdy zepsucie się zapełni, obrońca przemienia się w potwora, chyba że zostanie oczyszczony.
3. **Spuścizna:** poległy zostawia pamiątkę ze swoim imieniem, która przechodzi do kolejnych biegów. Obóz prowadzi kronikę poległych.

## Klimat i grafika

Dark fantasy w ciepłym stylu: noc, pochodnie, ogień. Postaci i wrogowie z Flux 2 (Legion), animacja w kodzie. Klimat buduje światło: ciemność wokół drogi i krąg światła wokół obrońców.

**Wybrany styl: B (wektorowy z konturem).** Powód: czytelność małych postaci na ciemnej mapie. Dopisek stylu do promptów:

> stylized dark fantasy mobile game art, flat vector style, clean thick dark outline, cel shading, muted colors with warm orange torchlight accents, strong readable silhouette

Postaci: `flux2-sprite` + „single full body character, three-quarter front view, standing idle pose, centered, plain light gray background, no text”. Próbki z testu: `assets-raw/brama/style/B/` (seedy 10–14). Tło mapy trzeba wygenerować od nowa w widoku z góry (testowe tła wyszły w perspektywie).

## Prototyp (szary), krok 1

**Pytanie:** czy ustawianie drużyny i więzi dają frajdę?

Zakres:
- jedna mapa: kręta droga i ok. 9 stanowisk,
- 4 klasy:
  - Łucznik: daleki zasięg, pojedynczy cel,
  - Rycerz: walczy wręcz, zatrzymuje wroga,
  - Mag: obrażenia obszarowe, wolny,
  - Kapłanka: leczy sąsiadów,
- 3 rodzaje wrogów (zwykły, szybki, ciężki) i boss,
- jedna noc: 6 fal i boss; między falami przestawianie drużyny i wybór 1 z 3 nagród,
- więzi: sąsiedzi zdobywają punkty więzi w walce; poziom więzi daje premię, a żałoba lub szał działają po śmierci partnera,
- poziomy obrońców za zabójstwa,
- logika w `sim/` (czysty TS) z testami i botem do balansu.

Poza prototypem: zepsucie, spuścizna, obóz, 3 noce, grafika, dźwięk.

## Wnioski z prototypu (symulacja + bot)

- **Rany zamiast natychmiastowej śmierci:** przy śmierci trwałej tanki zawsze ginęły (5–6 poległych na bieg). Teraz 2 powalenia to rany (−15% maks. życia każda), dopiero 3. zabija.
- Kapłanka leczy tylko sąsiadów, a zasięgi są krótkie: bez tego ustawienie było prawie obojętne.
- Wrogowie są 1,6× szybsi niż na początku: wcześniej pierwsza fala potrzebowała 25 s, zanim coś się działo.
- Balans (bot, 40 seedów): mądre ustawienie wygrywa ok. 65% (przegrywa głównie z bossem), losowe 0%, ok. 0,2 poległych na bieg.

## Decyzje

- Nazwa: Ostatnia Brama.
- Proporcje strategii i RPG: po równo.
- Biegi krótkie.
- Klimat: dark fantasy, styl B.
