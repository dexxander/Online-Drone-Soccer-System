# Online Drone Soccer Management System

A modern, production-ready SaaS platform for managing drone soccer tournaments, teams, players, referees, and real-time scoreboards.

## 🏗 Architecture Overview

The system is designed with a strict separation between the React frontend and a Node.js/Express backend, with shared types, and abstraction layers to allow easy swapping between local development data and future Firebase integration.

### Tech Stack
- **Frontend:** React 19, TypeScript, Vite, TanStack Router, Tailwind CSS v4, shadcn/ui.
- **Backend (WIP):** Node.js, Express, Socket.IO.
- **Deployment:** Configured for Vercel.

---

## 📁 Directory Structure & File Responsibilities

### 1. `server/` (Backend - Pending Implementation)
This directory houses the REST API and WebSocket server.
- `server/index.ts`: The entry point. Initializes Express and the HTTP server.
- `server/routes/`: Contains API endpoint definitions (e.g., `/api/tournaments`).
- `server/controllers/`: Contains business logic for API endpoints (e.g., `matchController.ts`).
- `server/services/socketService.ts`: Manages WebSocket connections for real-time Scoreboard and Referee dashboard sync.

### 2. `shared/` (Cross-Boundary Types)
- `shared/types/index.ts`: The single source of truth for TypeScript interfaces (User, Team, Match, Penalty). Both `src/` and `server/` import from here.

### 3. `src/` (React Frontend)
- `src/routes/`: Contains all the UI pages using TanStack file-based routing.
  - *Key File:* `src/routes/scoreboard.tsx` - The dedicated TV/fullscreen scoreboard page.
- `src/components/`: Reusable UI elements.
  - *Key File:* `src/components/RoleSwitcher.tsx` - A dev-only floating UI to switch roles (Admin, Referee, etc.) without logging in.
- `src/lib/services/`: Abstraction layers for data fetching and auth.
  - *Key File:* `AuthService.ts` - Handles swapping between Mock Auth (Dev Mode) and Firebase Auth.
  - *Key File:* `MatchService.ts` - Handles fetching match data via Local Express API vs Firebase.
- `src/lib/pairing/`: Complex algorithms.
  - *Key File:* `randomCirclePairing.ts` - Engine for generating tournament brackets and fair matchups.
- `src/lib/reporting/`: Utility scripts.
  - *Key File:* `exportUtils.ts` - Logic for CSV and PDF exports.

---

## 🛠 Team Task List: Implementing Missing Features

To complete the requirements and migrate from the initial Firebase-only prototype to the production-ready architecture, the team needs to implement the logic inside the placeholder files. 

### Phase 1: Decoupling & The Backend
1. **Move Types:** Migrate interfaces from `src/lib/types.ts` to `shared/types/index.ts`. Add `MatchEvent` and `Penalty` models.
2. **Build the API:** Implement basic CRUD in `server/controllers/` and expose them via `server/routes/index.ts`.
3. **Data Abstraction:** Implement `src/lib/services/MatchService.ts` and `TeamService.ts` so the frontend fetches data from your new Node.js backend instead of `db.ts` (Firebase).

### Phase 2: Real-Time & Refereeing (CRITICAL)
1. **WebSockets:** Implement `server/services/socketService.ts` to listen for match updates and broadcast to scoreboards.
2. **Scoreboard UI:** Build `src/routes/scoreboard.tsx` to display live scores and listen to the WebSocket.
3. **Referee Dashboard:** Update `src/routes/_authenticated/matches.$matchId.tsx` to include buttons for Minor/Major/Technical penalties and emit WebSocket events when scores change.

### Phase 3: Development Mode & Algorithms
1. **Mock Auth & Roles:** Implement `src/lib/services/AuthService.ts` to support bypass login. Build the UI for it in `src/components/RoleSwitcher.tsx`.
2. **Pairing Engine:** Write the algorithm inside `src/lib/pairing/randomCirclePairing.ts` to handle odd numbers and bracket generation.
3. **Reporting:** Implement CSV generation in `src/lib/reporting/exportUtils.ts`.

---

## 🚀 Deployment

The project is pre-configured for Vercel. 
- Ensure environment variables are set up in the Vercel dashboard.
- The `vercel.json` handles SPA rewrite rules.
- Run `npm run build` locally to verify production builds.
