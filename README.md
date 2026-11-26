# ShikshaSync

Offline-first adaptive learning PWA for rural multi-grade schools. Built for low-bandwidth classrooms where one teacher manages Grades 3 to 5 together and internet access is intermittent.

## Problem

Rural multi-grade classrooms often share a single teacher across multiple grade levels and regional languages, with unreliable connectivity that breaks cloud-only edtech apps and stalls individual remediation.

## What ShikshaSync Does

- **On-Device Adaptive Engine (BKT)**: Runs Bayesian Knowledge Tracing (`lib/bkt.ts`) locally in the browser to update Math and Reading mastery in real time (`0.05`–`0.99`) and adapt difficulty across Levels 1–3 without any network call.
- **Multilingual Practice + Voice Hints**: Delivers Grade 3–5 Math and Reading drills in **English**, **Kannada (`ಕನ್ನಡ`)**, and **Hindi (`हिन्दी`)** with a **Listen** voice hint button (`/api/tts` using ElevenLabs `eleven_multilingual_v2`, browser Cache API audio caching, and automatic `speechSynthesis` offline fallback).
- **Offline-First PWA & Local Storage**: Precaches core routes via a Service Worker (`public/sw.js`), ships with `public/manifest.json`, and persists mastery, offline mode state, remedial packs, and pending sync deltas in `localStorage` mirrored to `IndexedDB` (`lib/storage.ts`).
- **Low-Bandwidth Delta Sync & Teacher Heatmap**: Syncs queued student deltas and receives a targeted remedial pack (`~1–2 KB` round-trip, built for `<500 KB` rural sync windows) via `POST /api/sync`, with optional AWS DynamoDB + AWS Bedrock integration and a zero-config local fallback.

## App Routes & Architecture

- `/` (`app/page.tsx`): Classroom student register (Aarav, Kavya, Rohan, Meera across Grades 3–5), language switcher, mastery pills, and pending queue status.
- `/learn/[id]` (`app/learn/[id]/page.tsx`, `QuizClient.tsx`): Distraction-free adaptive practice sheet with live mastery bars, `Adaptive` / `Math` / `Reading` focus modes, voice hints, and prioritized remedial drills.
- `/teacher` (`app/teacher/page.tsx`): Multi-grade mastery matrix heatmap (Needs help `<45%`, Practicing `45–69%`, Mastered `>=70%`), Grade 3–5 averages, pending sync queue viewer, **Sync now** KB payload counter, **Latest remedial pack**, and **Reset demo**.
- `/api/tts` (`app/api/tts/route.ts`): Optional ElevenLabs audio synthesis returning `{ fallback: true }` cleanly when offline or unconfigured.
- `/api/sync` (`app/api/sync/route.ts`): Delta sync endpoint with optional AWS SigV4 DynamoDB (`PutItem`) + Bedrock (`Converse`) integration and deterministic local remedial pack generation.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack), React 19, TypeScript
- **Styling**: Tailwind CSS v4 with warm notebook paper & chalkboard green CSS custom properties
- **Offline & Storage**: Service Worker (`public/sw.js`), Web App Manifest (`public/manifest.json`), Cache API, `localStorage` + `IndexedDB`
- **Voice & Cloud (Optional)**: ElevenLabs API + Web Speech API fallback, AWS DynamoDB & Bedrock REST (SigV4) + local fallback

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

For production build and PWA service worker testing:

```bash
npm run build
npm run start
```

## Environment Variables (Optional)

The app runs out of the box with zero API keys using local BKT, local remedial pack generation, and browser `speechSynthesis` fallback. To enable cloud TTS and AWS sync, copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

- `ELEVENLABS_API_KEY`: Enables ElevenLabs `eleven_multilingual_v2` voice hints on `/api/tts` (optional `ELEVENLABS_VOICE_ID` overrides default voice)
- `AWS_REGION`: AWS region (defaults to `ap-south-1`)
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`: Enables AWS SigV4 requests on `/api/sync`
- `AWS_DYNAMODB_TABLE`: Persists school sync snapshots to DynamoDB
- `AWS_BEDROCK_MODEL_ID`: Generates personalized remedial tips via Bedrock Converse (defaults to `amazon.nova-micro-v1:0`)

## 2-Minute Demo Flow

1. On `/`, switch the top bar toggle to **Offline mode** and choose a language (`English`, `ಕನ್ನಡ`, or `हिन्दी`).
2. Select a student (e.g., **Aarav — Grade 3**) to open `/learn/aarav`.
3. Click **Listen** to test cached/offline voice hints, then answer 3–4 questions to watch **Math mastery**, **Reading mastery**, and **Pending sync** update locally with zero network calls.
4. Open **Teacher** (`/teacher`), review the updated mastery heatmap and **Pending sync queue**, toggle back to **Online mode**, and click **Sync now** to inspect the exact KB synced and generated **Latest remedial pack**.
5. Re-open **Aarav** (`/learn/aarav`) to see the **Synced remedial focus** and prioritized **Remedial drill**, or click **Reset demo** on `/teacher` to restart cleanly.
