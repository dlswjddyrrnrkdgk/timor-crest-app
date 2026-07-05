# Timor Crest Contractor Web App Demo

Vite-based demo project for the Timor Crest contractor mobile web app and Admin settings flow.

## Local Setup

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run preview
```

The production output is generated in `dist/`.

## Netlify

Use these Netlify build settings:

- Build command: `npm run build`
- Publish directory: `dist`

The same settings are also captured in `netlify.toml`.

## Project Structure

- `index.html` - Vite HTML entry.
- `src/main.js` - imports app styles, demo data services, and app UI code.
- `src/data.js` - demo localStorage-backed services.
- `src/app.js` - contractor/Admin UI rendering.
- `src/styles.css` - mobile app design system styling.
- `public/` - static files that should be copied directly to `dist/`.
