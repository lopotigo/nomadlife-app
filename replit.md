# NomadLife - Digital Nomad Social Platform

## Overview

NomadLife is a full-stack social platform designed to be a central hub for digital nomads. It enables users to connect, share experiences, and discover global resources through a feed-based social experience, interactive exploration, real-time messaging, and premium subscriptions. The platform aims to provide a comprehensive solution for remote workers by facilitating multi-format post sharing, eco-conscious trip planning, booking coworking spaces and accommodations, and event discovery. Monetization is integrated through AdSense, a nomad-focused marketplace, and affiliate partnerships for travel services.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

The frontend is built with React 18, TypeScript, Wouter for routing, and Vite as the build tool. State management utilizes TanStack React Query for server state and React Context for authentication. Styling is handled by Tailwind CSS v4 with shadcn/ui (New York style) and Framer Motion for animations.

**Routing (important):**
- `/` → UnifiedMap (Mappa Comune — community map, main entry point for all users)
- `/diary` → DiaryPage (diary.tsx) — personal map hub: user's trips, moments, nearby nomads, hub
- `/feed` → Home (home.tsx) — legacy social feed (still available)
- `/map-feed` → MapFeed (legacy map+feed hybrid)

**Key UI/UX and Features:**
- Map-centric feed with interactive markers for locations and trip stops.
- User profiles featuring travel statistics, avatar builder, and a "Travel Diary" for managing trips.
- Interactive map for exploration, eco-routing, event discovery, and navigation.
- Social features including multi-format post creation, QR code sharing, comments, and PWA support.
- Integrated booking for hotels, hostels, and coworking spaces, plus an events system with calendar view.
- Personalized travel statistics dashboard.
- Onboarding system with 7-slide English welcome tutorial, contextual floating tips on 10+ pages, and feature discovery cross-link cards on key pages (map, travel diary, blog, profile, marketplace, booking, events).
- Dark/light mode and multi-language support (Italian, English, Spanish).
- Community Chat Channels: predefined themed channels (Lavoro & Freelance, Città & Destinazioni, Visti & Burocrazia, Coworking & Alloggi, Tech & Strumenti, Off Topic) with join/leave functionality, alongside private messaging and user-created groups. Chat page uses tabbed sidebar (Messaggi/Community). All user names are clickable links to profiles.
- AI Chatbot (NomadBot) with streaming responses, conversation history, context-aware page-specific quick prompts and greetings, trip/destination recommendations, voice input (English), photo analysis, AI itinerary generation, and user memory.
- AI Social Intelligence features integrated into Marketplace (product recommendations), Profile (interest analysis), Search (nomad check-in badges), Travel Diary (destination suggestions), and Home Feed (suggested connections, personalized products).
- AI Image Generation functionality.
- "Moments" (Stories) for ephemeral content sharing.
- SEO features including dynamic sitemap, robots.txt, JSON-LD, Open Graph meta tags, and dynamic per-page meta tags (usePageTitle hook with og:title, og:description, og:image, canonical URL).
- Social sharing components for various platforms.
- Three-tier privacy system for location visibility.
- Local Marketplace (Mercato Locale) for GPS-based peer-to-peer listings.
- AI-generated City Guides for major nomad hubs.
- Skills Matchmaking for connecting nomads based on proximity and professional profiles.
- Proactive AI Chatbot as a database-connected agent utilizing various tools for booking, affiliate searches, cost analysis, trip planning, and web search.
- Shareable Eco Trip Card displaying CO2 statistics and an eco score.
- Crowdsourcing feature for users to add new work spots (Café, Coworking, Library) to the map.
- Blog section ("Storie & Guide") with articles, city guides, practical tips, eco-sustainability guides, and geopolitics analysis for nomads. Dynamic page titles per route for Google Analytics.
- Real-time travel alerts for visa changes, safety warnings, and natural disasters.
- Proximity nomad notifications when users enter a 50km radius of each other.
- Contextual stop panel in the Travel Diary: clicking a trip stop (marker on map or item in the expanded stop list) opens a StopContextCard inside the diary panel showing Travelpayouts hotel/flight search links, local coworking spots (from DB), and local events (from DB) — all inline without page navigation.

### Backend

The backend is built with Node.js, Express, and TypeScript. Authentication is session-based using Passport.js with a local strategy and bcryptjs for password hashing. The API follows RESTful conventions.

### Data Storage

PostgreSQL, hosted on Neon, serves as the primary database. Drizzle ORM with drizzle-zod is used for schema definition and CRUD operations. Key tables include `users`, `posts`, `comments`, `places`, `events`, `bookings`, `subscriptions`, `trips`, `messages`, `notifications`, `ai_conversations`, `ai_messages`, `user_ai_preferences`, `userInterests`, `userActivityLog`, `nomadCheckins`, `local_listings`, `city_guides`, `locations`, `blog_posts`, `travel_alerts`, `proximity_logs`, `password_reset_tokens`, `knowledge_cache`, and `learned_locations`.

## External Dependencies

- **Database**: PostgreSQL
- **UI Components**: Radix UI primitives, shadcn/ui, Lucide React
- **Authentication/Session**: `express-session`, `passport`, `passport-local`, `bcryptjs`
- **Push Notifications**: `web-push`
- **Mapping**: Leaflet, Overpass API (for OpenStreetMap data)
- **Affiliate Integrations**: Travelpayouts (Aviasales, Hotellook, Kiwi.com, GetRentacar, GetTransfer, Airalo, Insubuy, NordVPN)
- **Email Service**: SendGrid
- **Security**: Google reCAPTCHA v3
- **AI**: OpenAI (via Replit AI Integrations)
- **Web Search**: Tavily API

## Promemoria Federico (da fare)

- **telmi (domani)**: Wellfound ha bloccato la candidatura per anni di esperienza. Piano: trovare il founder su LinkedIn o telmi.app e scrivere direttamente con messaggio breve + link nomad-life.app. Template: *"Hi, I applied via Wellfound but got filtered out on years of experience. I built a full-stack platform solo this year (nomad-life.app) and I think I can help you take the prototype to production. Worth a quick call?"*

### Upwork — opportunità da seguire (domani)
- **Astro Landing Page ($150)** — cliente Svizzera, 5.0 rating, $6k spesi, cerca junior/studente. Stripe + Calendly integration. Prima candidatura inviata oggi → da monitorare risposta.
- **UX/UI Developer for Travel App ($35-55/hr)** — junior OK, app di viaggio, 1-3 mesi. NomadLife perfetto come portfolio. Da candidare.
- **Junior Full-Stack Dev Marketing/DTC Funnels ($25-47/hr)** — 6+ mesi, lavoro continuativo, cercano junior con mentalità conversione. Da candidare.
- **AI-Driven Restoration Platform (OperionAI)** — TypeScript, Node.js, PostgreSQL, OpenAI API. Stack identico. Expert level ma vale tentare. Da candidare.