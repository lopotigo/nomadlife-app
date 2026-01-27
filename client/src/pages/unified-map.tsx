import { useEffect, useState, useCallback, useMemo } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { 
  Heart, MapPin, Loader2, Plus, Leaf, Users, Compass, 
  Filter, X, Eye, EyeOff, Plane, MessageCircle, ChevronDown,
  Hotel, Coffee, Utensils, Car, Star, Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Post, User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

type PostWithUser = Post & { user: User };

interface TripStop {
  id: string;
  tripId: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  orderIndex: number;
  arrivalDate: string;
  departureDate?: string;
  notes?: string;
}

interface Trip {
  id: string;
  userId: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  isPublic: boolean;
  user: { id: string; name: string; username: string; avatar?: string };
  stops: TripStop[];
}

function createPostMarkerIcon() {
  return L.divIcon({
    html: `<div class="post-marker"><svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></div>`,
    className: "custom-post-marker",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}

function createStopMarkerIcon(orderIndex: number, isEco: boolean = false) {
  const bgColor = isEco ? "#22c55e" : "#3b82f6";
  return L.divIcon({
    html: `<div style="background:${bgColor};color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${orderIndex + 1}</div>`,
    className: "custom-stop-marker",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function BezierCurve({ points, color = "#3b82f6", isEco = false }: { points: [number, number][]; color?: string; isEco?: boolean }) {
  const map = useMap();
  
  useEffect(() => {
    if (points.length < 2) return;
    
    const curveColor = isEco ? "#22c55e" : color;
    const pathData = generateBezierPath(points, map);
    
    const svgOverlay = L.svgOverlay(
      createSvgElement(pathData, curveColor),
      map.getBounds(),
      { interactive: false }
    );
    
    const polyline = L.polyline(points, {
      color: curveColor,
      weight: 3,
      opacity: 0.8,
      smoothFactor: 2,
      dashArray: isEco ? "10, 5" : undefined,
    });
    
    polyline.addTo(map);
    
    return () => {
      map.removeLayer(polyline);
    };
  }, [points, map, color, isEco]);
  
  return null;
}

function generateBezierPath(points: [number, number][], map: L.Map): string {
  if (points.length < 2) return "";
  
  const pixelPoints = points.map(p => map.latLngToContainerPoint(L.latLng(p[0], p[1])));
  
  let path = `M ${pixelPoints[0].x} ${pixelPoints[0].y}`;
  
  for (let i = 1; i < pixelPoints.length; i++) {
    const prev = pixelPoints[i - 1];
    const curr = pixelPoints[i];
    const midX = (prev.x + curr.x) / 2;
    const midY = (prev.y + curr.y) / 2;
    const cpOffset = Math.abs(curr.x - prev.x) * 0.3;
    
    path += ` Q ${prev.x + cpOffset} ${midY - 20}, ${curr.x} ${curr.y}`;
  }
  
  return path;
}

function createSvgElement(pathData: string, color: string): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 1000 1000");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathData);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", color);
  path.setAttribute("stroke-width", "3");
  svg.appendChild(path);
  return svg;
}

function CurvedPolyline({ positions, color = "#3b82f6", isEco = false }: { positions: [number, number][]; color?: string; isEco?: boolean }) {
  const map = useMap();
  
  useEffect(() => {
    if (positions.length < 2) return;
    
    const curveColor = isEco ? "#22c55e" : color;
    const curvedPoints: L.LatLng[] = [];
    
    for (let i = 0; i < positions.length - 1; i++) {
      const start = L.latLng(positions[i][0], positions[i][1]);
      const end = L.latLng(positions[i + 1][0], positions[i + 1][1]);
      
      const midLat = (start.lat + end.lat) / 2;
      const midLng = (start.lng + end.lng) / 2;
      const distance = start.distanceTo(end);
      const offset = distance * 0.00001;
      
      const controlLat = midLat + offset * 0.5;
      const controlLng = midLng;
      
      for (let t = 0; t <= 1; t += 0.05) {
        const lat = (1 - t) * (1 - t) * start.lat + 2 * (1 - t) * t * controlLat + t * t * end.lat;
        const lng = (1 - t) * (1 - t) * start.lng + 2 * (1 - t) * t * controlLng + t * t * end.lng;
        curvedPoints.push(L.latLng(lat, lng));
      }
    }
    curvedPoints.push(L.latLng(positions[positions.length - 1][0], positions[positions.length - 1][1]));
    
    const polyline = L.polyline(curvedPoints, {
      color: curveColor,
      weight: 4,
      opacity: 0.85,
      lineCap: "round",
      lineJoin: "round",
      dashArray: isEco ? "8, 6" : undefined,
    });
    
    polyline.addTo(map);
    
    return () => {
      map.removeLayer(polyline);
    };
  }, [positions, map, color, isEco]);
  
  return null;
}

export default function UnifiedMap() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [myTrips, setMyTrips] = useState<Trip[]>([]);
  const [followingTrips, setFollowingTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showNewTrip, setShowNewTrip] = useState(false);
  const [showFeed, setShowFeed] = useState(true);
  const { toast } = useToast();
  
  const [filters, setFilters] = useState({
    showPosts: true,
    showMyTrips: true,
    showFollowingTrips: true,
    ecoMode: false,
  });

  const fetchData = useCallback(async () => {
    try {
      const [postsRes, myTripsRes, publicTripsRes] = await Promise.all([
        fetch("/api/posts", { credentials: "include" }),
        fetch("/api/my-trips", { credentials: "include" }),
        fetch("/api/trips", { credentials: "include" }),
      ]);
      
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        setPosts(postsData);
      }
      
      if (myTripsRes.ok) {
        const myTripsData = await myTripsRes.json();
        const tripsWithDetails = await Promise.all(
          myTripsData.map(async (trip: any) => {
            const detailRes = await fetch(`/api/trips/${trip.id}`, { credentials: "include" });
            if (detailRes.ok) return detailRes.json();
            return { ...trip, stops: [] };
          })
        );
        setMyTrips(tripsWithDetails);
      }
      
      if (publicTripsRes.ok) {
        const publicData = await publicTripsRes.json();
        const otherTrips = publicData.filter((t: Trip) => t.userId !== user?.id);
        setFollowingTrips(otherTrips);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLocation("/auth");
      return;
    }
    fetchData();
  }, [user, authLoading, setLocation, fetchData]);

  const handleCreateTrip = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: formData.get("title"),
          description: formData.get("description"),
          startDate: formData.get("startDate"),
          isPublic: formData.get("isPublic") === "on",
          startLocation: formData.get("startLocation") || "",
          endLocation: formData.get("endLocation") || "",
          totalBudget: 0,
          currency: "EUR",
        }),
      });
      
      if (res.ok) {
        toast({ title: "Viaggio creato!", description: "Ora puoi aggiungere le tappe" });
        setShowNewTrip(false);
        fetchData();
      }
    } catch (error) {
      toast({ title: "Errore", description: "Impossibile creare il viaggio", variant: "destructive" });
    }
  };

  const postsWithCoords = useMemo(() => 
    posts.filter(p => p.latitude && p.longitude),
    [posts]
  );

  const tripsWithStops = useMemo(() => {
    const allTrips: (Trip & { isOwn: boolean })[] = [];
    
    if (filters.showMyTrips) {
      myTrips.forEach(t => allTrips.push({ ...t, isOwn: true }));
    }
    
    if (filters.showFollowingTrips) {
      followingTrips.forEach(t => allTrips.push({ ...t, isOwn: false }));
    }
    
    return allTrips.filter(t => t.stops && t.stops.length > 0);
  }, [myTrips, followingTrips, filters.showMyTrips, filters.showFollowingTrips]);

  const mapCenter: [number, number] = useMemo(() => {
    const allStops = tripsWithStops.flatMap(t => t.stops);
    if (allStops.length > 0) {
      const validStops = allStops.filter(s => s.latitude && s.longitude);
      if (validStops.length > 0) {
        const avgLat = validStops.reduce((sum, s) => sum + (s.latitude || 0), 0) / validStops.length;
        const avgLng = validStops.reduce((sum, s) => sum + (s.longitude || 0), 0) / validStops.length;
        return [avgLat, avgLng];
      }
    }
    return [20, 100];
  }, [tripsWithStops]);

  if (authLoading || loading) {
    return (
      <Layout fullWidth>
        <div className="flex items-center justify-center h-screen bg-slate-900">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col h-full">
        <div className="relative h-[50vh] w-full">
          <MapContainer
            center={mapCenter}
            zoom={4}
            className="h-full w-full z-0"
            style={{ background: "#1a1a2e" }}
          >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          
          {filters.showPosts && postsWithCoords.map((post) => (
            <Marker
              key={`post-${post.id}`}
              position={[post.latitude!, post.longitude!]}
              icon={createPostMarkerIcon()}
            >
              <Popup className="custom-popup">
                <div className="p-2 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <img 
                      src={post.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user.username}`}
                      className="w-8 h-8 rounded-full"
                      alt={post.user.name}
                    />
                    <div>
                      <p className="font-semibold text-sm">{post.user.name}</p>
                      <p className="text-xs text-gray-500">@{post.user.username}</p>
                    </div>
                  </div>
                  {post.imageUrl && (
                    <img src={post.imageUrl} className="w-full h-24 object-cover rounded mb-2" alt="" />
                  )}
                  <p className="text-sm">{post.content.substring(0, 100)}...</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {post.likes}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {post.commentsCount}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
          
          {tripsWithStops.map((trip) => {
            const validStops = trip.stops.filter(s => s.latitude && s.longitude).sort((a, b) => a.orderIndex - b.orderIndex);
            const positions: [number, number][] = validStops.map(s => [s.latitude!, s.longitude!]);
            
            return (
              <div key={`trip-${trip.id}`}>
                {positions.length >= 2 && (
                  <CurvedPolyline 
                    positions={positions} 
                    color={trip.isOwn ? "#f59e0b" : "#3b82f6"}
                    isEco={filters.ecoMode}
                  />
                )}
                
                {validStops.map((stop) => (
                  <Marker
                    key={`stop-${stop.id}`}
                    position={[stop.latitude!, stop.longitude!]}
                    icon={createStopMarkerIcon(stop.orderIndex, filters.ecoMode)}
                  >
                    <Popup className="custom-popup">
                      <div className="p-3 min-w-[220px]">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${filters.ecoMode ? "bg-green-500" : "bg-blue-500"}`}>
                            {stop.orderIndex + 1}
                          </div>
                          <div>
                            <p className="font-bold">{stop.city}</p>
                            <p className="text-xs text-gray-500">{stop.country}</p>
                          </div>
                        </div>
                        
                        <div className="bg-slate-100 rounded p-2 mb-2">
                          <p className="text-xs font-medium text-slate-600">{trip.title}</p>
                          <p className="text-xs text-slate-500">di {trip.user?.name || "Anonimo"}</p>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(stop.arrivalDate).toLocaleDateString("it-IT")}</span>
                          {stop.departureDate && (
                            <>
                              <span>→</span>
                              <span>{new Date(stop.departureDate).toLocaleDateString("it-IT")}</span>
                            </>
                          )}
                        </div>
                        
                        {stop.notes && (
                          <p className="text-xs text-gray-600 italic">{stop.notes}</p>
                        )}
                        
                        {filters.ecoMode && (
                          <div className="mt-2 flex items-center gap-1 text-green-600 text-xs">
                            <Leaf className="w-3 h-3" />
                            <span>Viaggio eco-friendly</span>
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </div>
            );
          })}
        </MapContainer>
        
        <div className="absolute top-4 left-4 right-4 z-[1000] flex items-center justify-between">
          <div className="bg-card/90 backdrop-blur-md rounded-2xl px-4 py-3 shadow-lg border border-border/50">
            <h1 className="text-lg font-display font-bold flex items-center gap-2">
              <Compass className="w-5 h-5 text-primary" />
              NomadLife Map
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={filters.ecoMode ? "default" : "outline"}
              size="sm"
              onClick={() => setFilters(f => ({ ...f, ecoMode: !f.ecoMode }))}
              className={`backdrop-blur-md ${filters.ecoMode ? "bg-green-500 hover:bg-green-600" : "bg-card/90"}`}
              data-testid="button-eco-mode"
            >
              <Leaf className="w-4 h-4 mr-1" />
              {filters.ecoMode ? "Eco ON" : "Eco Mode"}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="bg-card/90 backdrop-blur-md"
              data-testid="button-filters"
            >
              <Filter className="w-4 h-4 mr-1" />
              Filtri
            </Button>
            
            <Button
              onClick={() => setShowNewTrip(true)}
              size="sm"
              className="bg-primary hover:bg-primary/90"
              data-testid="button-new-trip"
            >
              <Plus className="w-4 h-4 mr-1" />
              Nuovo Diario
            </Button>
          </div>
        </div>
        
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute top-20 right-4 z-[1000] bg-card/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-border/50 w-64"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Filtri Mappa</h3>
                <button onClick={() => setShowFilters(false)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <Heart className="w-4 h-4 text-red-400" />
                    Post Feed
                  </label>
                  <Switch
                    checked={filters.showPosts}
                    onCheckedChange={(v) => setFilters(f => ({ ...f, showPosts: v }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <Plane className="w-4 h-4 text-amber-400" />
                    I Miei Viaggi
                  </label>
                  <Switch
                    checked={filters.showMyTrips}
                    onCheckedChange={(v) => setFilters(f => ({ ...f, showMyTrips: v }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-blue-400" />
                    Viaggi Seguiti
                  </label>
                  <Switch
                    checked={filters.showFollowingTrips}
                    onCheckedChange={(v) => setFilters(f => ({ ...f, showFollowingTrips: v }))}
                  />
                </div>
                
                <hr className="border-border" />
                
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <Leaf className="w-4 h-4 text-green-500" />
                    Bassa CO2
                  </label>
                  <Switch
                    checked={filters.ecoMode}
                    onCheckedChange={(v) => setFilters(f => ({ ...f, ecoMode: v }))}
                  />
                </div>
              </div>
              
              {filters.ecoMode && (
                <div className="mt-4 p-3 bg-green-500/10 rounded-xl border border-green-500/30">
                  <p className="text-xs text-green-400">
                    Modalità Eco attiva: i percorsi sono ottimizzati per viaggi a basse emissioni di CO2
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="absolute bottom-4 left-4 z-[1000] bg-card/90 backdrop-blur-md rounded-2xl p-3 shadow-lg border border-border/50">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <span>Post</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <span>Miei Viaggi</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-400" />
                <span>Seguiti</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Eco</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-400" />
            Feed
          </h2>
          
          {posts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nessun post ancora</p>
          ) : (
            posts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-xl p-4 border border-border shadow-sm"
                data-testid={`post-card-${post.id}`}
              >
                <div className="flex items-start gap-3">
                  <Link href={`/user/${post.userId}`}>
                    <img
                      src={post.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user.username}`}
                      alt={post.user.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/user/${post.userId}`}>
                        <span className="font-semibold hover:underline">{post.user.name}</span>
                      </Link>
                      <span className="text-muted-foreground text-sm">@{post.user.username}</span>
                    </div>
                    {post.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="w-3 h-3" />
                        <span>{post.location}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <p className="mt-3 text-sm">{post.content}</p>
                
                {post.imageUrl && (
                  <img
                    src={post.imageUrl}
                    alt=""
                    className="mt-3 rounded-xl w-full max-h-64 object-cover"
                  />
                )}
                
                <div className="flex items-center gap-4 mt-3 text-muted-foreground">
                  <button className="flex items-center gap-1 text-sm hover:text-red-400 transition-colors">
                    <Heart className="w-4 h-4" />
                    <span>{post.likes}</span>
                  </button>
                  <button className="flex items-center gap-1 text-sm hover:text-primary transition-colors">
                    <MessageCircle className="w-4 h-4" />
                    <span>{post.commentsCount}</span>
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
        
      <Dialog open={showNewTrip} onOpenChange={setShowNewTrip}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plane className="w-5 h-5 text-primary" />
              Nuovo Diario di Viaggio
            </DialogTitle>
          </DialogHeader>
            
          <form onSubmit={handleCreateTrip} className="space-y-4">
          <div>
            <Label htmlFor="title">Titolo del Viaggio</Label>
            <Input
              id="title"
              name="title"
              placeholder="Es: Avventura Sud-Est Asiatico"
              required
              className="mt-1"
              data-testid="input-trip-title"
            />
          </div>
          <div>
            <Label htmlFor="description">Descrizione</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Racconta il tuo viaggio..."
              className="mt-1"
              rows={3}
              data-testid="input-trip-description"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startLocation">Partenza</Label>
              <Input
                id="startLocation"
                name="startLocation"
                placeholder="Es: Milano"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="endLocation">Destinazione</Label>
              <Input
                id="endLocation"
                name="endLocation"
                placeholder="Es: Bali"
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="startDate">Data Inizio</Label>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              required
              className="mt-1"
              data-testid="input-start-date"
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
            <div>
              <Label htmlFor="isPublic" className="text-sm font-medium">Viaggio Pubblico</Label>
              <p className="text-xs text-muted-foreground">Altri utenti potranno vedere il tuo viaggio sulla mappa</p>
            </div>
            <Switch id="isPublic" name="isPublic" data-testid="switch-public" />
          </div>
          <Button type="submit" className="w-full" data-testid="button-create-trip">
            <Plus className="w-4 h-4 mr-2" />
            Crea Diario di Viaggio
          </Button>
        </form>
        </DialogContent>
      </Dialog>
      
      <style>{`
        .custom-post-marker {
          background: transparent !important;
          border: none !important;
        }
        .post-marker {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #ef4444, #f97316);
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 3px 10px rgba(0,0,0,0.3);
          border: 2px solid white;
        }
        .post-marker svg {
          transform: rotate(45deg);
          color: white;
        }
        .custom-stop-marker {
          background: transparent !important;
          border: none !important;
        }
        .custom-popup .leaflet-popup-content-wrapper {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        .custom-popup .leaflet-popup-tip {
          background: white;
        }
        .leaflet-container {
          font-family: inherit;
        }
      `}</style>
    </Layout>
  );
}
