# NomadLife — Versione 1 (snapshot architettura originale)
> Creato il 24 marzo 2026 — riferimento pre-refactoring architettura

## Struttura navigazione v1

### Desktop sidebar
- / → Mappa Comune (UnifiedMap)
- /search → Cerca
- /travel-diary → Travel Diary
- /events-calendar → Events Calendar
- /chat → Messaggi & Community
- /booking → Booking
- /marketplace → Marketplace
- /matchmaking → Matchmaking
- /blog → Blog
- /saved → Post salvati
- /profile → Profilo

### Mobile bottom bar (5 slot)
1. Mappa (/)
2. Feed (/feed)
3. Chat (/chat)
4. Matchmaking (/matchmaking)
5. Profilo (/profile)
+ More menu: Booking, Marketplace, Blog, Saved, Admin

## Pagine (routes)

| Route | Component | Descrizione |
|-------|-----------|-------------|
| / | UnifiedMap | Mappa globale con post, eventi, spot, viaggi altrui |
| /feed | Home | Feed sociale con AI strip, Moments, post, NomadContextCard |
| /map-feed | MapFeed | (legacy) mappa + feed affiancati |
| /travel-diary | TravelDiary | Diario viaggi personale con tappe e mappe |
| /events-calendar | EventsCalendar | Calendario eventi comunitari |
| /chat | Chat | Messaggi privati + canali community |
| /booking | Booking | Prenotazione hotel/hostel/coworking (Travelpayouts) |
| /marketplace | Marketplace | Annunci peer-to-peer locali GPS-based |
| /matchmaking | Matchmaking | Trova nomadi vicini per skill e posizione |
| /blog | Blog | Articoli, guide città, consigli pratici |
| /saved | SavedPosts | Post salvati |
| /profile | Profile | Profilo personale con stats viaggio |
| /avatar-builder | AvatarBuilder | Costruttore avatar personalizzato |
| /search | SearchPage | Ricerca nomadi, post, badge |
| /user/:id | UserProfile | Profilo pubblico di un altro utente |
| /post/:id | PostDetail | Dettaglio post |
| /trip/:id | TripDetail | Dettaglio viaggio |
| /event/:id | EventDetail | Dettaglio evento |
| /subscription | Subscription | Piani premium |
| /admin | Admin | Pannello admin |

## Funzionalità principali v1

### Mappa Comune (/)
- Mappa Leaflet globale con CARTO tiles (light/dark)
- Marker clustering (MarkerClusterGroup)
- Post geo-taggati come marker con avatar utente
- Spot (café, coworking, biblioteche, luggage_storage) con Overpass API
- Percorsi viaggio altrui (linee colorate)
- Filtri: post, eventi, momenti, spot, viaggi
- Filtro per paese con conteggio nomadi
- FAB per creare nuovi contenuti
- Crowdsourcing nuovi spot
- 3 livelli privacy per posizione

### Feed sociale (/feed → home.tsx)
- NomadContextCard (saluto + città + stats + quick links)
- AIContextStrip (suggerimento NomadBot contestuale)
- MiniMapWidget (mini mappa soft)
- MomentsBar (storie 24h)
- CreatePostForm (testo, immagine, video, link, posizione)
- PostCard con like, commenti, condivisione, QR
- WeatherWidget, InFeedAd

### Travel Diary (/travel-diary)
- Lista viaggi dell'utente
- Crea/modifica/elimina viaggi con colore
- Aggiungi tappe con lat/lng, immagine, note
- Mappa dei percorsi con CurvedRouteLine
- Statistiche CO2
- EcoTripCard condivisibile
- TripReplay animazione percorso
- AI destination suggestions

### AI Features
- NomadBot (flottante su TUTTE le pagine): streaming, memoria, voce, foto, web search
- AIContextStrip: striscia contestuale per orario e città
- AI Social Hub (/ai-social-hub): hub centralizzato
- AI itinerari, guide città, matchmaking, prodotti marketplace, immagini

### Chat (/chat)
- Messaggi privati (DM)
- Canali community (Lavoro & Freelance, Città & Destinazioni, Visti, Coworking, Tech, Off Topic)
- Gruppi creati da utenti
- Tab sidebar: Messaggi / Community

### Matchmaking (/matchmaking)
- Cerca nomadi per raggio (10/25/50/100km)
- Filtro per skill
- Mostra distanza, nazionalità, skill, bio
- Badge nomad check-in AI

### Componenti globali
- Layout con sidebar desktop + bottom bar mobile
- NotificationsDropdown
- FloatingTip (suggerimenti contestuali per pagina)
- FeatureDiscoveryRow (card cross-link)
- WelcomeTutorial (7 slide onboarding)
- PWA Service Worker (nomadlife-v8)
- Dark/Light mode
- Multi-lingua: Italiano, Inglese, Spagnolo

## API principali
- GET /api/posts → feed
- GET /api/my-trips → viaggi personali
- GET /api/matchmaking/nearby → nomadi vicini
- GET /api/moments → momenti
- GET /api/saved-posts → post salvati
- GET /api/event-registrations → iscrizioni eventi
- GET /api/events → eventi
- POST /api/posts → crea post
- POST /api/moments → crea momento

## Tech Stack
- Frontend: React 18, TypeScript, Wouter, Vite, TanStack Query, Tailwind CSS v4, shadcn/ui, Framer Motion
- Backend: Node.js, Express, TypeScript, Passport.js, bcryptjs
- Database: PostgreSQL (Neon) + Drizzle ORM
- Mappe: Leaflet + react-leaflet + Leaflet.markercluster
- AI: OpenAI GPT-4o (Replit AI Integrations)
- Email: SendGrid | Analytics: GA4 (G-4F8ZJT7G1F)
- Affiliate: Travelpayouts (marker: 578583)
