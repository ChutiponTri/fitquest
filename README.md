# FitQuest 🏋️ — AI Exercise Game

A browser-based exercise game powered by MediaPipe Pose Detection. No backend required — fully deployable on Vercel.

## Features

- **Real-time pose detection** via MediaPipe Tasks Vision (runs in-browser, GPU-accelerated)
- **5 exercises**: Marching, Mini Squat, Squat, Squat + Punch, Squat + Kick
- **Heart rate zones** calculated using Karvonen formula (HR Rest = 70 bpm, Moderate = 40–59% HRR)
- **Live skeleton overlay** on mirrored camera feed
- **Score + results screen** at session end

## Heart Rate Formulas

```
HR_REST  = 70 bpm
HR_MAX   = 206.9 − (0.67 × age)
HRR      = HR_MAX − HR_REST
THR      = (HRR × % intensity) + HR_REST
Moderate = 40–59% HRR
```

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:5173 — allow camera access when prompted.

## Deploy to Vercel

### Option A: Vercel CLI
```bash
npm install -g vercel
vercel
```

### Option B: Vercel Dashboard
1. Push this repo to GitHub
2. Go to https://vercel.com/new
3. Import your repository
4. Framework: **Vite** (auto-detected)
5. Click Deploy

The `vercel.json` file already sets the required COOP/COEP headers for SharedArrayBuffer (needed by MediaPipe WASM).

## Camera Setup Tips

- Stand **2–3 metres** from the camera
- Ensure your **full body is visible** in frame
- Use a **well-lit** area
- Camera should be at **chest height** for best results

## Exercise Detection Logic

| Exercise | Detection Method |
|---|---|
| Marching | Knee angle < 140° = lifted; counts cycle up→down |
| Mini Squat | Knee angle 120–170° cycle |
| Squat | Knee angle 80–170° cycle |
| Squat + Punch | Squat cycle + wrist above shoulder |
| Squat + Kick | Squat cycle + ankle extension > 155° |

## Tech Stack

- React 18 + Vite
- MediaPipe Tasks Vision 0.10.14
- Zero backend dependencies
