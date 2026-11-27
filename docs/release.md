# Wydanie gry do sklepów (na przykładzie Gluta 1.0.0)

Stan na 2026-11-19: wszystko, co da się zrobić bez kont i podpisów właściciela, jest gotowe. Kroki oznaczone **[Ty]** wymagają Twojego konta, akceptacji umów albo danych osobowych. Kroki **[Claude]** zrobię, gdy dostanę od Ciebie identyfikatory.

Przed każdą wysyłką do recenzji przejdź poradnik https://github.com/mjmirza/app-store-compliance (lista kontrolna, zasady dla dzieci i gier, Capacitor, terminy polityk Google; po odrzuceniu: `docs/MISTAKE-PATTERNS.md`). Czytamy go ręcznie; skanera nie wpinamy jako hooka, bo blokuje `cap sync` i `xcodebuild archive`.

## Co jest gotowe

| Rzecz | Gdzie |
|---|---|
| Android: podpisany pakiet AAB 1.0.0 (versionCode 1) | `release/glut/glut-1.0.0-1.aab` |
| Android: klucz uploadu (hasła w pliku obok) | `~/.funfactory-keys/glut-upload.jks` + `.properties` **(zrób kopię zapasową!)** |
| iOS: archiwum wydania 1.0.0 (build 1) | `release/glut/Glut.xcarchive` |
| Ikony, splash, ciemne tło startu | w projektach `ios/` i `android/` |
| Grafiki do sklepów (ikony, feature graphic, zrzuty PL/EN) | `games/glut/store/` |
| Teksty, kategorie, odpowiedzi do formularzy | `games/glut/store/listing.md` |
| Polityka prywatności (opublikowana) | https://mkdev.com.pl/apps/glut/privacy-policy (repo `~/Sites/mkdev`, plik `content/pages/privacy-glut.mdx`) |
| Reklamy AdMob | **wyłączone na start** (decyzja 20.11.2026): kod w repo (`ADS_ENABLED` w `games/glut/src/ads-config.ts`), biblioteki nie ma w paczkach |

`release/` jest w `.gitignore` (duże pliki binarne). Buildy da się odtworzyć poleceniami z sekcji „Budowanie”.

## Twoje kroki [Ty], po kolei

### 1. Apple: zaakceptuj umowę (blokuje eksport do App Store)
Eksport archiwum zatrzymał się na: „PLA Update available”. Wejdź na developer.apple.com → Account → zaakceptuj nową wersję Apple Developer Program License Agreement. Bez tego Xcode nie utworzy certyfikatu dystrybucyjnego.

### 2. Apple: rekord aplikacji w App Store Connect
App Store Connect → Apps → „+” → New App:
- Platforma iOS, nazwa: `Glut: Słodka wspinaczka` (alternatywy w `listing.md`), język główny: polski.
- Bundle ID: `com.mkdev.glut` (jeśli nie ma na liście, dodaj go w developer.apple.com → Identifiers). Prefiks `com.mkdev` jak w Dealoot (decyzja właściciela).
- SKU: `glut-001`.

### 3. Google Play: konto dewelopera i aplikacja
- Konto Google Play Console (jednorazowo 25 USD) i weryfikacja tożsamości (może potrwać kilka dni).
- **Ważne:** nowe konta osobiste muszą przed produkcją przeprowadzić **test zamknięty z co najmniej 12 testerami przez 14 dni**. Zaplanuj znajomych jako testerów. Konto firmowe nie ma tego wymogu.
- Utwórz aplikację: nazwa jak wyżej, gra, bezpłatna, język polski.

### 4. AdMob: na później
Na start gra wychodzi bez reklam. Wracamy do tego, gdy ruch będzie sensowny: konto AdMob, 2 aplikacje, jednostki Banner i Interstitial, komunikat RODO, `app-ads.txt` na stronie dewelopera, potem kroki [Claude] niżej.

### 5. Polityka prywatności: gotowe
Opublikowana na stronie mkdev (jak Dealoot): **https://mkdev.com.pl/apps/glut/privacy-policy**, strona gry: https://mkdev.com.pl/apps/glut. Ten adres wpisz w obu sklepach (Privacy Policy URL), a https://mkdev.com.pl/apps/glut jako stronę wsparcia/marketingu. Kontakt: mkdev.appslab@gmail.com.

### 6. Formularze w sklepach
Wszystkie odpowiedzi są w `games/glut/store/listing.md`: opis, słowa kluczowe, kategorie, ocena wiekowa (13+ w Google Play), „Bezpieczeństwo danych” (Google) i „App Privacy” (Apple), notatki dla recenzji.

### 7. Ranking: Game Center i Google Play Games
Kod jest gotowy (`games/glut/src/game-services-config.ts`, wtyczka natywna `GameServices`). Nick i awatar gracza pochodzą z konta Game Center / Play Games.
- **Apple** (po akceptacji umowy z kroku 1): App Store Connect → aplikacja → Game Center → Leaderboards:
  - `glut.best`: Classic, „High score”, typ Integer, sortowanie malejąco, jednostka „m”, zakres wyników 0–5000 (odrzuca absurdalne wyniki).
  - `glut.daily`: **Recurring**, start dowolnego dnia o **00:00 UTC**, czas trwania 1 dzień, reszta jak wyżej.
  Zrobione 20.11.2026 (tablice `glut.best` i `glut.daily` utworzone, start cyklu 21.11 00:00 UTC; uprawnienie Game Center włączone w projekcie, `CODE_SIGN_ENTITLEMENTS = App/App.entitlements`).
- **Google**: Play Console → Usługi gier Play → Konfiguracja (projekt gier) → Tablice wyników: „Rekord” i „Wyzwanie dnia” (format liczbowy, wyższy lepszy, limit 0–5000). Wyślij mi **ID projektu** (liczba) i **ID obu tablic** (format `CgkI…`).
- Polityka prywatności: dopiszę, że wynik i nick idą do Apple Game Center / Google Play Games, gdy gracz jest zalogowany.

## Kroki [Claude] po otrzymaniu ID reklam (gdy włączymy reklamy)

0. Budowanie z `GLUT_ADS=1` (stała `__ADS__` w `vite.config.ts`; bez niej kod AdMob w ogóle nie trafia do paczki, więc Apple nie widzi wywołań ATT), `@capacitor-community/admob` z powrotem w `games/glut/package.json`, w Info.plist `GADApplicationIdentifier`, `NSUserTrackingUsageDescription` i `SKAdNetworkItems`, w AndroidManifest `com.google.android.gms.ads.APPLICATION_ID` (stan sprzed wyłączenia jest w historii git). Polityka prywatności i formularze sklepów: z powrotem sekcje o reklamach.

1. Wpisuję ID jednostek w `games/glut/src/ads-config.ts` i ustawiam `testing: false`.
2. Wpisuję ID aplikacji w `ios/App/App/Info.plist` (`GADApplicationIdentifier`) i `android/app/src/main/AndroidManifest.xml` (`com.google.android.gms.ads.APPLICATION_ID`).
3. Podbijam numer builda, buduję AAB i archiwum, sprawdzam na telefonie (reklamy testowe na Twoim urządzeniu jako „urządzenie testowe” AdMob, żeby nie klikać prawdziwych reklam).

## Wysyłka

Od 2026-11-27 wysyłkę robi Claude przez API sklepów (skill `app-stores`, klucze w `~/.store-keys/`, wspólne dla wszystkich projektów). Bez pytania: TestFlight i test wewnętrzny Google Play. Wydanie produkcyjne, wysłanie do recenzji Apple oraz zmiany ceny i opisu tylko po zgodzie właściciela.

```sh
S=~/.claude/skills/app-stores
# Android: podpisany AAB (nowy versionCode w android/app/build.gradle) na test wewnętrzny
node $S/play.ts upload com.mkdev.<slug> release/<slug>/<slug>-<wersja>-<versionCode>.aab --notes "Co nowego"
# iOS: archiwum (nowy CURRENT_PROJECT_VERSION) do App Store Connect, potem TestFlight
node $S/asc.ts upload release/<slug>/<Nazwa>.xcarchive
node $S/asc.ts testflight com.mkdev.<slug> <build> --group "Ja" --whats-new "Co nowego"
node $S/asc.ts status com.mkdev.<slug>   |   node $S/play.ts status com.mkdev.<slug>
```

Ręcznie (właściciel) zostaje: nowa aplikacja w obu sklepach, **pierwszy plik nowej aplikacji w Google Play**, listy testerów e-mail i testowanie licencji w Play Console, wiadomości od recenzentów Apple, deklaracje w formularzach sklepów. Przy pierwszym wgraniu do Google Play zaakceptuj Play App Signing (Google trzyma klucz podpisu, nasz klucz to tylko klucz uploadu).

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

Zrzuty do sklepów: `tools/store/glut-shots.sh` (8 scen: rozgrywka, syrop, mroczny świat, fabryka, nowy rekord, wyzwanie dnia, szafa, osiągnięcia; iOS 6,9″ i 6,5″ oraz Android, PL i EN), potem `tools/store/glut-cards.sh` składa karty z tłami z Fluxa i podpisami do `games/glut/store/screens/`. Karta 5 (ranking) pokazuje ekran nowego rekordu; po uruchomieniu Game Center można ją podmienić na zrzut prawdziwej tablicy.
