-- Anonimowe zdarzenia z Gluta (tylko za zgodą gracza). Bez adresów IP, bez danych osobowych.
CREATE TABLE IF NOT EXISTS events (
  id          bigserial PRIMARY KEY,
  received_at timestamptz NOT NULL DEFAULT now(),
  ts          timestamptz NOT NULL,            -- czas zdarzenia z gry (przycięty do sensownego zakresu)
  install     text        NOT NULL,            -- losowy identyfikator instalacji (UUID)
  session     text,                            -- losowy identyfikator sesji (uruchomienia gry)
  name        text        NOT NULL,            -- session | run | funnel | buy | ach | error
  build       text,                            -- wersja gry, np. 1.0.0+3
  platform    text,                            -- ios | android | web
  os          text,
  lang        text,
  data        jsonb       NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS events_name_ts ON events (name, ts);
CREATE INDEX IF NOT EXISTS events_install_ts ON events (install, ts);

-- Retencja danych: 24 miesiące (polityka prywatności). Sprzątanie: scripts/migrate.ts --prune.
