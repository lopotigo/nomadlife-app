import { useEffect, useState, useCallback, useMemo, Fragment, useRef } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { 
  Heart, MapPin, Loader2, Plus, Users, Compass, 
  Filter, X, MessageCircle, Calendar, Send, Image,
  Video, Link as LinkIcon, Share2, Trash2, Camera, CalendarPlus, Plane, FileImage, Hotel, ChevronDown,
  Star, Copy, ExternalLink, Route, Bed, MapPinned, Navigation, Bookmark, Eye,
  Pencil, Wifi, Zap, BookOpen, Coffee
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import type { Post, User, Comment, Event, ChatGroup, Moment, CityGuide, Location } from "@shared/schema";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { searchFlights, searchHotels } from "@/lib/travelpayouts";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import { ShareQRModal, handleShare } from "@/components/share-qr-modal";
import { EventPosterModal } from "@/components/event-poster-modal";
import { WeatherWidget } from "@/components/weather-widget";
import { InFeedAd } from "@/components/ad-banner";
import { MomentsBar } from "@/components/moments";
import { FloatingTip } from "@/components/contextual-tip";
import { FeatureDiscoveryRow } from "@/components/feature-discovery-card";
import { CurvedRouteLine, createStopMarkerIcon } from "@/components/map-route-line";
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { usePageTitle } from "@/hooks/use-page-title";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

type PostWithUser = Post & { user: User };
type CommentWithUser = Comment & { user: User };
type EventWithHost = Event & { host: User };
type MomentWithUser = Moment & { user: User };

type FeedItem = 
  | { type: "post"; data: PostWithUser; createdAt: Date }
  | { type: "event"; data: EventWithHost; createdAt: Date }
  | { type: "trip"; data: Trip; createdAt: Date };

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
  imageUrl?: string | null;
  transportMode?: string;
  distanceKm?: number;
  co2Kg?: number;
  rating?: number | null;
  accommodationName?: string | null;
  accommodationType?: string | null;
}

interface Trip {
  id: string;
  userId: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  isPublic: boolean;
  createdAt?: string;
  user: { id: string; name: string; username: string; avatar?: string };
  stops: TripStop[];
}

function getYouTubeEmbedUrl(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }
  return null;
}

function YouTubeEmbed({ url, className = "" }: { url: string; className?: string }) {
  const embedUrl = getYouTubeEmbedUrl(url);
  if (!embedUrl) return null;
  const videoId = embedUrl.split("/embed/")[1];
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className={`relative w-full ${className}`}>
        <div className="relative w-full rounded-xl overflow-hidden" style={{ paddingBottom: "56.25%" }}>
          <iframe
            src={`${embedUrl}?autoplay=1`}
            className="absolute top-0 left-0 w-full h-full"
            style={{ border: "none" }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="YouTube video"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full cursor-pointer ${className}`} onClick={() => setPlaying(true)} data-testid="youtube-thumbnail">
      <div className="relative w-full rounded-xl overflow-hidden">
        <img src={thumbnailUrl} className="w-full aspect-video object-cover" alt="YouTube video" loading="lazy" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors">
          <div className="w-16 h-11 bg-red-600 rounded-xl flex items-center justify-center shadow-lg hover:bg-red-700 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="9.5,6 9.5,18 19,12" /></svg>
          </div>
        </div>
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/70 text-white px-2 py-1 rounded-md">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z"/></svg>
          <span className="text-[10px] font-semibold">YouTube</span>
        </div>
      </div>
    </div>
  );
}

function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)/.test(url);
}

function openDirections(lat: number, lng: number, label?: string) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const destination = `${lat},${lng}`;
  if (isIOS) {
    window.open(`maps://maps.apple.com/?daddr=${destination}&q=${encodeURIComponent(label || "")}`, "_blank");
  } else {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}`, "_blank");
  }
}

function createPostMarkerIcon(imageUrl: string | null, avatarUrl?: string | null, hasTripId?: boolean, hasVideo?: boolean) {
  if (hasTripId && avatarUrl) {
    return L.divIcon({
      html: `<div style="position:relative;">
        <div style="width:52px;height:52px;border-radius:50%;border:3px solid #10b981;box-shadow:0 4px 14px rgba(16,185,129,0.5);overflow:hidden;background:white;position:relative;">
          <img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;" />
        </div>
        <div style="position:absolute;top:-6px;right:-6px;background:linear-gradient(135deg,#10b981,#059669);color:white;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.2l5.6 4-2 2-2-1c-.4-.2-.9-.2-1.2.1l-.2.2c-.2.3-.2.7 0 1l2.4 2.4c.3.3.7.3 1 0l.2-.2c.3-.3.3-.8.1-1.2l-1-2 2-2 4 5.6c.3.4.8.5 1.2.3l.5-.3c.4-.2.6-.6.5-1.1Z"/></svg>
        </div>
        <div style="position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);background:#10b981;color:white;font-size:8px;font-weight:700;padding:1px 6px;border-radius:8px;white-space:nowrap;border:1.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.2);">QUI ORA</div>
      </div>`,
      className: "custom-post-marker-trip",
      iconSize: [52, 52],
      iconAnchor: [26, 52],
      popupAnchor: [0, -52],
    });
  }
  let html: string;
  if (imageUrl) {
    html = `<div class="post-marker"><img src="${imageUrl}" alt="post" /></div>`;
  } else if (hasVideo) {
    html = `<div class="post-marker" style="background:linear-gradient(135deg,#ef4444,#dc2626);display:flex;align-items:center;justify-content:center;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="9.5,7.5 16.5,12 9.5,16.5"/></svg>
    </div>`;
  } else {
    html = `<div class="post-marker post-marker-text"><svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></div>`;
  }
  return L.divIcon({
    html,
    className: "custom-post-marker",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
}

function createEventMarkerIcon(imageUrl: string | null, color: string = "#a855f7") {
  const gradientBg = `linear-gradient(135deg, ${color}, ${adjustColor(color, -30)})`;
  const html = imageUrl 
    ? `<div class="event-marker" style="background: ${gradientBg} !important;"><img src="${imageUrl}" alt="event" /></div>`
    : `<div class="event-marker event-marker-icon" style="background: ${gradientBg} !important;"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/></svg></div>`;
  return L.divIcon({
    html,
    className: "custom-event-marker",
    iconSize: [44, 44],
    iconAnchor: [22, 44],
    popupAnchor: [0, -44],
  });
}

function createMomentMarkerIcon(mediaUrl: string | null, mediaType: string | null, avatarUrl?: string | null) {
  const avatarSrc = avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=moment";
  const isImage = mediaType === "image" && mediaUrl;
  const imgSrc = isImage ? mediaUrl : avatarSrc;
  const isVideo = mediaType === "video";
  const html = `<div style="position:relative;width:52px;height:52px;">
      <div style="position:absolute;inset:-4px;border-radius:50%;border:2px solid #f97316;animation:momentPulse 2s ease-in-out infinite;"></div>
      <img src="${imgSrc}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:3px solid #f97316;box-shadow:0 2px 12px rgba(249,115,22,0.6);" onerror="this.src='${avatarSrc}'" />
      <div style="position:absolute;bottom:-2px;right:-2px;width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,#f97316,#ef4444);display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);">
        ${isVideo
          ? '<svg viewBox="0 0 24 24" fill="white" width="10" height="10"><polygon points="5,3 19,12 5,21"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="white" width="10" height="10"><circle cx="12" cy="12" r="5"/><path d="M12 2a10 10 0 100 20 10 10 0 000-20z" fill="none" stroke="white" stroke-width="2"/></svg>'}
      </div>
    </div>`;
  return L.divIcon({
    html,
    className: "",
    iconSize: L.point(52, 52),
    iconAnchor: L.point(26, 26),
  });
}

function createCityGuideMarkerIcon(category: string) {
  const emojiMap: Record<string, string> = {
    wifi: "📶",
    coworking: "🏢",
    visa: "🛂",
    food: "🍜",
    lifestyle: "🌴",
  };
  const emoji = emojiMap[category] || "📖";
  return L.divIcon({
    html: `<div style="position:relative;">
      <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#8b5cf6,#6d28d9);border:3px solid white;box-shadow:0 4px 14px rgba(139,92,246,0.4);display:flex;align-items:center;justify-content:center;font-size:20px;">
        ${emoji}
      </div>
    </div>`,
    className: "custom-cityguide-marker",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
}

function createGroupMarkerIcon() {
  return L.divIcon({
    html: `<div style="position:relative;">
      <div style="width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,#06b6d4,#0891b2);border:3px solid white;box-shadow:0 4px 14px rgba(6,182,212,0.4);display:flex;align-items:center;justify-content:center;overflow:hidden;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M12 12.75c1.63 0 3.07.39 4.24.9 1.08.48 1.76 1.56 1.76 2.73V18H6v-1.61c0-1.18.68-2.26 1.76-2.73 1.17-.52 2.61-.91 4.24-.91zM4 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm1.13 1.1c-.37-.06-.74-.1-1.13-.1-.99 0-1.93.21-2.78.58C.48 14.9 0 15.62 0 16.43V18h4.5v-1.61c0-.83.23-1.61.63-2.29zM20 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm4 3.43c0-.81-.48-1.53-1.22-1.85-.85-.37-1.79-.58-2.78-.58-.39 0-.76.04-1.13.1.4.68.63 1.46.63 2.29V18H24v-1.57zM12 6c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z"/></svg>
      </div>
      <div style="position:absolute;bottom:-4px;right:-4px;background:#10b981;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.2);"></div>
    </div>`,
    className: "custom-group-marker",
    iconSize: [44, 44],
    iconAnchor: [22, 44],
    popupAnchor: [0, -44],
  });
}

function adjustColor(hex: string, amount: number): string {
  const clamp = (val: number) => Math.min(255, Math.max(0, val));
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  const r = clamp(((num >> 16) & 0xff) + amount);
  const g = clamp(((num >> 8) & 0xff) + amount);
  const b = clamp((num & 0xff) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// createStopMarkerIcon imported from shared component

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// CurvedRouteLine imported from shared component

function StopMapPopup({ stop, trip, openDirections, onShare }: {
  stop: any;
  trip: any;
  openDirections: (lat: number, lng: number, label: string) => void;
  onShare: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const isOwner = user?.id === trip.userId;
  const [photos, setPhotos] = useState<any[]>([]);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState("");
  const [savedNotes, setSavedNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [stopRating, setStopRating] = useState(0);
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState(0);
  const [deletingPhoto, setDeletingPhoto] = useState<string | null>(null);

  const realNotes = stop.notes && stop.notes !== "Aggiunta dalla mappa" ? stop.notes : "";

  useEffect(() => {
    if (containerRef.current) {
      L.DomEvent.disableClickPropagation(containerRef.current);
      L.DomEvent.disableScrollPropagation(containerRef.current);
    }
  }, []);

  useEffect(() => {
    const notes = stop.notes && stop.notes !== "Aggiunta dalla mappa" ? stop.notes : "";
    setNotesText(notes);
    setSavedNotes(notes);
    setStopRating(stop.rating || 0);
    setEditingNotes(false);
    setSelectedPhotoIdx(0);
    setPhotos([]);
    fetch(`/api/stops/${stop.id}/photos`, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(data => setPhotos(data))
      .catch(() => {});
  }, [stop.id, stop.notes, stop.rating]);

  const { uploadFile: uploadStopPhoto, isUploading: isUploadingPhoto, progress: photoUploadProgress } = useUpload({
    onSuccess: async (response) => {
      try {
        const res = await fetch(`/api/stops/${stop.id}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ url: response.objectPath }),
        });
        if (res.ok) {
          const newPhoto = await res.json();
          setPhotos(prev => [...prev, newPhoto]);
          toast({ title: "Foto aggiunta!" });
        }
      } catch {
        toast({ title: "Errore", variant: "destructive" });
      }
    },
  });

  const handleDeletePhoto = async (photoId: string) => {
    setDeletingPhoto(photoId);
    try {
      const res = await fetch(`/api/stop-photos/${photoId}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        setPhotos(prev => prev.filter(p => p.id !== photoId));
        toast({ title: "Foto eliminata" });
      }
    } catch {}
    setDeletingPhoto(null);
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/trips/stops/${stop.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notes: notesText || undefined, rating: stopRating || undefined }),
      });
      if (res.ok) {
        setEditingNotes(false);
        setSavedNotes(notesText);
        toast({ title: "Salvato!" });
      }
    } catch {
      toast({ title: "Errore", variant: "destructive" });
    }
    setSavingNotes(false);
  };

  const allPhotos = [
    ...(stop.imageUrl ? [{ id: "main", url: stop.imageUrl }] : []),
    ...photos.map((p: any) => ({ id: p.id, url: typeof p === 'string' ? p : p.url })),
  ];

  const hasPhotos = allPhotos.length > 0;
  const currentPhoto = hasPhotos ? allPhotos[selectedPhotoIdx % allPhotos.length] : null;

  return (
    <div ref={containerRef} className="w-[320px]" data-testid={`popup-stop-${stop.id}`}>
      <div className="relative" style={!hasPhotos ? { background: `linear-gradient(135deg, ${trip.color}30, ${trip.color}60)` } : undefined}>
        {hasPhotos && currentPhoto ? (
          <div className="relative group">
            <img src={currentPhoto.url} className="w-full h-44 object-cover" alt={stop.city} />
            {allPhotos.length > 1 && (
              <>
                <button onClick={() => setSelectedPhotoIdx(i => (i - 1 + allPhotos.length) % allPhotos.length)} className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronDown className="w-4 h-4 rotate-90" />
                </button>
                <button onClick={() => setSelectedPhotoIdx(i => (i + 1) % allPhotos.length)} className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronDown className="w-4 h-4 -rotate-90" />
                </button>
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-1">
                  {allPhotos.map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === selectedPhotoIdx % allPhotos.length ? 'bg-white' : 'bg-white/40'}`} />
                  ))}
                </div>
              </>
            )}
            {isOwner && currentPhoto.id !== "main" && (
              <button
                onClick={() => handleDeletePhoto(currentPhoto.id)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                data-testid={`map-delete-photo-${currentPhoto.id}`}
              >
                {deletingPhoto === currentPhoto.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-white font-bold text-base leading-tight">{stop.city}</p>
                  <p className="text-white/70 text-xs">{stop.country}</p>
                </div>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(s => (
                    <button key={s} onClick={isOwner ? () => { setStopRating(s); if (!editingNotes) setEditingNotes(true); } : undefined} className={isOwner ? "cursor-pointer" : "cursor-default"} data-testid={`map-rating-star-${stop.id}-${s}`}>
                      <Star className={`w-4 h-4 drop-shadow-md ${s <= stopRating ? 'fill-amber-400 text-amber-400' : 'text-white/50'}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 pb-3">
            <div className="flex items-center gap-3 mb-3">
              <div style={{ background: trip.color }} className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                {stop.orderIndex + 1}
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg leading-tight">{stop.city}</p>
                <p className="text-sm text-gray-500">{stop.country}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 mb-2">
              {[1,2,3,4,5].map(s => (
                <button key={s} onClick={isOwner ? () => { setStopRating(s); if (!editingNotes) setEditingNotes(true); } : undefined} className={isOwner ? "cursor-pointer" : "cursor-default"} data-testid={`map-rating-star-${stop.id}-${s}`}>
                  <Star className={`w-5 h-5 ${s <= stopRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                </button>
              ))}
              {stopRating > 0 && <span className="text-xs text-gray-500 ml-1">{stopRating}/5</span>}
            </div>
          </div>
        )}
      </div>

      <div className="p-3 space-y-2.5">
        {isOwner && (
          <>
            <label className="flex items-center justify-center w-full h-10 border-2 border-dashed border-blue-400/40 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-500/10 transition-all">
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) await uploadStopPhoto(file);
                  e.target.value = "";
                }}
                className="hidden"
                disabled={isUploadingPhoto}
                data-testid={`map-input-upload-photo-${stop.id}`}
              />
              {isUploadingPhoto ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  <span className="text-xs font-medium text-blue-500">{photoUploadProgress}%</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-semibold text-blue-500">{hasPhotos ? 'Aggiungi altre foto' : 'Carica una foto'}</span>
                </div>
              )}
            </label>

            {editingNotes ? (
              <div className="space-y-2 bg-emerald-50 dark:bg-emerald-950/20 p-2.5 rounded-xl">
                <div className="flex items-center gap-1.5 mb-1">
                  <Pencil className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Le tue note</span>
                </div>
                <Textarea
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  placeholder="Come è stato questo posto? Consigli per altri nomadi..."
                  className="bg-white dark:bg-gray-900 border-emerald-200 dark:border-emerald-800 text-xs min-h-[70px] rounded-lg"
                  rows={3}
                  data-testid={`map-textarea-notes-${stop.id}`}
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditingNotes(false); setNotesText(savedNotes); setStopRating(stop.rating || 0); }} className="flex-1 h-8 text-xs rounded-lg" data-testid={`map-button-cancel-notes-${stop.id}`}>
                    Annulla
                  </Button>
                  <Button size="sm" onClick={handleSaveNotes} disabled={savingNotes} className="flex-1 h-8 text-xs bg-emerald-500 hover:bg-emerald-600 rounded-lg" data-testid={`map-button-save-notes-${stop.id}`}>
                    {savingNotes ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Salva"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {savedNotes ? (
                  <div className="bg-gray-50 dark:bg-gray-800 p-2.5 rounded-xl">
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">"{savedNotes}"</p>
                  </div>
                ) : null}
                <button
                  onClick={() => setEditingNotes(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500 hover:text-emerald-400 py-1"
                  data-testid={`map-button-edit-notes-${stop.id}`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {savedNotes ? "Modifica note" : "Scrivi le tue impressioni"}
                </button>
              </div>
            )}
          </>
        )}

        {!isOwner && realNotes && (
          <div className="bg-gray-50 dark:bg-gray-800 p-2.5 rounded-xl">
            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed italic">"{realNotes}"</p>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {stop.transportMode && (
            <div className="flex items-center gap-1 text-[11px] text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">
              <span>{stop.transportMode === "car" ? "🚗" : stop.transportMode === "train" ? "🚂" : stop.transportMode === "plane" ? "✈️" : stop.transportMode === "bus" ? "🚌" : stop.transportMode === "bike" ? "🚲" : stop.transportMode === "walk" ? "🚶" : "🚗"}</span>
              {stop.distanceKm && <span>{stop.distanceKm} km</span>}
              {stop.co2Kg ? <span className="text-emerald-600">{stop.co2Kg}kg CO₂</span> : null}
            </div>
          )}
          <div className="flex items-center gap-1 text-[11px] text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">
            <Calendar className="w-3 h-3" />
            {new Date(stop.arrivalDate).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
            {stop.departureDate && ` → ${new Date(stop.departureDate).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}`}
          </div>
        </div>

        {stop.accommodationName && (
          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 rounded-xl px-3 py-2">
            <Bed className="w-4 h-4 shrink-0" />
            <div>
              <p className="font-semibold text-xs">{stop.accommodationName}</p>
              {stop.accommodationType && <p className="text-blue-500 dark:text-blue-400 text-[10px] capitalize">{stop.accommodationType}</p>}
            </div>
          </div>
        )}

        {stop.latitude && stop.longitude && (
          <WeatherWidget latitude={stop.latitude} longitude={stop.longitude} />
        )}

        <div className="flex gap-2 pt-1">
          <a
            href={`/trip/${trip.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2 text-xs font-semibold transition-colors"
            data-testid={`link-trip-diary-stop-${stop.id}`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Apri Diario
          </a>
          <button
            onClick={() => openDirections(stop.latitude!, stop.longitude!, `${stop.city}, ${stop.country}`)}
            className="flex items-center justify-center gap-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl py-2 px-3 text-xs font-semibold transition-colors"
            data-testid={`button-directions-stop-${stop.id}`}
          >
            <Navigation className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onShare}
            className="flex items-center justify-center gap-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl py-2 px-3 text-xs font-semibold transition-colors"
            data-testid={`button-share-trip-${trip.id}`}
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <a
          href={`/user/${trip.user?.id || trip.userId}`}
          className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <img
            src={trip.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${trip.user?.username || trip.userId}`}
            className="w-7 h-7 rounded-full object-cover ring-2 ring-primary/20"
            alt={trip.user?.name || "User"}
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[11px] text-primary">{trip.user?.name || "Utente"}</p>
            <p className="text-[10px] text-gray-400 truncate">{trip.title}</p>
          </div>
          {trip.isOwn && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Tu</span>}
        </a>
      </div>
    </div>
  );
}

function StarRating({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star 
          key={i} 
          style={{ width: size, height: size }} 
          className={i <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"} 
        />
      ))}
    </div>
  );
}

const POPUP_AUTO_CLOSE_MS = 10000;

function PopupAutoClose({ duration = POPUP_AUTO_CLOSE_MS }: { duration?: number }) {
  const map = useMap();
  const barRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    let remaining = duration;
    let last = Date.now();

    const close = () => {
      try {
        map.closePopup();
      } catch {}
      const popup = wrapRef.current?.closest('.leaflet-popup');
      const btn = popup?.querySelector<HTMLElement>('.leaflet-popup-close-button, a.leaflet-popup-close-button');
      if (btn) btn.click();
    };

    const iv = setInterval(() => {
      if (pausedRef.current) {
        last = Date.now();
        return;
      }
      const now = Date.now();
      remaining -= (now - last);
      last = now;
      if (remaining <= 0) {
        clearInterval(iv);
        close();
        return;
      }
      if (barRef.current) {
        barRef.current.style.width = `${Math.max(0, (remaining / duration) * 100)}%`;
      }
    }, 80);

    return () => clearInterval(iv);
  }, [map, duration]);

  return (
    <div
      ref={wrapRef}
      className="h-[3px] bg-gray-200/30 overflow-hidden mt-1"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
      onTouchStart={() => { pausedRef.current = true; }}
      onTouchEnd={() => { pausedRef.current = false; }}
      data-testid="popup-progress-bar"
    >
      <div
        ref={barRef}
        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
        style={{ width: '100%' }}
      />
    </div>
  );
}

function PostCarouselPopup({
  posts, likedPosts, pulsingPosts, savedPosts, onLike, onSave, onShare
}: {
  posts: PostWithUser[];
  likedPosts: Set<string>;
  pulsingPosts: Set<string>;
  savedPosts: Set<string>;
  onLike: (id: string) => void;
  onSave: (id: string) => void;
  onShare: (post: PostWithUser) => void;
}) {
  const [index, setIndex] = useState(0);
  const total = posts.length;
  const post = posts[index];
  const containerNodeRef = useRef<HTMLDivElement | null>(null);
  const touchHandlersRef = useRef<{ start: (e: TouchEvent) => void; end: (e: TouchEvent) => void } | null>(null);

  useEffect(() => {
    return () => {
      const node = containerNodeRef.current;
      const h = touchHandlersRef.current;
      if (node && h) {
        node.removeEventListener("touchstart", h.start);
        node.removeEventListener("touchend", h.end);
      }
    };
  }, []);

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    containerNodeRef.current = node;
    L.DomEvent.disableClickPropagation(node);
    L.DomEvent.disableScrollPropagation(node);

    let ts: { x: number; y: number } | null = null;
    const onStart = (e: TouchEvent) => {
      ts = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onEnd = (e: TouchEvent) => {
      if (!ts) return;
      const dx = e.changedTouches[0].clientX - ts.x;
      const dy = e.changedTouches[0].clientY - ts.y;
      ts = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        const dir = dx < 0 ? 1 : -1;
        setIndex(prev => {
          const t = posts.length;
          return (prev + dir + t) % t;
        });
      }
    };
    touchHandlersRef.current = { start: onStart, end: onEnd };
    node.addEventListener("touchstart", onStart, { passive: true });
    node.addEventListener("touchend", onEnd, { passive: true });
  }, [posts.length]);

  if (!post) return null;

  const goPrev = () => setIndex(prev => (prev - 1 + total) % total);
  const goNext = () => setIndex(prev => (prev + 1) % total);

  return (
    <div ref={containerRef} className="popup-animate-in">
      {total > 1 && (
        <div className="flex items-center justify-between pl-3 pr-8 py-1.5 border-b border-gray-200/30 bg-gray-50/80 dark:bg-gray-800/50">
          <button
            type="button"
            onClick={goPrev}
            className="w-7 h-7 rounded-full bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 shadow flex items-center justify-center text-gray-600 dark:text-gray-300 cursor-pointer select-none active:scale-90 transition-transform"
            data-testid="button-carousel-prev"
          >
            <ChevronDown className="w-4 h-4 rotate-90" />
          </button>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400" data-testid="carousel-counter">{index + 1} / {total}</span>
          <button
            type="button"
            onClick={goNext}
            className="w-7 h-7 rounded-full bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 shadow flex items-center justify-center text-gray-600 dark:text-gray-300 cursor-pointer select-none active:scale-90 transition-transform"
            data-testid="button-carousel-next"
          >
            <ChevronDown className="w-4 h-4 -rotate-90" />
          </button>
        </div>
      )}

      <PostMapPopupExpanded
        key={post.id}
        post={post}
        likedPosts={likedPosts}
        pulsingPosts={pulsingPosts}
        savedPosts={savedPosts}
        onLike={onLike}
        onSave={onSave}
        onShare={onShare}
      />

      <PopupAutoClose />
    </div>
  );
}

function extractYouTubeId(url: string): string {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?#]+)/);
  return match?.[1] || "";
}

function PostMapPopupExpanded({ 
  post, likedPosts, pulsingPosts, savedPosts, onLike, onSave, onShare 
}: { 
  post: PostWithUser; 
  likedPosts: Set<string>; 
  pulsingPosts: Set<string>; 
  savedPosts?: Set<string>;
  onLike: (id: string) => void; 
  onSave?: (id: string) => void;
  onShare: (post: PostWithUser) => void;
}) {
  const [tripData, setTripData] = useState<any>(null);
  const [loadingTrip, setLoadingTrip] = useState(false);
  const [showStops, setShowStops] = useState(false);
  const [expandedStop, setExpandedStop] = useState<string | null>(null);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (post.tripId && showStops && !tripData) {
      setLoadingTrip(true);
      fetch(`/api/trips/${post.tripId}`, { credentials: "include" })
        .then(r => r.json())
        .then(data => setTripData(data))
        .catch(() => {})
        .finally(() => setLoadingTrip(false));
    }
  }, [post.tripId, showStops]);

  const tripStops: TripStop[] = tripData?.stops || [];
  const sortedStops = [...tripStops].sort((a, b) => a.orderIndex - b.orderIndex);
  const totalKm = sortedStops.reduce((sum, s) => sum + (s.distanceKm || 0), 0);
  const totalCo2 = sortedStops.reduce((sum, s) => sum + (s.co2Kg || 0), 0);

  const handleCopyTrip = async () => {
    if (!tripData) return;
    try {
      const res = await fetch(`/api/trips/${tripData.id}/copy`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        alert("Viaggio aggiunto al tuo diario!");
      }
    } catch {}
  };

  return (
    <div className="w-[280px]" data-testid={`popup-post-${post.id}`}>
      {post.tripId && (
        <div className="px-3 pt-1">
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[10px] font-semibold">
            <Plane className="w-3 h-3" /> Viaggio
          </span>
        </div>
      )}

      {post.imageUrl && (
        <img src={post.imageUrl} className="w-full h-28 object-cover" alt="" />
      )}

      {!post.imageUrl && post.videoUrl && (
        post.videoUrl.startsWith("http") && isYouTubeUrl(post.videoUrl)
          ? <YouTubeEmbed url={post.videoUrl} className="px-2 pt-2" />
          : <video src={post.videoUrl} controls className="w-full h-28 object-cover" />
      )}

      {!post.imageUrl && !post.videoUrl && post.linkUrl && isYouTubeUrl(post.linkUrl) && (
        <YouTubeEmbed url={post.linkUrl} className="px-2 pt-2" />
      )}
      
      <div className="px-3 py-2">
        <p className="text-sm leading-relaxed">{post.content.length > 120 ? post.content.substring(0, 120) + "..." : post.content}</p>
      </div>

      {post.linkUrl && !isYouTubeUrl(post.linkUrl) && (
        <div className="px-3 pb-1">
          <a href={post.linkUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-500 hover:underline truncate">
            <LinkIcon className="w-3 h-3 flex-shrink-0" />
            {post.linkUrl}
          </a>
        </div>
      )}

      {post.tripId && (
        <div className="px-3 pb-2">
          <button
            onClick={() => setShowStops(!showStops)}
            className="w-full flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 text-emerald-700 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all border border-emerald-200/50"
            data-testid={`button-show-trip-stops-${post.id}`}
          >
            <Route className="w-4 h-4" />
            <span className="flex-1 text-left">{showStops ? "Nascondi itinerario" : "Esplora itinerario"}</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showStops ? "rotate-180" : ""}`} />
          </button>

          {showStops && (
            <div className="mt-2">
              {loadingTrip ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                </div>
              ) : sortedStops.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">Nessuna tappa</p>
              ) : (
                <>
                  {tripData?.title && (
                    <div className="flex items-center justify-between mb-2 px-1">
                      <p className="text-xs font-bold text-gray-700">{tripData.title}</p>
                      <span className="text-[10px] text-gray-400">{sortedStops.length} tappe</span>
                    </div>
                  )}

                  {totalKm > 0 && (
                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-1.5 mb-2 text-[10px]">
                      <span className="flex items-center gap-1 text-gray-600"><MapPinned className="w-3 h-3" /> {totalKm} km</span>
                      <span className="flex items-center gap-1 text-gray-600"><Route className="w-3 h-3" /> {sortedStops.length} tappe</span>
                      {totalCo2 > 0 && <span className="text-emerald-600">{totalCo2} kg CO₂</span>}
                    </div>
                  )}

                  <div className="space-y-0.5 max-h-[220px] overflow-y-auto pr-1">
                    {sortedStops.map((stop, idx) => (
                      <div key={stop.id}>
                        <button
                          onClick={() => setExpandedStop(expandedStop === stop.id ? null : stop.id)}
                          className={`w-full text-left px-2 py-2 rounded-xl text-xs transition-all flex items-center gap-2 ${
                            expandedStop === stop.id ? "bg-emerald-50 ring-1 ring-emerald-200" : "hover:bg-gray-50"
                          }`}
                          data-testid={`button-stop-${stop.id}`}
                        >
                          <span className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold">{stop.city}</span>
                            <span className="text-gray-400 ml-1">{stop.country}</span>
                          </div>
                          {stop.rating && <StarRating rating={stop.rating} size={10} />}
                          {stop.imageUrl && (
                            <img src={stop.imageUrl} className="w-8 h-8 rounded-lg object-cover shrink-0" alt="" />
                          )}
                        </button>
                        
                        {expandedStop === stop.id && (
                          <div className="ml-8 mt-1 mb-2 rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
                            {stop.imageUrl && (
                              <img src={stop.imageUrl} className="w-full h-24 object-cover" alt={stop.city} />
                            )}
                            <div className="p-3 space-y-2 text-xs">
                              <div className="flex items-center justify-between">
                                <p className="font-bold text-sm">{stop.city}, {stop.country}</p>
                                {stop.rating && <StarRating rating={stop.rating} size={12} />}
                              </div>

                              {stop.accommodationName && (
                                <div className="flex items-center gap-2 bg-blue-50 text-blue-700 rounded-lg px-2 py-1.5">
                                  <Bed className="w-3.5 h-3.5" />
                                  <div>
                                    <p className="font-semibold">{stop.accommodationName}</p>
                                    {stop.accommodationType && <p className="text-blue-500 text-[10px] capitalize">{stop.accommodationType}</p>}
                                  </div>
                                </div>
                              )}

                              {stop.arrivalDate && (
                                <p className="text-gray-500 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(stop.arrivalDate).toLocaleDateString("it-IT")}
                                  {stop.departureDate && ` → ${new Date(stop.departureDate).toLocaleDateString("it-IT")}`}
                                </p>
                              )}
                              {stop.notes && <p className="text-gray-600 italic bg-gray-50 p-2 rounded-lg">"{stop.notes}"</p>}
                              {stop.transportMode && (
                                <div className="flex items-center gap-2 text-gray-500">
                                  <span className="capitalize">{stop.transportMode}</span>
                                  {stop.distanceKm && <span>{stop.distanceKm} km</span>}
                                  {stop.co2Kg ? <span className="text-emerald-600">{stop.co2Kg} kg CO₂</span> : null}
                                </div>
                              )}
                              <div className="flex gap-1.5 flex-wrap">
                                <a 
                                  href={`/trip/${post.tripId}`}
                                  className="flex-1 flex items-center justify-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg py-1.5 text-xs font-semibold transition-colors min-w-[50px]"
                                  data-testid={`link-trip-diary-${stop.id}`}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Diario
                                </a>
                                {stop.latitude && stop.longitude && (
                                  <button
                                    onClick={() => openDirections(stop.latitude!, stop.longitude!, `${stop.city}, ${stop.country}`)}
                                    className="flex items-center justify-center bg-green-500 hover:bg-green-600 text-white rounded-lg py-1.5 px-2 text-xs font-semibold transition-colors"
                                    data-testid={`button-directions-expandstop-${stop.id}`}
                                    title="Indicazioni"
                                  >
                                    <Navigation className="w-3 h-3" />
                                  </button>
                                )}
                                <button
                                  onClick={() => searchFlights(idx > 0 ? sortedStops[idx - 1].city : undefined, stop.city, stop.arrivalDate)}
                                  className="flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-1.5 px-2 text-xs font-semibold transition-colors"
                                  data-testid={`button-flights-expandstop-${stop.id}`}
                                  title="Cerca voli"
                                >
                                  <Plane className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => searchHotels(stop.city, stop.arrivalDate, stop.departureDate)}
                                  className="flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-1.5 px-2 text-xs font-semibold transition-colors"
                                  data-testid={`button-hotel-expandstop-${stop.id}`}
                                  title="Cerca hotel"
                                >
                                  <Hotel className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 mt-2">
                    <a 
                      href={`/trip/${post.tripId}`}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2 text-xs font-semibold transition-colors"
                      data-testid={`link-full-trip-${post.id}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Diario completo
                    </a>
                    {currentUser && currentUser.id !== post.userId && (
                      <button 
                        onClick={handleCopyTrip}
                        className="flex items-center justify-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-2 px-3 text-xs font-semibold transition-colors"
                        data-testid={`button-copy-trip-${post.id}`}
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copia
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <button 
            onClick={() => onLike(post.id)}
            className={`flex items-center gap-1 transition-colors ${likedPosts.has(post.id) ? 'text-red-500' : 'hover:text-red-400'}`}
          >
            <Heart className={`w-3.5 h-3.5 ${pulsingPosts.has(post.id) ? 'heart-pulse' : ''} ${likedPosts.has(post.id) ? 'fill-red-500' : ''}`} /> 
            {post.likes}
          </button>
          <Link href={`/post/${post.id}`} className="flex items-center gap-1 hover:text-primary transition-colors">
            <MessageCircle className="w-3.5 h-3.5" /> {post.commentsCount}
          </Link>
        </div>
        <div className="flex items-center gap-1">
          {post.latitude && post.longitude && (
            <button
              onClick={() => openDirections(parseFloat(String(post.latitude)), parseFloat(String(post.longitude)), post.location || post.content.substring(0, 30))}
              className="p-1.5 rounded-full bg-green-500/10 hover:bg-green-500/20 text-green-600 transition-colors"
              title="Indicazioni"
              data-testid={`button-directions-post-${post.id}`}
            >
              <Navigation className="w-3.5 h-3.5" />
            </button>
          )}
          {currentUser && post.user.id !== currentUser.id && (
            <a
              href={`/chat?user=${post.user.id}`}
              className="p-1.5 rounded-full bg-violet-500/10 hover:bg-violet-500/20 text-violet-500 transition-colors"
              title={`Messaggio a ${post.user.name}`}
              data-testid={`button-dm-popup-${post.id}`}
            >
              <Send className="w-3.5 h-3.5" />
            </a>
          )}
          {onSave && (
            <button
              onClick={() => onSave(post.id)}
              className={`p-1.5 rounded-full transition-colors ${savedPosts?.has(post.id) ? 'bg-primary/20 text-primary' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}
              data-testid={`button-save-popup-${post.id}`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${savedPosts?.has(post.id) ? 'fill-primary' : ''}`} />
            </button>
          )}
          <button
            onClick={() => onShare(post)}
            className="p-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
            data-testid={`button-share-post-${post.id}`}
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UnifiedMap() {
  usePageTitle("Mappa", { description: "Esplora la mappa interattiva dei nomadi digitali. Trova coworking, coliving, eventi e altri nomadi in tutto il mondo." });
  const { user, loading: authLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const { t } = useI18n();
  const { theme } = useTheme();
  const tileUrl = theme === "dark"
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [moments, setMoments] = useState<MomentWithUser[]>([]);
  const [chatGroups, setChatGroups] = useState<ChatGroup[]>([]);
  const [joinedGroupIds, setJoinedGroupIds] = useState<Set<string>>(new Set());
  const [myTrips, setMyTrips] = useState<Trip[]>([]);
  const [followingTrips, setFollowingTrips] = useState<Trip[]>([]);
  const [followedUsersTrips, setFollowedUsersTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [showAddSpot, setShowAddSpot] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [spotLocations, setSpotLocations] = useState<(Location & { user: User })[]>([]);
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [shareModal, setShareModal] = useState<{ open: boolean; type: "post" | "profile" | "trip" | "invite" | "event"; id: string; title: string } | null>(null);
  const [posterEvent, setPosterEvent] = useState<any | null>(null);
  const [highlightedTripId, setHighlightedTripId] = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useState<{ country: string; lat: number; lng: number } | null>(null);
  const [countryNomads, setCountryNomads] = useState<any[]>([]);
  const [loadingNomads, setLoadingNomads] = useState(false);
  const [showNomadDrawer, setShowNomadDrawer] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [pulsingPosts, setPulsingPosts] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tripId = params.get("trip");
    setHighlightedTripId(tripId || null);
  }, [location]);
  
  const [filters, setFilters] = useState({
    showPosts: true,
    showEvents: true,
    showMoments: true,
    showGroups: true,
    showMyTrips: true,
    showFollowingTrips: true,
    showCityGuides: true,
    showSpots: true,
    maxBudget: 500,
    dateFrom: "",
    dateTo: "",
    maxDistance: 0,
  });

  const handleShowNomadsByCountry = useCallback(async (country: string, lat: number, lng: number) => {
    setCountryFilter({ country, lat, lng });
    setLoadingNomads(true);
    setShowNomadDrawer(true);
    try {
      const res = await fetch(`/api/users/by-country/${encodeURIComponent(country)}`, { credentials: "include" });
      if (res.ok) {
        const users = await res.json();
        setCountryNomads(users);
      } else {
        toast({ title: "Errore", description: "Impossibile caricare i nomadi", variant: "destructive" });
      }
    } catch (err) {
      console.error("Failed to fetch nomads:", err);
      toast({ title: "Errore", description: "Impossibile caricare i nomadi", variant: "destructive" });
    } finally {
      setLoadingNomads(false);
    }
  }, [toast]);

  const clearCountryFilter = useCallback(() => {
    setCountryFilter(null);
    setCountryNomads([]);
    setShowNomadDrawer(false);
  }, []);

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

  const handleSave = useCallback(async (postId: string) => {
    if (!user) return;
    const isSaved = savedPosts.has(postId);
    try {
      const res = await fetch(`/api/posts/${postId}/save`, {
        method: isSaved ? "DELETE" : "POST",
        credentials: "include",
      });
      if (res.ok) {
        setSavedPosts(prev => {
          const next = new Set(prev);
          if (isSaved) next.delete(postId);
          else next.add(postId);
          return next;
        });
      }
    } catch (error) {
      console.error("Failed to save post:", error);
    }
  }, [user, savedPosts]);

  const fetchData = useCallback(async () => {
    try {
      const publicFetches = [
        fetch("/api/posts", { credentials: "include" }),
        fetch("/api/events", { credentials: "include" }),
        fetch("/api/trips", { credentials: "include" }),
        fetch("/api/moments", { credentials: "include" }),
        fetch("/api/locations", { credentials: "include" }),
      ];
      const [postsRes, eventsRes, publicTripsRes, momentsRes, locationsRes] = await Promise.all(publicFetches);

      let groupsRes: Response | null = null;
      let myTripsRes: Response | null = null;
      let savedIdsRes: Response | null = null;
      let followedUsersTripsRes: Response | null = null;
      if (user) {
        [groupsRes, myTripsRes, savedIdsRes, followedUsersTripsRes] = await Promise.all([
          fetch("/api/chat-groups", { credentials: "include" }),
          fetch("/api/my-trips", { credentials: "include" }),
          fetch("/api/saved-posts/ids", { credentials: "include" }),
          fetch("/api/followed-users-trips", { credentials: "include" }),
        ]);
      }
      
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        setPosts(postsData);
      }
      
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData);
      }

      if (momentsRes.ok) {
        const momentsData = await momentsRes.json();
        setMoments(Array.isArray(momentsData) ? momentsData : []);
      }

      if (locationsRes.ok) {
        const locationsData = await locationsRes.json();
        setSpotLocations(Array.isArray(locationsData) ? locationsData : []);
      }

      if (groupsRes?.ok) {
        const groupsData = await groupsRes.json();
        setChatGroups(Array.isArray(groupsData) ? groupsData : []);
        const memberChecks = await Promise.all(
          (Array.isArray(groupsData) ? groupsData : []).map(async (g: ChatGroup) => {
            try {
              const res = await fetch(`/api/chat-groups/${g.id}/is-member`, { credentials: "include" });
              if (res.ok) {
                const data = await res.json();
                return data.isMember ? g.id : null;
              }
            } catch {}
            return null;
          })
        );
        setJoinedGroupIds(new Set(memberChecks.filter(Boolean) as string[]));
      }
      
      if (myTripsRes?.ok) {
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
      
      if (savedIdsRes?.ok) {
        const ids = await savedIdsRes.json();
        setSavedPosts(new Set(ids));
      }

      if (followedUsersTripsRes?.ok) {
        const followedData = await followedUsersTripsRes.json();
        setFollowedUsersTrips(Array.isArray(followedData) ? followedData : []);
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
    fetchData();
  }, [user, authLoading, fetchData]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (!user) {
      setLocation("/auth");
      return;
    }
    setClickedCoords({ lat, lng });
    setShowNewPost(true);
  }, [user, setLocation]);

  
  const postsWithCoords = useMemo(() => 
    filters.showPosts ? posts.filter(p => p.latitude && p.longitude) : [],
    [posts, filters.showPosts]
  );

  const groupedPosts = useMemo(() => {
    const groups: { lat: number; lng: number; posts: PostWithUser[] }[] = [];
    const threshold = 0.005;
    postsWithCoords.forEach(post => {
      const existing = groups.find(g =>
        Math.abs(g.lat - post.latitude!) < threshold && Math.abs(g.lng - post.longitude!) < threshold
      );
      if (existing) {
        existing.posts.push(post);
      } else {
        groups.push({ lat: post.latitude!, lng: post.longitude!, posts: [post] });
      }
    });
    return groups;
  }, [postsWithCoords]);

  const eventsWithCoords = useMemo(() => {
    if (!filters.showEvents) return [];
    
    return events.filter(e => {
      if (!e.latitude || !e.longitude) return false;
      if (filters.maxBudget < 500 && e.price > filters.maxBudget) return false;
      if (filters.dateFrom && new Date(e.startDate) < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && new Date(e.startDate) > new Date(filters.dateTo)) return false;
      return true;
    });
  }, [events, filters.showEvents, filters.maxBudget, filters.dateFrom, filters.dateTo]);

  const momentsWithCoords = useMemo(() => {
    if (!filters.showMoments) return [];
    return moments.filter(m => m.latitude && m.longitude);
  }, [moments, filters.showMoments]);

  const groupsWithCoords = useMemo(() => {
    if (!filters.showGroups) return [];
    return chatGroups.filter(g => g.latitude && g.longitude);
  }, [chatGroups, filters.showGroups]);

  const { data: cityGuidesData } = useQuery<CityGuide[]>({
    queryKey: ["/api/city-guides"],
    queryFn: async () => {
      const res = await fetch("/api/city-guides", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const cityGuidesWithCoords = useMemo(() => {
    if (!filters.showCityGuides || !cityGuidesData) return [];
    return cityGuidesData.filter(g => g.latitude && g.longitude);
  }, [cityGuidesData, filters.showCityGuides]);

  const handleJoinGroup = async (groupId: string) => {
    try {
      const res = await fetch(`/api/chat-groups/${groupId}/join`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const updated = await res.json();
        setChatGroups(prev => prev.map(g => g.id === groupId ? updated : g));
        setJoinedGroupIds(prev => new Set([...Array.from(prev), groupId]));
      }
    } catch (error) {
      console.error("Failed to join group:", error);
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    try {
      const res = await fetch(`/api/chat-groups/${groupId}/leave`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const updated = await res.json();
        setChatGroups(prev => prev.map(g => g.id === groupId ? updated : g));
        setJoinedGroupIds(prev => {
          const next = new Set(prev);
          next.delete(groupId);
          return next;
        });
      }
    } catch (error) {
      console.error("Failed to leave group:", error);
    }
  };

  const tripsToShow = useMemo(() => {
    const result: (Trip & { isOwn: boolean; color: string })[] = [];
    
    if (filters.showMyTrips) {
      myTrips.forEach(t => {
        if (t.stops && t.stops.length > 0) {
          result.push({ ...t, isOwn: true, color: "#f59e0b" });
        }
      });
    }
    
    if (filters.showFollowingTrips) {
      const followedIds = new Set(followedUsersTrips.map(t => t.id));
      followingTrips.forEach(t => {
        if (t.stops && t.stops.length > 0) {
          result.push({ ...t, isOwn: false, color: followedIds.has(t.id) ? "#10b981" : "#3b82f6" });
        }
      });
      followedUsersTrips.forEach(t => {
        if (t.stops && t.stops.length > 0 && !result.some(r => r.id === t.id)) {
          result.push({ ...t, isOwn: false, color: "#10b981" });
        }
      });
    }
    
    return result;
  }, [myTrips, followingTrips, followedUsersTrips, filters]);

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
        <div className="flex items-center justify-center h-screen bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout fullWidth>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="relative h-[50vh] min-h-[300px] flex-shrink-0 z-10 sticky top-0">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            className="h-full w-full z-0"
            style={{ background: theme === "dark" ? "#1a1a2e" : "#e8e8e8" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url={tileUrl}
            />
            <MapClickHandler onMapClick={handleMapClick} />
            
            <MarkerClusterGroup
              chunkedLoading
              maxClusterRadius={40}
              spiderfyOnMaxZoom={true}
              showCoverageOnHover={false}
              zoomToBoundsOnClick={true}
              disableClusteringAtZoom={18}
              iconCreateFunction={(cluster: any) => {
                const count = cluster.getChildCount();
                return L.divIcon({
                  html: `<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;box-shadow:0 3px 12px rgba(99,102,241,0.5);border:2px solid white;">${count}</div>`,
                  className: "",
                  iconSize: L.point(36, 36),
                  iconAnchor: L.point(18, 18),
                });
              }}
            >
              {groupedPosts.map((group, gi) => {
                const firstPost = group.posts[0];
                const hasMultiple = group.posts.length > 1;
                return (
                  <Marker
                    key={`group-${gi}`}
                    position={[group.lat, group.lng]}
                    icon={hasMultiple
                      ? L.divIcon({
                          html: `<div style="position:relative;width:44px;height:44px;">
                            <img src="${firstPost.imageUrl || firstPost.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firstPost.user?.username}`}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:3px solid #6366f1;box-shadow:0 2px 8px rgba(0,0,0,0.3);" />
                            <div style="position:absolute;top:-6px;right:-6px;width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(99,102,241,0.5);">${group.posts.length}</div>
                          </div>`,
                          className: "",
                          iconSize: L.point(44, 44),
                          iconAnchor: L.point(22, 22),
                        })
                      : createPostMarkerIcon(firstPost.imageUrl, firstPost.user?.avatar, !!firstPost.tripId, !!(firstPost.videoUrl || (firstPost.linkUrl && isYouTubeUrl(firstPost.linkUrl))))
                    }
                  >
                    <Tooltip direction="top" offset={[0, -10]} opacity={0.95} className="nomad-tooltip">
                      <div className="flex items-center gap-2 px-1 py-0.5">
                        <img
                          src={firstPost.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firstPost.user?.username}`}
                          className="w-6 h-6 rounded-full object-cover"
                          alt=""
                        />
                        <div>
                          <p className="text-xs font-semibold">{firstPost.user?.name}</p>
                          <p className="text-[10px] text-gray-500 truncate max-w-[120px]">{firstPost.content?.substring(0, 40)}{(firstPost.content?.length || 0) > 40 ? "..." : ""}</p>
                        </div>
                        {hasMultiple && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">+{group.posts.length - 1}</span>}
                      </div>
                    </Tooltip>
                    <Popup className="custom-popup" maxWidth={340} minWidth={280} autoPanPadding={[20, 20]} autoPan={true}>
                      <PostCarouselPopup
                        posts={group.posts}
                        likedPosts={likedPosts}
                        pulsingPosts={pulsingPosts}
                        savedPosts={savedPosts}
                        onLike={handleLike}
                        onSave={handleSave}
                        onShare={(p) => handleShare("post", p.id, (p.content || "").substring(0, 50) + "...", () => setShareModal({ open: true, type: "post", id: p.id, title: (p.content || "").substring(0, 50) + "..." }))}
                      />
                    </Popup>
                  </Marker>
                );
              })}
            </MarkerClusterGroup>

            {eventsWithCoords.map((event) => (
              <Marker
                key={`event-${event.id}`}
                position={[event.latitude!, event.longitude!]}
                icon={createEventMarkerIcon(event.imageUrl, event.color || "#a855f7")}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={0.95} className="nomad-tooltip">
                  <div className="flex items-center gap-2 px-1 py-0.5">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Calendar className="w-3 h-3 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">{event.title}</p>
                      <p className="text-[10px] text-gray-500">{new Date(event.startDate).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}</p>
                    </div>
                  </div>
                </Tooltip>
                <Popup className="custom-popup" maxWidth={340} minWidth={260} autoPanPadding={[20, 20]} autoPan={true}>
                  <div className="popup-animate-in p-3 w-[260px]">
                    <Link href={`/event/${event.id}`} className="flex items-center gap-2 mb-2 hover:bg-gray-100 rounded-lg p-1 -m-1 transition-colors cursor-pointer">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-sm hover:underline">{event.title}</p>
                        <p className="text-xs text-gray-500">{event.city}, {event.country}</p>
                      </div>
                    </Link>
                    {event.imageUrl && (
                      <img src={event.imageUrl} className="w-full h-28 object-cover rounded-xl mb-2" alt="" />
                    )}
                    <p className="text-xs text-gray-600 mb-2">{event.description?.substring(0, 80)}...</p>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-purple-600">
                        <Calendar className="w-3 h-3" />
                        {new Date(event.startDate).toLocaleDateString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <span className="font-bold text-green-600">
                        {event.price > 0 ? `€${event.price}` : "Gratis"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                      <span className="text-xs text-gray-500">
                        {event.attendees} partecipanti
                      </span>
                      <div className="flex items-center gap-1.5">
                        {event.latitude && event.longitude && (
                          <button
                            onClick={() => openDirections(parseFloat(String(event.latitude)), parseFloat(String(event.longitude)), event.title)}
                            className="p-1.5 rounded-full bg-green-100 hover:bg-green-200 text-green-600 transition-colors"
                            data-testid={`button-directions-event-${event.id}`}
                            title="Indicazioni"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setPosterEvent(event)}
                          className="p-1.5 rounded-full bg-pink-100 hover:bg-pink-200 text-pink-600 transition-colors"
                          data-testid={`button-poster-event-${event.id}`}
                          title="Crea Manifesto"
                        >
                          <FileImage className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleShare("event", event.id, event.title, () => setShareModal({ open: true, type: "event", id: event.id, title: event.title }))}
                          className="p-1.5 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-600 transition-colors"
                          data-testid={`button-share-event-${event.id}`}
                          title="Condividi"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <WeatherWidget latitude={event.latitude!} longitude={event.longitude!} />
                    <PopupAutoClose />
                  </div>
                </Popup>
              </Marker>
            ))}

            {momentsWithCoords.map((moment) => (
              <Marker
                key={`moment-${moment.id}`}
                position={[moment.latitude!, moment.longitude!]}
                icon={createMomentMarkerIcon(moment.mediaUrl, moment.mediaType, (moment as MomentWithUser).user?.avatar)}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={0.95} className="nomad-tooltip">
                  <div className="flex items-center gap-2 px-1 py-0.5">
                    {(moment as MomentWithUser).user?.avatar ? (
                      <img src={(moment as MomentWithUser).user.avatar!} className="w-6 h-6 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                        <Camera className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold">{(moment as MomentWithUser).user?.username || "Nomad"}</p>
                      <p className="text-[10px] text-gray-500">{moment.caption?.substring(0, 30) || (moment.location || "Momento")}</p>
                    </div>
                  </div>
                </Tooltip>
                <Popup className="custom-popup" maxWidth={300} minWidth={240} autoPanPadding={[20, 20]} autoPan={true}>
                  <div className="popup-animate-in w-[240px]">
                    <div className="flex items-center gap-2 p-2">
                      {(moment as MomentWithUser).user?.avatar ? (
                        <img src={(moment as MomentWithUser).user.avatar!} className="w-8 h-8 rounded-full object-cover border border-orange-300" alt="" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-xs font-bold">
                          {(moment as MomentWithUser).user?.name?.[0]?.toUpperCase() || "N"}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-sm">{(moment as MomentWithUser).user?.username}</p>
                        {moment.location && <p className="text-[10px] text-gray-500 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{moment.location}</p>}
                      </div>
                    </div>
                    {moment.mediaType === "video" ? (
                      <video src={moment.mediaUrl} className="w-full h-40 object-cover" autoPlay muted loop playsInline />
                    ) : (
                      <img src={moment.mediaUrl} className="w-full h-40 object-cover" alt="" />
                    )}
                    {moment.caption && <p className="text-xs text-gray-600 p-2">{moment.caption}</p>}
                    <div className="flex items-center justify-between px-2 pb-2 pt-1 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{moment.views}</span>
                      <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{moment.likes}</span>
                    </div>
                    <PopupAutoClose />
                  </div>
                </Popup>
              </Marker>
            ))}

            {groupsWithCoords.map((group) => {
              const isMember = joinedGroupIds.has(group.id);
              return (
                <Marker
                  key={`group-${group.id}`}
                  position={[parseFloat(group.latitude!), parseFloat(group.longitude!)]}
                  icon={createGroupMarkerIcon()}
                >
                  <Tooltip direction="top" offset={[0, -10]} opacity={0.95} className="nomad-tooltip">
                    <div className="flex items-center gap-2 px-1 py-0.5">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center">
                        <Users className="w-3 h-3 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold">{group.name}</p>
                        <p className="text-[10px] text-gray-500">{group.members} membri</p>
                      </div>
                    </div>
                  </Tooltip>
                  <Popup className="custom-popup" maxWidth={300} minWidth={240} autoPanPadding={[20, 20]} autoPan={true}>
                    <div className="popup-animate-in p-3 w-[240px]" data-testid={`popup-group-${group.id}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">{group.name}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{group.city}
                          </p>
                        </div>
                      </div>
                      {group.description && (
                        <p className="text-xs text-gray-600 mb-2">{group.description.substring(0, 100)}{group.description.length > 100 ? "..." : ""}</p>
                      )}
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="flex items-center gap-1 text-cyan-600">
                          <Users className="w-3 h-3" />
                          {group.members} {t("chat.group_members_count")}
                        </span>
                        {group.isOpen && (
                          <span className="text-emerald-600 font-medium">{t("chat.open_group")}</span>
                        )}
                      </div>
                      <div className="flex gap-2 pt-2 border-t border-gray-200">
                        {isMember ? (
                          <>
                            <Link href={`/chat?group=${group.id}`} className="flex-1">
                              <button
                                className="w-full py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-bold rounded-lg transition-colors"
                                data-testid={`button-goto-chat-${group.id}`}
                              >
                                {t("chat.go_to_chat")}
                              </button>
                            </Link>
                            <button
                              onClick={() => handleLeaveGroup(group.id)}
                              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium rounded-lg transition-colors"
                              data-testid={`button-leave-group-${group.id}`}
                            >
                              {t("chat.leave_group")}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleJoinGroup(group.id)}
                            className="w-full py-1.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white text-xs font-bold rounded-lg transition-colors"
                            data-testid={`button-join-group-${group.id}`}
                          >
                            {t("chat.join_group")}
                          </button>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {cityGuidesWithCoords.map((guide) => {
              const categoryColors: Record<string, string> = {
                wifi: "#3b82f6",
                coworking: "#f59e0b",
                visa: "#ef4444",
                food: "#10b981",
                lifestyle: "#8b5cf6",
              };
              const categoryLabels: Record<string, string> = {
                wifi: "WiFi",
                coworking: "Coworking",
                visa: "Visa",
                food: "Food",
                lifestyle: "Lifestyle",
              };
              const badgeColor = categoryColors[guide.category] || "#6b7280";
              const badgeLabel = categoryLabels[guide.category] || guide.category;
              return (
                <Marker
                  key={`cityguide-${guide.id}`}
                  position={[guide.latitude, guide.longitude]}
                  icon={createCityGuideMarkerIcon(guide.category)}
                >
                  <Tooltip direction="top" offset={[0, -10]} opacity={0.95} className="nomad-tooltip">
                    <div className="flex items-center gap-2 px-1 py-0.5">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: badgeColor }}>
                        <Compass className="w-3 h-3 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold">{guide.title}</p>
                        <p className="text-[10px] text-gray-500">{guide.city}, {guide.country}</p>
                      </div>
                    </div>
                  </Tooltip>
                  <Popup className="custom-popup" maxWidth={300} minWidth={260} autoPanPadding={[20, 20]} autoPan={true}>
                    <div className="popup-animate-in p-3 w-[260px]" data-testid={`popup-cityguide-${guide.id}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                          style={{ background: badgeColor }}
                        >
                          {badgeLabel}
                        </span>
                        {guide.rating != null && guide.rating > 0 && (
                          <StarRating rating={Math.round(guide.rating)} size={12} />
                        )}
                      </div>
                      <p className="font-bold text-sm mb-1">{guide.title}</p>
                      <p className="text-xs text-gray-600 mb-2">
                        {guide.content.length > 150 ? guide.content.substring(0, 150) + "..." : guide.content}
                      </p>
                      {guide.tags && guide.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {guide.tags.slice(0, 5).map((tag, i) => (
                            <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{guide.city}, {guide.country}
                        </span>
                        <Link href="/search" className="text-xs font-semibold text-violet-600 hover:underline" data-testid={`link-cityguide-detail-${guide.id}`}>
                          Vedi dettagli
                        </Link>
                      </div>
                      {guide.country && (
                        <button
                          onClick={() => handleShowNomadsByCountry(guide.country!, guide.latitude, guide.longitude)}
                          className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-semibold hover:bg-primary/20 transition-colors"
                          data-testid={`button-nomads-${guide.id}`}
                        >
                          <Users className="w-3.5 h-3.5" />
                          Vedi i Nomadi in {guide.country}
                        </button>
                      )}
                      <PopupAutoClose />
                    </div>
                  </Popup>
                </Marker>
              );
            })}
            
            {filters.showSpots && spotLocations.map((spot) => (
              <Marker
                key={`spot-${spot.id}`}
                position={[spot.latitude, spot.longitude]}
                icon={L.divIcon({
                  html: `<div style="width:36px;height:36px;border-radius:50%;background:${spot.category === 'cafe' ? '#f59e0b' : spot.category === 'coworking' ? '#10b981' : '#6366f1'};color:white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid white;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      ${spot.category === 'cafe' ? '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/>' : spot.category === 'coworking' ? '<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>' : '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M8 7h6"/><path d="M8 11h8"/>'}
                    </svg>
                  </div>`,
                  className: "",
                  iconSize: L.point(36, 36),
                  iconAnchor: L.point(18, 18),
                })}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={0.95} className="nomad-tooltip">
                  <div className="flex items-center gap-2 px-1 py-0.5">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: spot.category === 'cafe' ? '#f59e0b' : spot.category === 'coworking' ? '#10b981' : '#6366f1' }}>
                      {spot.category === 'cafe' ? <Coffee className="w-3 h-3 text-white" /> : spot.category === 'coworking' ? <Wifi className="w-3 h-3 text-white" /> : <BookOpen className="w-3 h-3 text-white" />}
                    </div>
                    <div>
                      <p className="text-xs font-semibold">{spot.name}</p>
                      <p className="text-[10px] text-gray-500">{spot.category === 'cafe' ? 'Café' : spot.category === 'coworking' ? 'Coworking' : 'Biblioteca'}</p>
                    </div>
                  </div>
                </Tooltip>
                <Popup className="custom-popup" maxWidth={300} minWidth={260} autoPanPadding={[20, 20]} autoPan={true}>
                  <div className="popup-animate-in p-3 w-[260px]" data-testid={`popup-spot-${spot.id}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: spot.category === 'cafe' ? '#f59e0b' : spot.category === 'coworking' ? '#10b981' : '#6366f1' }}>
                        {spot.category === 'cafe' ? 'Café' : spot.category === 'coworking' ? 'Coworking' : 'Biblioteca'}
                      </span>
                    </div>
                    <p className="font-bold text-sm mb-1">{spot.name}</p>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-1">
                        <Wifi className="w-3 h-3 text-blue-500" />
                        <span className="text-xs text-gray-600">Wi-Fi:</span>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} className={`w-3 h-3 ${s <= spot.wifiQuality ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      <Zap className={`w-3 h-3 ${spot.powerOutlets ? 'text-green-500' : 'text-gray-400'}`} />
                      <span className="text-xs text-gray-600">
                        Prese: {spot.powerOutlets ? 'Disponibili' : 'Non disponibili'}
                      </span>
                    </div>
                    {spot.notes && (
                      <p className="text-xs text-gray-500 mb-2 italic">"{spot.notes}"</p>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {spot.latitude.toFixed(4)}, {spot.longitude.toFixed(4)}
                      </span>
                      {spot.user && (
                        <span className="text-[10px] text-gray-400">
                          di {spot.user.name || spot.user.username}
                        </span>
                      )}
                    </div>
                    <PopupAutoClose />
                  </div>
                </Popup>
              </Marker>
            ))}

            {tripsToShow.map((trip) => {
              const validStops = trip.stops.filter(s => s.latitude && s.longitude).sort((a, b) => a.orderIndex - b.orderIndex);
              const positions: [number, number][] = validStops.map(s => [s.latitude!, s.longitude!]);
              
              return (
                <Fragment key={`trip-${trip.id}`}>
                  {positions.length >= 2 && (
                    <CurvedRouteLine 
                      positions={positions} 
                      color={trip.color}
                      dashed={false}
                    />
                  )}
                  
                  {validStops.map((stop, idx) => (
                    <Marker
                      key={`stop-${stop.id}`}
                      position={[stop.latitude!, stop.longitude!]}
                      icon={createStopMarkerIcon(stop.orderIndex, trip.color, trip.user?.avatar, stop.imageUrl)}
                    >
                      <Popup className="custom-popup" maxWidth={340} minWidth={300} autoPanPadding={[20, 20]} autoPan={true}>
                        <StopMapPopup
                          stop={stop}
                          trip={trip}
                          openDirections={openDirections}
                          onShare={() => handleShare("trip", trip.id, trip.title, () => setShareModal({ open: true, type: "trip", id: trip.id, title: trip.title }))}
                        />
                      </Popup>
                    </Marker>
                  ))}
                </Fragment>
              );
            })}
            {countryFilter && countryNomads.length > 0 && (
              <MarkerClusterGroup
                chunkedLoading
                maxClusterRadius={50}
                spiderfyOnMaxZoom={true}
                showCoverageOnHover={false}
                zoomToBoundsOnClick={true}
                disableClusteringAtZoom={16}
                iconCreateFunction={(cluster: any) => {
                  const count = cluster.getChildCount();
                  const size = count < 10 ? 36 : count < 50 ? 44 : 52;
                  const color = count < 10 ? "#10b981" : count < 50 ? "#f59e0b" : "#ef4444";
                  return L.divIcon({
                    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${count < 10 ? 13 : 14}px;box-shadow:0 3px 12px rgba(0,0,0,0.3);border:3px solid white;">${count}</div>`,
                    className: "",
                    iconSize: L.point(size, size),
                    iconAnchor: L.point(size / 2, size / 2),
                  });
                }}
              >
                {countryNomads.filter((n: any) => n.latitude && n.longitude).map((nomad) => {
                  const lat = nomad.latitude;
                  const lng = nomad.longitude;
                  return (
                    <Marker
                      key={`nomad-${nomad.id}`}
                      position={[lat, lng]}
                      icon={L.divIcon({
                        html: `<div style="width:40px;height:40px;border-radius:50%;border:3px solid #10b981;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.3);background:white;">
                          <img src="${nomad.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${nomad.username}`}" style="width:100%;height:100%;object-fit:cover;" />
                        </div>`,
                        className: "",
                        iconSize: L.point(40, 40),
                        iconAnchor: L.point(20, 20),
                      })}
                    >
                      <Tooltip direction="top" offset={[0, -10]} opacity={0.95} className="nomad-tooltip">
                        <div className="px-1 py-0.5">
                          <p className="text-xs font-semibold">{nomad.name || nomad.username}</p>
                          <p className="text-[10px] text-gray-500">{nomad.location || "Nomade"}</p>
                        </div>
                      </Tooltip>
                      <Popup className="custom-popup" maxWidth={260} minWidth={220} autoPanPadding={[20, 20]} autoPan={true}>
                        <div className="popup-animate-in p-3 w-[220px]">
                          <div className="flex items-center gap-3 mb-2">
                            <img src={nomad.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${nomad.username}`} className="w-10 h-10 rounded-xl object-cover" />
                            <div>
                              <p className="font-bold text-sm">{nomad.name || nomad.username}</p>
                              <p className="text-[10px] text-gray-500">@{nomad.username}</p>
                            </div>
                          </div>
                          {nomad.profession && <p className="text-xs text-gray-600 mb-1">{nomad.profession}</p>}
                          {nomad.location && <p className="text-[10px] text-gray-400 flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{nomad.location}</p>}
                          <Link href={`/user/${nomad.id}`} className="block mt-2 text-xs font-semibold text-primary hover:underline text-center">
                            Vedi profilo
                          </Link>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MarkerClusterGroup>
            )}
            {countryFilter && <ZoomToCountry lat={countryFilter.lat} lng={countryFilter.lng} />}
          </MapContainer>
          
          {countryFilter && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-primary text-primary-foreground rounded-full px-4 py-2 shadow-lg flex items-center gap-2 text-sm font-semibold" data-testid="banner-country-filter">
              <Users className="w-4 h-4" />
              {loadingNomads ? "Caricamento..." : `${countryNomads.length} nomadi in ${countryFilter.country}`}
              <button onClick={clearCountryFilter} className="ml-1 p-0.5 rounded-full hover:bg-white/20 transition-colors" data-testid="button-clear-country-filter">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <AnimatePresence>
            {showNomadDrawer && countryFilter && (
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="absolute bottom-0 left-0 right-0 z-[1000] bg-card rounded-t-2xl shadow-2xl border-t border-border/50 max-h-[45vh] flex flex-col"
                data-testid="drawer-nomads"
              >
                <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border/30">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-sm">Nomadi in {countryFilter.country}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {countryNomads.length}
                    </span>
                  </div>
                  <button onClick={() => setShowNomadDrawer(false)} className="p-1 rounded-full hover:bg-muted transition-colors" data-testid="button-close-drawer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="overflow-y-auto flex-1 p-3 space-y-2">
                  {loadingNomads ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : countryNomads.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Nessun nomade trovato in {countryFilter.country}
                    </div>
                  ) : (
                    countryNomads.map((nomad) => (
                      <Link key={nomad.id} href={`/user/${nomad.id}`} className="block" data-testid={`nomad-card-${nomad.id}`}>
                        <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/60 transition-colors">
                          <img
                            src={nomad.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${nomad.username}`}
                            className="w-10 h-10 rounded-xl object-cover border border-border/50"
                            alt={nomad.username}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{nomad.name || nomad.username}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {nomad.profession || nomad.location || `@${nomad.username}`}
                            </p>
                          </div>
                          {nomad.location && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 shrink-0">
                              <MapPin className="w-2.5 h-2.5" />{nomad.location.split(",")[0]}
                            </span>
                          )}
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="absolute top-4 left-4 z-[900] bg-card/90 backdrop-blur-md rounded-2xl px-4 py-2 shadow-lg border border-border/50">
            <h1 className="text-lg font-display font-bold flex items-center gap-2">
              <Compass className="w-5 h-5 text-primary" />
              NomadLife
            </h1>
          </div>
          
          <div className="absolute top-4 right-4 z-[1000] flex items-center gap-2">
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
          
          <div className="absolute bottom-4 right-4 z-[1000]">
            <div className="relative">
              <AnimatePresence>
                {fabOpen && (
                  <>
                    <motion.button
                      initial={{ opacity: 0, y: 0, scale: 0.3 }}
                      animate={{ opacity: 1, y: -180, scale: 1 }}
                      exit={{ opacity: 0, y: 0, scale: 0.3 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.05 }}
                      className="absolute bottom-0 right-0 flex items-center gap-2 cursor-pointer"
                      onClick={() => { setFabOpen(false); setShowAddSpot(true); }}
                      data-testid="menu-add-spot"
                    >
                      <span className="bg-card text-card-foreground text-xs font-medium px-2 py-1 rounded-lg shadow-md whitespace-nowrap">Aggiungi Spot</span>
                      <div className="w-11 h-11 rounded-full bg-emerald-500 text-white shadow-lg flex items-center justify-center">
                        <MapPin className="w-5 h-5" />
                      </div>
                    </motion.button>
                    <motion.button
                      initial={{ opacity: 0, y: 0, scale: 0.3 }}
                      animate={{ opacity: 1, y: -120, scale: 1 }}
                      exit={{ opacity: 0, y: 0, scale: 0.3 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.02 }}
                      className="absolute bottom-0 right-0 flex items-center gap-2 cursor-pointer"
                      onClick={() => { setFabOpen(false); setShowNewEvent(true); }}
                      data-testid="menu-new-event"
                    >
                      <span className="bg-card text-card-foreground text-xs font-medium px-2 py-1 rounded-lg shadow-md whitespace-nowrap">Crea Evento</span>
                      <div className="w-11 h-11 rounded-full bg-purple-500 text-white shadow-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5" />
                      </div>
                    </motion.button>
                    <motion.button
                      initial={{ opacity: 0, y: 0, scale: 0.3 }}
                      animate={{ opacity: 1, y: -60, scale: 1 }}
                      exit={{ opacity: 0, y: 0, scale: 0.3 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="absolute bottom-0 right-0 flex items-center gap-2 cursor-pointer"
                      onClick={() => { setFabOpen(false); setClickedCoords(null); setShowNewPost(true); }}
                      data-testid="menu-new-post"
                    >
                      <span className="bg-card text-card-foreground text-xs font-medium px-2 py-1 rounded-lg shadow-md whitespace-nowrap">Nuovo Post</span>
                      <div className="w-11 h-11 rounded-full bg-blue-500 text-white shadow-lg flex items-center justify-center">
                        <Pencil className="w-5 h-5" />
                      </div>
                    </motion.button>
                  </>
                )}
              </AnimatePresence>
              <motion.button
                animate={{ rotate: fabOpen ? 45 : 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform relative z-10"
                onClick={() => setFabOpen(!fabOpen)}
                data-testid="button-create-menu"
              >
                <Plus className="w-6 h-6" />
              </motion.button>
            </div>
          </div>
          {fabOpen && (
            <div 
              className="absolute inset-0 z-[999]" 
              onClick={() => setFabOpen(false)}
            />
          )}
          
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
                      <Calendar className="w-4 h-4 text-purple-400" />
                      Eventi
                    </label>
                    <Switch
                      checked={filters.showEvents}
                      onCheckedChange={(v) => setFilters(f => ({ ...f, showEvents: v }))}
                      data-testid="switch-events"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm">
                      <Camera className="w-4 h-4 text-orange-400" />
                      Momenti
                    </label>
                    <Switch
                      checked={filters.showMoments}
                      onCheckedChange={(v) => setFilters(f => ({ ...f, showMoments: v }))}
                      data-testid="switch-moments"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm">
                      <MessageCircle className="w-4 h-4 text-cyan-400" />
                      {t("map.filter_groups")}
                    </label>
                    <Switch
                      checked={filters.showGroups}
                      onCheckedChange={(v) => setFilters(f => ({ ...f, showGroups: v }))}
                      data-testid="switch-groups"
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
                  
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm">
                      <Compass className="w-4 h-4 text-violet-400" />
                      Guide Città
                    </label>
                    <Switch
                      checked={filters.showCityGuides}
                      onCheckedChange={(v) => setFilters(f => ({ ...f, showCityGuides: v }))}
                      data-testid="switch-city-guides"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      Spot
                    </label>
                    <Switch
                      checked={filters.showSpots}
                      onCheckedChange={(v) => setFilters(f => ({ ...f, showSpots: v }))}
                      data-testid="switch-spots"
                    />
                  </div>
                  
                  <div className="border-t border-border/50 pt-3 mt-3 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Filtri avanzati</p>
                    
                    <div>
                      <label className="text-xs text-muted-foreground flex items-center justify-between mb-1">
                        <span>Budget max eventi</span>
                        <span className="font-medium text-foreground">
                          {filters.maxBudget >= 500 ? "Tutti" : `€${filters.maxBudget}`}
                        </span>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="500"
                        step="10"
                        value={filters.maxBudget}
                        onChange={(e) => setFilters(f => ({ ...f, maxBudget: parseInt(e.target.value) }))}
                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                        data-testid="filter-budget"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Da</label>
                        <input
                          type="date"
                          value={filters.dateFrom}
                          onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                          className="w-full px-2 py-1.5 text-xs bg-muted border border-border rounded-lg"
                          data-testid="filter-date-from"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">A</label>
                        <input
                          type="date"
                          value={filters.dateTo}
                          onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                          className="w-full px-2 py-1.5 text-xs bg-muted border border-border rounded-lg"
                          data-testid="filter-date-to"
                        />
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setFilters(f => ({ ...f, maxBudget: 500, dateFrom: "", dateTo: "", maxDistance: 0 }))}
                      className="text-xs text-primary hover:underline"
                      data-testid="button-reset-filters"
                    >
                      Resetta filtri
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
          <div className="border-b border-gray-200/50 dark:border-gray-700/50 -mx-4 mb-2">
            <MomentsBar onMomentCreated={fetchData} />
          </div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-400" />
            Feed
          </h2>
          
          {(() => {
            const feedItems: FeedItem[] = [
              ...posts.map((p) => ({ type: "post" as const, data: p, createdAt: new Date(p.createdAt) })),
              ...events.map((e) => ({ type: "event" as const, data: e as EventWithHost, createdAt: new Date(e.createdAt) })),
              ...followingTrips.map((t) => ({ type: "trip" as const, data: t, createdAt: new Date(t.createdAt || Date.now()) })),
            ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

            if (feedItems.length === 0) {
              return <p className="text-muted-foreground text-center py-8">Nessun contenuto ancora. Clicca sulla mappa per crearne uno!</p>;
            }

            return feedItems.map((item, idx) => {
              const card = (() => {
                if (item.type === "post") {
                  return (
                    <FeedPostCard
                      key={`post-${item.data.id}`}
                      post={item.data}
                      currentUser={user}
                      likedPosts={likedPosts}
                      pulsingPosts={pulsingPosts}
                      savedPosts={savedPosts}
                      onLike={handleLike}
                      onSave={handleSave}
                      onShare={(p) => handleShare("post", p.id, (p.content || "").substring(0, 50) + "...", () => setShareModal({ open: true, type: "post", id: p.id, title: (p.content || "").substring(0, 50) + "..." }))}
                    />
                  );
                }
                if (item.type === "event") {
                  return <FeedEventCard key={`event-${item.data.id}`} event={item.data} currentUser={user} />;
                }
                if (item.type === "trip") {
                  return <FeedTripCard key={`trip-${item.data.id}`} trip={item.data} />;
                }
                return null;
              })();

              return (
                <div key={`feed-${idx}`}>
                  {card}
                  {(idx + 1) % 4 === 0 && <InFeedAd />}
                </div>
              );
            });
          })()}
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
      
      <CreateEventModal
        open={showNewEvent}
        onClose={() => setShowNewEvent(false)}
        onEventCreated={async () => {
          setShowNewEvent(false);
          toast({ title: "Evento creato!", description: "Il tuo evento è stato pubblicato" });
          // Reload events to show the new one
          try {
            const eventsRes = await fetch("/api/events", { credentials: "include" });
            if (eventsRes.ok) {
              const eventsData = await eventsRes.json();
              setEvents(eventsData);
            }
          } catch (err) {
            console.error("Error reloading events:", err);
          }
        }}
      />
      
      <AddSpotModal
        open={showAddSpot}
        onClose={() => setShowAddSpot(false)}
        onSpotCreated={async () => {
          setShowAddSpot(false);
          toast({ title: "Spot aggiunto!", description: "Il tuo spot è ora visibile sulla mappa" });
          try {
            const locRes = await fetch("/api/locations", { credentials: "include" });
            if (locRes.ok) {
              const locData = await locRes.json();
              setSpotLocations(Array.isArray(locData) ? locData : []);
            }
          } catch (err) {
            console.error("Error reloading locations:", err);
          }
        }}
      />

      {shareModal && (
        <ShareQRModal
          open={shareModal.open}
          onClose={() => setShareModal(null)}
          type={shareModal.type}
          id={shareModal.id}
          title={shareModal.title}
        />
      )}

      {posterEvent && (
        <EventPosterModal
          open={true}
          onClose={() => setPosterEvent(null)}
          event={posterEvent}
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
        .custom-cityguide-marker { background: transparent !important; border: none !important; }
        .custom-event-marker { background: transparent !important; border: none !important; }
        .event-marker {
          width: 44px; height: 44px; border-radius: 50% 50% 50% 0;
          border: 3px solid white; box-shadow: 0 3px 12px rgba(0,0,0,0.3);
          overflow: hidden; transform: rotate(-45deg);
          display: flex; align-items: center; justify-content: center;
        }
        .event-marker img { width: 100%; height: 100%; object-fit: cover; transform: rotate(45deg) scale(1.4); }
        .event-marker-icon svg { transform: rotate(45deg); fill: white; width: 20px; height: 20px; }
        .custom-stop-marker { background: transparent !important; border: none !important; }
        .route-anim-dots { animation: dashMove 1.5s linear infinite; }
        @keyframes dashMove { to { stroke-dashoffset: -18; } }
        .leaflet-popup-pane { z-index: 1100 !important; }
        .marker-cluster-animated { transition: none !important; }
        .leaflet-cluster-anim .leaflet-marker-icon, .leaflet-cluster-anim .leaflet-marker-shadow { transition: transform 0.25s ease-out, opacity 0.25s ease-out; }
        .marker-cluster { background: transparent !important; }
        .custom-popup .leaflet-popup-content-wrapper { 
          background: white; border-radius: 16px; box-shadow: 0 12px 40px rgba(0,0,0,0.3); 
          padding: 0 !important; overflow: hidden;
        }
        .custom-popup .leaflet-popup-content { 
          margin: 0 !important; width: auto !important;
          max-height: 450px; overflow-y: auto;
          scrollbar-width: thin; scrollbar-color: rgba(0,0,0,0.15) transparent;
        }
        .custom-popup .leaflet-popup-content::-webkit-scrollbar { width: 4px; }
        .custom-popup .leaflet-popup-content::-webkit-scrollbar-track { background: transparent; }
        .custom-popup .leaflet-popup-content::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 4px; }
        .custom-popup .leaflet-popup-tip { background: white; }
        .custom-popup .leaflet-popup-close-button { 
          color: #666 !important; font-size: 20px !important; 
          top: 6px !important; right: 8px !important;
          width: 24px !important; height: 24px !important;
          z-index: 10;
        }
        .leaflet-container { font-family: inherit; }
      `}</style>

      <div className="px-4 pb-4">
        <FeatureDiscoveryRow cards={[
          { icon: Plane, title: "Plan your next trip", description: "Create itineraries with stops and CO2 tracking", href: "/travel-diary" },
          { icon: BookOpen, title: "Read nomad guides", description: "Travel tips, visa guides, and city reviews", href: "/blog" },
        ]} />
      </div>

      <FloatingTip
        tipKey="hasSeenMapTip"
        title="Tap on the map!"
        description="Tap anywhere on the map to create a post or event at that location. Explore markers to discover what's around you!"
        delay={3000}
      />

      <FloatingTip
        tipKey="hasSeenFeedTip"
        title="Scroll to see the feed"
        description="Below the map you'll find posts, events, and trips from the community. Tap any content to see details!"
        delay={8000}
      />
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
      let lat = latitude;
      let lng = longitude;

      if ((!lat || !lng) && location.trim()) {
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location.trim())}&format=json&limit=1`);
          const geoData = await geoRes.json();
          if (geoData && geoData[0]) {
            lat = parseFloat(geoData[0].lat);
            lng = parseFloat(geoData[0].lon);
            setLatitude(lat);
            setLongitude(lng);
          }
        } catch {}
      }

      if (!lat || !lng) {
        toast({ title: "Posizione richiesta", description: "Scrivi una città o usa il pulsante Auto", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

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
          latitude: lat,
          longitude: lng,
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
            placeholder="Cerca città (es. Roma, Milano...)"
            value={location}
            onChange={(e) => setLocationName(e.target.value)}
            onBlur={async () => {
              if (location.trim() && !latitude) {
                try {
                  const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location.trim())}&format=json&limit=1`);
                  const data = await res.json();
                  if (data && data[0]) {
                    setLatitude(parseFloat(data[0].lat));
                    setLongitude(parseFloat(data[0].lon));
                  }
                } catch {}
              }
            }}
            onKeyDown={async (e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (location.trim()) {
                  try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location.trim())}&format=json&limit=1`);
                    const data = await res.json();
                    if (data && data[0]) {
                      setLatitude(parseFloat(data[0].lat));
                      setLongitude(parseFloat(data[0].lon));
                      setLocationName(data[0].display_name.split(",").slice(0, 2).join(",").trim());
                    }
                  } catch {}
                }
              }
            }}
            className="flex-1"
            data-testid="input-new-post-location"
          />
          <Button type="button" variant="outline" size="sm" onClick={handleGetCurrentLocation} disabled={gettingLocation}>
            {gettingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : "Auto"}
          </Button>
        </div>

        {latitude && longitude ? (
          <p className="text-xs text-green-500 mb-4 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Posizione trovata - il post apparirà sulla mappa
          </p>
        ) : (
          <p className="text-xs text-amber-500 mb-4">
            Scrivi una città e premi Invio, oppure clicca "Auto" per la tua posizione
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
            disabled={!content.trim() || isSubmitting || isUploading || (!latitude && !longitude && !location.trim())}
            data-testid="button-submit-new-post"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" />Pubblica</>}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AddSpotModal({
  open,
  onClose,
  onSpotCreated,
}: {
  open: boolean;
  onClose: () => void;
  onSpotCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("cafe");
  const [wifiQuality, setWifiQuality] = useState(3);
  const [powerOutlets, setPowerOutlets] = useState(false);
  const [notes, setNotes] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && !coords) {
      setGpsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsLoading(false);
        },
        () => {
          toast({ title: "GPS non disponibile", description: "Attiva la geolocalizzazione", variant: "destructive" });
          setGpsLoading(false);
        },
        { timeout: 15000, enableHighAccuracy: true }
      );
    }
  }, [open]);

  const resetForm = () => {
    setName("");
    setCategory("cafe");
    setWifiQuality(3);
    setPowerOutlets(false);
    setNotes("");
    setCoords(null);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: "Errore", description: "Inserisci il nome del posto", variant: "destructive" });
      return;
    }
    if (!coords) {
      toast({ title: "Errore", description: "Posizione GPS non disponibile", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          category,
          wifiQuality,
          powerOutlets,
          notes: notes.trim() || null,
          latitude: coords.lat,
          longitude: coords.lng,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Errore nel salvataggio");
      }
      resetForm();
      onSpotCreated();
    } catch (err: any) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose(); } }}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-add-spot">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-500" />
            Aggiungi Spot
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="spot-name">Nome del posto</Label>
            <Input
              id="spot-name"
              placeholder="Es. Café Roma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-spot-name"
            />
          </div>

          <div>
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger data-testid="select-spot-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cafe">
                  <span className="flex items-center gap-2"><Coffee className="w-4 h-4" /> Café</span>
                </SelectItem>
                <SelectItem value="coworking">
                  <span className="flex items-center gap-2"><Wifi className="w-4 h-4" /> Coworking</span>
                </SelectItem>
                <SelectItem value="biblioteca">
                  <span className="flex items-center gap-2"><BookOpen className="w-4 h-4" /> Biblioteca</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Qualità Wi-Fi</Label>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setWifiQuality(s)}
                  className="p-1 transition-transform hover:scale-110"
                  data-testid={`star-wifi-${s}`}
                >
                  <Star className={`w-6 h-6 ${s <= wifiQuality ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              Prese elettriche
            </Label>
            <Switch
              checked={powerOutlets}
              onCheckedChange={setPowerOutlets}
              data-testid="switch-power-outlets"
            />
          </div>

          <div>
            <Label htmlFor="spot-notes">Note (opzionale)</Label>
            <Textarea
              id="spot-notes"
              placeholder="Wi-Fi veloce, silenzioso, buon caffè..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              data-testid="input-spot-notes"
            />
          </div>

          <div className="bg-muted/50 rounded-lg p-3">
            <Label className="flex items-center gap-2 mb-1">
              <Navigation className="w-4 h-4 text-blue-500" />
              Posizione
            </Label>
            {gpsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Rilevamento GPS...
              </div>
            ) : coords ? (
              <p className="text-sm text-green-600 font-medium" data-testid="text-spot-coords">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </p>
            ) : (
              <p className="text-sm text-red-500">GPS non disponibile</p>
            )}
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={isSubmitting || !coords || !name.trim()}
            data-testid="button-submit-spot"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Salvataggio...</>
            ) : (
              <><MapPin className="w-4 h-4 mr-2" /> Salva Spot</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateEventModal({
  open,
  onClose,
  onEventCreated,
}: {
  open: boolean;
  onClose: () => void;
  onEventCreated: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [eventColor, setEventColor] = useState("#a855f7");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const { toast } = useToast();
  const { uploadFile, isUploading, progress } = useUpload();

  const handleImageUpload = async (file: File) => {
    const result = await uploadFile(file);
    if (result?.objectPath) {
      setImageUrl(result.objectPath);
    }
  };

  const geocodeCity = async (city: string, country: string) => {
    if (!city) return;
    setGeocoding(true);
    try {
      const query = country ? `${city}, ${country}` : city;
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        setCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        toast({ title: "Posizione trovata", description: `Coordinate impostate per ${city}` });
      }
    } catch (error) {
      console.error("Geocoding failed:", error);
    } finally {
      setGeocoding(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const city = formData.get("city") as string;
    const country = formData.get("country") as string;
    
    let latitude = coords?.lat;
    let longitude = coords?.lng;
    
    if (!latitude || !longitude) {
      try {
        const query = country ? `${city}, ${country}` : city;
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
        const geoData = await geoRes.json();
        if (geoData && geoData.length > 0) {
          latitude = parseFloat(geoData[0].lat);
          longitude = parseFloat(geoData[0].lon);
        }
      } catch {}
    }
    
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: formData.get("title"),
          description: formData.get("description"),
          type: formData.get("type") || "public",
          city,
          country: country || "",
          location: formData.get("location") || "",
          latitude,
          longitude,
          startDate: new Date(formData.get("startDate") as string).toISOString(),
          endDate: formData.get("endDate") ? new Date(formData.get("endDate") as string).toISOString() : null,
          capacity: formData.get("capacity") ? parseInt(formData.get("capacity") as string) : null,
          price: formData.get("price") ? parseInt(formData.get("price") as string) : 0,
          currency: formData.get("currency") || "EUR",
          imageUrl: imageUrl || null,
          color: eventColor,
        }),
      });

      if (res.ok) {
        setImageUrl(null);
        setCoords(null);
        setEventColor("#a855f7");
        onEventCreated();
      } else {
        throw new Error("Failed");
      }
    } catch {
      toast({ title: "Errore", description: "Impossibile creare l'evento", variant: "destructive" });
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
      data-testid="overlay-create-event"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Nuovo Evento
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" data-testid="button-close-event">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="event-title">Titolo *</Label>
            <Input
              id="event-title"
              name="title"
              placeholder="Es: Nomad Meetup Milano"
              required
              className="mt-1"
              data-testid="input-event-title"
            />
          </div>

          <div>
            <Label htmlFor="event-description">Descrizione</Label>
            <Textarea
              id="event-description"
              name="description"
              placeholder="Descrivi il tuo evento..."
              className="mt-1"
              rows={3}
              data-testid="input-event-description"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="event-city">Città *</Label>
              <Input
                id="event-city"
                name="city"
                placeholder="Es: Milano"
                required
                className="mt-1"
                data-testid="input-event-city"
              />
            </div>
            <div>
              <Label htmlFor="event-country">Paese</Label>
              <Input
                id="event-country"
                name="country"
                placeholder="Es: Italia"
                className="mt-1"
                data-testid="input-event-country"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="event-location">Indirizzo</Label>
            <Input
              id="event-location"
              name="location"
              placeholder="Es: Via Roma 123"
              className="mt-1"
              data-testid="input-event-location"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="event-start">Data Inizio *</Label>
              <Input
                id="event-start"
                name="startDate"
                type="datetime-local"
                required
                className="mt-1"
                data-testid="input-event-start"
              />
            </div>
            <div>
              <Label htmlFor="event-end">Data Fine</Label>
              <Input
                id="event-end"
                name="endDate"
                type="datetime-local"
                className="mt-1"
                data-testid="input-event-end"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="event-type">Tipo</Label>
              <Select name="type" defaultValue="public">
                <SelectTrigger className="mt-1" data-testid="select-event-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Pubblico</SelectItem>
                  <SelectItem value="nomad">Solo Nomadi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="event-capacity">Posti</Label>
              <Input
                id="event-capacity"
                name="capacity"
                type="number"
                min="1"
                placeholder="∞"
                className="mt-1"
                data-testid="input-event-capacity"
              />
            </div>
            <div>
              <Label htmlFor="event-price">Prezzo €</Label>
              <Input
                id="event-price"
                name="price"
                type="number"
                min="0"
                defaultValue="0"
                className="mt-1"
                data-testid="input-event-price"
              />
            </div>
          </div>
          <input type="hidden" name="currency" value="EUR" />

          <div>
            <Label>Immagine</Label>
            <div className="mt-1">
              {imageUrl ? (
                <div className="relative">
                  <img src={imageUrl} alt="Event" className="w-full h-32 object-cover rounded-xl" />
                  <button
                    type="button"
                    onClick={() => setImageUrl(null)}
                    className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-muted rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                    className="hidden"
                    disabled={isUploading}
                  />
                  {isUploading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {progress}%
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Image className="w-5 h-5" />
                      <span className="text-sm">Aggiungi immagine</span>
                    </div>
                  )}
                </label>
              )}
            </div>
          </div>

          <div>
            <Label>Colore Marker</Label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {["#a855f7", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setEventColor(color)}
                  className={`w-8 h-8 rounded-full transition-all ${eventColor === color ? 'ring-2 ring-offset-2 ring-white scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: color }}
                  data-testid={`color-${color.replace('#', '')}`}
                />
              ))}
              <label className="w-8 h-8 rounded-full border-2 border-dashed border-muted flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden">
                <input
                  type="color"
                  value={eventColor}
                  onChange={(e) => setEventColor(e.target.value)}
                  className="opacity-0 absolute w-8 h-8 cursor-pointer"
                />
                <span className="text-xs text-muted-foreground">+</span>
              </label>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div 
                className="w-6 h-6 rounded-full" 
                style={{ background: `linear-gradient(135deg, ${eventColor}, ${adjustColor(eventColor, -30)})` }}
              />
              <span className="text-xs text-muted-foreground">Anteprima colore</span>
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting || isUploading} 
            className="w-full"
            data-testid="button-create-event"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CalendarPlus className="w-4 h-4 mr-2" />Crea Evento</>}
          </Button>
        </form>
      </motion.div>
    </motion.div>
  );
}

function FeedPostCard({ 
  post, 
  currentUser, 
  likedPosts, 
  pulsingPosts, 
  savedPosts,
  onLike,
  onSave,
  onShare 
}: { 
  post: PostWithUser; 
  currentUser: User | null;
  likedPosts: Set<string>;
  pulsingPosts: Set<string>;
  savedPosts: Set<string>;
  onLike: (id: string) => void;
  onSave: (id: string) => void;
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
      
      <Link href={`/post/${post.id}`} className="block cursor-pointer group">
        <p className="mt-3 text-sm group-hover:text-primary/90 transition-colors">{post.content}</p>
        
        {post.imageUrl && (
          <img
            src={post.imageUrl}
            alt=""
            className="mt-3 rounded-xl w-full max-h-64 object-cover group-hover:opacity-95 transition-opacity"
          />
        )}
      </Link>

      {!post.imageUrl && post.videoUrl && (
        post.videoUrl.startsWith("http") && isYouTubeUrl(post.videoUrl)
          ? <YouTubeEmbed url={post.videoUrl} className="mt-3" />
          : <video src={post.videoUrl} controls className="mt-3 rounded-xl w-full max-h-64 object-cover" />
      )}

      {!post.imageUrl && !post.videoUrl && post.linkUrl && isYouTubeUrl(post.linkUrl) && (
        <YouTubeEmbed url={post.linkUrl} className="mt-3" />
      )}

      {post.linkUrl && !isYouTubeUrl(post.linkUrl) && (
        <a href={post.linkUrl} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-2 p-2.5 bg-muted rounded-xl hover:bg-muted/80 transition-colors">
          <LinkIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <span className="text-sm text-blue-500 truncate">{post.linkUrl}</span>
        </a>
      )}

      {post.tripId && (
        <Link href={`/trip/${post.tripId}`}>
          <div className="mt-2 flex items-center gap-2 bg-primary/10 rounded-xl px-3 py-2 cursor-pointer hover:bg-primary/20 transition-colors" data-testid={`trip-badge-${post.id}`}>
            <Plane className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-primary">Viaggio allegato - clicca per vedere</span>
          </div>
        </Link>
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
          onClick={() => onSave(post.id)}
          className={`ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${savedPosts.has(post.id) ? 'bg-primary/15 text-primary' : 'hover:bg-muted hover:text-primary'}`}
          data-testid={`button-save-${post.id}`}
        >
          <Bookmark className={`w-4 h-4 ${savedPosts.has(post.id) ? 'fill-primary' : ''}`} />
          <span>{savedPosts.has(post.id) ? 'Salvato' : 'Salva'}</span>
        </button>
        <button 
          onClick={() => onShare(post)}
          className="p-1 hover:text-primary transition-colors"
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

type EventCommentWithUser = { id: string; eventId: string; userId: string; content: string; createdAt: Date; user: User };

function FeedEventCard({ event, currentUser }: { event: EventWithHost; currentUser: User | null }) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(event.likes || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<EventCommentWithUser[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [commentsCount, setCommentsCount] = useState(event.commentsCount || 0);
  const [pulsing, setPulsing] = useState(false);

  // Check if user has liked this event
  useEffect(() => {
    if (currentUser) {
      fetch(`/api/events/${event.id}/liked`, { credentials: "include" })
        .then(res => res.json())
        .then(data => setLiked(data.liked))
        .catch(console.error);
    }
  }, [event.id, currentUser]);

  const handleLike = async () => {
    if (!currentUser) return;
    
    setPulsing(true);
    setTimeout(() => setPulsing(false), 300);
    
    try {
      if (liked) {
        await fetch(`/api/events/${event.id}/like`, { method: "DELETE", credentials: "include" });
        setLikes(l => Math.max(0, l - 1));
        setLiked(false);
      } else {
        await fetch(`/api/events/${event.id}/like`, { method: "POST", credentials: "include" });
        setLikes(l => l + 1);
        setLiked(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/events/${event.id}/comments`, { credentials: "include" });
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
      const res = await fetch(`/api/events/${event.id}/comments`, {
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
      const res = await fetch(`/api/events/${event.id}/comments/${commentId}`, {
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
      <div className="relative p-5 text-white" style={{ background: `linear-gradient(135deg, ${event.color || "#a855f7"}, ${adjustColor(event.color || "#a855f7", -30)})` }}>
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-4 right-4 w-24 h-24 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute bottom-4 left-4 w-20 h-20 rounded-full bg-white/20 blur-xl" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-medium opacity-90">Evento</span>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-1.5">
              <QRCodeSVG value={shareUrl} size={48} bgColor="transparent" fgColor="white" />
            </div>
          </div>

          <Link href={`/event/${event.id}`} className="block group cursor-pointer">
            <h2 className="text-xl font-bold mb-1 group-hover:underline">{event.title}</h2>
            
            {event.description && (
              <p className="text-xs opacity-80 mb-3 line-clamp-2">{event.description}</p>
            )}

            <div className="space-y-1.5 mb-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-3.5 h-3.5 opacity-70" />
                <span>{formatDate(event.startDate)}</span>
                <span className="opacity-70">ore {formatTime(event.startDate)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-3.5 h-3.5 opacity-70" />
                <span>{event.city}, {event.country}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/20">
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-3.5 h-3.5 opacity-70" />
                <span>{event.attendees} partecipanti</span>
              </div>
              <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <span className="font-bold text-sm">
                  {(event.price ?? 0) > 0 ? `€${event.price}` : "Gratis"}
                </span>
              </div>
            </div>
          </Link>

          {event.host && (
            <div className="mt-3 flex items-center gap-2">
              {event.host.avatar ? (
                <img src={event.host.avatar} alt={event.host.name || ""} className="w-6 h-6 rounded-full border border-white/50" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center text-xs font-bold">
                  {(event.host.name || event.host.username || "?")[0]}
                </div>
              )}
              <span className="text-xs">Organizzato da <strong>{event.host.name || event.host.username}</strong></span>
            </div>
          )}

          {/* Like and Comment buttons */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/20">
            <button 
              onClick={handleLike}
              className={`flex items-center gap-1 text-sm transition-colors ${liked ? 'text-white' : 'text-white/70 hover:text-white'}`}
              data-testid={`button-like-event-${event.id}`}
              disabled={!currentUser}
            >
              <Heart className={`w-4 h-4 ${pulsing ? 'animate-pulse' : ''} ${liked ? 'fill-white text-white' : ''}`} />
              <span>{likes}</span>
            </button>
            <button 
              onClick={handleToggleComments}
              className="flex items-center gap-1 text-sm text-white/70 hover:text-white transition-colors"
              data-testid={`button-comments-event-${event.id}`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>{commentsCount}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Comments section */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-card p-4 border-t border-border overflow-hidden"
          >
            {currentUser && (
              <form onSubmit={handleSubmitComment} className="flex gap-2 mb-4">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Scrivi un commento..."
                  className="flex-1 bg-muted rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                  data-testid={`input-comment-event-${event.id}`}
                />
                <button 
                  type="submit" 
                  disabled={submitting || !newComment.trim()}
                  className="w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center disabled:opacity-50"
                  data-testid={`button-submit-comment-event-${event.id}`}
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
                  <div key={comment.id} className="flex items-start gap-2" data-testid={`event-comment-${comment.id}`}>
                    <img
                      src={comment.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user.username}`}
                      className="w-7 h-7 rounded-full"
                      alt={comment.user.name || ""}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-semibold mr-1">{comment.user.username}</span>
                        {comment.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(comment.createdAt).toLocaleDateString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {currentUser && comment.userId === currentUser.id && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                        data-testid={`button-delete-event-comment-${comment.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
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

function FeedTripCard({ trip }: { trip: Trip }) {
  const stops = trip.stops || [];
  const cities = stops.map(s => s.city).filter(Boolean);
  const countries = Array.from(new Set(stops.map(s => s.country).filter(Boolean)));
  
  const tripDays = stops.length > 1 
    ? Math.ceil((new Date(stops[stops.length - 1].arrivalDate).getTime() - new Date(stops[0].arrivalDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 1;

  return (
    <Link href={`/trip/${trip.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border/40 rounded-2xl overflow-hidden cursor-pointer hover:border-primary/30 transition-colors"
        data-testid={`trip-feed-card-${trip.id}`}
      >
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
                <Plane className="w-4 h-4" />
                {stops.length} tappe
              </span>
              <span>{tripDays} giorni</span>
            </div>
            {countries.length > 0 && (
              <span className="text-xs">{countries.join(", ")}</span>
            )}
          </div>

          {stops.length > 1 && (
            <div className="mt-3 pt-3 border-t border-border/40">
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
