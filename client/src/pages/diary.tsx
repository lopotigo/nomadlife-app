import { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Circle, Popup, Tooltip } from "react-leaflet";
import L from "leaflet";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useToast } from "@/hooks/use-toast";
import { MomentsBar } from "@/components/moments";
import {
  Map, Plane, Camera, Users, Bookmark, User, Plus,
  MapPin, Calendar, Star, ChevronUp, ChevronDown,
  Heart, Globe, Navigation, Sparkles, Share2, ExternalLink,
  X, Compass, BookOpen, Settings
} from "lucide-react";

const TABS = [
  { id: "trips", label: "Viaggi", icon: Plane },
  { id: "moments", label: "Momenti", icon: Camera },
  { id: "nomads", label: "Nomadi", icon: Users },
  { id: "hub", label: "Hub", icon: Bookmark },
] as const;

type TabId = (typeof TABS)[number]["id"];
type PanelState = "peek" | "half" | "full";

interface TripStop {
  id: number;
  latitude: number | null;
  longitude: number | null;
  location: string;
  orderIndex: number;
  imageUrl?: string | null;
  notes?: string | null;
}

interface Trip {
  id: number;
  name: string;
  color: string;
  stops: TripStop[];
  isPublic: boolean;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
}

interface NearbyNomad {
  id: number;
  username: string;
  name: string;
  avatar?: string | null;
  bio?: string | null;
  skills?: string[];
  currentCity?: string | null;
  distance?: number;
  latitude?: number | null;
  longitude?: number | null;
}

const PANEL_HEIGHTS: Record<PanelState, string> = {
  peek: "88px",
  half: "52vh",
  full: "88vh",
};

function createStopIcon(color: string, order: number) {
  return L.divIcon({
    html: `<div style="width:32px;height:32px;border-radius:50%;background:${color};color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">${order}</div>`,
    className: "",
    iconSize: L.point(32, 32),
    iconAnchor: L.point(16, 16),
  });
}

function createNomadIcon(avatar: string | null | undefined, username: string) {
  const src = avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
  return L.divIcon({
    html: `<div style="width:36px;height:36px;border-radius:50%;border:2px solid #6366f1;box-shadow:0 2px 8px rgba(99,102,241,0.4);overflow:hidden;"><img src="${src}" style="width:100%;height:100%;object-fit:cover;" /></div>`,
    className: "",
    iconSize: L.point(36, 36),
    iconAnchor: L.point(18, 18),
  });
}

export default function DiaryPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>("trips");
  const [panelState, setPanelState] = useState<PanelState>("half");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([45, 10]);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number>(0);
  const dragStartState = useRef<PanelState>("half");

  const tileUrl = theme === "dark"
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setMapCenter([loc.lat, loc.lng]);
      },
      () => {}
    );
  }, []);

  const { data: rawTrips } = useQuery<Trip[]>({
    queryKey: ["/api/my-trips"],
    queryFn: () => fetch("/api/my-trips", { credentials: "include" }).then(r => r.json()),
  });
  const trips: Trip[] = Array.isArray(rawTrips) ? rawTrips : [];

  const { data: rawNearbyNomads } = useQuery<NearbyNomad[]>({
    queryKey: ["/api/matchmaking/nearby", userLocation?.lat, userLocation?.lng],
    queryFn: () => {
      if (!userLocation) return Promise.resolve([]);
      return fetch(`/api/matchmaking/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=50`, { credentials: "include" }).then(r => r.json());
    },
    enabled: !!userLocation,
  });
  const nearbyNomads: NearbyNomad[] = Array.isArray(rawNearbyNomads) ? rawNearbyNomads : [];

  const { data: rawSavedPosts } = useQuery<any[]>({
    queryKey: ["/api/saved-posts"],
  });
  const savedPosts: any[] = Array.isArray(rawSavedPosts) ? rawSavedPosts : [];

  const { data: rawEventRegistrations } = useQuery<any[]>({
    queryKey: ["/api/event-registrations"],
  });
  const eventRegistrations: any[] = Array.isArray(rawEventRegistrations) ? rawEventRegistrations : [];

  const allStops = trips.flatMap(trip =>
    (trip.stops || [])
      .filter(s => s.latitude && s.longitude)
      .map(s => ({ ...s, tripColor: trip.color, tripName: trip.name, tripId: trip.id }))
  );

  const togglePanel = () => {
    setPanelState(prev => prev === "peek" ? "half" : prev === "half" ? "full" : "half");
  };

  const handleTabClick = (tabId: TabId) => {
    setActiveTab(tabId);
    if (panelState === "peek") setPanelState("half");
  };

  const handleDragStart = (e: React.PointerEvent) => {
    dragStartY.current = e.clientY;
    dragStartState.current = panelState;
  };

  const handleDragEnd = (e: React.PointerEvent) => {
    const delta = dragStartY.current - e.clientY;
    if (delta > 60) setPanelState(prev => prev === "peek" ? "half" : "full");
    else if (delta < -60) setPanelState(prev => prev === "full" ? "half" : "peek");
  };

  const publishTrip = async (tripId: number) => {
    try {
      await fetch(`/api/trips/${tripId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isPublic: true }),
      });
      toast({ title: "Viaggio condiviso!", description: "Ora visibile sulla Mappa Comune." });
    } catch {
      toast({ title: "Errore", description: "Non è stato possibile condividere il viaggio.", variant: "destructive" });
    }
  };

  return (
    <Layout fullWidth>
      <div className="relative h-full flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="absolute top-0 inset-x-0 z-[1001] flex items-center justify-between px-4 pt-4 pointer-events-none">
          <div className="flex items-center gap-2 bg-card/90 backdrop-blur-md rounded-2xl px-3 py-2 shadow-md border border-border/50 pointer-events-auto">
            <Compass className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Il mio Diary</span>
          </div>
          <Link href="/profile">
            <div className="w-10 h-10 rounded-full border-2 border-primary overflow-hidden shadow-lg cursor-pointer pointer-events-auto hover:scale-105 transition-transform" data-testid="diary-profile-avatar">
              <img
                src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
                className="w-full h-full object-cover"
                alt="Profilo"
              />
            </div>
          </Link>
        </div>

        {/* Map */}
        <div
          className="flex-1 relative"
          style={{ transition: "all 0.4s ease", marginBottom: panelState === "peek" ? "88px" : panelState === "half" ? "52vh" : "88vh" }}
        >
          <MapContainer
            center={mapCenter}
            zoom={userLocation ? 11 : 4}
            className="h-full w-full z-0"
            style={{ background: theme === "dark" ? "#1a1a2e" : "#e8e8e8", minHeight: "200px" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url={tileUrl}
            />

            {/* User location */}
            {userLocation && (
              <>
                <Circle
                  center={[userLocation.lat, userLocation.lng]}
                  radius={400}
                  pathOptions={{ color: "#6366f1", fillColor: "#6366f1", fillOpacity: 0.12, weight: 1.5 }}
                />
                <Circle
                  center={[userLocation.lat, userLocation.lng]}
                  radius={80}
                  pathOptions={{ color: "#6366f1", fillColor: "#6366f1", fillOpacity: 0.8, weight: 0 }}
                />
              </>
            )}

            {/* Trip stops */}
            {allStops.map(stop => (
              <Marker
                key={`stop-${stop.id}`}
                position={[stop.latitude!, stop.longitude!]}
                icon={createStopIcon(stop.tripColor, stop.orderIndex + 1)}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                  <div className="text-xs">
                    <p className="font-semibold">{stop.location}</p>
                    <p className="text-muted-foreground">{stop.tripName}</p>
                  </div>
                </Tooltip>
                <Popup maxWidth={240} minWidth={200} autoPan>
                  <div className="p-2">
                    <p className="font-bold text-sm mb-1">{stop.location}</p>
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <Plane className="w-3 h-3" /> {stop.tripName}
                    </p>
                    {stop.notes && <p className="text-xs italic text-muted-foreground">"{stop.notes}"</p>}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Nearby nomads (visible in Nomadi tab) */}
            {activeTab === "nomads" && nearbyNomads.map(nomad => nomad.latitude && nomad.longitude ? (
              <Marker
                key={`nomad-${nomad.id}`}
                position={[nomad.latitude, nomad.longitude]}
                icon={createNomadIcon(nomad.avatar, nomad.username)}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                  <div className="text-xs font-semibold">{nomad.name || nomad.username}</div>
                </Tooltip>
                <Popup maxWidth={220}>
                  <div className="flex items-center gap-2 p-1">
                    <img
                      src={nomad.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${nomad.username}`}
                      className="w-10 h-10 rounded-full object-cover"
                      alt={nomad.username}
                    />
                    <div>
                      <p className="font-bold text-sm">{nomad.name || nomad.username}</p>
                      {nomad.currentCity && <p className="text-xs text-muted-foreground">{nomad.currentCity}</p>}
                      {nomad.distance && <p className="text-xs text-primary">~{Math.round(nomad.distance)} km da te</p>}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ) : null)}
          </MapContainer>
        </div>

        {/* Bottom Panel */}
        <motion.div
          ref={panelRef}
          className="absolute bottom-0 inset-x-0 bg-card border-t border-border/50 shadow-2xl z-[1000] flex flex-col"
          animate={{ height: PANEL_HEIGHTS[panelState] }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          style={{ borderRadius: "20px 20px 0 0" }}
        >
          {/* Drag handle */}
          <div
            className="flex-shrink-0 flex flex-col items-center pt-2 pb-1 cursor-grab active:cursor-grabbing"
            onPointerDown={handleDragStart}
            onPointerUp={handleDragEnd}
            onClick={togglePanel}
            data-testid="diary-panel-handle"
          >
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mb-2" />
            <div className="flex gap-1 items-center text-muted-foreground">
              {panelState === "full" ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex-shrink-0 flex border-b border-border/50 px-2">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors rounded-xl mx-0.5 ${
                    isActive ? "text-primary bg-primary/8" : "text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid={`diary-tab-${tab.id}`}
                >
                  <Icon className={`w-4.5 h-4.5 ${isActive ? "stroke-[2.5px]" : "stroke-2"}`} style={{ width: "18px", height: "18px" }} />
                  {tab.label}
                  {isActive && <div className="w-4 h-0.5 rounded-full bg-primary" />}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {activeTab === "trips" && (
                <motion.div
                  key="trips"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Plane className="w-4 h-4 text-primary" />
                      I miei viaggi ({trips.length})
                    </h3>
                    <Link href="/travel-diary">
                      <button className="text-xs text-primary font-medium flex items-center gap-1 hover:underline" data-testid="diary-trips-manage">
                        Gestisci <ExternalLink className="w-3 h-3" />
                      </button>
                    </Link>
                  </div>

                  {trips.length === 0 ? (
                    <div className="text-center py-8">
                      <Plane className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">Nessun viaggio ancora.</p>
                      <Link href="/travel-diary">
                        <button className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium" data-testid="diary-create-trip">
                          Crea il tuo primo viaggio
                        </button>
                      </Link>
                    </div>
                  ) : trips.map(trip => (
                    <div key={trip.id} className="bg-muted/40 rounded-2xl p-3 flex items-center gap-3" data-testid={`diary-trip-${trip.id}`}>
                      <div className="w-3 h-12 rounded-full flex-shrink-0" style={{ background: trip.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{trip.name}</p>
                        <p className="text-xs text-muted-foreground">{(trip.stops || []).length} tappe</p>
                        {trip.isPublic && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-green-600 font-medium mt-0.5">
                            <Globe className="w-3 h-3" /> Pubblico
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {!trip.isPublic && (
                          <button
                            onClick={() => publishTrip(trip.id)}
                            className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            title="Condividi sulla mappa comune"
                            data-testid={`diary-share-trip-${trip.id}`}
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        )}
                        <Link href={`/trip/${trip.id}`}>
                          <button className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors" data-testid={`diary-view-trip-${trip.id}`}>
                            <Map className="w-4 h-4" />
                          </button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {activeTab === "moments" && (
                <motion.div
                  key="moments"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-4 space-y-3"
                >
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Camera className="w-4 h-4 text-primary" />
                    I miei Momenti
                  </h3>
                  <div className="bg-muted/30 rounded-2xl overflow-hidden">
                    <MomentsBar onMomentCreated={() => {}} />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    I momenti che crei appaiono nella Mappa Comune per 24 ore
                  </p>
                </motion.div>
              )}

              {activeTab === "nomads" && (
                <motion.div
                  key="nomads"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      Nomadi vicini ({nearbyNomads.length})
                    </h3>
                    <Link href="/matchmaking">
                      <button className="text-xs text-primary font-medium flex items-center gap-1 hover:underline" data-testid="diary-full-matchmaking">
                        Tutti <ExternalLink className="w-3 h-3" />
                      </button>
                    </Link>
                  </div>

                  {!userLocation && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 text-center">
                      <Navigation className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                      <p className="text-xs text-amber-700 dark:text-amber-400">Attiva la posizione per vedere i nomadi vicini</p>
                    </div>
                  )}

                  {nearbyNomads.length === 0 && userLocation && (
                    <div className="text-center py-8">
                      <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">Nessun nomade nelle vicinanze.</p>
                    </div>
                  )}

                  {nearbyNomads.slice(0, 8).map(nomad => (
                    <Link key={nomad.id} href={`/user/${nomad.id}`}>
                      <div className="flex items-center gap-3 bg-muted/40 rounded-2xl p-3 hover:bg-muted/60 transition-colors cursor-pointer" data-testid={`diary-nomad-${nomad.id}`}>
                        <img
                          src={nomad.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${nomad.username}`}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-primary/20"
                          alt={nomad.username}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{nomad.name || nomad.username}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {nomad.currentCity || nomad.bio?.substring(0, 40)}
                          </p>
                          {nomad.distance && (
                            <p className="text-xs text-primary mt-0.5">~{Math.round(nomad.distance)} km</p>
                          )}
                        </div>
                        {nomad.skills && nomad.skills.slice(0, 2).map(skill => (
                          <span key={skill} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </Link>
                  ))}
                </motion.div>
              )}

              {activeTab === "hub" && (
                <motion.div
                  key="hub"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-4 space-y-3"
                >
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-primary" />
                    Il mio Hub personale
                  </h3>

                  {/* Quick access grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { href: "/profile", icon: User, label: "Profilo", color: "bg-violet-500/10 text-violet-600", testId: "hub-profile" },
                      { href: "/avatar-builder", icon: Sparkles, label: "Avatar", color: "bg-pink-500/10 text-pink-600", testId: "hub-avatar" },
                      { href: "/saved", icon: Bookmark, label: "Salvati", color: "bg-amber-500/10 text-amber-600", testId: "hub-saved", badge: savedPosts.length },
                      { href: "/events-calendar", icon: Calendar, label: "I miei eventi", color: "bg-green-500/10 text-green-600", testId: "hub-events", badge: eventRegistrations.length },
                      { href: "/booking", icon: Globe, label: "Prenotazioni", color: "bg-blue-500/10 text-blue-600", testId: "hub-booking" },
                      { href: "/subscription", icon: Star, label: "Premium", color: "bg-orange-500/10 text-orange-600", testId: "hub-subscription" },
                    ].map(item => {
                      const Icon = item.icon;
                      return (
                        <Link key={item.href} href={item.href}>
                          <div
                            className={`relative flex flex-col items-center gap-1.5 p-3 rounded-2xl ${item.color} hover:opacity-80 transition-opacity cursor-pointer`}
                            data-testid={item.testId}
                          >
                            {item.badge != null && item.badge > 0 && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                                {item.badge}
                              </div>
                            )}
                            <Icon className="w-5 h-5" />
                            <span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  {/* Recent saved posts preview */}
                  {savedPosts.length > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Post salvati recenti</p>
                        <Link href="/saved">
                          <span className="text-xs text-primary hover:underline">Vedi tutti</span>
                        </Link>
                      </div>
                      <div className="space-y-2">
                        {savedPosts.slice(0, 3).map((item: any) => (
                          <Link key={item.id || item.post?.id} href={`/post/${item.postId || item.post?.id || item.id}`}>
                            <div className="flex items-center gap-2 bg-muted/40 rounded-xl p-2.5 hover:bg-muted/60 transition-colors" data-testid={`hub-saved-post-${item.id}`}>
                              <Heart className="w-4 h-4 text-red-400 flex-shrink-0" />
                              <p className="text-xs text-muted-foreground truncate">
                                {item.post?.content || item.content || "Post salvato"}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Event registrations preview */}
                  {eventRegistrations.length > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Prossimi eventi</p>
                        <Link href="/events-calendar">
                          <span className="text-xs text-primary hover:underline">Vedi tutti</span>
                        </Link>
                      </div>
                      <div className="space-y-2">
                        {eventRegistrations.slice(0, 3).map((reg: any) => (
                          <Link key={reg.id} href={`/event/${reg.eventId || reg.event?.id}`}>
                            <div className="flex items-center gap-2 bg-muted/40 rounded-xl p-2.5 hover:bg-muted/60 transition-colors" data-testid={`hub-event-${reg.id}`}>
                              <Calendar className="w-4 h-4 text-purple-400 flex-shrink-0" />
                              <p className="text-xs font-medium truncate">
                                {reg.event?.title || reg.title || "Evento"}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
