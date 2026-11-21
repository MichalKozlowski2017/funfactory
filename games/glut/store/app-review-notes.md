# Glut: notatki dla App Review (Guideline 2.1, Information Needed)

Odpowiedź na prośbę Apple z 2026-11-21 (zgłoszenie 6d805e7f-81fd-49f3-ab09-e0f10a654fac).
Tekst poniżej wkleja się do App Store Connect → App Review Information → Notes. Nagranie ekranu idzie jako załącznik (Attachment) w tej samej sekcji.

---

Screen recording: attached in the App Review Information section (recorded on iPhone 15 Pro Max, latest iOS). It starts with launching the app and shows the typical flow: first-launch consent prompt, main menu, a full run, game over screen, daily challenge, wardrobe, settings and Game Center leaderboards.

1. Purpose and target audience
Glut: Sweet Climb is a casual single-player arcade game. The player is a candy slime that climbs up a candy well by slingshot jumps while rising syrup chases it from below. It is a short-session game for casual players (rated 13+). It offers quick, skill-based fun: runs of 1–3 minutes, a best-height record, a daily challenge that is the same level for everyone that day, achievements and cosmetic items (hats, colors, trails) unlocked with candies collected while playing.

2. How to use the main features
No account, login or setup is required. Everything is available right after launch.
- Play: tap "Play". Touch anywhere, drag back and release to jump (like a slingshot; dots show the trajectory). Climb as high as possible before the syrup catches you.
- Daily challenge: "Daily challenge" button in the main menu (one fixed level per day).
- Wardrobe: cosmetic items bought with candies earned in game. They do not affect gameplay.
- Achievements: in-game list ("Achievements" button in the main menu).
- Leaderboard: "Leaderboard" button opens Game Center (optional; the game works fully without signing in).
- Settings: sound, music, vibration, language (English/Polish) and the optional anonymous statistics toggle.

3. External services
- Apple Game Center: optional leaderboards (best height, daily challenge).
- Optional anonymous gameplay statistics, sent only if the player agrees on first launch (can be turned off in Settings at any time): our own endpoint hosted on Vercel with a Neon Postgres database. It receives a random installation ID and gameplay events (sessions, run results, errors). No personal data, no tracking, no third-party analytics or advertising SDKs are active in this version.
- No in-app purchases, no ads, no AI services, no payment processors, no user accounts and no user-generated content.

4. Regional differences
The app works the same in all regions where it is available. Content is localized in English and Polish only.

5. Regulated industry / third-party material
Not applicable. The app does not operate in a regulated industry. All graphics, music and sounds are original or used under licenses that allow commercial use (including CC0 sound samples).
