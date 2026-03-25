import { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Circle, Popup, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useToast } from "@/hooks/use-toast";
import { MomentsBar } from "@/components/moments";
import { CurvedRouteLine } from "@/components/map-route-line";
import {
  Map, Plane, Camera, Users, Bookmark, User, Plus,
  MapPin, Calendar, Star, ChevronUp, ChevronDown,
  Heart, Globe, Navigation, Sparkles, Share2, ExternalLink,
  X, Compass, BookOpen, Settings, CheckCircle2, Loader2,
  Edit3, Eye
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

const TRIP_COLORS = [
  "#6366f1", "#3b82f6", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6",
];

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

function MapController({ center, zoom }: { center: [number, number] | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || map.getZoom(), { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

export default function DiaryPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>("trips");
  const [panelState, setPanelState] = useState<PanelState>("half");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [flyZoom, setFlyZoom] = useState<number | undefined>(undefined);
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number>(0);
  const dragStartState = useRef<PanelState>("half");

  // Create trip modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTripName, setNewTripName] = useState("");
  const [newTripColor, setNewTripColor] = useState(TRIP_COLORS[0]);
  const [newTripStartDate, setNewTripStartDate] = useState("");
  const [newTripEndDate, setNewTripEndDate] = useState("");
  const [creating, setCreating] = useState(false);

  const tileUrl = theme === "dark"
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
      },
      () => {}
    );
  }, []);

  // Use the endpoint that returns trips WITH stops
  const { data: rawTrips } = useQuery<Trip[]>({
    queryKey: ["/api/users", user?.id, "trips"],
    queryFn: () => fetch(`/api/users/${user?.id}/trips`, { credentials: "include" }).then(r => r.json()),
    enabled: !!user?.id,
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

  const selectedTrip = trips.find(t => t.id === selectedTripId) || null;

  // All stops from all trips for the map
  const allStops = trips.flatMap(trip =>
    (trip.stops || [])
      .filter(s => s.latitude && s.longitude)
      .map(s => ({ ...s, tripColor: trip.color, tripName: trip.name, tripId: trip.id }))
  );

  // Stops from the currently selected trip (highlighted)
  const selectedStops = selectedTrip
    ? (selectedTrip.stops || []).filter(s => s.latitude && s.longitude)
    : [];

  // Route positions for drawing the line
  const selectedPositions: [number, number][] = selectedStops
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map(s => [s.latitude!, s.longitude!]);

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

  const selectTrip = (trip: Trip) => {
    if (selectedTripId === trip.id) {
      setSelectedTripId(null);
      return;
    }
    setSelectedTripId(trip.id);
    const stops = (trip.stops || []).filter(s => s.latitude && s.longitude);
    if (stops.length > 0) {
      const firstStop = stops[0];
      setFlyTarget([firstStop.latitude!, firstStop.longitude!]);
      setFlyZoom(6);
      setPanelState("peek");
    }
  };

  const publishTrip = async (tripId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isPublic: true }),
      });
      if (!res.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "trips"] });
      toast({ title: "Viaggio condiviso!", description: "Ora visibile sulla Mappa Comune." });
    } catch {
      toast({ title: "Errore", description: "Non è stato possibile condividere il viaggio.", variant: "destructive" });
    }
  };

  const createTrip = async () => {
    if (!newTripName.trim()) return;
    setCreating(true);
    try {
      const body: any = {
        name: newTripName.trim(),
        color: newTripColor,
        isPublic: false,
      };
      if (newTripStartDate) body.startDate = newTripStartDate;
      if (newTripEndDate) body.endDate = newTripEndDate;

      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "trips"] });
      setShowCreateModal(false);
      setNewTripName("");
      setNewTripStartDate("");
      setNewTripEndDate("");
      setNewTripColor(TRIP_COLORS[0]);
      toast({ title: "Viaggio creato!", description: `"${body.name}" è pronto. Aggiungi le tue tappe.` });
    } catch {
      toast({ title: "Errore", description: "Non è stato possibile creare il viaggio.", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const mapCenter: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lng]
    : allStops.length > 0
    ? [allStops[0].latitude!, allStops[0].longitude!]
    : [45, 10];

  return (
    <Layout fullWidth>
      <div className="relative h-full flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="absolute top-0 inset-x-0 z-[1001] flex items-center justify-between px-4 pt-4 pointer-events-none">
          <div className="flex items-center gap-2 bg-card/90 backdrop-blur-md rounded-2xl px-3 py-2 shadow-md border border-border/50 pointer-events-auto">
            <Compass className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Il mio Diary</span>
            {trips.length > 0 && (
              <span className="text-[10px] bg-primary/15 text-primary rounded-full px-2 py-0.5 font-medium">
                {trips.length} {trips.length === 1 ? "viaggio" : "viaggi"}
              </span>
            )}
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

        {/* FAB: Crea viaggio */}
        <div className="absolute bottom-0 left-4 z-[1001] pointer-events-none"
          style={{ bottom: `calc(${PANEL_HEIGHTS[panelState]} + 16px)`, transition: "bottom 0.4s ease" }}>
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={() => setShowCreateModal(true)}
            className="w-12 h-12 rounded-full bg-primary shadow-lg text-white flex items-center justify-center pointer-events-auto hover:bg-primary/90 active:scale-95 transition-transform"
            data-testid="diary-fab-create"
            title="Crea nuovo viaggio"
          >
            <Plus className="w-5 h-5" />
          </motion.button>
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

            <MapController center={flyTarget} zoom={flyZoom} />

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

            {/* Route line for selected trip */}
            {selectedPositions.length >= 2 && (
              <CurvedRouteLine
                positions={selectedPositions}
                color={selectedTrip?.color || "#6366f1"}
                opacity={0.9}
              />
            )}

            {/* Trip stops — all trips (dimmed if one is selected) */}
            {allStops.map(stop => {
              const isDimmed = selectedTripId !== null && stop.tripId !== selectedTripId;
              return (
                <Marker
                  key={`stop-${stop.id}`}
                  position={[stop.latitude!, stop.longitude!]}
                  icon={createStopIcon(isDimmed ? "#aaa" : stop.tripColor, stop.orderIndex + 1)}
                  opacity={isDimmed ? 0.35 : 1}
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
                      <Link href={`/travel-diary`}>
                        <button className="mt-2 w-full text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-medium hover:bg-primary/90 transition-colors">
                          Modifica nel Travel Diary
                        </button>
                      </Link>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

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
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mb-1" />
          </div>

          {/* Mini profile header — visible in peek & half state */}
          {panelState !== "full" && user && (
            <Link href="/profile">
              <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 hover:bg-muted/40 transition-colors cursor-pointer" data-testid="diary-profile-header">
                <img
                  src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                  alt={user.username}
                  className="w-8 h-8 rounded-full object-cover border-2 border-primary/30 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate leading-tight">{user.name || user.username}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{user.location || "Il mio Diary"}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground font-medium">{trips.length} viaggi</span>
                  <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              </div>
            </Link>
          )}

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

              {/* ── VIAGGI ── */}
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-xl font-medium flex items-center gap-1 hover:bg-primary/90 transition-colors"
                        data-testid="diary-create-trip-btn"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Nuovo
                      </button>
                      <Link href="/travel-diary">
                        <button className="text-xs text-primary font-medium flex items-center gap-1 hover:underline" data-testid="diary-trips-manage">
                          Gestisci <ExternalLink className="w-3 h-3" />
                        </button>
                      </Link>
                    </div>
                  </div>

                  {trips.length === 0 ? (
                    <div className="text-center py-8">
                      <Plane className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground mb-1">Nessun viaggio ancora.</p>
                      <p className="text-xs text-muted-foreground/60 mb-3">Crea il tuo primo viaggio e aggiungi le tappe sulla mappa.</p>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium"
                        data-testid="diary-create-first-trip"
                      >
                        Crea il tuo primo viaggio
                      </button>
                    </div>
                  ) : (
                    <>
                      {selectedTripId && (
                        <div className="flex items-center gap-2 text-xs bg-primary/8 text-primary rounded-xl px-3 py-2">
                          <Eye className="w-3.5 h-3.5" />
                          <span>Viaggio evidenziato sulla mappa. Tocca di nuovo per deselezionare.</span>
                          <button onClick={() => setSelectedTripId(null)} className="ml-auto">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      {trips.map(trip => {
                        const stopsWithCoords = (trip.stops || []).filter(s => s.latitude && s.longitude);
                        const isSelected = trip.id === selectedTripId;
                        return (
                          <div
                            key={trip.id}
                            onClick={() => selectTrip(trip)}
                            className={`rounded-2xl p-3 flex items-center gap-3 cursor-pointer transition-all ${
                              isSelected
                                ? "bg-primary/10 border border-primary/30 shadow-sm"
                                : "bg-muted/40 hover:bg-muted/60 border border-transparent"
                            }`}
                            data-testid={`diary-trip-${trip.id}`}
                          >
                            <div className="w-3 h-12 rounded-full flex-shrink-0" style={{ background: trip.color }} />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{trip.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(trip.stops || []).length} tappe
                                {stopsWithCoords.length > 0 && ` · ${stopsWithCoords.length} sulla mappa`}
                              </p>
                              {trip.isPublic && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400 font-medium mt-0.5">
                                  <Globe className="w-3 h-3" /> Pubblico sulla mappa
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                              {!trip.isPublic && (
                                <button
                                  onClick={(e) => publishTrip(trip.id, e)}
                                  className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                  title="Condividi sulla mappa comune"
                                  data-testid={`diary-share-trip-${trip.id}`}
                                >
                                  <Share2 className="w-4 h-4" />
                                </button>
                              )}
                              <Link href={`/travel-diary`}>
                                <button className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors" data-testid={`diary-edit-trip-${trip.id}`}>
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </motion.div>
              )}

              {/* ── MOMENTI ── */}
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

              {/* ── NOMADI ── */}
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

              {/* ── HUB ── */}
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

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { href: "/profile", icon: User, label: "Profilo", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400", testId: "hub-profile" },
                      { href: "/avatar-builder", icon: Sparkles, label: "Avatar", color: "bg-pink-500/10 text-pink-600 dark:text-pink-400", testId: "hub-avatar" },
                      { href: "/saved", icon: Bookmark, label: "Salvati", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400", testId: "hub-saved", badge: savedPosts.length },
                      { href: "/events-calendar", icon: Calendar, label: "I miei eventi", color: "bg-green-500/10 text-green-600 dark:text-green-400", testId: "hub-events", badge: eventRegistrations.length },
                      { href: "/booking", icon: Globe, label: "Prenotazioni", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400", testId: "hub-booking" },
                      { href: "/subscription", icon: Star, label: "Premium", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400", testId: "hub-subscription" },
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

        {/* ── CREATE TRIP MODAL ── */}
        <AnimatePresence>
          {showCreateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex items-end sm:items-center justify-center p-4"
              onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}
            >
              <motion.div
                initial={{ y: 60, opacity: 0, scale: 0.97 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 60, opacity: 0, scale: 0.97 }}
                transition={{ type: "spring", damping: 26, stiffness: 300 }}
                className="bg-card rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-border/50"
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Plane className="w-5 h-5 text-primary" />
                    Nuovo viaggio
                  </h2>
                  <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Nome del viaggio *</label>
                    <input
                      type="text"
                      value={newTripName}
                      onChange={e => setNewTripName(e.target.value)}
                      placeholder="Es. Estate in Asia, Giro d'Europa…"
                      className="w-full px-4 py-3 rounded-2xl bg-muted/50 border border-border/60 text-sm focus:outline-none focus:border-primary/50 focus:bg-background transition-all"
                      data-testid="diary-new-trip-name"
                      autoFocus
                      onKeyDown={e => { if (e.key === "Enter" && newTripName.trim()) createTrip(); }}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Colore del percorso</label>
                    <div className="flex gap-2 flex-wrap">
                      {TRIP_COLORS.map(color => (
                        <button
                          key={color}
                          onClick={() => setNewTripColor(color)}
                          className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 active:scale-95"
                          style={{
                            background: color,
                            borderColor: newTripColor === color ? "white" : "transparent",
                            boxShadow: newTripColor === color ? `0 0 0 2px ${color}` : "none",
                          }}
                          data-testid={`diary-color-${color}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Data inizio</label>
                      <input
                        type="date"
                        value={newTripStartDate}
                        onChange={e => setNewTripStartDate(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-2xl bg-muted/50 border border-border/60 text-sm focus:outline-none focus:border-primary/50 transition-all"
                        data-testid="diary-new-trip-start"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Data fine</label>
                      <input
                        type="date"
                        value={newTripEndDate}
                        onChange={e => setNewTripEndDate(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-2xl bg-muted/50 border border-border/60 text-sm focus:outline-none focus:border-primary/50 transition-all"
                        data-testid="diary-new-trip-end"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground/70 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-primary" />
                    Dopo aver creato il viaggio, aggiungi le tappe nel Travel Diary per vederle sulla mappa.
                  </p>

                  <button
                    onClick={createTrip}
                    disabled={!newTripName.trim() || creating}
                    className="w-full py-3 bg-primary text-primary-foreground rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-primary/90 active:scale-[0.98] transition-all"
                    data-testid="diary-confirm-create-trip"
                  >
                    {creating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    {creating ? "Creazione…" : "Crea viaggio"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
