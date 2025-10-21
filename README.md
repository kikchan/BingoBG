# Bingo BG

A fancy React + Vite Bingo web app that draws random numbers (1–90) and reads them out loud in Bulgarian using the Web Speech API.

## Features

- Draws numbers 1 through 90 without repeats
- Play/Pause automated drawing, Next single step, and Reset
- Bulgarian text-to-speech (bg-BG) with fallback
- Responsive, modern UI with glowing accents

## Run locally

1. Install dependencies
2. Start the dev server

# Build

Creates a production build (output goes to `build/`).

## Docker

Build and run the production image (from project root):

```bash
# build
docker build -t bingobg:latest .

# run (serves app on port 80 inside container)
docker run --rm -p 2005:80 bingobg:latest

# or using docker compose (recommended)
docker compose up --build
```

Notes:
- The Dockerfile uses a multi-stage build: Node (build) → Nginx (runtime). The image serves the static `build` output.
- If you want to expose a different port on your host, change the `-p` mapping or the compose `ports` section.

Troubleshooting:
- If Docker Desktop networking appears to hang or name resolution fails when this container starts, try: `docker compose down -v` and restart Docker Desktop. Then run `docker compose up` again. If you're on a corporate VPN, set explicit DNS servers in a compose override (see `docker-compose.override.yml`).

## Notes

- Text-to-speech requires a supported browser (Chrome/Edge recommended). The first time you run, the browser may need to load voices; if Bulgarian is unavailable, an English fallback voice will be used, but the spoken text is still Bulgarian words.
- If you don't hear audio, check site sound permissions and system output device.
