# NomadLife - Digital Nomad Social Platform

## Overview

NomadLife is a full-stack social platform designed for digital nomads. It enables users to share their travel experiences, discover coworking spaces, book accommodations, and connect with other remote workers worldwide. The application features a feed-based social experience, interactive exploration tools, real-time messaging, coworking space booking, and premium subscription management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side router)
- **State Management**: TanStack React Query for server state, React Context for auth state
- **Styling**: Tailwind CSS v4 with shadcn/ui component library (New York style)
- **Animations**: Framer Motion for UI transitions
- **Build Tool**: Vite with custom plugins for Replit integration

The frontend follows a page-based structure with shared layout components. Authentication state is managed through a React Context provider that checks session validity on mount.

### Backend Architecture

- **Runtime**: Node.js with Express
- **Language**: TypeScript compiled with tsx
- **Authentication**: Passport.js with local strategy, express-session for session management
- **Session Storage**: connect-pg-simple for PostgreSQL-backed sessions
- **Password Hashing**: bcryptjs

API routes follow RESTful conventions under the `/api` prefix. Protected routes use middleware to check authentication status.

### Data Storage

- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` contains all table definitions

Database tables include:
- `users` - User accounts with profile data and premium status
- `posts` - Social feed posts with location tagging
- `places` - Coworking spaces and hotels with booking capabilities
- `bookings` - User reservations for places
- `chatGroups` - Group chat rooms organized by city
- `messages` - Chat messages within groups
- `subscriptions` - Premium subscription records

### Authentication Flow

1. User submits credentials to `/api/auth/login` or `/api/auth/signup`
2. Passport validates credentials against the database
3. Session is created and stored in PostgreSQL
4. Frontend auth context polls `/api/auth/me` to verify session state
5. Protected pages redirect to `/auth` if no valid session exists

### Build System

The project uses a dual-build approach:
- **Client**: Vite builds the React app to `dist/public`
- **Server**: esbuild bundles the Express server to `dist/index.cjs`
- Selective dependency bundling reduces cold start times by including frequently-used packages

## External Dependencies

### Database
- PostgreSQL (required, connection via `DATABASE_URL` environment variable)

### UI Component Libraries
- Radix UI primitives (dialogs, dropdowns, forms, etc.)
- shadcn/ui styled components
- Lucide React for icons

### Third-Party Services (Configured but may require API keys)
- Potential Stripe integration for subscription payments (stripe package installed)
- OpenAI integration capability (openai package installed)
- Google Generative AI capability (@google/generative-ai package installed)
- Email sending via Nodemailer (nodemailer package installed)

### Session & Security
- express-session with PostgreSQL session store
- Rate limiting via express-rate-limit
- CORS support via cors package