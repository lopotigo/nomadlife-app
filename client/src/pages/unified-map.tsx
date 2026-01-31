import { useEffect, useState, useCallback, useMemo } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { 
  Heart, MapPin, Loader2, Plus, Leaf, Users, Compass, 
  Filter, X, Plane, MessageCircle, Calendar, Send, Image,
  Video, Link as LinkIcon, Share2, Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import type { Post, User, Comment } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import { ShareQRModal } from "@/components/share-qr-modal";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

type PostWithUser = Post & { user: User };
type CommentWithUser = Comment & { user: User };

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

function createPostMarkerIcon(imageUrl: string | null) {
  const html = imageUrl 
    ? `<div class="post-marker"><img src="${imageUrl}" alt="post" /></div>`
    : `<div class="post-marker post-marker-text"><svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></div>`;
  return L.divIcon({
    html,
    className: "custom-post-marker",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
}

function createStopMarkerIcon(orderIndex: number, color: string = "#3b82f6") {
  return L.divIcon({
    html: `<div style="background:${color};color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${orderIndex + 1}</div>`,
    className: "custom-stop-marker",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function CurvedPolyline({ positions, color = "#3b82f6", dashed = false }: { positions: [number, number][]; color?: string; dashed?: boolean }) {
  const map = useMap();
  
  useEffect(() => {
    if (positions.length < 2) return;
    
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
      color,
      weight: 4,
      opacity: 0.85,
      lineCap: "round",
      lineJoin: "round",
      dashArray: dashed ? "8, 6" : undefined,
    });
    
    polyline.addTo(map);
    
    return () => {
      map.removeLayer(polyline);
    };
  }, [positions, map, color, dashed]);
  
  return null;
}

export default function UnifiedMap() {
  const { user, loading: authLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [myTrips, setMyTrips] = useState<Trip[]>([]);
  const [followingTrips, setFollowingTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showNewTrip, setShowNewTrip] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [shareModal, setShareModal] = useState<{ open: boolean; type: "post" | "profile" | "trip" | "invite"; id: string; title: string } | null>(null);
  const [highlightedTripId, setHighlightedTripId] = useState<string | null>(null);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [pulsingPosts, setPulsingPosts] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tripId = params.get("trip");
    setHighlightedTripId(tripId || null);
  }, [location]);
  
  const [filters, setFilters] = useState({
    showPosts: true,
    showMyTrips: true,
    showFollowingTrips: true,
    ecoMode: false,
  });

  const handleLike = useCallback(async (postId: string) => {
    if (likedPosts.has(postId)) return;
    
    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
        credentials: "include",
      });
      
      if (res.ok) {
        const updatedPost = await res.json();
        
        setLikedPosts(prev => new Set(Array.from(prev).concat(postId)));
        setPulsingPosts(prev => new Set(Array.from(prev).concat(postId)));
        
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: updatedPost.likes } : p));
        
        setTimeout(() => {
          setPulsingPosts(prev => {
            const next = new Set(prev);
            next.delete(postId);
            return next;
          });
        }, 5000);
      }
    } catch (error) {
      console.error("Failed to like post:", error);
    }
  }, [likedPosts]);

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
        const tripsWithStops = await Promise.all(
          otherTrips.map(async (trip: any) => {
            const detailRes = await fetch(`/api/trips/${trip.id}`, { credentials: "include" });
            if (detailRes.ok) return detailRes.json();
            return { ...trip, stops: [] };
          })
        );
        setFollowingTrips(tripsWithStops);
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

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setClickedCoords({ lat, lng });
    setShowNewPost(true);
  }, []);

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
        toast({ title: "Viaggio creato!", description: "Vai al Diario di Viaggio per aggiungere le tappe" });
        setShowNewTrip(false);
        fetchData();
      }
    } catch (error) {
      toast({ title: "Errore", description: "Impossibile creare il viaggio", variant: "destructive" });
    }
  };

  const postsWithCoords = useMemo(() => 
    filters.showPosts ? posts.filter(p => p.latitude && p.longitude) : [],
    [posts, filters.showPosts]
  );

  const tripsToShow = useMemo(() => {
    const result: (Trip & { isOwn: boolean; color: string })[] = [];
    
    if (filters.showMyTrips) {
      myTrips.forEach(t => {
        if (t.stops && t.stops.length > 0) {
          result.push({ ...t, isOwn: true, color: filters.ecoMode ? "#22c55e" : "#f59e0b" });
        }
      });
    }
    
    if (filters.showFollowingTrips) {
      followingTrips.forEach(t => {
        if (t.stops && t.stops.length > 0) {
          result.push({ ...t, isOwn: false, color: filters.ecoMode ? "#22c55e" : "#3b82f6" });
        }
      });
    }
    
    return result;
  }, [myTrips, followingTrips, filters]);

  const { mapCenter, mapZoom } = useMemo(() => {
    if (highlightedTripId) {
      const trip = tripsToShow.find(t => t.id === highlightedTripId);
      if (trip && trip.stops.length > 0) {
        const tripPoints = trip.stops.filter(s => s.latitude && s.longitude);
        if (tripPoints.length > 0) {
          const avgLat = tripPoints.reduce((sum, p) => sum + (p.latitude || 0), 0) / tripPoints.length;
          const avgLng = tripPoints.reduce((sum, p) => sum + (p.longitude || 0), 0) / tripPoints.length;
          const latitudes = tripPoints.map(p => p.latitude || 0);
          const longitudes = tripPoints.map(p => p.longitude || 0);
          const latSpan = Math.max(...latitudes) - Math.min(...latitudes);
          const lngSpan = Math.max(...longitudes) - Math.min(...longitudes);
          const maxSpan = Math.max(latSpan, lngSpan);
          let zoom = 5;
          if (maxSpan > 50) zoom = 3;
          else if (maxSpan > 20) zoom = 4;
          else if (maxSpan > 5) zoom = 5;
          else zoom = 7;
          return { mapCenter: [avgLat, avgLng] as [number, number], mapZoom: zoom };
        }
      }
    }
    
    const allPoints: { lat: number; lng: number }[] = [];
    
    postsWithCoords.forEach(p => {
      if (p.latitude && p.longitude) {
        allPoints.push({ lat: p.latitude, lng: p.longitude });
      }
    });
    
    tripsToShow.forEach(t => {
      t.stops.forEach(s => {
        if (s.latitude && s.longitude) {
          allPoints.push({ lat: s.latitude, lng: s.longitude });
        }
      });
    });
    
    if (allPoints.length === 0) {
      return { mapCenter: [20, 50] as [number, number], mapZoom: 2 };
    }
    
    const avgLat = allPoints.reduce((sum, p) => sum + p.lat, 0) / allPoints.length;
    const avgLng = allPoints.reduce((sum, p) => sum + p.lng, 0) / allPoints.length;
    
    const latitudes = allPoints.map(p => p.lat);
    const longitudes = allPoints.map(p => p.lng);
    const latSpan = Math.max(...latitudes) - Math.min(...latitudes);
    const lngSpan = Math.max(...longitudes) - Math.min(...longitudes);
    const maxSpan = Math.max(latSpan, lngSpan);
    
    let zoom = 3;
    if (maxSpan > 100) zoom = 2;
    else if (maxSpan > 50) zoom = 3;
    else if (maxSpan > 20) zoom = 4;
    else if (maxSpan > 5) zoom = 6;
    else zoom = 8;
    
    return { mapCenter: [avgLat, avgLng] as [number, number], mapZoom: zoom };
  }, [postsWithCoords, tripsToShow, highlightedTripId]);

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen bg-slate-900">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col h-full">
        <div className="relative h-[50vh] min-h-[300px]">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            className="h-full w-full z-0"
            style={{ background: "#1a1a2e" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <MapClickHandler onMapClick={handleMapClick} />
            
            {postsWithCoords.map((post) => (
              <Marker
                key={`post-${post.id}`}
                position={[post.latitude!, post.longitude!]}
                icon={createPostMarkerIcon(post.imageUrl)}
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
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <button 
                          onClick={() => handleLike(post.id)}
                          className={`flex items-center gap-1 ${likedPosts.has(post.id) ? 'text-red-500' : 'hover:text-red-400'}`}
                        >
                          <Heart className={`w-3 h-3 ${pulsingPosts.has(post.id) ? 'heart-pulse' : ''} ${likedPosts.has(post.id) ? 'fill-red-500' : ''}`} /> 
                          {post.likes}
                        </button>
                        <Link href={`/post/${post.id}`} className="flex items-center gap-1 hover:text-primary transition-colors"><MessageCircle className="w-3 h-3" /> {post.commentsCount}</Link>
                      </div>
                      <button
                        onClick={() => setShareModal({ open: true, type: "post", id: post.id, title: post.content.substring(0, 50) + "..." })}
                        className="p-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                        data-testid={`button-share-post-${post.id}`}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
            
            {tripsToShow.map((trip) => {
              const validStops = trip.stops.filter(s => s.latitude && s.longitude).sort((a, b) => a.orderIndex - b.orderIndex);
              const positions: [number, number][] = validStops.map(s => [s.latitude!, s.longitude!]);
              
              return (
                <div key={`trip-${trip.id}`}>
                  {positions.length >= 2 && (
                    <CurvedPolyline 
                      positions={positions} 
                      color={trip.color}
                      dashed={filters.ecoMode}
                    />
                  )}
                  
                  {validStops.map((stop) => (
                    <Marker
                      key={`stop-${stop.id}`}
                      position={[stop.latitude!, stop.longitude!]}
                      icon={createStopMarkerIcon(stop.orderIndex, trip.color)}
                    >
                      <Popup className="custom-popup">
                        <div className="p-3 min-w-[200px]">
                          <div className="flex items-center gap-2 mb-3">
                            <img 
                              src={trip.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${trip.user?.username || trip.userId}`}
                              className="w-8 h-8 rounded-full object-cover"
                              alt={trip.user?.name || "User"}
                            />
                            <div>
                              <p className="font-semibold text-sm">{trip.user?.name || trip.user?.username || "Utente"}</p>
                              {trip.user?.username && <p className="text-xs text-gray-500">@{trip.user.username}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <div style={{ background: trip.color }} className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs">
                              {stop.orderIndex + 1}
                            </div>
                            <div>
                              <p className="font-bold">{stop.city}</p>
                              <p className="text-xs text-gray-500">{stop.country}</p>
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 mb-1">{trip.title}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(stop.arrivalDate).toLocaleDateString("it-IT")}</span>
                            </div>
                            <button
                              onClick={() => setShareModal({ open: true, type: "trip", id: trip.id, title: trip.title })}
                              className="p-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                              data-testid={`button-share-trip-${trip.id}`}
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {stop.notes && (
                            <p className="text-xs text-gray-600 mt-2 italic">{stop.notes}</p>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </div>
              );
            })}
          </MapContainer>
          
          <div className="absolute top-4 left-4 z-[1000] bg-card/90 backdrop-blur-md rounded-2xl px-4 py-2 shadow-lg border border-border/50">
            <h1 className="text-lg font-display font-bold flex items-center gap-2">
              <Compass className="w-5 h-5 text-primary" />
              NomadLife
            </h1>
          </div>
          
          <div className="absolute top-4 right-4 z-[1000] flex items-center gap-2">
            <Button
              variant={filters.ecoMode ? "default" : "outline"}
              size="sm"
              onClick={() => setFilters(f => ({ ...f, ecoMode: !f.ecoMode }))}
              className={`backdrop-blur-md ${filters.ecoMode ? "bg-green-500 hover:bg-green-600" : "bg-card/90"}`}
              data-testid="button-eco-mode"
            >
              <Leaf className="w-4 h-4 mr-1" />
              Eco
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="bg-card/90 backdrop-blur-md"
              data-testid="button-filters"
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>
          
          <button
            onClick={() => {
              setClickedCoords(null);
              setShowNewPost(true);
            }}
            className="absolute bottom-4 right-4 z-[1000] w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
            data-testid="button-new-post"
          >
            <Plus className="w-5 h-5" />
          </button>
          
          <Button
            onClick={() => setShowNewTrip(true)}
            size="sm"
            className="absolute bottom-4 left-4 z-[1000] bg-amber-500 hover:bg-amber-600"
            data-testid="button-new-trip"
          >
            <Plane className="w-4 h-4 mr-1" />
            Nuovo Viaggio
          </Button>
          
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-16 right-4 z-[1000] bg-card/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-border/50 w-56"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Filtri</h3>
                  <button onClick={() => setShowFilters(false)}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm">
                      <Heart className="w-4 h-4 text-red-400" />
                      Post
                    </label>
                    <Switch
                      checked={filters.showPosts}
                      onCheckedChange={(v) => setFilters(f => ({ ...f, showPosts: v }))}
                      data-testid="switch-posts"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm">
                      <Plane className="w-4 h-4 text-amber-400" />
                      Miei Viaggi
                    </label>
                    <Switch
                      checked={filters.showMyTrips}
                      onCheckedChange={(v) => setFilters(f => ({ ...f, showMyTrips: v }))}
                      data-testid="switch-my-trips"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-blue-400" />
                      Seguiti
                    </label>
                    <Switch
                      checked={filters.showFollowingTrips}
                      onCheckedChange={(v) => setFilters(f => ({ ...f, showFollowingTrips: v }))}
                      data-testid="switch-following"
                    />
                  </div>
                  
                  <hr className="border-border" />
                  
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm">
                      <Leaf className="w-4 h-4 text-green-500" />
                      Eco Mode
                    </label>
                    <Switch
                      checked={filters.ecoMode}
                      onCheckedChange={(v) => setFilters(f => ({ ...f, ecoMode: v }))}
                      data-testid="switch-eco"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-400" />
            Feed
          </h2>
          
          {posts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nessun post ancora. Clicca sulla mappa per crearne uno!</p>
          ) : (
            posts.map((post) => (
              <FeedPostCard
                key={post.id}
                post={post}
                currentUser={user}
                likedPosts={likedPosts}
                pulsingPosts={pulsingPosts}
                onLike={handleLike}
                onShare={(p) => setShareModal({ open: true, type: "post", id: p.id, title: p.content.substring(0, 50) + "..." })}
              />
            ))
          )}
        </div>
      </div>
      
      <CreatePostModal
        open={showNewPost}
        coords={clickedCoords}
        onClose={() => {
          setShowNewPost(false);
          setClickedCoords(null);
        }}
        onPostCreated={() => {
          fetchData();
          setShowNewPost(false);
          setClickedCoords(null);
        }}
      />
      
      <Dialog open={showNewTrip} onOpenChange={setShowNewTrip}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plane className="w-5 h-5 text-amber-500" />
              Nuovo Viaggio
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleCreateTrip} className="space-y-4">
            <div>
              <Label htmlFor="title">Titolo</Label>
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
                rows={2}
                data-testid="input-trip-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startLocation">Partenza</Label>
                <Input id="startLocation" name="startLocation" placeholder="Es: Milano" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="endLocation">Destinazione</Label>
                <Input id="endLocation" name="endLocation" placeholder="Es: Bali" className="mt-1" />
              </div>
            </div>
            <div>
              <Label htmlFor="startDate">Data Inizio</Label>
              <Input id="startDate" name="startDate" type="date" required className="mt-1" data-testid="input-start-date" />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
              <div>
                <Label htmlFor="isPublic" className="text-sm font-medium">Pubblico</Label>
                <p className="text-xs text-muted-foreground">Visibile sulla mappa</p>
              </div>
              <Switch id="isPublic" name="isPublic" data-testid="switch-public" />
            </div>
            <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600" data-testid="button-create-trip">
              <Plane className="w-4 h-4 mr-2" />
              Crea Viaggio
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Dopo la creazione, vai alla sezione Profilo per aggiungere le tappe
            </p>
          </form>
        </DialogContent>
      </Dialog>
      
      {shareModal && (
        <ShareQRModal
          open={shareModal.open}
          onClose={() => setShareModal(null)}
          type={shareModal.type}
          id={shareModal.id}
          title={shareModal.title}
        />
      )}
      
      <style>{`
        .custom-post-marker { background: transparent !important; border: none !important; }
        .post-marker {
          width: 40px; height: 40px; border-radius: 50% 50% 50% 0;
          background: linear-gradient(135deg, #ef4444, #f97316);
          border: 3px solid white; box-shadow: 0 3px 10px rgba(0,0,0,0.3);
          overflow: hidden; transform: rotate(-45deg);
          display: flex; align-items: center; justify-content: center;
        }
        .post-marker img { width: 100%; height: 100%; object-fit: cover; transform: rotate(45deg) scale(1.4); }
        .post-marker-text svg { transform: rotate(45deg); color: white; width: 16px; height: 16px; }
        .custom-stop-marker { background: transparent !important; border: none !important; }
        .custom-popup .leaflet-popup-content-wrapper { background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
        .custom-popup .leaflet-popup-tip { background: white; }
        .leaflet-container { font-family: inherit; }
      `}</style>
    </Layout>
  );
}

function CreatePostModal({
  open,
  coords,
  onClose,
  onPostCreated,
}: {
  open: boolean;
  coords: { lat: number; lng: number } | null;
  onClose: () => void;
  onPostCreated: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [location, setLocationName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showTripSelect, setShowTripSelect] = useState(false);

  const { data: userTrips } = useQuery({
    queryKey: ["/api/my-trips"],
    enabled: !!user && showTripSelect,
  });

  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (response) => {
      if (response.objectPath.match(/\.(mp4|webm|mov)$/i)) {
        setVideoUrl(response.objectPath);
        toast({ title: "Video caricato!" });
      } else {
        setImageUrl(response.objectPath);
        toast({ title: "Foto caricata!" });
      }
    },
    onError: (error) => {
      toast({ title: "Errore upload", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (coords && open) {
      setLatitude(coords.lat);
      setLongitude(coords.lng);
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json`)
        .then((res) => res.json())
        .then((data) => {
          const city = data.address?.city || data.address?.town || data.address?.village || "";
          const country = data.address?.country || "";
          setLocationName(city && country ? `${city}, ${country}` : data.display_name?.split(",").slice(0, 2).join(",") || "");
        })
        .catch(() => {});
    }
  }, [coords, open]);

  useEffect(() => {
    if (!open) {
      setContent("");
      setLocationName("");
      setImageUrl("");
      setVideoUrl("");
      setLinkUrl("");
      setSelectedTripId(null);
      setShowLinkInput(false);
      setShowTripSelect(false);
      setLatitude(null);
      setLongitude(null);
    }
  }, [open]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        setLatitude(lat);
        setLongitude(lng);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || "";
          const country = data.address?.country || "";
          setLocationName(city && country ? `${city}, ${country}` : "");
        } catch {}
        setGettingLocation(false);
      },
      () => {
        toast({ title: "Accesso alla posizione negato", variant: "destructive" });
        setGettingLocation(false);
      }
    );
  };

  const handleSubmit = async () => {
    if (!content.trim() || !user) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content: content.trim(),
          imageUrl: imageUrl || null,
          videoUrl: videoUrl || null,
          linkUrl: linkUrl || null,
          tripId: selectedTripId || null,
          location: location.trim() || null,
          latitude,
          longitude,
        }),
      });
      if (res.ok) {
        toast({ title: "Post pubblicato!" });
        onPostCreated();
      } else {
        throw new Error("Failed");
      }
    } catch {
      toast({ title: "Errore", description: "Impossibile pubblicare", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-[2000] flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="overlay-create-post"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card rounded-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Nuovo Post</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" data-testid="button-close-create">
            <X className="w-5 h-5" />
          </button>
        </div>

        <Textarea
          placeholder="Condividi la tua esperienza..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="mb-4 min-h-[100px]"
          data-testid="input-new-post-content"
        />

        {imageUrl && (
          <div className="relative mb-4 rounded-xl overflow-hidden">
            <img src={imageUrl} alt="Preview" className="w-full h-40 object-cover" />
            <button onClick={() => setImageUrl("")} className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {videoUrl && (
          <div className="relative mb-4 rounded-xl overflow-hidden">
            <video src={videoUrl} controls className="w-full h-40 object-cover" />
            <button onClick={() => setVideoUrl("")} className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {showLinkInput && (
          <div className="flex items-center gap-2 mb-4">
            <LinkIcon className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="https://..."
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="flex-1"
              data-testid="input-link-url"
            />
            <button onClick={() => { setShowLinkInput(false); setLinkUrl(""); }} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {showTripSelect && (userTrips as any)?.length > 0 && (
          <div className="mb-4">
            <label className="text-sm text-muted-foreground mb-2 block">Collega un viaggio:</label>
            <select
              value={selectedTripId || ""}
              onChange={(e) => setSelectedTripId(e.target.value || null)}
              className="w-full p-2 rounded-lg bg-muted border-0 text-sm"
              data-testid="select-trip"
            >
              <option value="">Nessun viaggio</option>
              {(userTrips as any)?.map((trip: any) => (
                <option key={trip.id} value={trip.id}>{trip.title}</option>
              ))}
            </select>
          </div>
        )}

        {isUploading && (
          <div className="mb-4 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Caricamento... {progress}%
          </div>
        )}

        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Posizione"
            value={location}
            onChange={(e) => setLocationName(e.target.value)}
            className="flex-1"
            data-testid="input-new-post-location"
          />
          <Button type="button" variant="outline" size="sm" onClick={handleGetCurrentLocation} disabled={gettingLocation}>
            {gettingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : "Auto"}
          </Button>
        </div>

        {latitude && longitude ? (
          <p className="text-xs text-green-500 mb-4">
            Il tuo post apparirà sulla mappa
          </p>
        ) : (
          <p className="text-xs text-amber-500 mb-4">
            Clicca "Auto" o sulla mappa per aggiungere la posizione
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
              className="hidden"
              disabled={isUploading}
            />
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors">
              <Image className="w-4 h-4 text-primary" />
              <span className="text-xs">Foto</span>
            </div>
          </label>

          <label className="cursor-pointer">
            <input
              type="file"
              accept="video/*"
              onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
              className="hidden"
              disabled={isUploading}
            />
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors">
              <Video className="w-4 h-4 text-red-500" />
              <span className="text-xs">Video</span>
            </div>
          </label>

          <button
            type="button"
            onClick={() => setShowLinkInput(!showLinkInput)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
          >
            <LinkIcon className="w-4 h-4 text-blue-500" />
            <span className="text-xs">Link</span>
          </button>

          <button
            type="button"
            onClick={() => setShowTripSelect(!showTripSelect)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
          >
            <Plane className="w-4 h-4 text-green-500" />
            <span className="text-xs">Viaggio</span>
          </button>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting || isUploading || !latitude || !longitude}
            data-testid="button-submit-new-post"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" />Pubblica</>}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function FeedPostCard({ 
  post, 
  currentUser, 
  likedPosts, 
  pulsingPosts, 
  onLike,
  onShare 
}: { 
  post: PostWithUser; 
  currentUser: User | null;
  likedPosts: Set<string>;
  pulsingPosts: Set<string>;
  onLike: (id: string) => void;
  onShare: (post: PostWithUser) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleToggleComments = () => {
    if (!showComments && comments.length === 0) {
      fetchComments();
    }
    setShowComments(!showComments);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;
    
    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: newComment.trim() })
      });
      if (res.ok) {
        await fetchComments();
        setNewComment("");
        setCommentsCount(c => c + 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (res.ok) {
        setComments(comments.filter(c => c.id !== commentId));
        setCommentsCount(c => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.div
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
        <button 
          onClick={() => onLike(post.id)}
          className={`flex items-center gap-1 text-sm transition-colors ${likedPosts.has(post.id) ? 'text-red-500' : 'hover:text-red-400'}`}
          data-testid={`button-like-${post.id}`}
        >
          <Heart 
            className={`w-4 h-4 ${pulsingPosts.has(post.id) ? 'heart-pulse' : ''} ${likedPosts.has(post.id) ? 'fill-red-500 text-red-500' : ''}`} 
          />
          <span>{post.likes}</span>
        </button>
        <button 
          onClick={handleToggleComments}
          className="flex items-center gap-1 text-sm hover:text-primary transition-colors"
          data-testid={`button-comments-${post.id}`}
        >
          <MessageCircle className="w-4 h-4" />
          <span>{commentsCount}</span>
        </button>
        <button 
          onClick={() => onShare(post)}
          className="ml-auto p-1 hover:text-primary transition-colors"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 pt-4 border-t border-border overflow-hidden"
          >
            {currentUser && (
              <form onSubmit={handleSubmitComment} className="flex gap-2 mb-4">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Scrivi un commento..."
                  className="flex-1 bg-muted rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                  data-testid={`input-comment-${post.id}`}
                />
                <button 
                  type="submit" 
                  disabled={submitting || !newComment.trim()}
                  className="w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center disabled:opacity-50"
                  data-testid={`button-submit-comment-${post.id}`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}

            {loadingComments ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">Nessun commento ancora</p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex items-start gap-2" data-testid={`feed-comment-${comment.id}`}>
                    <img
                      src={comment.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user.username}`}
                      className="w-7 h-7 rounded-full"
                      alt={comment.user.name}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-semibold mr-1">{comment.user.username}</span>
                        {comment.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(comment.createdAt).toLocaleDateString("it-IT")}
                      </p>
                    </div>
                    {currentUser?.id === comment.userId && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-red-500 hover:text-red-600 p-1"
                        data-testid={`button-delete-feed-comment-${comment.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
