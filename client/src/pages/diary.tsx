import { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Circle, Popup, Tooltip, useMap } from "react-leaflet";
import { searchFlights, searchHotels, searchKiwiFlights } from "@/lib/travelpayouts";
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
  Edit3, Eye, PenLine, Hotel, Coffee, Wifi, Building2, ArrowRight
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

// ── Stop Context Card ─────────────────────────────────────────────────────────
interface StopContextCardProps {
  stop: TripStop & { tripColor: string; tripName: string; tripId: number };
  onClose: () => void;
}

function StopContextCard({ stop, onClose }: StopContextCardProps) {
  const city = stop.location.split(",")[0].trim();

  const { data: rawEvents } = useQuery<any[]>({
    queryKey: ["/api/events", city],
    queryFn: () =>
      fetch(`/api/events?city=${encodeURIComponent(city)}&limit=3`, { credentials: "include" })
        .then(r => r.json())
        .then(d => (Array.isArray(d) ? d : [])),
    staleTime: 5 * 60 * 1000,
  });
  const events: any[] = Array.isArray(rawEvents) ? rawEvents : [];

  const { data: rawPlaces } = useQuery<any[]>({
    queryKey: ["/api/places", city, "coworking"],
    queryFn: () =>
      fetch(`/api/places?city=${encodeURIComponent(city)}&type=coworking&limit=3`, { credentials: "include" })
        .then(r => r.json())
        .then(d => (Array.isArray(d) ? d : [])),
    staleTime: 5 * 60 * 1000,
  });
  const coworkingPlaces: any[] = Array.isArray(rawPlaces) ? rawPlaces : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="rounded-2xl border border-amber-500/30 bg-amber-500/6 overflow-hidden"
      data-testid="stop-context-card"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: stop.tripColor }} />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{stop.location}</p>
          <p className="text-[11px] text-muted-foreground truncate">{stop.tripName}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-muted/60 transition-colors text-muted-foreground flex-shrink-0"
          data-testid="stop-context-close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Quick actions — Travelpayouts */}
      <div className="grid grid-cols-2 gap-2 px-3 pb-2">
        <button
          onClick={() => searchHotels(city)}
          className="flex items-center gap-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-2.5 text-xs font-semibold hover:bg-blue-500/20 transition-colors"
          data-testid="stop-hotels-btn"
        >
          <Hotel className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Hotel a {city}</span>
          <ExternalLink className="w-3 h-3 ml-auto opacity-60 flex-shrink-0" />
        </button>
        <button
          onClick={() => searchFlights(undefined, city)}
          className="flex items-center gap-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 px-3 py-2.5 text-xs font-semibold hover:bg-purple-500/20 transition-colors"
          data-testid="stop-flights-btn"
        >
          <Plane className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Voli per {city}</span>
          <ExternalLink className="w-3 h-3 ml-auto opacity-60 flex-shrink-0" />
        </button>
      </div>

      {/* Coworking spots */}
      {coworkingPlaces.length > 0 && (
        <div className="px-3 pb-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
            <Wifi className="w-3 h-3" /> Coworking
          </p>
          <div className="space-y-1">
            {coworkingPlaces.slice(0, 2).map((place: any) => (
              <div key={place.id} className="flex items-center gap-2 rounded-lg bg-card/60 px-2.5 py-1.5">
                <Building2 className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{place.name}</p>
                  {place.address && <p className="text-[10px] text-muted-foreground truncate">{place.address}</p>}
                </div>
                {place.rating && (
                  <span className="text-[10px] text-amber-500 font-semibold flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5 fill-current" />{place.rating}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Local events */}
      {events.length > 0 && (
        <div className="px-3 pb-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Eventi a {city}
          </p>
          <div className="space-y-1">
            {events.slice(0, 2).map((event: any) => (
              <div key={event.id} className="flex items-center gap-2 rounded-lg bg-card/60 px-2.5 py-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{event.title}</p>
                  {event.date && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      {new Date(event.date).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* If no coworking or events, show a link to the community map */}
      {coworkingPlaces.length === 0 && events.length === 0 && (
        <div className="px-3 pb-3">
          <Link href={`/?city=${encodeURIComponent(city)}`}>
            <button className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary/8 text-primary text-xs font-medium px-3 py-2 hover:bg-primary/15 transition-colors" data-testid="stop-explore-map-btn">
              <Map className="w-3.5 h-3.5" />
              Esplora {city} sulla mappa
              <ArrowRight className="w-3.5 h-3.5 ml-auto" />
            </button>
          </Link>
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
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
  const [selectedStop, setSelectedStop] = useState<(TripStop & { tripColor: string; tripName: string; tripId: number }) | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number>(0);
  const dragStartState = useRef<PanelState>("half");

  // FAB menu state
  const [showFabMenu, setShowFabMenu] = useState(false);

  // Create trip modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTripName, setNewTripName] = useState("");
  const [newTripColor, setNewTripColor] = useState(TRIP_COLORS[0]);
  const [newTripStartDate, setNewTripStartDate] = useState("");
  const [newTripEndDate, setNewTripEndDate] = useState("");
  const [creating, setCreating] = useState(false);

  // Create post modal state
  const [showPostModal, setShowPostModal] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postLocation, setPostLocation] = useState("");
  const [creatingPost, setCreatingPost] = useState(false);

  // Add stop modal state
  const [showStopModal, setShowStopModal] = useState(false);
  const [stopCity, setStopCity] = useState("");
  const [stopCountry, setStopCountry] = useState("");
  const [stopDate, setStopDate] = useState(new Date().toISOString().slice(0, 10));
  const [stopTransport, setStopTransport] = useState<string>("plane");
  const [stopNotes, setStopNotes] = useState("");
  const [stopTripId, setStopTripId] = useState<string>("");
  const [addingStop, setAddingStop] = useState(false);

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
      setSelectedStop(null);
      return;
    }
    setSelectedTripId(trip.id);
    setSelectedStop(null);
    const stops = (trip.stops || []).filter(s => s.latitude && s.longitude);
    if (stops.length > 0) {
      const firstStop = stops[0];
      setFlyTarget([firstStop.latitude!, firstStop.longitude!]);
      setFlyZoom(6);
      setPanelState("peek");
    }
  };

  const selectStop = (stop: TripStop & { tripColor: string; tripName: string; tripId: number }) => {
    if (selectedStop?.id === stop.id) {
      setSelectedStop(null);
      return;
    }
    setSelectedStop(stop);
    setSelectedTripId(stop.tripId);
    if (stop.latitude && stop.longitude) {
      setFlyTarget([stop.latitude, stop.longitude]);
      setFlyZoom(12);
    }
    setActiveTab("trips");
    setPanelState("half");
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

  const addStop = async () => {
    if (!stopCity.trim() || !stopCountry.trim() || !stopTripId) return;
    setAddingStop(true);
    try {
      // Geocode city + country via Nominatim
      let lat: number | undefined;
      let lng: number | undefined;
      try {
        const geo = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(stopCity + ", " + stopCountry)}&limit=1`
        );
        const geoData = await geo.json();
        if (geoData.length > 0) {
          lat = parseFloat(geoData[0].lat);
          lng = parseFloat(geoData[0].lon);
        }
      } catch { /* geocoding failed, proceed without coords */ }

      // Count existing stops in the trip to set orderIndex
      const existingStops = allStops.filter(s => String(s.tripId) === stopTripId);
      const orderIndex = existingStops.length;

      const body: any = {
        city: stopCity.trim(),
        country: stopCountry.trim(),
        arrivalDate: stopDate,
        transportMode: stopTransport,
        notes: stopNotes.trim() || undefined,
        orderIndex,
        ...(lat !== undefined && { latitude: lat }),
        ...(lng !== undefined && { longitude: lng }),
      };

      const res = await fetch(`/api/trips/${stopTripId}/stops`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "trips"] });
      setShowStopModal(false);
      setStopCity("");
      setStopCountry("");
      setStopNotes("");
      setStopDate(new Date().toISOString().slice(0, 10));
      setStopTransport("plane");
      if (lat && lng) setFlyTarget([lat, lng]);
      toast({ title: "Tappa aggiunta!", description: `${stopCity} aggiunta al viaggio.` });
    } catch {
      toast({ title: "Errore", description: "Non è stato possibile aggiungere la tappa.", variant: "destructive" });
    } finally {
      setAddingStop(false);
    }
  };

  const createPost = async () => {
    if (!postContent.trim()) return;
    setCreatingPost(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content: postContent.trim(),
          type: "text",
          ...(postLocation.trim() && { location: postLocation.trim() }),
        }),
      });
      if (!res.ok) throw new Error();
      setShowPostModal(false);
      setPostContent("");
      setPostLocation("");
      toast({ title: "Post pubblicato!", description: "Il tuo post è visibile nel feed." });
    } catch {
      toast({ title: "Errore", description: "Non è stato possibile pubblicare il post.", variant: "destructive" });
    } finally {
      setCreatingPost(false);
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

        {/* FAB multi-azione */}
        <div
          className="absolute left-4 z-[1001] flex flex-col-reverse items-start gap-2"
          style={{ bottom: `calc(${PANEL_HEIGHTS[panelState]} + 16px)`, transition: "bottom 0.4s ease" }}
        >
          {/* Main FAB button */}
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={() => setShowFabMenu(v => !v)}
            className={`w-12 h-12 rounded-full shadow-lg text-white flex items-center justify-center hover:opacity-90 active:scale-95 transition-all ${showFabMenu ? "bg-destructive" : "bg-primary"}`}
            data-testid="diary-fab-toggle"
          >
            <motion.div animate={{ rotate: showFabMenu ? 45 : 0 }} transition={{ duration: 0.2 }}>
              <Plus className="w-5 h-5" />
            </motion.div>
          </motion.button>

          {/* FAB menu options */}
          <AnimatePresence>
            {showFabMenu && (
              <>
                {/* Viaggio */}
                <motion.div
                  initial={{ opacity: 0, x: -20, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20, scale: 0.8 }}
                  transition={{ delay: 0.0, duration: 0.18 }}
                  className="flex items-center gap-2"
                >
                  <span className="bg-card/95 backdrop-blur-sm text-foreground text-xs font-medium px-2.5 py-1 rounded-xl shadow border border-border/50 whitespace-nowrap">Nuovo viaggio</span>
                  <button
                    onClick={() => { setShowCreateModal(true); setShowFabMenu(false); }}
                    className="w-10 h-10 rounded-full bg-indigo-500 shadow text-white flex items-center justify-center hover:bg-indigo-600 active:scale-95 transition-all"
                    data-testid="diary-fab-trip"
                  >
                    <Plane className="w-4 h-4" />
                  </button>
                </motion.div>

                {/* Tappa */}
                <motion.div
                  initial={{ opacity: 0, x: -20, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20, scale: 0.8 }}
                  transition={{ delay: 0.06, duration: 0.18 }}
                  className="flex items-center gap-2"
                >
                  <span className="bg-card/95 backdrop-blur-sm text-foreground text-xs font-medium px-2.5 py-1 rounded-xl shadow border border-border/50 whitespace-nowrap">Aggiungi tappa</span>
                  <button
                    onClick={() => {
                      setStopTripId(selectedTripId ? String(selectedTripId) : trips.length > 0 ? String(trips[0].id) : "");
                      setShowStopModal(true);
                      setShowFabMenu(false);
                    }}
                    className="w-10 h-10 rounded-full bg-emerald-500 shadow text-white flex items-center justify-center hover:bg-emerald-600 active:scale-95 transition-all"
                    data-testid="diary-fab-stop"
                  >
                    <MapPin className="w-4 h-4" />
                  </button>
                </motion.div>

                {/* Post */}
                <motion.div
                  initial={{ opacity: 0, x: -20, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20, scale: 0.8 }}
                  transition={{ delay: 0.12, duration: 0.18 }}
                  className="flex items-center gap-2"
                >
                  <span className="bg-card/95 backdrop-blur-sm text-foreground text-xs font-medium px-2.5 py-1 rounded-xl shadow border border-border/50 whitespace-nowrap">Scrivi post</span>
                  <button
                    onClick={() => { setShowPostModal(true); setShowFabMenu(false); }}
                    className="w-10 h-10 rounded-full bg-amber-500 shadow text-white flex items-center justify-center hover:bg-amber-600 active:scale-95 transition-all"
                    data-testid="diary-fab-post"
                  >
                    <PenLine className="w-4 h-4" />
                  </button>
                </motion.div>

                {/* Evento */}
                <motion.div
                  initial={{ opacity: 0, x: -20, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20, scale: 0.8 }}
                  transition={{ delay: 0.18, duration: 0.18 }}
                  className="flex items-center gap-2"
                >
                  <span className="bg-card/95 backdrop-blur-sm text-foreground text-xs font-medium px-2.5 py-1 rounded-xl shadow border border-border/50 whitespace-nowrap">Crea evento</span>
                  <a
                    href="/events-calendar"
                    onClick={() => setShowFabMenu(false)}
                    className="w-10 h-10 rounded-full bg-rose-500 shadow text-white flex items-center justify-center hover:bg-rose-600 active:scale-95 transition-all"
                    data-testid="diary-fab-event"
                  >
                    <Calendar className="w-4 h-4" />
                  </a>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Backdrop when FAB menu open */}
        {showFabMenu && (
          <div
            className="absolute inset-0 z-[1000]"
            onClick={() => setShowFabMenu(false)}
          />
        )}

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
              const isStopSelected = selectedStop?.id === stop.id;
              return (
                <Marker
                  key={`stop-${stop.id}`}
                  position={[stop.latitude!, stop.longitude!]}
                  icon={createStopIcon(isStopSelected ? "#f59e0b" : isDimmed ? "#aaa" : stop.tripColor, stop.orderIndex + 1)}
                  opacity={isDimmed ? 0.35 : 1}
                  eventHandlers={{
                    click: () => selectStop(stop),
                  }}
                >
                  <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                    <div className="text-xs">
                      <p className="font-semibold">{stop.location}</p>
                      <p className="text-muted-foreground">{stop.tripName} · Tocca per info</p>
                    </div>
                  </Tooltip>
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
                      {selectedTripId && !selectedStop && (
                        <div className="flex items-center gap-2 text-xs bg-primary/8 text-primary rounded-xl px-3 py-2">
                          <Eye className="w-3.5 h-3.5" />
                          <span>Viaggio evidenziato sulla mappa. Tocca una tappa per dettagli.</span>
                          <button onClick={() => { setSelectedTripId(null); setSelectedStop(null); }} className="ml-auto">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* ── STOP CONTEXT CARD ── */}
                      {selectedStop && (
                        <StopContextCard
                          stop={selectedStop}
                          onClose={() => setSelectedStop(null)}
                        />
                      )}

                      {trips.map(trip => {
                        const stopsWithCoords = (trip.stops || []).filter(s => s.latitude && s.longitude);
                        const isSelected = trip.id === selectedTripId;
                        return (
                          <div key={trip.id}>
                            <div
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
                            {/* Stops list — shown when trip is selected */}
                            {isSelected && (trip.stops || []).length > 0 && (
                              <div className="mt-1 ml-4 mb-1 space-y-0.5" onClick={e => e.stopPropagation()}>
                                {(trip.stops || [])
                                  .sort((a, b) => a.orderIndex - b.orderIndex)
                                  .map(stop => {
                                    const isStopActive = selectedStop?.id === stop.id;
                                    return (
                                      <button
                                        key={stop.id}
                                        onClick={() => selectStop({ ...stop, tripColor: trip.color, tripName: trip.name, tripId: trip.id })}
                                        className={`w-full flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-left transition-colors ${
                                          isStopActive
                                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                            : "hover:bg-muted/60 text-foreground"
                                        }`}
                                        data-testid={`diary-stop-btn-${stop.id}`}
                                      >
                                        <div
                                          className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold"
                                          style={{ fontSize: "9px", background: isStopActive ? "#f59e0b" : trip.color }}
                                        >
                                          {stop.orderIndex + 1}
                                        </div>
                                        <span className="text-xs font-medium truncate flex-1">{stop.location}</span>
                                        {stop.latitude && stop.longitude && (
                                          <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                        )}
                                      </button>
                                    );
                                  })}
                              </div>
                            )}
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
                    Dopo aver creato il viaggio, usa il (+) per aggiungere tappe direttamente sulla mappa.
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

        {/* ── MODAL SCRIVI POST ── */}
        <AnimatePresence>
          {showPostModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex items-end justify-center"
              onClick={e => { if (e.target === e.currentTarget) setShowPostModal(false); }}
            >
              <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="w-full bg-card rounded-t-3xl shadow-2xl p-6 pb-8 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {user && (
                      <img
                        src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                        className="w-8 h-8 rounded-full border-2 border-amber-400/30"
                        alt={user.username}
                      />
                    )}
                    <div>
                      <p className="text-sm font-bold">{user?.name || user?.username}</p>
                      <p className="text-[11px] text-muted-foreground">Condividi con la community</p>
                    </div>
                  </div>
                  <button onClick={() => setShowPostModal(false)} className="p-2 rounded-full hover:bg-muted transition-colors" data-testid="diary-post-modal-close">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <textarea
                  value={postContent}
                  onChange={e => setPostContent(e.target.value)}
                  placeholder="Cosa vuoi condividere? Un'esperienza, un consiglio, un luogo…"
                  rows={4}
                  autoFocus
                  className="w-full px-4 py-3 rounded-2xl bg-muted/50 border border-border/60 text-sm focus:outline-none focus:border-amber-400/50 transition-all resize-none"
                  data-testid="diary-post-content"
                />

                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <input
                    type="text"
                    value={postLocation}
                    onChange={e => setPostLocation(e.target.value)}
                    placeholder="Dove sei? (opzionale)"
                    className="flex-1 px-3 py-2 rounded-xl bg-muted/50 border border-border/60 text-xs focus:outline-none focus:border-amber-400/50 transition-all"
                    data-testid="diary-post-location"
                  />
                </div>

                <button
                  onClick={createPost}
                  disabled={!postContent.trim() || creatingPost}
                  className="w-full py-3 bg-amber-500 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-amber-600 active:scale-[0.98] transition-all"
                  data-testid="diary-confirm-post"
                >
                  {creatingPost ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <PenLine className="w-4 h-4" />
                  )}
                  {creatingPost ? "Pubblicazione…" : "Pubblica"}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── MODAL AGGIUNGI TAPPA ── */}
        <AnimatePresence>
          {showStopModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex items-end justify-center"
              onClick={e => { if (e.target === e.currentTarget) setShowStopModal(false); }}
            >
              <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="w-full bg-card rounded-t-3xl shadow-2xl p-6 pb-8 space-y-4 max-h-[85vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-emerald-500" />
                    </div>
                    <h2 className="font-bold text-base">Aggiungi tappa</h2>
                  </div>
                  <button onClick={() => setShowStopModal(false)} className="p-2 rounded-full hover:bg-muted transition-colors" data-testid="diary-stop-modal-close">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Trip selector */}
                {trips.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Viaggio</label>
                    <select
                      value={stopTripId}
                      onChange={e => setStopTripId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-2xl bg-muted/50 border border-border/60 text-sm focus:outline-none focus:border-primary/50 transition-all"
                      data-testid="diary-stop-trip-select"
                    >
                      <option value="">— Seleziona viaggio —</option>
                      {trips.map(t => (
                        <option key={t.id} value={String(t.id)}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {trips.length === 0 && (
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded-2xl px-4 py-3">Prima crea un viaggio, poi potrai aggiungere tappe.</p>
                )}

                {/* City + Country */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Città *</label>
                    <input
                      type="text"
                      value={stopCity}
                      onChange={e => setStopCity(e.target.value)}
                      placeholder="es. Bali"
                      className="w-full px-3 py-2.5 rounded-2xl bg-muted/50 border border-border/60 text-sm focus:outline-none focus:border-primary/50 transition-all"
                      data-testid="diary-stop-city"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Paese *</label>
                    <input
                      type="text"
                      value={stopCountry}
                      onChange={e => setStopCountry(e.target.value)}
                      placeholder="es. Indonesia"
                      className="w-full px-3 py-2.5 rounded-2xl bg-muted/50 border border-border/60 text-sm focus:outline-none focus:border-primary/50 transition-all"
                      data-testid="diary-stop-country"
                    />
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Data di arrivo *</label>
                  <input
                    type="date"
                    value={stopDate}
                    onChange={e => setStopDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-muted/50 border border-border/60 text-sm focus:outline-none focus:border-primary/50 transition-all"
                    data-testid="diary-stop-date"
                  />
                </div>

                {/* Transport mode */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Come ci arrivi?</label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { id: "plane", label: "✈️ Aereo" },
                      { id: "train", label: "🚂 Treno" },
                      { id: "car", label: "🚗 Auto" },
                      { id: "bike", label: "🚴 Bici" },
                      { id: "walk", label: "🚶 A piedi" },
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => setStopTransport(t.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${stopTransport === t.id ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 border-border/50 text-muted-foreground hover:border-primary/40"}`}
                        data-testid={`diary-stop-transport-${t.id}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Note (opzionale)</label>
                  <textarea
                    value={stopNotes}
                    onChange={e => setStopNotes(e.target.value)}
                    placeholder="Cosa vuoi ricordare di questa tappa?"
                    rows={2}
                    className="w-full px-3 py-2.5 rounded-2xl bg-muted/50 border border-border/60 text-sm focus:outline-none focus:border-primary/50 transition-all resize-none"
                    data-testid="diary-stop-notes"
                  />
                </div>

                <p className="text-[11px] text-muted-foreground/70 flex items-start gap-1.5">
                  <Globe className="w-3 h-3 flex-shrink-0 mt-0.5 text-emerald-500" />
                  La posizione viene trovata automaticamente dalla città e paese che hai inserito.
                </p>

                <button
                  onClick={addStop}
                  disabled={!stopCity.trim() || !stopCountry.trim() || !stopTripId || addingStop}
                  className="w-full py-3 bg-emerald-500 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-emerald-600 active:scale-[0.98] transition-all"
                  data-testid="diary-confirm-add-stop"
                >
                  {addingStop ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MapPin className="w-4 h-4" />
                  )}
                  {addingStop ? "Aggiunta in corso…" : "Aggiungi tappa"}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
