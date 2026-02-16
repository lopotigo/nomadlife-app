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
- **AI Chatbot (NomadBot):** Floating AI assistant powered by OpenAI (via Replit AI Integrations). Features: streaming responses, conversation history, quick prompts, trip/destination recommendations. Routes under `/api/ai/*`. Schema: `ai_conversations` and `ai_messages` tables.
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

## External Dependencies

- **Database**: PostgreSQL
- **UI Components**: Radix UI primitives, shadcn/ui, Lucide React
- **Authentication/Session**: `express-session`, `passport`, `passport-local`, `bcryptjs`
- **Push Notifications**: `web-push` library
- **Mapping**: Leaflet
- **Affiliate Integrations**: Travelpayouts (Aviasales for flights, Hotellook for hotels)