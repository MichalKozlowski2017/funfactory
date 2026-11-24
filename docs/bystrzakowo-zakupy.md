# Bystrzakowo: pełna wersja (zakup w aplikacji)

Model (decyzja właściciela, 21.11.2026, skrócone do 3 dni 24.11.2026): 3 dni zabawy z pełnym dostępem, potem tylko Polana Zagadek.
Pełna wersja: jednorazowo **24,99 zł**, bez subskrypcji i reklam, bez zewnętrznych serwisów
(wtyczka `@capgo/native-purchases`: StoreKit 2 i Google Play Billing). Kod: `games/bystrzakowo/src/premium.ts`,
logika próby z testami: `src/sim/trial.ts`.

Identyfikator produktu w obu sklepach: **`bystrzakowo.full`**.

## Kroki [właściciel]

### Apple (App Store Connect)
1. Aplikacja Bystrzakowo → Monetyzacja → Zakupy w aplikacji → „+”.
2. Typ: **Bez możliwości ponownego użycia** (Non-Consumable). Nazwa referencyjna: „Pełna wersja”.
   Identyfikator produktu: `bystrzakowo.full`.
3. Cena: 24,99 zł (Polska jako kraj bazowy, resztę Apple przeliczy). Dostępność: wszystkie kraje.
4. Lokalizacja PL: nazwa „Pełna wersja”, opis „Wszystkie krainy, pełny raport dla rodzica i pocztówka tygodnia. Jednorazowo.”
5. **Chmura rodzinna**: włącz (jeden zakup dla całej rodziny).
6. Zrzut do recenzji: ekran zakupu ze strefy rodzica (zrobię go).
7. Do testów: Użytkownicy i dostęp → Sandbox → konto testowe; na iPhonie Ustawienia → App Store → Konto sandbox.

### Google (Play Console)
1. Bystrzakowo → Zarabianie → Produkty → Produkty w aplikacji → Utwórz produkt.
2. Identyfikator: `bystrzakowo.full`, nazwa „Pełna wersja”, opis jak wyżej, cena 24,99 zł, aktywuj.
3. Do testów: Ustawienia → Testowanie licencji → dodaj swój adres Gmail (zakupy testowe bez płacenia).
   Produkt jest widoczny w aplikacji dopiero, gdy jakikolwiek build jest na ścieżce testów (test wewnętrzny).

## Zachowanie w grze
- Dzień próby liczy się przy pierwszym rozwiązanym zadaniu dnia (dni zabawy, nie kalendarzowe).
- Po próbie krainy poza Polaną „śpią” (księżyc, Zzz); dotknięcie: Lusia „Ta kraina jeszcze śpi. Pobawmy się na Polanie Zagadek.” (neutralnie: bez namawiania dziecka, by poprosiło dorosłego o zakup; dyrektywa UE o nieuczciwych praktykach, zał. I pkt 28; zmiana 2026-11-24).
- Zakup i „Przywróć zakup” tylko w strefie rodzica (za bramką): zakładki Postępy i Ustawienia.
- Przy starcie gra po cichu sprawdza zakup (np. po reinstalacji albo zakup przez Chmurę rodzinną).
- Playtesty: `?free` (koniec próby bez zakupu), `?full` (kupione).
