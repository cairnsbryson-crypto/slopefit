# SlopeFit

SlopeFit is a single-page React app that recommends a complete, color-matched ski or snowboard setup based on a short quiz. Answer questions about your height, weight, ability level, preferred terrain, style, budget, and color preferences, and SlopeFit scores a built-in catalog of real gear (skis or boards, jackets, pants, goggles, helmets, gloves) to put together a matched kit with shoppable links.

## Features

- **Ski or snowboard setup builder** — a guided, multi-step quiz drives recommendations for boards/skis and the matching apparel and accessories.
- **Size and fit recommendations** — ski/board length, jacket/pant fit, and general sizing are derived from height, weight, ability, and riding style.
- **Color-matched kits** — gear is filtered and scored against chosen colors so the recommended pieces coordinate.
- **Budget tiers** — Budget-Friendly, Mid-Range, and Premium price bands, with scoring that favors items close to the selected tier.
- **Free vs. Premium** — free users get one re-search per item; Premium unlocks unlimited re-searching across all pieces plus a side-by-side compare mode. Premium status is managed via Supabase.
- **Shop links** — each recommended item links out to a retailer/affiliate URL for purchase.

## Tech stack

- [React 18](https://react.dev/) + [Vite 5](https://vitejs.dev/) for the frontend and dev server
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Supabase](https://supabase.com/) for premium user/session state
- [lucide-react](https://lucide.dev/) for icons

The entire quiz flow, scoring logic, and gear catalog currently live in `src/App.jsx`.

## Getting started

### Prerequisites

- Node.js (18+) and npm

### Install

```bash
npm install
```

### Configure environment variables

SlopeFit reads Supabase credentials from Vite env vars. Create a `.env` file in the project root:

```
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Only variables prefixed with `VITE_` are exposed to the browser bundle, by Vite's design — see `src/supabaseClient.js`.

### Run the dev server

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

### Preview a production build

```bash
npm run preview
```

## Project structure

```
index.html              Entry HTML, page metadata
src/
  main.jsx               React root / app bootstrap
  App.jsx                Quiz flow, gear catalog, scoring/recommendation logic, UI components
  supabaseClient.js       Supabase client setup (premium/session state)
  index.css               Global styles / Tailwind entrypoint
tailwind.config.js
postcss.config.js
vite.config.js
```

## Deployment

The app is a static Vite build intended for deployment on [Vercel](https://vercel.com/), which supplies the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables at build time.
