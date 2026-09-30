# ⚡ PULSE — Fitness & Daily Goal Habit Tracker

> Real-Time Multi-User Fitness, Workout & Daily Habit Tracking Web Application.

![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.x-purple?logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.x-38bdf8?logo=tailwindcss&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-black?logo=express)
![WebSocket](https://img.shields.io/badge/WebSocket-Real--Time-green)

---

## 🌟 Overview

**PULSE** is a full-stack, real-time fitness and habit tracker designed for both solo users and competitive fitness groups. It combines daily goal tracking (steps, hydration, sleep, workouts, custom habits) with real-time WebSocket synchronization, visual analytics, interactive leaderboards, and head-to-head member face-offs.

---

## 🚀 Key Features

- **✅ Interactive Daily Checklist:**
  - Track steps, sleep duration, water intake, workouts, and customizable daily habits.
  - Quick goal toggle, completion streaks, and dynamic visual progress bars.
  - Confetti celebration upon hitting all daily targets!

- **🏋️ Workout Logging & History:**
  - Detailed workout entry with exercise types, sets, reps, weight, duration, and calories burned.
  - Filterable workout history feed.

- **⚡ Real-Time Live Sync (WebSockets):**
  - Instant cross-client updates when teammates log workouts, complete goals, or react.
  - Live user presence indicator (`Live Sync` badge) displaying active online members.

- **🏆 Leaderboard & Social Feed:**
  - Real-time group rankings based on total points and streak consistency.
  - Social activity feed with emoji reactions (🔥, 💪, 👏, 🎯, ⭐).

- **⚔️ Head-to-Head Face-Off:**
  - Side-by-side comparison between any two registered members to spark friendly competition.

- **📊 Visual Analytics & Weekly Recap:**
  - Recharts-powered graphs for weight trends, daily activity, and sleep consistency.
  - One-click weekly performance summary modal.

- **💾 Dual Persistence & Zero Config:**
  - Fast client-side storage hydration with persistent JSON database backend (`pulse_db.json`).
  - No external SQL database configuration required to get started.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React icons, Recharts, Canvas Confetti
- **Backend:** Node.js, Express 5, WebSocket (`ws`), CORS
- **Storage:** JSON File Database (`server/data/pulse_db.json`) + Browser LocalStorage fallback

---

## 🏁 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/RakeshKumar-Meduri/Habit-Tracker-challenge.git
cd Habit-Tracker-challenge
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run the Development Server
```bash
npm run dev
```

This single command boots both:
- **Express + WebSocket Backend:** `http://localhost:3001`
- **Vite React Frontend:** `http://localhost:5173`

Open [http://localhost:5173](http://localhost:5173) in your browser to start tracking!

---

## 📁 Project Structure

```text
Habit-Tracker-challenge/
├── server/
│   ├── data/
│   │   └── pulse_db.json     # JSON database for persistence
│   └── server.js             # Express & WebSocket real-time server
├── src/
│   ├── components/           # UI components (Navbar, Checklist, Leaderboard, etc.)
│   ├── services/             # API and WebSocket sync client
│   ├── utils/                # Local storage and date helpers
│   ├── types.ts              # TypeScript interfaces
│   ├── App.tsx               # Main application controller
│   └── main.tsx              # React DOM entry
├── scripts/
│   └── dev.js                # Concurrent backend + frontend runner
├── package.json
└── vite.config.ts
```

---

## 📜 License

MIT License. Crafted with ❤️ for health, discipline, and daily consistency.
