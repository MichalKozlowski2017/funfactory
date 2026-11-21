# Bystrzakowo 1.0.0: wydanie do sklepów

Stan na 2026-11-22. Kroki **[Ty]** wymagają Twojego konta albo decyzji, kroki **[Claude]** robię sam.
Wzór: wydanie Gluta (`docs/release.md`).

## Co jest gotowe

| Rzecz | Gdzie |
|---|---|
| Android: podpisany AAB 1.0.0 (versionCode 1) | `release/bystrzakowo/bystrzakowo-1.0.0-1.aab` (budowanie: `pnpm --filter @funfactory-game/bystrzakowo aab`) |
| Android: klucz uploadu | `~/.funfactory-keys/bystrzakowo-upload.jks` + `.properties` **(zrób kopię zapasową, tak jak dla Gluta!)** |
| iOS: archiwum 1.0.0 (build 1) | `release/bystrzakowo/Bystrzakowo.xcarchive` |
| Ikona 1024 i 512 | `games/bystrzakowo/store/icon-*.png` |
| Zrzuty do sklepów: iPhone 6,9", iPad 13", Android, w 4 językach | `games/bystrzakowo/store/screens/<rozmiar>-<język>/1..8.jpg` |
| Grafika Google Play 1024×500 | `games/bystrzakowo/store/feature-graphic-<język>.png` |
| Teksty kart (pl, en, de, es), kategorie, ocena wiekowa, prywatność, notatki dla recenzji | `games/bystrzakowo/store/listing.md` |
| Zakup w aplikacji | `docs/bystrzakowo-zakupy.md` (produkt `bystrzakowo.full`, 24,99 zł) |
| Polityka prywatności i strona aplikacji | repo `~/Sites/mkdev`, gałąź `bystrzakowo` (**nieopublikowane**, czeka na Twoją zgodę) |

## Twoje kroki [Ty], po kolei

### 1. Zgoda na publikację strony i polityki prywatności
Gałąź `bystrzakowo` w `~/Sites/mkdev` dodaje stronę https://mkdev.com.pl/apps/bystrzakowo i politykę
https://mkdev.com.pl/apps/bystrzakowo/privacy-policy (build przechodzi). Powiedz „publikuj”, a scalę ją z `main` i wypchnę (Vercel wdroży sam).
Oba sklepy wymagają adresu polityki prywatności przed wysłaniem do recenzji.

### 2. Apple: rekord aplikacji
App Store Connect → Apps → „+” → New App: iOS, nazwa `Bystrzakowo: zagadki malucha`, język główny polski,
Bundle ID `com.mkdev.bystrzakowo` (dodaj w developer.apple.com → Identifiers, jeśli go nie ma), SKU `bystrzakowo-001`.
- App Information: kategoria Edukacja (druga: Gry → Edukacyjne), **Kids: Ages 5 and Under**.
- Lokalizacje: polski, English (U.S.), Deutsch, Español (México): teksty z `listing.md`.
- App Privacy: **Data Not Collected**.
- Zakup w aplikacji `bystrzakowo.full`: `docs/bystrzakowo-zakupy.md`. Pierwszy zakup wysyła się razem z wersją 1.0.0 (zaznacz go na stronie wersji).
- Zrzuty: iPhone 6,9" (`ios-6.9-*`), iPad 13" (`ipad-13-*`).
- Notatki dla recenzji: sekcja „Notatki dla recenzji” w `listing.md`.

### 3. Google Play: aplikacja
Play Console → Utwórz aplikację: nazwa `Bystrzakowo: zagadki malucha`, aplikacja (nie gra), bezpłatna, język polski.
- Konto jest firmowe (DUNS), więc **nie obowiązuje** wymóg 12 testerów przez 14 dni.
- Zawartość aplikacji: grupa docelowa **0–5 i 6–8 lat** (program „Rodzina”), reklamy: nie, bezpieczeństwo danych: brak zbierania danych, polityka prywatności: adres z kroku 1, ocena IARC (Everyone / PEGI 3).
- Kategoria: Edukacja. Karta sklepu w 4 językach z `listing.md`, grafiki z `store/`.
- Produkty w aplikacji → `bystrzakowo.full` (`docs/bystrzakowo-zakupy.md`).
- Wydanie: najpierw test wewnętrzny z AAB (sprawdzisz zakup na koncie testowym), potem produkcja.

### 4. Odsłuch lektora
Przesłuchaj po kilka nagrań w każdym języku (lista w podsumowaniu nocy) i, jeśli możesz, daj je komuś, dla kogo
angielski, niemiecki albo hiszpański jest językiem ojczystym. Whisper sprawdza tylko zrozumiałość.

### 5. Test z dzieckiem
Przed wysyłką: tydzień zabawy z prawdziwym dzieckiem. Uwagi zapisuj albo przysyłaj zrzuty.

## Kroki [Claude] po Twojej zgodzie

1. Publikacja strony i polityki prywatności (krok 1).
2. Po założeniu produktu w sklepach: test zakupu w sandboxie (iPhone) i na teście wewnętrznym (Android).
3. Przed wysyłką: podbicie numeru builda, świeże AAB i archiwum, eksport do App Store Connect (mogę z wiersza poleceń, gdy dasz klucz API App Store Connect).

## Budowanie

```sh
pnpm --filter @funfactory-game/bystrzakowo aab        # podpisany AAB → android/app/build/outputs/bundle/release/
cd games/bystrzakowo && npx vite build && npx cap sync ios
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release -destination generic/platform=iOS \
  -archivePath ../../release/bystrzakowo/Bystrzakowo.xcarchive -allowProvisioningUpdates archive
```

Zrzuty: `bash tools/store/bystrzakowo-shots.sh` (ok. 1 h), karty: `bash tools/store/bystrzakowo-cards.sh`.
