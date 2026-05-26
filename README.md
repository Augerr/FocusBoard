# FocusBoard

A small Raspberry Pi touchscreen Focus Terminal optimized for the Raspberry Pi Touch Display 2.

## Scripts

- `npm run dev` starts the Vite dev server.
- `npm run typecheck` runs TypeScript checks.
- `npm run build` typechecks and builds the app.

## Data setup

Copy `.env.example` to `.env` and fill in:

- `VITE_GOOGLE_CALENDAR_ID` and `VITE_GOOGLE_CALENDAR_API_KEY` for a public Google Calendar.
- `VITE_WEATHER_LAT`, `VITE_WEATHER_LON`, and `VITE_WEATHER_LOCATION` for the daily Open-Meteo forecast.
