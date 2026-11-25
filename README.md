# Garbage Overflow Reporting Portal

A public-service grievance management system that lets citizens report overflowing bins and sanitation issues, track resolution status in real time, and gives administrators tools to assign and monitor field workers. The platform also includes AI-powered issue categorization via the Gemini API.

## Features

- **Citizen Issue Reporting** — Submit complaints with location, description, severity, and photo proof.
- **Status Tracking** — Track a report's lifecycle: `new → assigned → dispatching → resolved → verified`.
- **Admin Dashboard** — Assign tasks to field workers, monitor task history, and manage notifications.
- **Worker Portal** — Field workers can accept, reject, start, and complete assigned tasks with before/after photos and GPS location.
- **AI-Powered Categorization** — Uses Google's Gemini API to assist with classifying and prioritizing incoming reports.
- **Activity & Notification Logs** — Full audit trail of task status changes and worker activity.

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS, Recharts, Lucide Icons
- **Backend:** Express (served via `tsx` in development, bundled with `esbuild` for production)
- **AI Integration:** `@google/genai` (Gemini API)
- **Language:** TypeScript

## Prerequisites

- Node.js (LTS recommended)
- A [Gemini API key](https://ai.google.dev/) for AI-powered categorization

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**

   Copy the example file and add your Gemini API key:
   ```bash
   cp .env.example .env.local
   ```
   Then set `GEMINI_API_KEY` in `.env.local`.

3. **Run in development mode**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the Express + Vite dev server with hot module reload |
| `npm run build` | Builds the frontend (Vite) and bundles the server (esbuild) into `dist/` |
| `npm start` | Runs the production build from `dist/server.cjs` |
| `npm run clean` | Removes the `dist/` directory |
| `npm run lint` | Type-checks the project with `tsc --noEmit` |

## Project Structure

```
├── server.ts              # Express server, API routes, and Gemini integration
├── public/                # Static assets and local JSON "database" files
│   ├── db_grievances.json
│   ├── db_workers.json
│   ├── db_assigned_tasks.json
│   ├── db_task_history.json
│   ├── db_notifications.json
│   └── db_worker_activity.json
├── index.html              # App entry point
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
└── package.json
```

> **Note:** This project uses flat JSON files under `public/` as a lightweight local data store for demo purposes. For a production deployment, replace these with a proper database (e.g., PostgreSQL, MongoDB) and move authentication credentials out of plaintext JSON.

## Security Notes Before Deploying

- `db_workers.json` currently stores worker passwords as **plaintext**, not hashed. Replace this with a proper hashing scheme (e.g., bcrypt) before any real deployment.
- Keep `.env.local` out of version control (already covered by `.gitignore`) and never commit real API keys.

## License

Add your license here.
