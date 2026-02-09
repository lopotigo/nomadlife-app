# NomadLife - Digital Nomad Social Platform

## Overview

NomadLife is a full-stack social platform designed for digital nomads to share travel experiences, discover coworking spaces, book accommodations, and connect with other remote workers globally. It offers a feed-based social experience, interactive exploration, real-time messaging, coworking space booking, and premium subscription management, aiming to be a central hub for the digital nomad community.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query for server state, React Context for authentication
- **Styling**: Tailwind CSS v4 with shadcn/ui (New York style)
- **Animations**: Framer Motion
- **Build Tool**: Vite
- **Key Features**:
    - Map-centered feed with interactive Leaflet markers for posts.
    - User profiles with travel statistics.
    - Travel Diary with "My Trips" and "Explore" tabs.
    - Coworking space browsing and booking.
    - Group and private messaging.
    - Premium subscription management.
    - Interactive map for exploration with eco-routing.
- **UI/UX Decisions**:
    - New Home Layout (Design E): Left navigation sidebar, center interactive Leaflet map (dark theme), right column for nearby nomads and activity (desktop only), bottom tab navigation for mobile.

### Backend

- **Runtime**: Node.js with Express
- **Language**: TypeScript
- **Authentication**: Passport.js with local strategy, express-session (in-memory for development)
- **Password Hashing**: bcryptjs (salt rounds 10)
- **API**: RESTful conventions under `/api` with protected routes.

### Data Storage

- **Database**: PostgreSQL (Neon-backed)
- **ORM**: Drizzle ORM with drizzle-zod
- **Schema**: Defined in `shared/schema.ts`
- **Core Tables**: `users`, `posts`, `comments`, `places`, `events`, `event_registrations`, `bookings`, `chatGroups`, `messages`, `subscriptions`, `trips`, `trip_stops`, `trip_expenses`, `followers`, `notifications`.
- **Storage Interface**: `server/storage.ts` provides comprehensive CRUD operations.

### Authentication Flow

- Session-based authentication handles user login/signup, session creation, and protected route access, redirecting unauthenticated users.

### API Routes

- Comprehensive API for `auth`, `users`, `posts`, `places`, `bookings`, `events`, `chat-groups`, `messages`, and `subscription` management.

### Build System

- Dual-build approach using Vite for the client and esbuild for the server, optimizing for performance.
- Database schema synchronization via `npm run db:push`.

### Key Features Implemented

- User Authentication (session-based, secure hashing)
- Social Feed (post creation with images/location, likes, engagement metrics)
- **Multi-format Sharing** (video, photo, link, trip association, location-based posts)
- **QR Code Sharing** (share posts, trips and profiles via scannable QR codes)
- User Profiles (personal info, travel stats, profile editing)
- Coworking Space Booking (search, filter, booking flow, history)
- Events System (browse, register, manage events)
- Group Messaging (city-based groups, private messaging, chat history)
- Premium Subscription (subscribe/cancel, status tracking)
- Explore & Discovery (interactive map, city markers, eco-routing)

### Recent Updates

- **Enhanced Trip Experience (Differentiating Feature)**:
  - Avatar-based markers: Trip stops show user avatar as marker on map
  - Larger avatar marker with "QUI ORA" badge for posts with trips attached (shows where user is now)
  - Premium PostMapPopup: Expandable itinerary with star ratings, accommodation info, photo previews, trip stats (km, CO2, stops), copy trip button, direct link to trip diary
  - Premium trip stop popup: Photo header with gradient overlay, star rating, accommodation card (name + type), weather widget, diary/booking/share buttons
  - Copy trip API: POST /api/trips/:id/copy to duplicate public trips to own diary
  - Trip detail page upgraded: Stats dashboard (total km, CO2 saved, stops count), expandable stops with ratings, accommodation details, user profile link
  - Trip stops schema: Added rating (1-5 stars), accommodationName, accommodationType fields
  - Travel diary stop creation: Star rating input, accommodation name/type fields
- Added multi-format post creation: video upload, photo upload, link attachment, trip association
- Implemented QR code sharing system with `qrcode.react` library
- Created dedicated pages for viewing individual posts (`/post/:id`) and trips (`/trip/:id`)
- Added share buttons to post and trip popups on the map
- ShareQRModal component with download, copy and native share functionality
- **Trip Planning System**: New trip status field (planned/in_progress/completed) with filter tabs
- **Copy Stops from Public Trips**: Users can copy interesting stops from public trips to their planned trips
- **Photo/Video Upload for Stops**: Trip stops now support media upload with progress indicator
- **View on Map**: Click any trip to see it highlighted on the main map
- **Hotel Search from Stops**: Each stop has a "Cerca alloggio" button linking to hotel search for that city
- **Comments System**: Full commenting on posts with create/delete functionality, real-time count updates
- **Search System**: Search for nomads by name/location and trips by destination (city/country)
- **Notifications UI**: Dropdown with unread count badge, mark as read, notifications list
- **Inline Comments in Feed**: Expandable comments section in post cards (both home feed and map feed)
- **PWA (Progressive Web App)**: App is installable on mobile/desktop, with offline caching support
- **Profile Photo Upload**: Users can upload/change profile photo by clicking camera icon on avatar
- **Followers/Following UI**: Modal showing lists of followers and following with counts
- **Dark/Light Mode**: Theme toggle in profile with `ThemeProvider` context and localStorage persistence
- **Push Notifications**: Web Push API with VAPID keys, service worker push handler, subscribe/unsubscribe from profile
- **Avatar Builder**: Customizable avatar creation page with DiceBear integration - 12 styles (cartoon, pixel art, robot, etc.), background colors, hair colors, accessories
- **Unified Create Menu**: Single "+" button on map opens dropdown to create Post or Event
- **Events on Map**: Events now appear as purple markers on the map with dedicated popup showing date, location, price, attendees
- **Event Filtering**: Toggle events visibility in map filters panel
- **Event Geocoding**: Automatic coordinate detection from city name using OpenStreetMap Nominatim
- **Event Poster/Manifesto**: Generate downloadable poster image for events with QR code, date, location, and event details (uses html2canvas)
- **Transport Mode Selection**: Two interfaces for selecting transport between trip stops:
  - Manual: TransportSelector dropdown in trip stop list with CO2/distance display
  - Map: Auto-showing transport panel in TripPlannerMap with large 2x2 grid buttons (walk/bike/train/car/plane)
  - CO2 rates: walk/bike 0, train 0.041, car 0.171, plane 0.255 kg/km
  - Distance filtering: walk ≤30km, bike ≤100km, car ≤2000km, plane >200km
- **Trip Status & Visibility Controls**: Toggle buttons in TripDetails for:
  - Status: Pianificato (planned), In corso (in_progress), Completato (completed)
  - Visibility: Pubblico/Privato with instant save via PATCH /api/trips/:tripId
- **Personal Travel Statistics**: Dashboard component (`PersonalStats`) showing:
  - Total km traveled, countries/cities visited, trips completed
  - CO2 emitted vs CO2 saved (compared to car travel)
  - Eco-transport percentage
  - Displayed in both Profile and Travel Diary pages
- **Events Calendar**: Monthly calendar view (`/events-calendar`) with:
  - Navigate between months
  - See events you're registered for and events you organized
  - Click any date to see events on that day
  - Quick stats showing registered vs organized events
- **Multi-language Support (i18n)**: 
  - Italian (default), English, Spanish
  - Language selector in Profile page
  - All navigation labels and common UI elements translated
  - Persisted to localStorage
- **Mobile Header**: Fixed header on mobile with NomadLife branding and notifications bell
- **Enhanced Search**: Trips searchable by title, description, and author name/username
- **Onboarding System**: Comprehensive tutorial for new users:
  - WelcomeTutorial: 4 interactive slides introducing map, sharing, travel diary, and community features
  - Contextual FloatingTips: Appear on specific pages after tutorial completion with delays
  - State persisted to localStorage with key "nomadlife_onboarding"
  - Tips on: unified-map (map and feed tips), profile (customization tips), travel-diary (trip creation tips)
- **Booking Section (formerly Coworking)**: Renamed from "Coworking" to "Booking" for broader scope
  - Primary route: `/booking` (legacy `/coworking` still works)
  - Includes hotels, hostels, and coworking spaces
  - Trip stops have "Cerca alloggio" button linking directly to booking with city pre-selected
  - **Map Integration**: Trip stop popups on the map now include a blue Hotel button for quick booking access
- **Marketplace**: Monetization feature for nomad-focused products
  - Vendor and product database tables with affiliate tracking
  - Categories: eSIM, bags, clothing, insurance, tech, software
  - Featured products, discount display, click tracking for affiliate revenue
  - Category filtering, responsive design for mobile/desktop
  - Accessible via bottom nav on mobile and sidebar on desktop
- **Admin Panel** (`/admin`): Protected management interface
  - Access restricted to users with `isAdmin = true` in database
  - Dashboard with stats: total products, vendors, clicks, featured count
  - Full CRUD for Vendors (name, logo, website, category)
  - Full CRUD for Products (name, description, price, discount, affiliate URL, featured/active toggles)
  - Amazon affiliate link integration for marketplace products
  - Backend protection with `requireAdmin` middleware on all `/api/admin/*` routes

### PWA Configuration

- **Manifest**: `client/public/manifest.json` - App name, icons, theme colors, shortcuts
- **Service Worker**: `client/public/sw.js` - Caches static assets, images, and API responses for offline use
- **Icons**: 8 sizes (72x72 to 512x512) in `client/public/icons/`
- **Installation**: Users can install NomadLife from the browser menu ("Add to Home Screen" on mobile, "Install app" on desktop)

### Push Notifications
- **VAPID Keys**: Configured as environment variables (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`)
- **Service Worker**: `client/public/sw.js` handles push events, shows native notifications, handles click-to-navigate
- **Frontend Hook**: `client/src/hooks/use-push-notifications.ts` manages subscribe/unsubscribe flow
- **Backend Helper**: `sendPushToUser()` in `server/routes.ts` sends push to all user's devices, auto-cleans expired subscriptions (410)
- **Push Triggers**: New follower, new trip, trip started, new stop added, new private message
- **Subscribe/Unsubscribe**: Toggle in Profile page, endpoints at `/api/push/subscribe` and `/api/push/unsubscribe`

## External Dependencies

- **Database**: PostgreSQL (via `DATABASE_URL`)
- **UI Components**: Radix UI primitives, shadcn/ui, Lucide React for icons
- **Authentication/Session**: `express-session`, `passport`, `passport-local`, `bcryptjs`
- **Push Notifications**: `web-push` library with VAPID authentication