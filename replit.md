# NomadLife - Digital Nomad Social Platform

## Overview

NomadLife is a full-stack social platform designed for digital nomads. It enables users to share their travel experiences, discover coworking spaces, book accommodations, and connect with other remote workers worldwide. The application features a feed-based social experience, interactive exploration tools, real-time messaging, coworking space booking, and premium subscription management.

**Status**: Fully functional full-stack application with complete backend integration and tested features.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side router)
- **State Management**: TanStack React Query for server state, React Context for authentication state
- **Styling**: Tailwind CSS v4 with shadcn/ui component library (New York style)
- **Animations**: Framer Motion for UI transitions
- **Build Tool**: Vite with custom plugins for Replit integration

The frontend follows a page-based structure with shared layout components. Authentication state is managed through a React Context provider (`client/src/lib/auth.tsx`) that checks session validity on mount. All protected pages redirect to `/auth` if the user is not authenticated.

**Key Pages**:
- `/auth` - Login and signup (public)
- `/` - Social feed with posts from all users (protected)
- `/profile` - User profile with travel stats and posts (protected)
- `/coworking` - Browse and book coworking spaces (protected)
- `/chat` - Group and private messaging (protected)
- `/subscription` - Manage premium subscription (protected)
- `/explore` - Interactive map with cities and eco-routing (protected)

### Backend Architecture

- **Runtime**: Node.js with Express
- **Language**: TypeScript compiled with tsx
- **Authentication**: Passport.js with local strategy, express-session for session management
- **Session Storage**: In-memory sessions (development) - can be upgraded to connect-pg-simple for production
- **Password Hashing**: bcryptjs with salt rounds of 10

API routes follow RESTful conventions under the `/api` prefix. Protected routes use middleware to check authentication status via `req.isAuthenticated()`.

**Session Configuration** (`server/index.ts`):
- Secret: Configurable via SESSION_SECRET environment variable
- Cookie max age: 7 days
- Secure cookies in production
- Session store: In-memory (development)

### Data Storage

- **Database**: PostgreSQL (Neon-backed via Replit)
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` contains all table definitions

**Database Tables**:
- `users` - User accounts with profile data, location, and premium status
  - Fields: id, username, email, password (hashed), name, bio, avatar, location, isPremium, countriesVisited, citiesVisited, coworkingSpaces
- `posts` - Social feed posts with location tagging and engagement metrics
  - Fields: id, userId, content, imageUrl, location, likes, commentsCount, createdAt
- `places` - Coworking spaces and hotels with booking capabilities
  - Fields: id, name, type, location, city, description, price, imageUrl, rating, reviews, tags
- `bookings` - User reservations for places
  - Fields: id, userId, placeId, checkInDate, guestName, status, createdAt
- `chatGroups` - Group chat rooms organized by city
  - Fields: id, name, city, description, members, createdAt
- `messages` - Chat messages within groups or private conversations
  - Fields: id, senderId, groupId, receiverId, content, createdAt
- `subscriptions` - Premium subscription records
  - Fields: id, userId, plan, status, startDate, endDate

**Storage Interface** (`server/storage.ts`):
- Implements comprehensive CRUD operations for all data models
- Uses Drizzle queries with proper joins for related data
- Handles date conversions for bookings and subscriptions
- Supports filtering (e.g., places by city/type)

### Authentication Flow

1. User submits credentials to `/api/auth/login` or `/api/auth/signup`
2. Passport validates credentials against the database (bcrypt for password comparison)
3. Session is created via express-session and stored
4. Frontend auth context polls `/api/auth/me` to verify session state on mount
5. Protected pages use `useAuth` hook which redirects to `/auth` if no valid session exists
6. Logout via `/api/auth/logout` destroys session and redirects to auth page

**Demo Credentials**:
- Username: `marco`
- Password: `password123`

### API Routes

**Authentication**:
- `POST /api/auth/signup` - Create new user account (auto-login after signup)
- `POST /api/auth/login` - Login with username and password
- `POST /api/auth/logout` - Logout current user
- `GET /api/auth/me` - Get current authenticated user

**Users**:
- `GET /api/users/:id` - Get user by ID (public profile data)
- `PATCH /api/users/:id` - Update user profile (authenticated, self only)

**Posts**:
- `GET /api/posts` - Get all posts with user data (newest first, limit param)
- `GET /api/posts/user/:userId` - Get posts by specific user
- `POST /api/posts` - Create new post (authenticated)
- `POST /api/posts/:id/like` - Like a post (authenticated)

**Places & Bookings**:
- `GET /api/places` - Get all places (optional filters: city, type)
- `GET /api/places/:id` - Get place by ID
- `POST /api/places` - Create new place (authenticated)
- `GET /api/bookings` - Get user's bookings (authenticated)
- `POST /api/bookings` - Create booking (authenticated)
- `DELETE /api/bookings/:id` - Cancel booking (authenticated)

**Chat & Messages**:
- `GET /api/chat-groups` - Get all chat groups
- `GET /api/chat-groups/:id` - Get chat group by ID
- `POST /api/chat-groups` - Create new chat group (authenticated)
- `GET /api/messages/group/:groupId` - Get group messages (authenticated, limit param)
- `GET /api/messages/private/:userId` - Get private messages with user (authenticated)
- `POST /api/messages` - Send message (authenticated)

**Subscriptions**:
- `GET /api/subscription` - Get user's active subscription (authenticated)
- `POST /api/subscription` - Create subscription (authenticated, updates isPremium)
- `PATCH /api/subscription/:id` - Update/cancel subscription (authenticated)

### Build System

The project uses a dual-build approach:
- **Client**: Vite builds the React app to `dist/public`
- **Server**: esbuild bundles the Express server to `dist/index.cjs`
- Selective dependency bundling reduces cold start times by including frequently-used packages

**Database Commands**:
- `npm run db:push` - Sync Drizzle schema to PostgreSQL
- Seed data script: `tsx server/seed.ts` (creates demo users, posts, places, groups)

## Features Implemented

### ✅ User Authentication
- Session-based authentication with Passport.js
- Secure password hashing with bcryptjs
- Auto-login after signup
- Protected routes with automatic redirect
- Logout functionality

### ✅ Social Feed
- Post creation with images and location tags
- Real-time like functionality
- Display posts with user information
- Engagement metrics (likes, comments count)
- Chronological feed ordering

### ✅ User Profiles
- Personal information display
- Travel statistics (countries, cities, coworking spaces visited)
- User posts gallery
- Profile editing capabilities
- Logout from profile page

### ✅ Coworking Space Booking
- Browse coworking spaces by type
- View detailed place information
- Booking modal with date and guest selection
- Booking confirmation flow
- View user's booking history

### ✅ Group Messaging
- City-based chat groups
- Real-time message sending
- Group member counts
- Chat history with sender information
- Group and private chat tabs

### ✅ Premium Subscription
- Monthly subscription at $29/month
- Subscribe and cancel functionality
- Premium status tracking (isPremium flag)
- Subscription management UI
- Active subscription display with billing date

### ✅ Explore & Discovery
- Interactive map with city markers
- Eco-route planning with CO2 tracking
- City information popups
- Sustainability focus

## External Dependencies

### Database
- PostgreSQL (required, connection via `DATABASE_URL` environment variable)
- Managed by Replit's built-in database feature

### UI Component Libraries
- Radix UI primitives (dialogs, dropdowns, forms, tabs, toast, etc.)
- shadcn/ui styled components
- Lucide React for icons

### Session Management
- express-session for session handling
- passport and passport-local for authentication
- bcryptjs for password hashing

## Seed Data

The application includes comprehensive seed data for testing:
- **3 Users**: marco, sarah, alex (all with password "password123")
- **3 Posts**: Travel updates with images and locations
- **5 Places**: Mix of coworking spaces, hotels, and hostels
- **3 Chat Groups**: Bali, Lisbon, Chiang Mai
- **3 Messages**: Sample messages in each group

Run seed script: `tsx server/seed.ts`

## Recent Changes (January 17, 2026)

### Backend Implementation
- ✅ Converted from mockup to full-stack application
- ✅ Configured express-session and Passport.js middleware
- ✅ Implemented DrizzleStorage with PostgreSQL
- ✅ Created complete API routes for all features
- ✅ Added date conversion handling for bookings and subscriptions
- ✅ Integrated authentication across all protected endpoints

### Frontend Integration
- ✅ Created AuthProvider context for session management
- ✅ Added authentication page with login/signup tabs
- ✅ Updated Home page to fetch real posts from API
- ✅ Updated Profile page to display authenticated user data
- ✅ Updated Coworking page with real booking flow
- ✅ Updated Chat page with real groups and messaging
- ✅ Updated Subscription page with full subscription management
- ✅ Added loading states and error handling throughout
- ✅ Implemented automatic auth redirects for protected pages

### Testing
- ✅ End-to-end tests passing for all core features
- ✅ Authentication flow tested (login, signup, logout)
- ✅ Booking flow tested (browse, select, confirm)
- ✅ Messaging tested (view groups, send messages)
- ✅ Subscription tested (subscribe, cancel)

## Known Limitations

- Private messaging UI exists but only group messages are fully implemented
- Explore page is mostly presentational (no backend integration)
- Comments feature exists in data model but UI is not implemented
- Real-time chat updates require page refresh (no WebSocket implementation)
- In-memory session storage (will be lost on server restart)

## Future Enhancements

- WebSocket integration for real-time chat
- Private messaging backend implementation
- Comment system for posts
- File upload for post images and avatars
- Search functionality for users, places, and posts
- Notifications system
- Email verification for signups
- Password reset flow
- Admin panel for content moderation
- Analytics dashboard for premium users
