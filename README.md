# AccessAudit

AI-powered wheelchair accessibility auditor using NVIDIA Nemotron vision models.

## How It Works

AccessAudit runs a 4-step autonomous agent loop for any address:

1. **Geocode** — Converts the address to coordinates via OpenStreetMap Nominatim
2. **Capture** — Fetches 4 Google Street View images facing N, E, S, W
3. **Analyze** — Sends each image to `nvidia/nemotron-nano-12b-v2-vl` for accessibility analysis (sidewalks, curb cuts, ramps, obstacles, surface quality)
4. **Synthesize** — `nvidia/nemotron-3-super-120b-a12b` combines all findings into a scored report with an A–F grade and actionable recommendations

## Tech Stack

- **Framework** — Next.js 14 (App Router, TypeScript)
- **Styling** — Tailwind CSS
- **AI Vision** — NVIDIA Nemotron Nano 12B v2 VL
- **AI Synthesis** — NVIDIA Nemotron Super 120B
- **Maps** — React-Leaflet + OpenStreetMap tiles
- **Geocoding** — Nominatim (free, no key required)
- **Street View** — Google Street View Static API

## Setup

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local` in the project root:
   ```
   NVIDIA_API_KEY=nvapi-...
   GOOGLE_MAPS_API_KEY=AIzaSy...
   ```

3. Run the dev server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) and enter any address.

## Social Impact

Over **1.3 billion people** worldwide live with some form of disability — roughly 1 in 6 of the global population. For wheelchair users, inaccessible sidewalks, missing curb cuts, and broken ramps aren't inconveniences; they are barriers to employment, healthcare, education, and daily life.

AccessAudit makes accessibility auditing instant and scalable. What once required a trained inspector and hours of fieldwork can now be done in under a minute for any address on Earth — helping city planners, disability advocates, and businesses identify and prioritize accessibility improvements before people encounter them in the real world.
