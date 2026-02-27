# NomadLife - Digital Nomad Social Platform

## Overview

NomadLife is a full-stack social platform for digital nomads to connect, share experiences, and discover resources globally. It provides a feed-based social experience, interactive exploration, real-time messaging, and premium subscription management, aiming to be a central hub for the digital nomad community. Key capabilities include sharing multi-format posts, planning and tracking trips with eco-routing, booking coworking spaces and accommodations, and discovering events. The platform also features monetization through AdSense integration, a marketplace for nomad-focused products, and affiliate integrations for flights and hotels, enhancing its market potential as a comprehensive solution for remote workers.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

The frontend is built with React 18, TypeScript, and Wouter for routing. State management uses TanStack React Query for server state and React Context for authentication. Styling is handled by Tailwind CSS v4 with shadcn/ui (New York style) and Framer Motion for animations. Vite is used as the build tool.

**Key UI/UX and Features:**
- A map-centered feed with interactive Leaflet markers, avatar-based markers for trip stops, and a "QUI ORA" badge for current locations.
- User profiles with travel statistics, an avatar builder, and a dedicated Travel Diary for managing trips (planned, in progress, completed) with photo/video uploads for stops.
- Interactive map for exploration with eco-routing, event markers, and "Indicazioni" for navigation.
- Comprehensive social features including multi-format post creation (video, photo, link), QR code sharing, a comments system, and PWA support for offline access.
- Integrated booking section for hotels, hostels, and coworking spaces, and an events system with a calendar view and poster generation.
- Personal travel statistics dashboard showing total km, CO2 emitted/saved, and eco-transport percentage.
- Onboarding system with interactive tutorials and contextual floating tips.
- Dark/light mode theme toggle and multi-language support (Italian, English, Spanish).

### Backend

The backend uses Node.js with Express and TypeScript. Authentication is session-based via Passport.js with a local strategy and bcryptjs for password hashing. The API follows RESTful conventions under `/api` with protected routes. A dual-build approach utilizes Vite for the client and esbuild for the server.

### Data Storage

PostgreSQL, backed by Neon, is the primary database. Drizzle ORM with drizzle-zod is used for schema definition and CRUD operations. Core tables include `users`, `posts`, `comments`, `places`, `events`, `bookings`, `subscriptions`, `trips`, `messages`, and `notifications`.

### Authentication Flow

Session-based authentication manages user login, signup, and secure access to protected routes, redirecting unauthenticated users as needed.

### Key Features Implemented

- **User Authentication:** Session-based with secure hashing.
- **Social Feed:** Post creation with images/location, likes, engagement metrics, and YouTube video embeds.
- **Trip Planning & Management:** Detailed trip planning with status, visibility controls, copy public trips, and an animated Trip Replay feature.
- **Booking & Events:** Search, filter, and book coworking spaces and accommodations; browse, register, and manage events with map integration and calendar view.
- **Messaging:** Group and private messaging.
- **Subscription & Monetization:** Premium subscription management, Google AdSense integration, and a marketplace for nomad-focused products with affiliate tracking.
- **User Engagement:** Push notifications for new followers, trips, and messages; search functionality for nomads and trips; and an Admin Panel for product and vendor management.
- **Internationalization:** Multi-language support for Italian, English, and Spanish.
- **AI Chatbot (NomadBot):** Floating AI assistant powered by OpenAI (via Replit AI Integrations). Features: streaming responses, conversation history, quick prompts, trip/destination recommendations, voice input (Web Speech API), photo analysis (GPT-4o Vision), AI itinerary generation, user memory/preferences, smart trip notifications. Routes under `/api/ai/*`. Schema: `ai_conversations`, `ai_messages`, `user_ai_preferences` tables. 9 tools: search_places, get_place_reviews, create_booking, search_affiliate, get_city_costs, budget_trip_planner, web_search, generate_itinerary, save_user_preferences.
- **AI Social Intelligence (Unified):** AI features are integrated directly into existing sections (no separate AI Hub page):
  - **Marketplace**: "Consigliati per te" AI-powered product recommendations at top of product listing
  - **Profile**: "I tuoi interessi" section showing AI-analyzed interest tags with confidence scores
  - **Search**: Check-in badges (Qui ora, In arrivo, Pianifica) on nomad search results
  - **Travel Diary**: "Suggeriscimi una destinazione" AI panel in new trip dialog
  - **Home Feed**: "Nomadi che potresti conoscere" suggested connections card, SmartProductsWidget with personalized products
  - Backend: Profile analysis via OpenAI GPT-4o, nomad check-in system, smart product matching, travel suggestions, connection matching. Schema: `userInterests`, `userActivityLog`, `nomadCheckins` tables.
- **AI Image Generation:** Endpoint `/api/generate-image` for AI-powered image creation.
- **Moments (Stories):** Ephemeral 24h content with media upload, views tracking, fullscreen viewer with progress bars.
- **SEO:** Dynamic sitemap, robots.txt, JSON-LD structured data, Open Graph meta tags.
- **Social Sharing:** Reusable component for WhatsApp, Telegram, X/Twitter, copy link.
- **Privacy Shadow Mode:** Three-tier privacy system (visible/approximate/hidden) for location visibility on map. Settings in profile page. Schema: `privacyMode` field on `users` table.
- **Local Marketplace (Mercato Locale):** GPS-based peer-to-peer marketplace for nearby items. CRUD with proximity filter (1-5km radius), category filters, image upload. Routes under `/api/local-listings/*`. Schema: `local_listings` table. Merged into Marketplace page as "Vicino a te" tab.
- **City Guides (Guide Città):** AI-generated city guides for major nomad hubs (Bangkok, Lisbon, Madeira, Bali, Chiang Mai). Categories: WiFi, coworking, visa, food, lifestyle. Map markers on unified map. Routes under `/api/city-guides/*`. Schema: `city_guides` table. Merged into Search page as "Guide AI" tab.
- **Skills Matchmaking (Matchmaking Professionale):** Proximity + skills-based nomad matching. Profile fields: profession, skills[], lookingFor. GPS-based search with radius slider. Routes under `/api/matchmaking/*`. Page: `/matchmaking`.
- **Proactive AI Chatbot (Database-Connected Agent):** NomadBot is a database-connected AI agent using OpenAI function calling. Tools: `search_places` (queries PLACES table by city/type), `get_place_reviews` (queries PLACE_REVIEWS with avg ratings), `create_booking` (writes to BOOKINGS table), `search_affiliate` (generates Travelpayouts affiliate links for hotels/flights/cars/transfers/insurance via Hotellook, Aviasales, Kiwi.com, Rentalcars, GetTransfer, Insubuy), `get_city_costs` (queries CITIES table for cost-of-living data), `budget_trip_planner` (cross-references flight estimates + daily city costs to calculate trip affordability, suggests best cities for a given budget), `web_search` (real-time web search via Tavily API for Wi-Fi quality, cafes, visa info, local tips). Workflow: search DB first → show real data → book on confirmation → fallback to affiliate links → budget planning with cost breakdown → web search for unknown cities. Booking confirmation shown as styled card. Frontend renders markdown links and booking confirmations.
- **Eco Trip Card:** Shareable eco-trip card with CO2 stats, eco score (A+/A/B/C), circular progress, social sharing. Component: `EcoTripButton` in trip detail pages.
- **Overpass API Integration:** Real coworking/hotel/hostel/café data from OpenStreetMap via Overpass API. Route: `GET /api/places/overpass?city=X&type=Y&radius=Z` or `?lat=X&lng=Y`. Multi-endpoint failover (kumi, de, mail.ru). In-memory cache (30min TTL). Merges with local DB places (local priority). Service: `server/overpass.ts`. Coworking page updated with GPS nearby search, city quick-search pills, radius slider, source badges (OSM/local), Google Maps links.
- **Crowdsourcing Spot:** Users can add new work spots (Café, Coworking, Biblioteca) to the map via FAB menu. Form: name, category, Wi-Fi quality (1-5 stars), power outlets toggle, GPS auto-position, optional notes. Animated radial FAB menu with 3 options: Aggiungi Spot, Crea Evento, Nuovo Post. Spots render as colored markers (amber/green/indigo) with clickable popups showing details. Routes: `GET/POST /api/locations`. Schema: `locations` table. Filter toggle in map filters panel.
- **Blog / Storie & Guide:** Public blog section (no login required) with 12 quality articles covering city guides (Bangkok, Lisbona, Bali, Chiang Mai, Medellín, Berlino), practical tips (VPN, insurance, apps, taxes), lifestyle guides, and coworking reviews. Categories: guide, tips, lifestyle, finance, tech, travel, events, review. Featured article hero, category filters, search, affiliate links sidebar on articles with city context. Public routes: `GET /api/blog`, `GET /api/blog/categories`, `GET /api/blog/:slug`. Admin: `POST /api/blog`. Schema: `blog_posts` table. Pages: `/blog` (listing), `/blog/:slug` (article). Blog posts included in sitemap.xml with high priority (0.8-0.9). Navigation: sidebar + mobile menu.

## External Dependencies

- **Database**: PostgreSQL
- **UI Components**: Radix UI primitives, shadcn/ui, Lucide React
- **Authentication/Session**: `express-session`, `passport`, `passport-local`, `bcryptjs`
- **Push Notifications**: `web-push` library
- **Mapping**: Leaflet
- **Affiliate Integrations**: Travelpayouts (Aviasales for flights, Hotellook for hotels, Kiwi.com for low-cost flights, GetRentacar for car rental, GetTransfer for transfers, Airalo for eSIM, Insubuy for travel insurance, NordVPN for VPN). Marker ID: env VITE_TRAVELPAYOUTS_MARKER. Frontend utility: `client/src/lib/travelpayouts.ts`. DB: 50 real places across 14 nomad cities (Bangkok, Bali, Lisbon, Chiang Mai, Berlin, Medellín, Mexico City, Buenos Aires, Porto, Tbilisi, Da Nang, Cape Town, Tulum, Playa del Carmen).
- **Email Service**: SendGrid (`@sendgrid/mail`) for transactional emails (password reset). Sender: `noreply@nomad-life.app`. Domain: `nomad-life.app`.
- **Password Recovery**: Full password reset flow via email. Routes: `POST /api/auth/forgot-password`, `GET /api/auth/verify-reset-token`, `POST /api/auth/reset-password`. Schema: `password_reset_tokens` table. Pages: `/forgot-password`, `/reset-password?token=X`. Token expires in 1 hour.
- **reCAPTCHA**: Google reCAPTCHA v3 (invisible) on login/signup forms. Loaded dynamically only on auth page. Site Key: `6LdMNXYsAAAAABrnjRNQqrnq-JC4mObOiwcR8Lw1`. Secret Key stored as `RECAPTCHA_SECRET_KEY`. Server-side verification with score threshold 0.3. Domain: `nomad-life.app`.
- **Privacy Policy & GDPR**: Full GDPR-compliant privacy policy page at `/privacy` (also `/privacy-policy`). States: collects only email and GPS for the social to function, data not sold to third parties, user can delete account anytime. Page: `client/src/pages/privacy-policy.tsx`.
- **Terms of Service**: Full ToS page at `/terms` covering account rules, content license, acceptable use, third-party services, subscriptions, IP, liability, and governing law. Page: `client/src/pages/terms.tsx`. Login form has link text to both /terms and /privacy below the button. Signup form requires mandatory checkbox "Accetto i Termini di Servizio e l'Informativa sulla Privacy" before registration.
- **Knowledge Cache & Learning System:** Self-growing database that learns from user activity. Schema: `knowledge_cache` table (caches Tavily web search results with fuzzy matching, avoids repeated API calls), `learned_locations` table (tracks locations mentioned in Tavily results, user posts, and chat). Post creation auto-extracts location data. Tavily results cached with normalized query keys and fuzzy ILIKE fallback. Hit counter tracks popular queries. Location mention counter tracks trending destinations.
- **Weekly Auto-Update System:** Automatic weekly job (`server/weekly-update.ts`) refreshes all 26 cities via Tavily with latest nomad info (coworking, costs, WiFi, visa). Cities table extended with `tavily_insights` (JSON) and `last_tavily_update` columns. Enriched data endpoint: `GET /api/cities/:id/enriched` returns Tavily insights + user post count + community mentions + trending score. City popups in Search page show community section with post count, mentions, and auto-updated insights. Job starts 30s after server boot, runs every 7 days, with 3s delay between cities (~26 searches/week, ~104/month).