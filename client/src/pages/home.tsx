import { useEffect, useState, useCallback, useRef, type ChangeEvent } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { Heart, MessageCircle, Share2, MapPin, MoreHorizontal, Loader2, Plus, Camera, X, Upload, RotateCcw, Send, Trash2, Navigation, Wallet, Route, Calendar, Users, MapPinned, Plane, ChevronRight, LinkIcon, Bot, Globe, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import type { Post, User, Comment, Trip, TripStop, TripExpense, Event } from "@shared/schema";
import { CreatePostForm } from "@/components/CreatePostForm";
import { QRCodeSVG } from "qrcode.react";
import { MomentsBar } from "@/components/moments";
import { SmartProductsWidget } from "@/components/smart-products-widget";
import { TravelAlertsBanner } from "@/components/travel-alerts-banner";
import { usePageTitle } from "@/hooks/use-page-title";
import { MapContainer, TileLayer, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)/.test(url);
}

function getYouTubeEmbedUrl(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

type PostWithUser = Post & { user: User };
type CommentWithUser = Comment & { user: User };
type LiveTrip = Trip & { user: User; stops: (TripStop & { expenses: TripExpense[] })[] };
type EventWithHost = Event & { host: User };
type PublicTrip = Trip & { user: User; stops: TripStop[] };

type FeedItem = 
  | { type: "post"; data: PostWithUser; createdAt: Date }
  | { type: "event"; data: EventWithHost; createdAt: Date }
  | { type: "trip"; data: PublicTrip; createdAt: Date };

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buongiorno";
  if (h < 18) return "Buon pomeriggio";
  return "Buona sera";
}

export default function Home() {
  usePageTitle("Home");
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [events, setEvents] = useState<EventWithHost[]>([]);
  const [publicTrips, setPublicTrips] = useState<PublicTrip[]>([]);
  const [liveTrips, setLiveTrips] = useState<LiveTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [geoLat, setGeoLat] = useState<number | null>(null);
  const [geoLng, setGeoLng] = useState<number | null>(null);
  const [geoCity, setGeoCity] = useState<string | null>(null);

  const fetchPosts = useCallback(() => {
    fetch("/api/posts", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setPosts(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fetchEvents = useCallback(() => {
    fetch("/api/events", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setEvents(data);
      })
      .catch(console.error);
  }, []);

  const fetchPublicTrips = useCallback(() => {
    fetch("/api/trips/public", { credentials: "include" })
      .then((res) => {
        if (!res.ok) return [];
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setPublicTrips(data);
      })
      .catch(console.error);
  }, []);

  const fetchLiveTrips = useCallback(() => {
    fetch("/api/trips/live", { credentials: "include" })
      .then((res) => {
        if (!res.ok) return [];
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setLiveTrips(data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setLocation("/auth");
      return;
    }

    fetchPosts();
    fetchEvents();
    fetchPublicTrips();
    fetchLiveTrips();
  }, [user, authLoading, setLocation, fetchPosts, fetchEvents, fetchPublicTrips, fetchLiveTrips]);

  useEffect(() => {
    const applyGeo = (lat: number, lng: number) => {
      setGeoLat(lat);
      setGeoLng(lng);
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
        .then(r => r.json())
        .then(d => {
          const city = d.address?.city || d.address?.town || d.address?.village || d.address?.county;
          if (city) setGeoCity(city);
        })
        .catch(() => {});
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => applyGeo(pos.coords.latitude, pos.coords.longitude),
        () => {
          if (user?.latitude && user?.longitude) applyGeo(user.latitude, user.longitude);
          if (user?.location) setGeoCity(user.location);
        },
        { timeout: 5000 }
      );
    } else if (user?.latitude && user?.longitude) {
      applyGeo(user.latitude, user.longitude);
      if (user?.location) setGeoCity(user.location);
    }
  }, [user]);

  const feedItems: FeedItem[] = [
    ...posts.map((p) => ({ type: "post" as const, data: p, createdAt: new Date(p.createdAt) })),
    ...events.map((e) => ({ type: "event" as const, data: e, createdAt: new Date(e.createdAt) })),
    ...publicTrips.map((t) => ({ type: "trip" as const, data: t, createdAt: new Date(t.createdAt) })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const handleLike = async (postId: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: "POST", credentials: "include" });
      if (res.ok) {
        const updatedPost = await res.json();
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, likes: updatedPost.likes } : p))
        );
      }
    } catch (error) {
      console.error("Failed to like post:", error);
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const firstName = user?.name?.split(" ")[0] || user?.username || "";
  const displayCity = geoCity || user?.location;

  return (
    <Layout>
      <div className="p-4 space-y-4">
        <NomadContextCard user={user} city={displayCity || null} eventsCount={events.length} greeting={getGreeting()} />

        <MiniMapWidget lat={geoLat} lng={geoLng} />

        <AIContextStrip city={displayCity || null} />

        <TravelAlertsBanner />
        <MomentsBar />

        {liveTrips.length > 0 && <LiveTripsSection trips={liveTrips} />}

        <CreatePostForm onPostCreated={fetchPosts} />

        <div className="space-y-5">
          {feedItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16 space-y-3"
            >
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Globe className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">Il feed è ancora silenzioso</p>
              <p className="text-sm text-muted-foreground/70">Sii il primo a condividere la tua avventura!</p>
            </motion.div>
          ) : (
            feedItems.map((item, index) => {
              const card = (() => {
                if (item.type === "post") {
                  return <PostCard key={`post-${item.data.id}`} post={item.data} onLike={handleLike} currentUser={user} />;
                }
                if (item.type === "event") {
                  return <EventManifestoCard key={`event-${item.data.id}`} event={item.data} />;
                }
                if (item.type === "trip") {
                  return <TripFeedCard key={`trip-${item.data.id}`} trip={item.data} />;
                }
                return null;
              })();
              return (
                <div key={`feed-item-${index}`}>
                  {card}
                  {index === 2 && <SmartProductsWidget key="smart-widget" />}
                  {index === 4 && <SuggestedNomads key="suggested-nomads" />}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}

function NomadContextCard({ user, city, eventsCount, greeting }: { user: User | null; city: string | null; eventsCount: number; greeting: string }) {
  const firstName = user?.name?.split(" ")[0] || user?.username || "";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-5 text-white shadow-lg"
      data-testid="nomad-context-card"
    >
      <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/5 rounded-full" />
      <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-white/5 rounded-full" />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          {user?.avatar ? (
            <img src={user.avatar} className="w-14 h-14 rounded-full border-2 border-white/30 object-cover shadow-md" alt="avatar" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold border-2 border-white/20">
              {(user?.name || user?.username || "?")[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm text-white/75">{greeting},</p>
            <p className="text-xl font-bold leading-tight">{firstName}!</p>
            {city ? (
              <div className="flex items-center gap-1.5 text-xs text-white/70 mt-0.5">
                <MapPin className="w-3 h-3" />
                <span>Sei a <strong className="text-white/90">{city}</strong></span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-white/60 mt-0.5">
                <Globe className="w-3 h-3" />
                <span>{user?.profession || "Digital Nomad"}</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{user?.countriesVisited ?? 0}</p>
            <p className="text-[10px] text-white/70 mt-0.5">paesi</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{user?.citiesVisited ?? 0}</p>
            <p className="text-[10px] text-white/70 mt-0.5">città</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{eventsCount}</p>
            <p className="text-[10px] text-white/70 mt-0.5">eventi</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Link href="/map" className="flex-1">
            <button className="w-full bg-white/15 hover:bg-white/25 transition-colors rounded-xl px-3 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5" data-testid="link-explore-map">
              <MapPin className="w-3.5 h-3.5" />
              Esplora
            </button>
          </Link>
          <Link href="/matchmaking" className="flex-1">
            <button className="w-full bg-white/15 hover:bg-white/25 transition-colors rounded-xl px-3 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5" data-testid="link-matchmaking">
              <Users className="w-3.5 h-3.5" />
              Nomadi
            </button>
          </Link>
          <Link href="/travel-diary" className="flex-1">
            <button className="w-full bg-white/15 hover:bg-white/25 transition-colors rounded-xl px-3 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5" data-testid="link-travel-diary">
              <Plane className="w-3.5 h-3.5" />
              Viaggi
            </button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

function MiniMapWidget({ lat, lng }: { lat: number | null; lng: number | null }) {
  const center: [number, number] = lat !== null && lng !== null ? [lat, lng] : [20, 0];
  const zoom = lat !== null && lng !== null ? 13 : 2;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1 }}
      className="relative rounded-2xl overflow-hidden shadow-sm border border-border/30"
      style={{ height: "190px" }}
      data-testid="mini-map-widget"
    >
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        zoomControl={false}
        dragging={false}
        doubleClickZoom={false}
        attributionControl={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        {lat !== null && lng !== null && (
          <>
            <Circle
              center={[lat, lng]}
              radius={400}
              pathOptions={{ color: "#10b981", fillColor: "#10b981", fillOpacity: 0.15, weight: 2 }}
            />
            <Circle
              center={[lat, lng]}
              radius={80}
              pathOptions={{ color: "#10b981", fillColor: "#10b981", fillOpacity: 0.6, weight: 0 }}
            />
          </>
        )}
      </MapContainer>
      <div className="absolute inset-0 pointer-events-none rounded-2xl ring-1 ring-inset ring-black/5" />
      <Link href="/map">
        <button
          className="absolute bottom-3 right-3 z-[1000] bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm text-xs font-semibold px-3 py-1.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 border border-white/50"
          data-testid="button-open-full-map"
        >
          <MapPin className="w-3 h-3 text-emerald-500" />
          Apri mappa completa
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
        </button>
      </Link>
      {lat === null && (
        <div className="absolute inset-0 z-[999] flex items-center justify-center bg-black/5 backdrop-blur-[1px]">
          <div className="bg-card/95 rounded-xl px-4 py-2.5 shadow text-center">
            <p className="text-xs font-medium text-muted-foreground">Condividi la posizione per vedere cosa c'è intorno a te</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function AIContextStrip({ city }: { city: string | null }) {
  const h = new Date().getHours();
  let tip = "";
  let sub = "";
  if (h < 12) {
    tip = city ? `Stai cercando un buon caffè con wifi a ${city}?` : "Dove lavori stamattina?";
    sub = "NomadBot può trovarlo per te";
  } else if (h < 18) {
    tip = city ? `Pomeriggio produttivo a ${city}? Ecco i coworking vicini.` : "Cerchi un posto dove lavorare?";
    sub = "Chiedi a NomadBot";
  } else {
    tip = city ? `Sera libera a ${city}? Scopri eventi per nomadi.` : "Vuoi trovare eventi vicino a te?";
    sub = "NomadBot ti guida";
  }

  return (
    <Link href="/chat">
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-violet-500/8 to-blue-500/8 border border-violet-400/20 rounded-2xl cursor-pointer hover:border-violet-400/40 hover:from-violet-500/12 hover:to-blue-500/12 transition-all group"
        data-testid="ai-context-strip"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-violet-500/25 transition-shadow">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">{tip}</p>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-violet-400" />
            {sub}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
      </motion.div>
    </Link>
  );
}

function PostCard({ post, onLike, currentUser }: { post: PostWithUser; onLike: (id: string) => void; currentUser: User | null }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);

  const formattedDate = new Date(post.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

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
    <motion.article 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm"
      data-testid={`card-post-${post.id}`}
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/user/${post.user.id}`} data-testid={`link-avatar-${post.id}`}>
            <img 
              src={post.user.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=default"} 
              alt={post.user.name} 
              className="w-10 h-10 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity" 
              data-testid={`avatar-${post.id}`}
            />
          </Link>
          <div>
            <Link 
              href={`/user/${post.user.id}`}
              className="text-sm font-bold leading-none cursor-pointer hover:text-primary transition-colors" 
              data-testid={`link-username-${post.id}`}
            >
              {post.user.name}
            </Link>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <span>{post.user.location}</span>
              <span>•</span>
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>
        <button className="text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {post.imageUrl && (
        <div className="aspect-[4/5] md:aspect-video w-full bg-muted relative">
          <img src={post.imageUrl} alt="Post content" className="w-full h-full object-cover" />
          {post.location && (
            <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-xs font-medium flex items-center gap-1.5">
              <MapPin className="w-3 h-3" />
              {post.location}
            </div>
          )}
        </div>
      )}

      {!post.imageUrl && post.videoUrl && (
        isYouTubeUrl(post.videoUrl)
          ? <div className="w-full aspect-video" data-testid={`video-embed-${post.id}`}>
              <iframe
                src={getYouTubeEmbedUrl(post.videoUrl)!}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="YouTube video"
              />
            </div>
          : <video src={post.videoUrl} controls className="w-full aspect-video object-cover" data-testid={`video-native-${post.id}`} />
      )}

      {!post.imageUrl && !post.videoUrl && post.linkUrl && isYouTubeUrl(post.linkUrl) && (
        <div className="w-full aspect-video" data-testid={`video-embed-${post.id}`}>
          <iframe
            src={getYouTubeEmbedUrl(post.linkUrl)!}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="YouTube video"
          />
        </div>
      )}

      {post.linkUrl && !isYouTubeUrl(post.linkUrl) && (
        <div className="px-4 pt-2">
          <a href={post.linkUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2.5 bg-muted rounded-xl hover:bg-muted/80 transition-colors" data-testid={`link-external-${post.id}`}>
            <LinkIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="text-sm text-blue-500 truncate">{post.linkUrl}</span>
          </a>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center gap-4 mb-3">
          <button 
            onClick={() => onLike(post.id)}
            className="flex items-center gap-1.5 text-foreground hover:text-red-500 transition-colors"
            data-testid={`button-like-${post.id}`}
          >
            <Heart className="w-6 h-6" />
            <span className="text-sm font-bold" data-testid={`text-likes-${post.id}`}>{post.likes}</span>
          </button>
          <button 
            onClick={handleToggleComments}
            className="flex items-center gap-1.5 text-foreground hover:text-primary transition-colors"
            data-testid={`button-comments-${post.id}`}
          >
            <MessageCircle className="w-6 h-6" />
            <span className="text-sm font-bold">{commentsCount}</span>
          </button>
          {currentUser && post.user.id !== currentUser.id && (
            <Link href={`/chat?user=${post.user.id}`}>
              <button 
                className="text-foreground hover:text-violet-500 transition-colors"
                data-testid={`button-dm-${post.id}`}
                title={`Messaggio a ${post.user.name}`}
              >
                <Send className="w-5 h-5" />
              </button>
            </Link>
          )}
          <button className="ml-auto text-foreground hover:text-primary transition-colors">
            <Share2 className="w-6 h-6" />
          </button>
        </div>
        
        <p className="text-sm leading-relaxed whitespace-pre-line" data-testid={`text-content-${post.id}`}>
          <span className="font-bold mr-2">{post.user.username}</span>
          {post.content?.split(/\*\*(.*?)\*\*/g).map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part)}
        </p>

        {post.tripId && (
          <Link href={`/trip/${post.tripId}`}>
            <div className="mt-2 flex items-center gap-2 bg-primary/10 rounded-xl px-3 py-2 cursor-pointer hover:bg-primary/20 transition-colors" data-testid={`trip-badge-${post.id}`}>
              <Plane className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-primary">Viaggio allegato - clicca per vedere</span>
            </div>
          </Link>
        )}

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
      </div>
    </motion.article>
  );
}

function LiveTripsSection({ trips }: { trips: LiveTrip[] }) {
  const calculateTotalExpenses = (trip: LiveTrip) => {
    return trip.stops.reduce((total, stop) => {
      return total + stop.expenses.reduce((sum, exp) => sum + exp.cost, 0);
    }, 0) / 100;
  };

  const getLastStop = (trip: LiveTrip) => {
    const stopsWithCoords = trip.stops.filter(s => s.latitude && s.longitude);
    return stopsWithCoords[stopsWithCoords.length - 1];
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Navigation className="w-5 h-5 text-emerald-500 animate-pulse" />
        <h2 className="font-semibold text-lg">Viaggi Live</h2>
        <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
          {trips.length} in corso
        </span>
      </div>
      
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {trips.map((trip) => {
          const lastStop = getLastStop(trip);
          const totalExpenses = calculateTotalExpenses(trip);
          
          return (
            <Link key={trip.id} href={`/trip/${trip.id}`}>
              <motion.div 
                className="flex-shrink-0 w-64 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 rounded-xl p-4 cursor-pointer hover:border-emerald-400/50 transition-colors"
                whileHover={{ scale: 1.02 }}
                data-testid={`live-trip-card-${trip.id}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative">
                    {trip.user.avatar ? (
                      <img 
                        src={trip.user.avatar} 
                        alt={trip.user.name || trip.user.username} 
                        className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-emerald-500/30 flex items-center justify-center border-2 border-emerald-500">
                        <span className="text-sm font-bold">{(trip.user.name || trip.user.username || 'N')[0]}</span>
                      </div>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{trip.user.name || trip.user.username}</p>
                    <p className="text-xs text-muted-foreground truncate">{trip.title}</p>
                  </div>
                </div>
                
                {lastStop && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 mb-2">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="truncate">{lastStop.city}, {lastStop.country}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Route className="w-3.5 h-3.5" />
                    <span>{trip.stops.length} tappe</span>
                  </div>
                  {totalExpenses > 0 && (
                    <div className="flex items-center gap-1 text-amber-400">
                      <Wallet className="w-3.5 h-3.5" />
                      <span>€{totalExpenses.toFixed(0)}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function EventManifestoCard({ event }: { event: EventWithHost }) {
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString("it-IT", { 
      weekday: "long",
      day: "numeric", 
      month: "long",
      year: "numeric"
    });
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  };

  const shareUrl = `${window.location.origin}/event/${event.id}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden shadow-xl"
      data-testid={`event-manifesto-${event.id}`}
    >
      <div className="relative bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 p-6 text-white">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-white/20 blur-xl" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">Evento</span>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
              <QRCodeSVG value={shareUrl} size={60} bgColor="transparent" fgColor="white" />
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-2">{event.title}</h2>
          
          {event.description && (
            <p className="text-sm opacity-80 mb-4 line-clamp-2">{event.description}</p>
          )}

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 opacity-70" />
              <span className="text-sm">{formatDate(event.startDate)}</span>
              <span className="text-sm opacity-70">ore {formatTime(event.startDate)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 opacity-70" />
              <span className="text-sm">{event.city}, {event.country}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPinned className="w-4 h-4 opacity-70" />
                <span className="text-sm opacity-80">{event.location}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/20">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 opacity-70" />
              <span className="text-sm">{event.attendees} partecipanti</span>
            </div>
            <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
              <span className="font-bold">
                {(event.price ?? 0) > 0 ? `€${event.price}` : "Gratis"}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            {event.host?.avatar ? (
              <img src={event.host.avatar} alt={event.host.name || ""} className="w-8 h-8 rounded-full border-2 border-white/50" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center text-sm font-bold">
                {(event.host?.name || event.host?.username || "?")[0]}
              </div>
            )}
            <span className="text-sm">Organizzato da <strong>{event.host?.name || event.host?.username}</strong></span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TripFeedCard({ trip }: { trip: PublicTrip }) {
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  };

  const stops = trip.stops || [];
  const cities = stops.map(s => s.city).filter(Boolean);
  const countries = Array.from(new Set(stops.map(s => s.country).filter(Boolean)));
  
  const tripDays = stops.length > 1 
    ? Math.ceil((new Date(stops[stops.length - 1].arrivalDate).getTime() - new Date(stops[0].arrivalDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 1;

  const coverImage = stops.find(s => s.imageUrl)?.imageUrl;

  return (
    <Link href={`/trip/${trip.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border/40 rounded-2xl overflow-hidden cursor-pointer hover:border-primary/30 transition-colors"
        data-testid={`trip-feed-card-${trip.id}`}
      >
        {coverImage && (
          <div className="h-40 overflow-hidden">
            <img src={coverImage} alt={trip.title} className="w-full h-full object-cover" />
          </div>
        )}
        
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            {trip.user?.avatar ? (
              <img src={trip.user.avatar} alt={trip.user.name || ""} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-bold">{(trip.user?.name || trip.user?.username || "?")[0]}</span>
              </div>
            )}
            <div>
              <p className="font-medium text-sm">{trip.user?.name || trip.user?.username}</p>
              <p className="text-xs text-muted-foreground">ha condiviso un viaggio</p>
            </div>
          </div>

          <h3 className="font-bold text-lg mb-2">{trip.title}</h3>
          
          {trip.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{trip.description}</p>
          )}

          <div className="flex flex-wrap gap-2 mb-3">
            {cities.slice(0, 4).map((city, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-full text-xs">
                <MapPin className="w-3 h-3" />
                {city}
              </span>
            ))}
            {cities.length > 4 && (
              <span className="px-2 py-1 bg-muted rounded-full text-xs">+{cities.length - 4}</span>
            )}
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Route className="w-4 h-4" />
                {stops.length} tappe
              </span>
              <span>{tripDays} giorni</span>
            </div>
            {countries.length > 0 && (
              <span className="text-xs">{countries.join(", ")}</span>
            )}
          </div>

          {stops.length > 1 && (
            <div className="mt-4 pt-3 border-t border-border/40">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium">{stops[0].city}</span>
                <div className="flex-1 h-px bg-gradient-to-r from-primary/50 to-transparent relative">
                  {stops.slice(1, -1).map((_, i) => (
                    <div key={i} className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary rounded-full" style={{ left: `${((i + 1) / stops.length) * 100}%` }} />
                  ))}
                </div>
                <span className="font-medium">{stops[stops.length - 1].city}</span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

function SuggestedNomads() {
  const { user } = useAuth();

  const { data } = useQuery<{ connections: Array<{ user: { id: string; username: string; name: string; avatar: string | null; bio: string | null }; checkin: { city: string; country: string; status: string }; reason: string; matchScore: number }> }>({
    queryKey: ["/api/ai/suggest-connections"],
    queryFn: () => apiRequest("POST", "/api/ai/suggest-connections").then(r => r.json()),
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  const connections = data?.connections?.slice(0, 3) || [];
  if (connections.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card overflow-hidden" data-testid="suggested-nomads-widget">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-pink-500" />
          <span className="text-sm font-semibold">Nomadi che potresti conoscere</span>
        </div>
      </div>
      <div className="divide-y">
        {connections.map(conn => (
          <Link key={conn.user.id} href={`/user/${conn.user.id}`}>
            <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer" data-testid={`suggested-nomad-${conn.user.id}`}>
              {conn.user.avatar ? (
                <img src={conn.user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm">
                  {conn.user.name?.[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{conn.user.username}</p>
                <p className="text-[10px] text-muted-foreground truncate">{conn.reason}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="w-2.5 h-2.5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">{conn.checkin.city}, {conn.checkin.country}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
