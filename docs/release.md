# Wydanie gry do sklepów (na przykładzie Gluta 1.0.0)

Stan na 2026-11-19: wszystko, co da się zrobić bez kont i podpisów właściciela, jest gotowe. Kroki oznaczone **[Ty]** wymagają Twojego konta, akceptacji umów albo danych osobowych. Kroki **[Claude]** zrobię, gdy dostanę od Ciebie identyfikatory.

## Co jest gotowe

| Rzecz | Gdzie |
|---|---|
| Android: podpisany pakiet AAB 1.0.0 (versionCode 1) | `release/glut/glut-1.0.0-1.aab` |
| Android: klucz uploadu (hasła w pliku obok) | `~/.funfactory-keys/glut-upload.jks` + `.properties` **(zrób kopię zapasową!)** |
| iOS: archiwum wydania 1.0.0 (build 1) | `release/glut/Glut.xcarchive` |
| Ikony, splash, ciemne tło startu | w projektach `ios/` i `android/` |
| Grafiki do sklepów (ikony, feature graphic, zrzuty PL/EN) | `games/glut/store/` |
| Teksty, kategorie, odpowiedzi do formularzy | `games/glut/store/listing.md` |
| Polityka prywatności (do opublikowania) | `games/glut/legal/privacy.html` |
| Reklamy AdMob (baner poza grą, pełnoekranowe między biegami, zgoda RODO, ATT) | działają na **testowych** ID Google |

`release/` jest w `.gitignore` (duże pliki binarne). Buildy da się odtworzyć poleceniami z sekcji „Budowanie”.

## Twoje kroki [Ty], po kolei

### 1. Apple: zaakceptuj umowę (blokuje eksport do App Store)
Eksport archiwum zatrzymał się na: „PLA Update available”. Wejdź na developer.apple.com → Account → zaakceptuj nową wersję Apple Developer Program License Agreement. Bez tego Xcode nie utworzy certyfikatu dystrybucyjnego.

### 2. Apple: rekord aplikacji w App Store Connect
App Store Connect → Apps → „+” → New App:
- Platforma iOS, nazwa: `Glut: Słodka wspinaczka` (alternatywy w `listing.md`), język główny: polski.
- Bundle ID: `com.funfactory.glut` (jeśli nie ma na liście, dodaj go w developer.apple.com → Identifiers). **Bundle ID jest na zawsze**: jeśli wolisz inny (np. z Twoją domeną), powiedz przed pierwszym wysłaniem, a zmienię go w projektach.
- SKU: `glut-001`.

### 3. Google Play: konto dewelopera i aplikacja
- Konto Google Play Console (jednorazowo 25 USD) i weryfikacja tożsamości (może potrwać kilka dni).
- **Ważne:** nowe konta osobiste muszą przed produkcją przeprowadzić **test zamknięty z co najmniej 12 testerami przez 14 dni**. Zaplanuj znajomych jako testerów. Konto firmowe nie ma tego wymogu.
- Utwórz aplikację: nazwa jak wyżej, gra, bezpłatna, język polski.

### 4. AdMob: konto i jednostki reklamowe
- admob.google.com: konto (połączone z płatnościami i danymi podatkowymi).
- Dodaj 2 aplikacje (iOS i Android, „jeszcze nie w sklepie”, potem połączysz ze sklepem).
- W każdej utwórz jednostki: **Banner** (adaptacyjny) i **Interstitial**.
- Privacy & messaging: utwórz komunikat RODO (GDPR) dla obu aplikacji i komunikat wyjaśniający IDFA dla iOS.
- **app-ads.txt:** AdMob wymaga pliku `app-ads.txt` na stronie dewelopera (domena podana w sklepach). Potrzebna jest jakakolwiek Twoja strona, np. ta sama, na której będzie polityka prywatności.
- Wyślij mi: ID aplikacji (2 sztuki, format `ca-app-pub-…~…`) i ID jednostek (4 sztuki, format `ca-app-pub-…/…`).

### 5. Polityka prywatności pod stałym adresem
- Uzupełnij w `games/glut/legal/privacy.html` pola `[IMIĘ I NAZWISKO / NAZWA WYDAWCY]` i `[E-MAIL KONTAKTOWY]` (albo podaj mi je, wpiszę).
- Opublikuj stronę (np. GitHub Pages, własna domena, Netlify) i podaj adres w obu sklepach.

### 6. Formularze w sklepach
Wszystkie odpowiedzi są w `games/glut/store/listing.md`: opis, słowa kluczowe, kategorie, ocena wiekowa (13+ w Google Play), „Bezpieczeństwo danych” (Google) i „App Privacy” (Apple), notatki dla recenzji.

## Kroki [Claude] po otrzymaniu ID reklam

1. Wpisuję ID jednostek w `games/glut/src/ads-config.ts` i ustawiam `testing: false`.
2. Wpisuję ID aplikacji w `ios/App/App/Info.plist` (`GADApplicationIdentifier`) i `android/app/src/main/AndroidManifest.xml` (`com.google.android.gms.ads.APPLICATION_ID`).
3. Podbijam numer builda, buduję AAB i archiwum, sprawdzam na telefonie (reklamy testowe na Twoim urządzeniu jako „urządzenie testowe” AdMob, żeby nie klikać prawdziwych reklam).

## Wysyłka

- **iOS:** Xcode → Window → Organizer → `Glut.xcarchive` → Distribute App → App Store Connect → Upload. Potem w App Store Connect: TestFlight (testy wewnętrzne, najpierw Ty), a gdy wszystko gra: wersja 1.0.0 → wybór builda → zrzuty → wysłanie do recenzji. Wysyłkę mogę zrobić z wiersza poleceń, gdy dasz zgodę i klucz API App Store Connect.
- **Android:** Play Console → Testowanie → Test wewnętrzny (albo zamknięty, wymóg 12 testerów) → nowa wersja → wgraj `glut-1.0.0-1.aab`. Przy pierwszym wgraniu zaakceptuj Play App Signing (Google trzyma klucz podpisu, nasz klucz to tylko klucz uploadu).

## Budowanie (dla mnie i dla Ciebie)

```sh
# Android: podpisany AAB (klucz z ~/.funfactory-keys albo GLUT_UPLOAD_KEY)
pnpm --filter @funfactory-game/glut aab
# -> games/glut/android/app/build/outputs/bundle/release/app-release.aab

# iOS: archiwum wydania
cd games/glut && pnpm build && pnpm exec cap sync ios
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -destination generic/platform=iOS -archivePath ../../release/glut/Glut.xcarchive \
  -allowProvisioningUpdates archive
# eksport do App Store (po akceptacji umowy Apple):
xcodebuild -exportArchive -archivePath ../../release/glut/Glut.xcarchive \
  -exportPath ../../release/glut/ipa -exportOptionsPlist ../../release/glut/ExportOptions.plist -allowProvisioningUpdates
```

Przed każdą kolejną wersją podbij: `version` w `games/glut/package.json` (widać ją w ustawieniach), `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` w projekcie Xcode oraz `versionName` / `versionCode` w `android/app/build.gradle`.

Zrzuty do sklepów: `node tools/playtest/shot.ts games/glut --gpu --size 440x956@3 ...` (scenariusze w historii tej sesji), a ramki z podpisem: `tools/store/frame.sh <zrzut> "<podpis>" <szer> <wys> <wyjście>`.
