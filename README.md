# NomadLife — Digital Nomad Social Platform

> A full-stack production PWA built solo in 2025 — live at **[nomad-life.app](https://nomad-life.app)**

---

## What is it?

NomadLife is a social platform for digital nomads: people who work remotely and travel the world. It combines a community feed, an interactive map, real-time chat, AI assistance, booking tools, and travel tracking into a single mobile-first web app.

Built from zero by one developer (me) over the course of a few months, using AI-assisted development workflows.

---

## Features

| Area | What it does |
|------|-------------|
| **AI Chatbot (NomadBot)** | Streaming responses, voice input, photo analysis, trip planning, web search via Tavily |
| **Community Map** | Interactive Leaflet map with user check-ins, coworking spots, events, eco-routing |
| **Real-time Chat** | WebSocket-based group channels + private messaging |
| **Travel Diary** | Personal trip tracking with map visualization, stop management, contextual booking suggestions |
| **Booking** | Hotel, hostel, coworking search via Travelpayouts affiliate APIs |
| **Marketplace** | GPS-based peer-to-peer listings (Mercato Locale) |
| **Blog** | AI-generated city guides and nomad articles, multi-language |
| **Moments** | Ephemeral story-style content sharing |
| **Events** | Discovery and calendar view |
| **PWA** | Installable, offline-capable, push notifications |

---

## Tech Stack

**Frontend**
- React 18 + TypeScript
- Vite
- Tailwind CSS v4 + shadcn/ui (New York style)
- Framer Motion
- Leaflet (maps)
- TanStack React Query
- Wouter (routing)

**Backend**
- Node.js + Express + TypeScript
- Passport.js (session-based auth)
- WebSockets (real-time chat)
- Drizzle ORM

**Database**
- PostgreSQL (Neon)

**AI & External**
- OpenAI API (GPT-4o, GPT-4o-mini, TTS, Whisper)
- Tavily (web search)
- SendGrid (email)
- Travelpayouts (booking affiliates)
- Google reCAPTCHA v3

---

## Project Structure

```
├── client/          # React frontend
│   ├── src/
│   │   ├── pages/   # Route-level components
│   │   ├── components/
│   │   └── hooks/
├── server/          # Express backend
│   ├── routes.ts    # All API routes
│   ├── storage.ts   # Database layer (Drizzle)
│   └── index.ts
├── shared/
│   └── schema.ts    # Drizzle schema + Zod types
└── job-inspector/   # Standalone job search tool (see below)
```

---

## Job Inspector

A personal tool I built alongside NomadLife to automate my own job search.

**Live:** [nomad-life.app/inspector](https://nomad-life.app/inspector)

It scans Remotive, Jobicy, RemoteOK, and Remotive AI for remote developer jobs, scores each one against my profile using GPT-4o-mini (tech stack match, experience gate, EU timezone, compensation), and runs a Startup Scout via Tavily to surface early-stage EU startups to cold-outreach.

```
job-inspector/
├── server.js        # Express server (port 3001 in dev)
└── public/
    └── index.html   # Single-file frontend UI
```

---

## Running Locally

```bash
# Install dependencies
npm install

# Set up environment variables (see .env.example)
cp .env.example .env

# Push database schema
npm run db:push

# Start development server
npm run dev
```

The app runs on `http://localhost:5000`.

---

## Who built this?

**Federico Poletti** — full-stack developer, Sardinia Italy.

Self-taught over ~12 months, using TypeScript, React, Node.js, PostgreSQL, and OpenAI API as my core stack. Background in political science, logistics, and business — I bring product thinking alongside engineering.

- 🌐 [nomad-life.app](https://nomad-life.app)
- 📧 federicopoletti83@gmail.com
- 💼 [linkedin.com/in/federico-poletti-dev](https://linkedin.com/in/federico-poletti-dev)

---

## License

MIT
