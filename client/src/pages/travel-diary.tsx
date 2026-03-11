import { useEffect, useState, useCallback, useRef } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { searchFlights, searchHotels } from "@/lib/travelpayouts";
import { useLocation, Link } from "wouter";
import { 
  Plus, MapPin, Calendar, Wallet, Star, ChevronRight, 
  Loader2, Plane, Hotel, Coffee, Utensils, Car, MoreHorizontal,
  Globe, X, Check, Edit, Trash2, Eye, Users, Image, Video, LocateFixed,
  Home, Building2, ShoppingCart, Beer, Ticket, Wifi, Heart, Briefcase,
  MessageCircle
} from "lucide-react";
import { useUpload } from "@/hooks/use-upload";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import { CurvedRouteLine, createStopMarkerIcon } from "@/components/map-route-line";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation, Route, Play, Train, Footprints, Bike, Leaf, CheckCircle2, Lock, BarChart3, Film, ExternalLink, Share2, Bed, Sparkles, Camera, Pencil } from "lucide-react";
import { PersonalStats } from "@/components/personal-stats";
import { MomentsBar } from "@/components/moments";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { FloatingTip } from "@/components/contextual-tip";
import { TripReplay } from "@/components/trip-replay";
import { WeatherWidget } from "@/components/weather-widget";
import { handleShare } from "@/components/share-qr-modal";
import { InFeedAd } from "@/components/ad-banner";
import { usePageTitle } from "@/hooks/use-page-title";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// createStopMarkerIcon and CurvedRouteLine imported from shared component

interface Trip {
  id: string;
  userId: string;
  title: string;
  description?: string;
  startLocation: string;
  endLocation: string;
  startDate: string;
  endDate?: string;
  isPublic: boolean;
  isActive: boolean;
  status: "planned" | "in_progress" | "completed";
  totalBudget: number;
  currency: string;
  imageUrl?: string;
  createdAt: string;
}

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
  imageUrl?: string;
  transportMode?: string;
  distanceKm?: number;
  co2Kg?: number;
  rating?: number;
  accommodationName?: string;
  accommodationType?: string;
  placeId?: string;
  sourceTripId?: string;
  place?: { id: string; name: string; type: string; imageUrl?: string };
  expenses?: TripExpense[];
}

interface TripExpense {
  id: string;
  stopId: string;
  type: string;
  name: string;
  cost: number;
  currency: string;
  rating?: number;
  review?: string;
  imageUrl?: string;
}

interface TripWithDetails extends Trip {
  user: { id: string; name: string; username: string; avatar?: string };
  stops: (TripStop & { expenses: TripExpense[] })[];
}

const expenseTypes = [
  { value: "hotel", label: "Hotel", icon: Hotel },
  { value: "hostel", label: "Ostello", icon: Building2 },
  { value: "airbnb", label: "Airbnb/Affitto", icon: Home },
  { value: "coworking", label: "Coworking", icon: Briefcase },
  { value: "food", label: "Ristorante", icon: Utensils },
  { value: "groceries", label: "Spesa/Market", icon: ShoppingCart },
  { value: "drinks", label: "Bar/Drink", icon: Beer },
  { value: "transport", label: "Trasporto", icon: Car },
  { value: "internet", label: "Internet/SIM", icon: Wifi },
  { value: "entertainment", label: "Svago/Cultura", icon: Ticket },
  { value: "health", label: "Salute", icon: Heart },
  { value: "other", label: "Altro", icon: MoreHorizontal },
];

const CO2_PER_KM: Record<string, number> = {
  walk: 0,
  bike: 0,
  train: 0.041,
  car: 0.171,
  plane: 0.255,
};

const SPEED_KMH: Record<string, number> = {
  walk: 5,
  bike: 20,
  train: 80,
  car: 90,
  plane: 800,
};

const TRANSPORT_OPTIONS = [
  { value: "walk", label: "A piedi", icon: Footprints, color: "#22c55e" },
  { value: "bike", label: "Bici", icon: Bike, color: "#10b981" },
  { value: "train", label: "Treno", icon: Train, color: "#3b82f6" },
  { value: "car", label: "Auto", icon: Car, color: "#f59e0b" },
  { value: "plane", label: "Aereo", icon: Plane, color: "#6366f1" },
];

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c);
}

function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  if (h === 0) return `${m}min`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function TravelDiary() {
  usePageTitle("Travel Diary", { description: "Pianifica i tuoi viaggi eco-friendly, traccia le tappe e condividi il tuo diario di viaggio con la community di nomadi digitali." });
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const { theme } = useTheme();
  const tileUrl = theme === "dark"
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
  const [, setLocation] = useLocation();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [publicTrips, setPublicTrips] = useState<TripWithDetails[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<TripWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewTrip, setShowNewTrip] = useState(false);
  const [showNewStop, setShowNewStop] = useState(false);
  const [showNewExpense, setShowNewExpense] = useState<string | null>(null);
  const [expenseType, setExpenseType] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"my-trips" | "explore" | "followed">("my-trips");
  const [followedTrips, setFollowedTrips] = useState<any[]>([]);
  const [followedLoading, setFollowedLoading] = useState(false);
  const [showPlannerMap, setShowPlannerMap] = useState(false);
  const [stopImageUrl, setStopImageUrl] = useState<string | null>(null);
  const [stopPhotos, setStopPhotos] = useState<string[]>([]);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [aiSuggestionsLoading, setAiSuggestionsLoading] = useState(false);
  const { toast } = useToast();
  
  const { uploadFile, isUploading: isUploadingStopMedia, progress: uploadProgress } = useUpload({
    onSuccess: (response) => {
      setStopImageUrl(response.objectPath);
      toast({ title: "Media caricato!" });
    },
    onError: (error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const { uploadFile: uploadGalleryFile, isUploading: isUploadingGallery, progress: galleryUploadProgress } = useUpload({
    onSuccess: (response) => {
      setStopPhotos(prev => [...prev, response.objectPath]);
      toast({ title: "Foto aggiunta alla galleria!" });
    },
    onError: (error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const fetchTrips = useCallback(async () => {
    try {
      const res = await fetch("/api/my-trips", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setTrips(data);
      }
    } catch (error) {
      console.error("Failed to fetch trips:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPublicTrips = useCallback(async () => {
    try {
      const res = await fetch("/api/trips?isPublic=true", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setPublicTrips(data);
      }
    } catch (error) {
      console.error("Failed to fetch public trips:", error);
    }
  }, []);

  const fetchFollowedTrips = useCallback(async () => {
    setFollowedLoading(true);
    try {
      const res = await fetch("/api/followed-trips", { credentials: "include" });
      if (res.ok) {
        setFollowedTrips(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch followed trips:", error);
    } finally {
      setFollowedLoading(false);
    }
  }, []);

  const getCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      toast({ title: "Errore", description: "Geolocalizzazione non supportata dal browser", variant: "destructive" });
      return;
    }
    
    setIsGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
            { headers: { 'Accept-Language': 'it' } }
          );
          
          if (response.ok) {
            const data = await response.json();
            const city = data.address?.city || data.address?.town || data.address?.village || data.address?.municipality || "Posizione attuale";
            const country = data.address?.country || "Paese sconosciuto";
            
            const cityInput = document.getElementById('city') as HTMLInputElement;
            const countryInput = document.getElementById('country') as HTMLInputElement;
            
            if (cityInput) cityInput.value = city;
            if (countryInput) countryInput.value = country;
            
            toast({ title: "Posizione rilevata!", description: `${city}, ${country}` });
          }
        } catch (error) {
          console.error("Geocoding error:", error);
          toast({ title: "Errore", description: "Impossibile determinare la località", variant: "destructive" });
        }
        
        setIsGettingLocation(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        let message = "Impossibile ottenere la posizione";
        if (error.code === 1) message = "Permesso negato. Abilita la geolocalizzazione.";
        if (error.code === 2) message = "Posizione non disponibile";
        if (error.code === 3) message = "Timeout richiesta";
        toast({ title: "Errore GPS", description: message, variant: "destructive" });
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [toast]);

  const fetchAiSuggestions = async () => {
    setAiSuggestionsLoading(true);
    try {
      const res = await fetch("/api/ai/travel-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        setAiSuggestions(data.suggestions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiSuggestionsLoading(false);
    }
  };

  const fetchTripDetails = useCallback(async (tripId: string) => {
    try {
      const res = await fetch(`/api/trips/${tripId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSelectedTrip(data);
      }
    } catch (error) {
      console.error("Failed to fetch trip details:", error);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLocation("/auth");
      return;
    }
    fetchPublicTrips();
    fetchTrips();
    fetchFollowedTrips();
  }, [user, authLoading, setLocation, fetchTrips, fetchFollowedTrips]);

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
          startLocation: formData.get("startLocation"),
          endLocation: formData.get("endLocation"),
          startDate: formData.get("startDate"),
          isPublic: formData.get("isPublic") === "true",
          currency: formData.get("currency") || "EUR",
          status: formData.get("status") || "planned",
        }),
      });

      if (res.ok) {
        toast({ title: "Viaggio creato!", description: "Inizia ad aggiungere tappe" });
        setShowNewTrip(false);
        fetchTrips();
      } else {
        const error = await res.json();
        toast({ title: "Errore", description: error.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Errore", description: "Impossibile creare il viaggio", variant: "destructive" });
    }
  };

  const handleAddStop = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTrip) return;
    
    const formData = new FormData(e.currentTarget);
    const nextOrderIndex = selectedTrip.stops.length;
    const city = formData.get("city") as string;
    const country = formData.get("country") as string;
    
    let latitude: number | undefined;
    let longitude: number | undefined;
    
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city + ", " + country)}&limit=1`
      );
      const geoData = await geoRes.json();
      if (geoData.length > 0) {
        latitude = parseFloat(geoData[0].lat);
        longitude = parseFloat(geoData[0].lon);
      }
    } catch (geoError) {
      console.log("Geocoding failed, saving without coordinates");
    }
    
    try {
      const res = await fetch(`/api/trips/${selectedTrip.id}/stops`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          city,
          country,
          latitude,
          longitude,
          arrivalDate: formData.get("arrivalDate"),
          departureDate: formData.get("departureDate") || undefined,
          notes: formData.get("notes") || undefined,
          imageUrl: stopImageUrl || undefined,
          photos: stopPhotos.length > 0 ? stopPhotos : undefined,
          orderIndex: nextOrderIndex,
          rating: parseInt(formData.get("rating") as string) || undefined,
          accommodationName: formData.get("accommodationName") || undefined,
          accommodationType: formData.get("accommodationType") || undefined,
        }),
      });

      if (res.ok) {
        toast({ title: "Tappa aggiunta!" });
        setShowNewStop(false);
        setStopImageUrl(null);
        setStopPhotos([]);
        fetchTripDetails(selectedTrip.id);
      } else {
        const error = await res.json();
        toast({ title: "Errore", description: error.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Errore", description: "Impossibile aggiungere la tappa", variant: "destructive" });
    }
  };
  
  const handleStopMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const handleAddStopFromMap = async (lat: number, lng: number, city: string, country: string) => {
    if (!selectedTrip) return;
    
    const nextOrderIndex = selectedTrip.stops.length;
    const today = new Date().toISOString().split('T')[0];
    
    try {
      const res = await fetch(`/api/trips/${selectedTrip.id}/stops`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          city,
          country,
          latitude: lat,
          longitude: lng,
          arrivalDate: today,
          orderIndex: nextOrderIndex,
          notes: "Aggiunta dalla mappa",
        }),
      });

      if (res.ok) {
        fetchTripDetails(selectedTrip.id);
      } else {
        const error = await res.json();
        toast({ title: "Errore", description: error.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Errore", description: "Impossibile aggiungere la tappa", variant: "destructive" });
    }
  };

  const handleClearAllStops = async () => {
    if (!selectedTrip || selectedTrip.stops.length === 0) return;
    
    try {
      for (const stop of selectedTrip.stops) {
        await fetch(`/api/stops/${stop.id}`, {
          method: "DELETE",
          credentials: "include",
        });
      }
      fetchTripDetails(selectedTrip.id);
      toast({ title: "Percorso azzerato", description: "Tutte le tappe sono state rimosse" });
    } catch (error) {
      toast({ title: "Errore", description: "Impossibile azzerare il percorso", variant: "destructive" });
    }
  };

  const handleAddExpense = async (e: React.FormEvent<HTMLFormElement>, stopId: string) => {
    e.preventDefault();
    
    if (!expenseType) {
      toast({ title: "Seleziona un tipo di spesa", variant: "destructive" });
      return;
    }
    
    const formData = new FormData(e.currentTarget);
    
    try {
      const res = await fetch(`/api/stops/${stopId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: expenseType,
          name: formData.get("name"),
          cost: Math.round(parseFloat(formData.get("cost") as string) * 100),
          currency: formData.get("currency") || "EUR",
          rating: formData.get("rating") ? parseInt(formData.get("rating") as string) : undefined,
          wifiRating: formData.get("wifiRating") ? parseInt(formData.get("wifiRating") as string) : undefined,
          cleanRating: formData.get("cleanRating") ? parseInt(formData.get("cleanRating") as string) : undefined,
          locationRating: formData.get("locationRating") ? parseInt(formData.get("locationRating") as string) : undefined,
          valueRating: formData.get("valueRating") ? parseInt(formData.get("valueRating") as string) : undefined,
          review: formData.get("review") || undefined,
        }),
      });

      if (res.ok) {
        toast({ title: "Spesa aggiunta!" });
        setShowNewExpense(null);
        setExpenseType("");
        if (selectedTrip) fetchTripDetails(selectedTrip.id);
      } else {
        const error = await res.json();
        toast({ title: "Errore", description: error.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Errore", description: "Impossibile aggiungere la spesa", variant: "destructive" });
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo viaggio?")) return;
    
    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        toast({ title: "Viaggio eliminato" });
        setSelectedTrip(null);
        fetchTrips();
      }
    } catch (error) {
      toast({ title: "Errore", description: "Impossibile eliminare il viaggio", variant: "destructive" });
    }
  };

  const handleCopyStop = async (stop: TripStop, targetTripId: string) => {
    try {
      const targetTrip = trips.find(t => t.id === targetTripId);
      if (!targetTrip) return;
      
      const tripDetailsRes = await fetch(`/api/trips/${targetTripId}`, { credentials: "include" });
      const tripDetails = await tripDetailsRes.json();
      const nextOrderIndex = tripDetails.stops ? tripDetails.stops.length : 0;
      
      const res = await fetch(`/api/trips/${targetTripId}/stops`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          city: stop.city,
          country: stop.country,
          arrivalDate: stop.arrivalDate,
          departureDate: stop.departureDate,
          notes: stop.notes ? `Copiato da altro viaggio: ${stop.notes}` : "Copiato da altro viaggio",
          imageUrl: stop.imageUrl,
          sourceTripId: stop.tripId,
          orderIndex: nextOrderIndex,
        }),
      });

      if (res.ok) {
        toast({ 
          title: "Tappa aggiunta!", 
          description: `"${stop.city}" aggiunta al viaggio "${targetTrip.title}"` 
        });
        fetchTrips();
      } else {
        const error = await res.json();
        toast({ title: "Errore", description: error.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Errore", description: "Impossibile copiare la tappa", variant: "destructive" });
    }
  };

  const calculateTotalExpenses = (trip: TripWithDetails) => {
    return trip.stops.reduce((total, stop) => {
      return total + stop.expenses.reduce((stopTotal, expense) => stopTotal + expense.cost, 0);
    }, 0);
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

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
        <style>{`
          .custom-stop-marker { background: transparent; border: none; }
          .stop-marker {
            width: 32px; height: 32px; border-radius: 50%;
            background: linear-gradient(135deg, #14b8a6, #0891b2);
            border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex; align-items: center; justify-content: center;
            font-weight: bold; color: white; font-size: 14px;
          }
          .custom-popup .leaflet-popup-content-wrapper { 
            background: ${theme === "dark" ? "#1e293b" : "#ffffff"}; 
            color: ${theme === "dark" ? "#e2e8f0" : "#1e293b"}; 
            border-radius: 16px; 
            box-shadow: 0 8px 30px rgba(0,0,0,0.15); 
            overflow: hidden;
            padding: 0;
          }
          .custom-popup .leaflet-popup-content { margin: 0 !important; width: auto !important; }
          .custom-popup .leaflet-popup-tip { background: ${theme === "dark" ? "#1e293b" : "#ffffff"}; }
          .custom-popup .leaflet-popup-close-button { 
            color: ${theme === "dark" ? "white" : "#64748b"} !important; 
            font-size: 20px !important;
            top: 6px !important;
            right: 8px !important;
            z-index: 10;
          }
        `}</style>
        
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Plane className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Viaggi</h1>
                <p className="text-xs text-muted-foreground">Diario di viaggio</p>
              </div>
            </div>
            {activeTab === "my-trips" && (
              <Dialog open={showNewTrip} onOpenChange={setShowNewTrip}>
              <DialogTrigger asChild>
                <Button 
                  data-testid="button-new-trip"
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nuovo Viaggio
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-muted border-border text-foreground max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-emerald-500" />
                    Crea Nuovo Viaggio
                  </DialogTitle>
                </DialogHeader>
                <div className="mb-4">
                  {!showAiSuggestions ? (
                    <button
                      type="button"
                      onClick={() => { setShowAiSuggestions(true); fetchAiSuggestions(); }}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm font-medium hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-950/30 dark:hover:to-teal-950/30 transition-all"
                      data-testid="button-ai-suggest-destination"
                    >
                      <Sparkles className="w-4 h-4" />
                      Suggeriscimi una destinazione
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-emerald-500" />
                          Destinazioni suggerite
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAiSuggestions(false)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Chiudi
                        </button>
                      </div>
                      {aiSuggestionsLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                          <span className="ml-2 text-sm text-muted-foreground">L'AI sta pensando...</span>
                        </div>
                      ) : aiSuggestions.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {aiSuggestions.map((s: any, i: number) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                const form = document.querySelector('form');
                                const endInput = form?.querySelector('[name="endLocation"]') as HTMLInputElement;
                                const titleInput = form?.querySelector('[name="title"]') as HTMLInputElement;
                                if (endInput) endInput.value = s.city;
                                if (titleInput && !titleInput.value) titleInput.value = `Viaggio a ${s.city}`;
                                setShowAiSuggestions(false);
                              }}
                              className="w-full text-left p-3 rounded-lg bg-accent hover:bg-accent/80 transition-colors"
                              data-testid={`ai-suggestion-${i}`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-sm">{s.city}, {s.country}</span>
                                <span className="text-xs text-emerald-600 dark:text-emerald-400">~${s.dailyBudget}/giorno</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.reason}</p>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">Nessun suggerimento disponibile</p>
                      )}
                    </div>
                  )}
                </div>
                <form onSubmit={handleCreateTrip} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Titolo del viaggio</Label>
                    <Input 
                      id="title"
                      name="title" 
                      placeholder="Es: Avventura in Thailandia" 
                      required 
                      className="bg-accent border-border"
                      data-testid="input-trip-title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Descrizione (opzionale)</Label>
                    <Textarea 
                      id="description"
                      name="description" 
                      placeholder="Racconta il tuo viaggio..." 
                      className="bg-accent border-border"
                      data-testid="input-trip-description"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="startLocation">Partenza</Label>
                      <Input 
                        id="startLocation"
                        name="startLocation" 
                        placeholder="Milano" 
                        required 
                        className="bg-accent border-border"
                        data-testid="input-start-location"
                      />
                    </div>
                    <div>
                      <Label htmlFor="endLocation">Arrivo</Label>
                      <Input 
                        id="endLocation"
                        name="endLocation" 
                        placeholder="Bangkok" 
                        required 
                        className="bg-accent border-border"
                        data-testid="input-end-location"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="startDate">Data partenza</Label>
                      <Input 
                        id="startDate"
                        type="date" 
                        name="startDate" 
                        required 
                        className="bg-accent border-border"
                        data-testid="input-start-date"
                      />
                    </div>
                    <div>
                      <Label htmlFor="currency">Valuta</Label>
                      <Select name="currency" defaultValue="EUR">
                        <SelectTrigger className="bg-accent border-border" data-testid="select-currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-accent border-border">
                          <SelectItem value="EUR">€ EUR</SelectItem>
                          <SelectItem value="USD">$ USD</SelectItem>
                          <SelectItem value="GBP">£ GBP</SelectItem>
                          <SelectItem value="THB">฿ THB</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Tipo di viaggio</Label>
                    <Select name="status" defaultValue="planned">
                      <SelectTrigger className="bg-accent border-border" data-testid="select-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-accent border-border">
                        <SelectItem value="planned">📝 Pianificato (futuro)</SelectItem>
                        <SelectItem value="in_progress">✈️ In corso</SelectItem>
                        <SelectItem value="completed">✅ Completato</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="isPublic" 
                      name="isPublic" 
                      value="true" 
                      defaultChecked 
                      className="w-4 h-4 rounded bg-accent"
                      data-testid="checkbox-public"
                    />
                    <Label htmlFor="isPublic" className="text-sm text-foreground">
                      Rendi visibile agli altri nomadi
                    </Label>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600"
                    data-testid="button-submit-trip"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Crea Viaggio
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("my-trips")}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === "my-trips" 
                  ? "bg-emerald-500 text-white" 
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
              data-testid="tab-my-trips"
            >
              <Plane className="w-4 h-4 inline mr-2" />
              I Miei Viaggi
            </button>
            <button
              onClick={() => setActiveTab("followed")}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === "followed" 
                  ? "bg-emerald-500 text-white" 
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
              data-testid="tab-followed"
            >
              <Eye className="w-4 h-4 inline mr-2" />
              Seguiti
            </button>
            <button
              onClick={() => setActiveTab("explore")}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === "explore" 
                  ? "bg-emerald-500 text-white" 
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
              data-testid="tab-explore"
            >
              <Globe className="w-4 h-4 inline mr-2" />
              Esplora
            </button>
          </div>
        </header>

        <div className="border-b border-border/30">
          <MomentsBar />
        </div>

        {activeTab === "my-trips" && (
          <div className="p-4 pb-24">
          {selectedTrip ? (
            <TripDetails 
              trip={selectedTrip} 
              onBack={() => setSelectedTrip(null)}
              onAddStop={() => setShowNewStop(true)}
              onAddExpense={(stopId) => setShowNewExpense(stopId)}
              onDelete={() => handleDeleteTrip(selectedTrip.id)}
              onOpenPlannerMap={() => setShowPlannerMap(true)}
              calculateTotal={calculateTotalExpenses}
              onRefresh={() => fetchTripDetails(selectedTrip.id)}
            />
          ) : (
            <>
            {user && (
              <div className="mb-6 bg-muted/50 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-semibold text-foreground">{t("diary.your_stats")}</h3>
                </div>
                <PersonalStats userId={user.id} compact />
              </div>
            )}
            <TripsList 
              trips={trips} 
              onSelectTrip={(tripId) => fetchTripDetails(tripId)}
              onPlanRoute={(tripId) => {
                fetchTripDetails(tripId);
                setTimeout(() => setShowPlannerMap(true), 300);
              }}
            />
            </>
          )}
        </div>
        )}

        {activeTab === "followed" && (
          <div className="p-4 pb-24">
            {followedLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              </div>
            ) : followedTrips.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Eye className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Nessun viaggio seguito</h3>
                <p className="text-muted-foreground text-sm max-w-xs">
                  Esplora i viaggi pubblici e segui quelli che ti interessano per ricevere aggiornamenti.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setActiveTab("explore")}
                  data-testid="button-go-explore"
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Esplora Viaggi
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {followedTrips.map((ft: any) => {
                  const trip = ft.trip;
                  if (!trip) return null;
                  const stopsCount = trip.stops?.length || 0;
                  return (
                    <Link key={ft.id} href={`/trip/${trip.id}`}>
                      <div className="bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer border border-border/50" data-testid={`followed-trip-${trip.id}`}>
                        {trip.imageUrl && (
                          <div className="relative h-28">
                            <img src={trip.imageUrl} className="w-full h-full object-cover" alt={trip.title} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            <div className="absolute bottom-2 left-3 right-3">
                              <h3 className="text-white font-semibold text-sm truncate">{trip.title}</h3>
                            </div>
                          </div>
                        )}
                        <div className="p-3">
                          {!trip.imageUrl && (
                            <h3 className="font-semibold text-foreground text-sm mb-1">{trip.title}</h3>
                          )}
                          {trip.description && (
                            <p className="text-muted-foreground text-xs line-clamp-2 mb-2">{trip.description}</p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {trip.startLocation}
                            </span>
                            {stopsCount > 0 && (
                              <span className="flex items-center gap-1">
                                <Route className="w-3 h-3" />
                                {stopsCount} tappe
                              </span>
                            )}
                            {trip.user && (
                              <span className="flex items-center gap-1 ml-auto">
                                <img 
                                  src={trip.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${trip.user.username}`}
                                  className="w-4 h-4 rounded-full object-cover"
                                  alt=""
                                />
                                <span className="truncate max-w-[80px]">{trip.user.name || trip.user.username}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "explore" && (
          <ExploreTripsMap 
            trips={selectedTrip && !publicTrips.find(t => t.id === selectedTrip.id) 
              ? [...publicTrips, { ...selectedTrip, stops: selectedTrip.stops || [] }] 
              : publicTrips
            } 
            onSelectTrip={(tripId) => {
              fetchTripDetails(tripId);
              setActiveTab("my-trips");
            }}
            onCopyStop={handleCopyStop}
            userTrips={trips}
            onBack={() => setActiveTab("my-trips")}
            highlightedTripId={selectedTrip?.id}
          />
        )}

        <Dialog open={showNewStop} onOpenChange={(open) => { setShowNewStop(open); if (!open) { setStopImageUrl(null); setStopPhotos([]); } }}>
          <DialogContent className="bg-muted border-border text-foreground max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-500" />
                Aggiungi Tappa
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddStop} className="space-y-4">
              <Button
                type="button"
                onClick={getCurrentLocation}
                disabled={isGettingLocation}
                variant="outline"
                className="w-full border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                data-testid="button-get-location"
              >
                {isGettingLocation ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <LocateFixed className="w-4 h-4 mr-2" />
                )}
                {isGettingLocation ? "Rilevamento posizione..." : "Usa posizione attuale"}
              </Button>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="city">Città</Label>
                  <Input 
                    id="city"
                    name="city" 
                    placeholder="Bangkok" 
                    required 
                    className="bg-accent border-border"
                    data-testid="input-stop-city"
                  />
                </div>
                <div>
                  <Label htmlFor="country">Paese</Label>
                  <Input 
                    id="country"
                    name="country" 
                    placeholder="Thailandia" 
                    required 
                    className="bg-accent border-border"
                    data-testid="input-stop-country"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="arrivalDate">Arrivo</Label>
                  <Input 
                    id="arrivalDate"
                    type="date" 
                    name="arrivalDate" 
                    required 
                    className="bg-accent border-border"
                    data-testid="input-arrival-date"
                  />
                </div>
                <div>
                  <Label htmlFor="departureDate">Partenza</Label>
                  <Input 
                    id="departureDate"
                    type="date" 
                    name="departureDate" 
                    className="bg-accent border-border"
                    data-testid="input-departure-date"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Note (opzionale)</Label>
                <Textarea 
                  id="notes"
                  name="notes" 
                  placeholder="Appunti sulla tappa..." 
                  className="bg-accent border-border"
                  data-testid="input-stop-notes"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="accommodationName">Alloggio (opzionale)</Label>
                  <Input 
                    id="accommodationName"
                    name="accommodationName" 
                    placeholder="Hotel Roma" 
                    className="bg-accent border-border"
                    data-testid="input-accommodation-name"
                  />
                </div>
                <div>
                  <Label htmlFor="accommodationType">Tipo</Label>
                  <select 
                    id="accommodationType"
                    name="accommodationType" 
                    className="w-full h-10 rounded-md bg-accent border border-border px-3 text-sm"
                    data-testid="select-accommodation-type"
                  >
                    <option value="">Seleziona...</option>
                    <option value="hotel">Hotel</option>
                    <option value="hostel">Ostello</option>
                    <option value="airbnb">Airbnb</option>
                    <option value="camping">Camping</option>
                    <option value="couchsurfing">Couchsurfing</option>
                    <option value="other">Altro</option>
                  </select>
                </div>
              </div>

              <div>
                <Label>Valutazione (opzionale)</Label>
                <div className="flex items-center gap-1 mt-1" data-testid="rating-input">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={(e) => {
                        const container = e.currentTarget.parentElement;
                        const input = container?.querySelector('input[name="rating"]') as HTMLInputElement;
                        const currentVal = parseInt(input?.value || "0");
                        input.value = currentVal === star ? "0" : String(star);
                        container?.querySelectorAll('svg').forEach((svg, i) => {
                          if (i < (currentVal === star ? 0 : star)) {
                            svg.classList.add('fill-amber-400', 'text-amber-400');
                            svg.classList.remove('text-gray-500');
                          } else {
                            svg.classList.remove('fill-amber-400', 'text-amber-400');
                            svg.classList.add('text-gray-500');
                          }
                        });
                      }}
                      className="p-0.5 hover:scale-110 transition-transform"
                    >
                      <svg className="w-6 h-6 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                    </button>
                  ))}
                  <input type="hidden" name="rating" defaultValue="0" />
                </div>
              </div>
              
              <div>
                <Label>Foto/Video (opzionale)</Label>
                <div className="mt-2">
                  {stopImageUrl ? (
                    <div className="relative">
                      {stopImageUrl.match(/\.(mp4|webm|mov)$/i) ? (
                        <video 
                          src={stopImageUrl} 
                          className="w-full h-32 object-cover rounded-lg"
                          controls
                        />
                      ) : (
                        <img 
                          src={stopImageUrl} 
                          alt="Anteprima" 
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => setStopImageUrl(null)}
                        className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-emerald-500 transition-colors">
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleStopMediaUpload}
                        className="hidden"
                        disabled={isUploadingStopMedia}
                        data-testid="input-stop-media"
                      />
                      {isUploadingStopMedia ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                          <span className="text-xs text-muted-foreground">{uploadProgress}%</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex gap-2">
                            <Image className="w-5 h-5 text-muted-foreground" />
                            <Video className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <span className="text-xs text-muted-foreground">Carica foto o video</span>
                        </div>
                      )}
                    </label>
                  )}
                </div>
              </div>

              <div>
                <Label>Altre foto (opzionale)</Label>
                <div className="mt-2 space-y-2">
                  {stopPhotos.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {stopPhotos.map((photo, idx) => (
                        <div key={idx} className="relative w-16 h-16">
                          <img src={photo} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover rounded-lg" />
                          <button
                            type="button"
                            onClick={() => setStopPhotos(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute -top-1 -right-1 p-0.5 bg-red-500 rounded-full text-white"
                            data-testid={`button-remove-gallery-photo-${idx}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="flex items-center justify-center w-full h-12 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-emerald-500 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) await uploadGalleryFile(file);
                        e.target.value = "";
                      }}
                      className="hidden"
                      disabled={isUploadingGallery}
                      data-testid="input-gallery-photos"
                    />
                    {isUploadingGallery ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                        <span className="text-xs text-muted-foreground">{galleryUploadProgress}%</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Image className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Aggiungi foto alla galleria</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600"
                data-testid="button-submit-stop"
                disabled={isUploadingStopMedia || isUploadingGallery}
              >
                <Plus className="w-4 h-4 mr-2" />
                Aggiungi Tappa
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!showNewExpense} onOpenChange={() => { setShowNewExpense(null); setExpenseType(""); }}>
          <DialogContent className="bg-muted border-border text-foreground max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-500" />
                Aggiungi Spesa
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => showNewExpense && handleAddExpense(e, showNewExpense)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <Label htmlFor="type">Tipo Spesa *</Label>
                <Select value={expenseType} onValueChange={setExpenseType}>
                  <SelectTrigger className={`bg-accent border-border ${!expenseType ? 'text-muted-foreground' : ''}`} data-testid="select-expense-type">
                    <SelectValue placeholder="Seleziona tipo..." />
                  </SelectTrigger>
                  <SelectContent className="bg-accent border-border max-h-60">
                    {expenseTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="w-4 h-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input 
                  id="name"
                  name="name" 
                  placeholder="Es: Ostello Central, Café Roma..." 
                  required 
                  className="bg-accent border-border"
                  data-testid="input-expense-name"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="cost">Costo</Label>
                  <Input 
                    id="cost"
                    type="number" 
                    step="0.01"
                    name="cost" 
                    placeholder="25.00" 
                    required 
                    className="bg-accent border-border"
                    data-testid="input-expense-cost"
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Valuta</Label>
                  <Select name="currency" defaultValue="EUR">
                    <SelectTrigger className="bg-accent border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-accent border-border">
                      <SelectItem value="EUR">€ EUR</SelectItem>
                      <SelectItem value="USD">$ USD</SelectItem>
                      <SelectItem value="GBP">£ GBP</SelectItem>
                      <SelectItem value="THB">฿ THB</SelectItem>
                      <SelectItem value="IDR">Rp IDR</SelectItem>
                      <SelectItem value="MXN">$ MXN</SelectItem>
                      <SelectItem value="BRL">R$ BRL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="p-3 bg-accent/50 rounded-lg space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Valutazioni Qualità</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="rating" className="text-xs">⭐ Generale</Label>
                    <Select name="rating">
                      <SelectTrigger className="bg-accent border-border h-9" data-testid="select-rating">
                        <SelectValue placeholder="--" />
                      </SelectTrigger>
                      <SelectContent className="bg-accent border-border">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <SelectItem key={n} value={n.toString()}>
                            {"⭐".repeat(n)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="wifiRating" className="text-xs">📶 WiFi</Label>
                    <Select name="wifiRating">
                      <SelectTrigger className="bg-accent border-border h-9" data-testid="select-wifi-rating">
                        <SelectValue placeholder="--" />
                      </SelectTrigger>
                      <SelectContent className="bg-accent border-border">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <SelectItem key={n} value={n.toString()}>
                            {"⭐".repeat(n)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="cleanRating" className="text-xs">🧹 Pulizia</Label>
                    <Select name="cleanRating">
                      <SelectTrigger className="bg-accent border-border h-9" data-testid="select-clean-rating">
                        <SelectValue placeholder="--" />
                      </SelectTrigger>
                      <SelectContent className="bg-accent border-border">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <SelectItem key={n} value={n.toString()}>
                            {"⭐".repeat(n)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="locationRating" className="text-xs">📍 Posizione</Label>
                    <Select name="locationRating">
                      <SelectTrigger className="bg-accent border-border h-9" data-testid="select-location-rating">
                        <SelectValue placeholder="--" />
                      </SelectTrigger>
                      <SelectContent className="bg-accent border-border">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <SelectItem key={n} value={n.toString()}>
                            {"⭐".repeat(n)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="valueRating" className="text-xs">💰 Rapporto Qualità/Prezzo</Label>
                    <Select name="valueRating">
                      <SelectTrigger className="bg-accent border-border h-9" data-testid="select-value-rating">
                        <SelectValue placeholder="--" />
                      </SelectTrigger>
                      <SelectContent className="bg-accent border-border">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <SelectItem key={n} value={n.toString()}>
                            {"⭐".repeat(n)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="review">Recensione (opzionale)</Label>
                <Textarea 
                  id="review"
                  name="review" 
                  placeholder="La tua esperienza, consigli per altri nomadi..." 
                  className="bg-accent border-border"
                  rows={3}
                  data-testid="input-expense-review"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600"
                data-testid="button-submit-expense"
              >
                <Plus className="w-4 h-4 mr-2" />
                Aggiungi Spesa
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        
        {showPlannerMap && selectedTrip && (
          <TripPlannerMap
            trip={selectedTrip}
            onAddStopFromMap={handleAddStopFromMap}
            onClearAllStops={handleClearAllStops}
            onClose={() => setShowPlannerMap(false)}
            userAvatar={user?.avatar}
            onStopUpdated={() => fetchTripDetails(selectedTrip.id)}
          />
        )}
      </div>

      <FloatingTip
        tipKey="hasSeenTravelDiaryTip"
        title="Crea il tuo diario di viaggio"
        description="Premi 'Nuovo Viaggio' per iniziare a pianificare. Aggiungi tappe, spese e traccia le tue statistiche CO2!"
        delay={2000}
      />
    </Layout>
  );
}

function TripsList({ trips, onSelectTrip, onPlanRoute }: { trips: Trip[]; onSelectTrip: (id: string) => void; onPlanRoute: (id: string) => void }) {
  const [statusFilter, setStatusFilter] = useState<"all" | "planned" | "in_progress" | "completed">("all");
  
  const filteredTrips = trips.filter(trip => {
    if (statusFilter === "all") return true;
    return trip.status === statusFilter;
  });
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "planned":
        return <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px]">📝 Pianificato</span>;
      case "in_progress":
        return <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">✈️ In corso</span>;
      case "completed":
        return <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px]">✅ Completato</span>;
      default:
        return null;
    }
  };

  if (trips.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16"
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
          <Plane className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Nessun viaggio ancora</h3>
        <p className="text-muted-foreground mb-6">Inizia a documentare le tue avventure!</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">I Tuoi Viaggi</h2>
      </div>
      
      <div className="flex gap-2 flex-wrap mb-4">
        {[
          { value: "all", label: "Tutti", count: trips.length },
          { value: "planned", label: "📝 Pianificati", count: trips.filter(t => t.status === "planned").length },
          { value: "in_progress", label: "✈️ In corso", count: trips.filter(t => t.status === "in_progress").length },
          { value: "completed", label: "✅ Completati", count: trips.filter(t => t.status === "completed").length },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value as typeof statusFilter)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              statusFilter === tab.value
                ? "bg-emerald-500 text-white"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
            data-testid={`filter-${tab.value}`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>
      
      {filteredTrips.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nessun viaggio in questa categoria
        </div>
      ) : (
        filteredTrips.map((trip, index) => (
          <div key={trip.id}>
          {index > 0 && index % 3 === 0 && <InFeedAd />}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-muted/50 rounded-2xl p-4 border border-border/50"
            data-testid={`trip-card-${trip.id}`}
          >
            <div 
              onClick={() => onSelectTrip(trip.id)}
              className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  trip.status === "in_progress" ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 
                  trip.status === "planned" ? 'bg-gradient-to-br from-blue-500 to-indigo-600' :
                  'bg-gradient-to-br from-purple-500 to-pink-600'
                }`}>
                  <Plane className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{trip.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>{trip.startLocation} → {trip.endLocation}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(trip.startDate).toLocaleDateString("it-IT")}</span>
                    {getStatusBadge(trip.status)}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          <div className="mt-3 pt-3 border-t border-border/50 flex gap-2">
            <button
              onClick={() => onPlanRoute(trip.id)}
              className="flex-1 py-2 px-3 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              data-testid={`button-map-${trip.id}`}
            >
              <Globe className="w-4 h-4" />
              Mappa
            </button>
          </div>
        </motion.div>
        </div>
        ))
      )}
    </div>
  );
}

function TripDetails({ 
  trip, 
  onBack, 
  onAddStop, 
  onAddExpense,
  onDelete,
  onOpenPlannerMap,
  calculateTotal,
  onRefresh
}: { 
  trip: TripWithDetails; 
  onBack: () => void;
  onAddStop: () => void;
  onAddExpense: (stopId: string) => void;
  onDelete: () => void;
  onOpenPlannerMap: () => void;
  calculateTotal: (trip: TripWithDetails) => number;
  onRefresh: () => void;
}) {
  const [isPublic, setIsPublic] = useState(trip.isPublic);
  const [status, setStatus] = useState(trip.status);
  const [showReplay, setShowReplay] = useState(false);
  const { toast } = useToast();
  const totalExpenses = calculateTotal(trip);
  const currencySymbol = trip.currency === "EUR" ? "€" : trip.currency === "USD" ? "$" : trip.currency;
  
  const handleTogglePublic = async () => {
    const newValue = !isPublic;
    setIsPublic(newValue);
    try {
      await fetch(`/api/trips/${trip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isPublic: newValue })
      });
      toast({ title: newValue ? "Viaggio ora pubblico" : "Viaggio ora privato" });
      onRefresh();
    } catch (error) {
      setIsPublic(!newValue);
      toast({ title: "Errore", variant: "destructive" });
    }
  };
  
  const handleChangeStatus = async (newStatus: string) => {
    setStatus(newStatus as "planned" | "in_progress" | "completed");
    try {
      await fetch(`/api/trips/${trip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus })
      });
      const statusLabels: Record<string, string> = { planned: "Pianificato", in_progress: "In corso", completed: "Completato" };
      toast({ title: `Stato: ${statusLabels[newStatus]}` });
      onRefresh();
    } catch (error) {
      toast({ title: "Errore", variant: "destructive" });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between gap-2">
        <button 
          onClick={onBack}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          data-testid="button-back"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          <span className="text-sm">Indietro</span>
        </button>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowReplay(true)}
            className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10 text-xs px-3 animate-pulse hover:animate-none"
            data-testid="button-diary-replay"
          >
            <Film className="w-4 h-4 mr-1" />
            Replay Viaggio
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onOpenPlannerMap}
            className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 text-xs px-2"
            data-testid="button-plan-on-map"
          >
            <Route className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Crea percorso</span>
            <span className="sm:hidden">Mappa</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onDelete}
            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            data-testid="button-delete-trip"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="bg-gradient-to-br from-emerald-500/20 to-teal-600/20 rounded-2xl p-6 border border-emerald-500/30">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{trip.title}</h2>
            {trip.description && (
              <p className="text-foreground mt-1">{trip.description}</p>
            )}
          </div>
          {trip.isActive && (
            <span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-sm font-medium">
              In corso
            </span>
          )}
        </div>
        <div className="flex items-center gap-6 text-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>{trip.startLocation} → {trip.endLocation}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{new Date(trip.startDate).toLocaleDateString("it-IT")}</span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-emerald-500/30 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Spese totali</p>
            <p className="text-2xl font-bold text-foreground">
              {currencySymbol}{(totalExpenses / 100).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Tappe</p>
            <p className="text-2xl font-bold text-foreground">{trip.stops.length}</p>
          </div>
        </div>
        
        {/* Controlli stato e visibilità */}
        <div className="mt-4 pt-4 border-t border-emerald-500/30 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Stato viaggio</p>
            <div className="flex gap-1.5">
              {[
                { value: "planned", label: "Pianificato", icon: Calendar },
                { value: "in_progress", label: "In corso", icon: Play },
                { value: "completed", label: "Completato", icon: CheckCircle2 }
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleChangeStatus(opt.value)}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all ${
                    status === opt.value 
                      ? "bg-emerald-500 text-white" 
                      : "bg-accent/50 text-muted-foreground hover:bg-accent"
                  }`}
                  data-testid={`status-${opt.value}`}
                >
                  <opt.icon className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{opt.label.split(" ")[0]}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Visibilità</p>
            <button
              onClick={handleTogglePublic}
              className={`w-full py-2.5 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                isPublic 
                  ? "bg-blue-500 text-white" 
                  : "bg-accent/50 text-muted-foreground"
              }`}
              data-testid="toggle-public"
            >
              {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              {isPublic ? "Pubblico" : "Privato"}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Tappe del viaggio</h3>
        <Button 
          onClick={onAddStop}
          size="sm"
          className="bg-emerald-500 hover:bg-emerald-600"
          data-testid="button-add-stop"
        >
          <Plus className="w-4 h-4 mr-1" />
          Aggiungi
        </Button>
      </div>

      {trip.stops.length === 0 ? (
        <div className="text-center py-8 bg-muted/50 rounded-xl border border-dashed border-border">
          <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">Nessuna tappa ancora</p>
          <p className="text-sm text-muted-foreground">Aggiungi la tua prima destinazione</p>
        </div>
      ) : (
        <div className="space-y-2">
          {trip.stops.length >= 2 && !trip.stops.some(s => s.transportMode) && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg mb-3">
              <p className="text-sm text-blue-400 flex items-center gap-2">
                <Leaf className="w-4 h-4" />
                Scegli come viaggiare tra le tappe per calcolare il CO2
              </p>
            </div>
          )}
          {trip.stops.map((stop, index) => (
            <div key={stop.id}>
              {index > 0 && (
                <TransportSelector 
                  stop={stop}
                  prevStop={trip.stops[index - 1]}
                  onUpdate={(transportMode, distanceKm, co2Kg) => {
                    fetch(`/api/trips/${trip.id}/stops/${stop.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ transportMode, distanceKm, co2Kg })
                    });
                  }}
                />
              )}
              <StopCard 
                stop={stop} 
                index={index}
                currency={trip.currency}
                onAddExpense={() => onAddExpense(stop.id)}
                prevCity={index > 0 ? trip.stops[index - 1].city : undefined}
                tripUserId={trip.userId}
                onStopUpdated={onRefresh}
              />
            </div>
          ))}
          
          <TripCO2Summary stops={trip.stops} />
        </div>
      )}

      {showReplay && (
        <TripReplay
          tripTitle={trip.title}
          stops={trip.stops}
          userAvatar={trip.user?.avatar || undefined}
          userName={trip.user?.name || trip.user?.username}
          onClose={() => setShowReplay(false)}
        />
      )}
    </motion.div>
  );
}

function TransportSelector({ 
  stop, 
  prevStop,
  onUpdate 
}: { 
  stop: TripStop; 
  prevStop: TripStop;
  onUpdate: (transportMode: string, distanceKm: number, co2Kg: number) => void;
}) {
  const [selected, setSelected] = useState(stop.transportMode || "");
  
  const distance = (prevStop.latitude && prevStop.longitude && stop.latitude && stop.longitude)
    ? calculateDistance(prevStop.latitude, prevStop.longitude, stop.latitude, stop.longitude)
    : 500;
  
  const handleSelect = (mode: string) => {
    setSelected(mode);
    const co2 = Math.round(distance * (CO2_PER_KM[mode] || 0));
    onUpdate(mode, distance, co2);
  };

  const selectedOption = TRANSPORT_OPTIONS.find(o => o.value === selected);
  const duration = selected ? formatDuration(distance / SPEED_KMH[selected] + (selected === "plane" ? 2 : 0)) : null;
  const co2 = selected ? Math.round(distance * (CO2_PER_KM[selected] || 0)) : 0;

  return (
    <div className="py-4 px-2">
      <div className="bg-muted/60 rounded-xl p-3 border border-border/50">
        <p className="text-xs text-muted-foreground text-center mb-2">Come arrivi qui?</p>
        <div className="flex justify-center gap-1">
          {TRANSPORT_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = selected === option.value;
            return (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                  isSelected 
                    ? "text-white scale-105" 
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
                style={{ backgroundColor: isSelected ? option.color : "transparent" }}
                title={option.label}
                data-testid={`transport-${option.value}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px]">{option.label}</span>
              </button>
            );
          })}
        </div>
        {selected && (
          <div className="flex justify-center items-center gap-3 mt-3 pt-2 border-t border-border/50">
            <span className="text-sm text-foreground">{distance} km</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-sm text-muted-foreground">{duration}</span>
            <span className="text-muted-foreground">•</span>
            {co2 > 0 ? (
              <span className="text-sm text-amber-400 font-medium">{co2} kg CO₂</span>
            ) : (
              <span className="text-sm text-green-400 flex items-center gap-1 font-medium">
                <Leaf className="w-3 h-3" /> Eco!
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TripCO2Summary({ stops }: { stops: TripStop[] }) {
  const totalCO2 = stops.reduce((sum, stop) => sum + (stop.co2Kg || 0), 0);
  const totalDistance = stops.reduce((sum, stop) => sum + (stop.distanceKm || 0), 0);
  const stopsWithTransport = stops.filter(s => s.transportMode).length;
  
  if (stopsWithTransport === 0) return null;
  
  const isEcoFriendly = totalCO2 < totalDistance * 0.1;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mt-4 p-4 rounded-xl border ${
        isEcoFriendly 
          ? "bg-green-500/10 border-green-500/30" 
          : "bg-muted/50 border-border/50"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isEcoFriendly ? "bg-green-500/20 text-green-400" : "bg-accent text-muted-foreground"
          }`}>
            <Leaf className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Impatto Ambientale</p>
            <p className="text-xs text-muted-foreground">{totalDistance} km totali</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold ${isEcoFriendly ? "text-green-400" : "text-amber-400"}`}>
            {totalCO2} kg CO₂
          </p>
          {isEcoFriendly && (
            <p className="text-xs text-green-400 flex items-center gap-1 justify-end">
              <CheckCircle2 className="w-3 h-3" /> Viaggio eco-friendly!
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function DiaryStopMapPopup({ stop, index, tripUserId, onStopUpdated }: {
  stop: TripStop & { expenses?: TripExpense[] };
  index: number;
  tripUserId?: string;
  onStopUpdated?: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const isOwner = user?.id === tripUserId;
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
        onStopUpdated?.();
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
    <div ref={containerRef} className="w-[300px]" data-testid={`popup-diary-stop-${stop.id}`}>
      <div className="relative" style={!hasPhotos ? { background: `linear-gradient(135deg, #f9731630, #f9731660)` } : undefined}>
        {hasPhotos && currentPhoto ? (
          <div className="relative group">
            <img src={currentPhoto.url} className="w-full h-40 object-cover" alt={stop.city} />
            {allPhotos.length > 1 && (
              <>
                <button onClick={() => setSelectedPhotoIdx(i => (i - 1 + allPhotos.length) % allPhotos.length)} className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </button>
                <button onClick={() => setSelectedPhotoIdx(i => (i + 1) % allPhotos.length)} className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="w-4 h-4" />
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
                data-testid={`diary-map-delete-photo-${currentPhoto.id}`}
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
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map(s => (
                    <button key={s} onClick={isOwner ? () => { setStopRating(s); if (!editingNotes) setEditingNotes(true); } : undefined} className={isOwner ? "cursor-pointer" : "cursor-default"} data-testid={`diary-map-rating-${stop.id}-${s}`}>
                      <Star className={`w-4 h-4 drop-shadow-md ${s <= stopRating ? 'fill-amber-400 text-amber-400' : 'text-white/50'}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 pb-2">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                {index + 1}
              </div>
              <div className="flex-1">
                <p className="font-bold text-base leading-tight">{stop.city}</p>
                <p className="text-sm text-gray-500">{stop.country}</p>
              </div>
            </div>
            <div className="flex items-center gap-0.5 mb-1">
              {[1,2,3,4,5].map(s => (
                <button key={s} onClick={isOwner ? () => { setStopRating(s); if (!editingNotes) setEditingNotes(true); } : undefined} className={isOwner ? "cursor-pointer" : "cursor-default"} data-testid={`diary-map-rating-${stop.id}-${s}`}>
                  <Star className={`w-5 h-5 ${s <= stopRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                </button>
              ))}
              {stopRating > 0 && <span className="text-xs text-gray-500 ml-1">{stopRating}/5</span>}
            </div>
          </div>
        )}
      </div>

      <div className="p-3 space-y-2">
        {isOwner && (
          <label className="flex items-center justify-center w-full h-9 border-2 border-dashed border-blue-400/40 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-500/10 transition-all">
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
              data-testid={`diary-map-upload-photo-${stop.id}`}
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
        )}

        {isOwner ? (
          editingNotes ? (
            <div className="space-y-1.5 bg-emerald-50 dark:bg-emerald-950/20 p-2.5 rounded-xl">
              <div className="flex items-center gap-1.5">
                <Pencil className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Le tue note</span>
              </div>
              <Textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Come è stato questo posto? Consigli..."
                className="bg-white dark:bg-gray-900 border-emerald-200 dark:border-emerald-800 text-xs min-h-[60px] rounded-lg"
                rows={2}
                data-testid={`diary-map-notes-${stop.id}`}
              />
              <div className="flex gap-1.5">
                <Button onClick={handleSaveNotes} disabled={savingNotes} size="sm" className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs h-7" data-testid={`diary-map-save-${stop.id}`}>
                  {savingNotes ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3 mr-1" /> Salva</>}
                </Button>
                <Button onClick={() => { setEditingNotes(false); setNotesText(savedNotes); setStopRating(stop.rating || 0); }} variant="outline" size="sm" className="text-xs h-7" data-testid={`diary-map-cancel-${stop.id}`}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ) : (
            <div onClick={() => setEditingNotes(true)} className="cursor-pointer group">
              {savedNotes ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-2 flex items-start gap-2 hover:bg-emerald-100 dark:hover:bg-emerald-950/30 transition-colors">
                  <p className="text-xs text-gray-600 dark:text-gray-400 italic flex-1">"{savedNotes}"</p>
                  <Pencil className="w-3 h-3 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 text-center hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                  <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
                    <Pencil className="w-3 h-3" /> Aggiungi note e impressioni
                  </p>
                </div>
              )}
            </div>
          )
        ) : savedNotes ? (
          <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-2">
            <p className="text-xs text-gray-600 dark:text-gray-400 italic">"{savedNotes}"</p>
          </div>
        ) : null}

        {stop.arrivalDate && (
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <Calendar className="w-3 h-3" />
            {new Date(stop.arrivalDate).toLocaleDateString("it-IT")}
            {stop.departureDate && ` → ${new Date(stop.departureDate).toLocaleDateString("it-IT")}`}
          </div>
        )}

        {stop.transportMode && (
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <span className="capitalize">{stop.transportMode}</span>
            {stop.distanceKm && <span>· {stop.distanceKm} km</span>}
            {stop.co2Kg ? <span className="text-emerald-600">· {stop.co2Kg} kg CO₂</span> : null}
          </div>
        )}

        {stop.latitude && stop.longitude && (
          <WeatherWidget latitude={stop.latitude} longitude={stop.longitude} compact />
        )}
      </div>
    </div>
  );
}

function StopCard({ 
  stop, 
  index, 
  currency,
  onAddExpense,
  prevCity,
  tripUserId,
  onStopUpdated
}: { 
  stop: TripStop & { expenses: TripExpense[] }; 
  index: number;
  currency: string;
  onAddExpense: () => void;
  prevCity?: string;
  tripUserId?: string;
  onStopUpdated?: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);
  const [photosLoaded, setPhotosLoaded] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showMeetupForm, setShowMeetupForm] = useState(false);
  const [meetupMessage, setMeetupMessage] = useState("");
  const [meetupDate, setMeetupDate] = useState("");
  const [submittingMeetup, setSubmittingMeetup] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState(stop.notes || "");
  const [savedNotes, setSavedNotes] = useState(stop.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [stopRating, setStopRating] = useState(stop.rating || 0);
  const [savedRating, setSavedRating] = useState(stop.rating || 0);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

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
        toast({ title: "Errore salvataggio foto", variant: "destructive" });
      }
    },
    onError: (error) => {
      toast({ title: "Errore upload", description: error.message, variant: "destructive" });
    },
  });
  const currencySymbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : currency;
  const totalStopExpenses = stop.expenses.reduce((sum, e) => sum + e.cost, 0);

  const fetchPhotos = async () => {
    if (photosLoaded) return;
    try {
      const res = await fetch(`/api/stops/${stop.id}/photos`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setPhotos(data);
      }
    } catch (err) {
      console.error("Failed to fetch photos:", err);
    }
    setPhotosLoaded(true);
  };

  const fetchReviews = async () => {
    if (reviewsLoaded) return;
    try {
      const res = await fetch(`/api/stops/${stop.id}/reviews`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
      }
    } catch (err) {
      console.error("Failed to fetch reviews:", err);
    }
    setReviewsLoaded(true);
  };

  const handleExpand = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    if (newExpanded) {
      fetchPhotos();
      fetchReviews();
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    setDeletingPhotoId(photoId);
    try {
      const res = await fetch(`/api/stop-photos/${photoId}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        setPhotos(prev => prev.filter((p: any) => p.id !== photoId));
        toast({ title: "Foto rimossa" });
      }
    } catch {
      toast({ title: "Errore", variant: "destructive" });
    }
    setDeletingPhotoId(null);
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/trips/stops/${stop.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notes: notesText, rating: stopRating || undefined }),
      });
      if (res.ok) {
        setEditingNotes(false);
        setSavedNotes(notesText);
        setSavedRating(stopRating);
        toast({ title: "Tappa aggiornata!" });
        onStopUpdated?.();
      }
    } catch {
      toast({ title: "Errore", variant: "destructive" });
    }
    setSavingNotes(false);
  };

  const handleSubmitReview = async () => {
    if (reviewRating === 0) {
      toast({ title: "Seleziona una valutazione", variant: "destructive" });
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/stops/${stop.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment || undefined }),
      });
      if (res.ok) {
        const newReview = await res.json();
        setReviews(prev => [...prev, newReview]);
        setShowReviewForm(false);
        setReviewRating(0);
        setReviewComment("");
        toast({ title: "Recensione pubblicata!" });
      } else {
        toast({ title: "Errore", variant: "destructive" });
      }
    } catch {
      toast({ title: "Errore", variant: "destructive" });
    }
    setSubmittingReview(false);
  };

  const handleSubmitMeetup = async () => {
    if (!meetupMessage.trim()) {
      toast({ title: "Scrivi un messaggio", variant: "destructive" });
      return;
    }
    setSubmittingMeetup(true);
    try {
      const res = await fetch(`/api/stops/${stop.id}/meetup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: meetupMessage, date: meetupDate || undefined }),
      });
      if (res.ok) {
        setShowMeetupForm(false);
        setMeetupMessage("");
        setMeetupDate("");
        toast({ title: "Richiesta di incontro inviata!" });
      } else {
        toast({ title: "Errore", variant: "destructive" });
      }
    } catch {
      toast({ title: "Errore", variant: "destructive" });
    }
    setSubmittingMeetup(false);
  };

  const allPhotoUrls = [
    ...(stop.imageUrl ? [stop.imageUrl] : []),
    ...photos.map((p: any) => typeof p === 'string' ? p : p.url),
  ];

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : null;

  const isOwner = user?.id === tripUserId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-muted/50 rounded-xl border border-border/50 overflow-hidden"
      data-testid={`stop-card-${stop.id}`}
    >
      <div 
        className="p-4 cursor-pointer"
        onClick={handleExpand}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-foreground font-bold">
            {index + 1}
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-foreground">{stop.city}, {stop.country}</h4>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{new Date(stop.arrivalDate).toLocaleDateString("it-IT")}</span>
              {stop.departureDate && (
                <span>→ {new Date(stop.departureDate).toLocaleDateString("it-IT")}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center" title="Galleria foto">
                <Camera className="w-3 h-3 text-blue-400" />
              </div>
              <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center" title="Recensioni">
                <Star className="w-3 h-3 text-amber-400" />
              </div>
              <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center" title="Incontri">
                <Users className="w-3 h-3 text-purple-400" />
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{stop.expenses.length} spese</p>
              <p className="font-semibold text-emerald-400">
                {currencySymbol}{(totalStopExpenses / 100).toFixed(2)}
              </p>
            </div>
          </div>
          <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border/50"
          >
            <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
              {stop.notes && !isOwner && (
                <p className="text-sm text-muted-foreground italic">"{stop.notes}"</p>
              )}

              <div data-testid={`social-sections-${stop.id}`} className="space-y-3">
                <div data-testid={`photo-gallery-${stop.id}`} className="p-3 rounded-lg" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(6,182,212,0.12))', border: '1.5px solid rgba(59,130,246,0.3)' }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Camera className="w-4 h-4 text-blue-400" />
                    <p className="text-sm font-bold text-blue-400">Foto della tappa</p>
                    <span className="text-xs text-blue-300/70 ml-auto">{allPhotoUrls.length} foto</span>
                  </div>
                  {allPhotoUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {allPhotoUrls.map((photoUrl, idx) => {
                        const photoObj = idx === 0 && stop.imageUrl ? null : photos[stop.imageUrl ? idx - 1 : idx];
                        return (
                          <div key={idx} className="relative group">
                            <img src={photoUrl} alt="" className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-blue-500/30" data-testid={`photo-thumb-${stop.id}-${idx}`} />
                            {isOwner && photoObj?.id && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photoObj.id); }}
                                disabled={deletingPhotoId === photoObj.id}
                                className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-500 hover:bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                data-testid={`button-delete-photo-${stop.id}-${idx}`}
                              >
                                {deletingPhotoId === photoObj.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {isOwner && (
                    <label className="flex items-center justify-center w-full h-10 border-2 border-dashed border-blue-500/30 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-500/10 transition-colors" onClick={(e) => e.stopPropagation()}>
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
                        data-testid={`input-upload-photo-${stop.id}`}
                      />
                      {isUploadingPhoto ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                          <span className="text-xs text-blue-400">{photoUploadProgress}%</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Plus className="w-4 h-4 text-blue-400" />
                          <span className="text-xs font-medium text-blue-400">Aggiungi foto</span>
                        </div>
                      )}
                    </label>
                  )}
                  {!isOwner && allPhotoUrls.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">Nessuna foto ancora</p>
                  )}
                </div>

                {isOwner && (
                  <div className="p-3 rounded-lg" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.12))', border: '1.5px solid rgba(16,185,129,0.3)' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Edit className="w-4 h-4 text-emerald-400" />
                      <p className="text-sm font-bold text-emerald-400">Le tue note</p>
                      <div className="flex ml-auto gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <button key={s} onClick={(e) => { e.stopPropagation(); setStopRating(s); if (!editingNotes) setEditingNotes(true); }} className="p-0" data-testid={`stop-rating-star-${stop.id}-${s}`}>
                            <Star className={`w-4 h-4 ${s <= stopRating ? 'fill-emerald-400 text-emerald-400' : 'text-gray-500'}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                    {editingNotes ? (
                      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                        <Textarea value={notesText} onChange={(e) => setNotesText(e.target.value)} placeholder="Le tue impressioni su questa tappa..." className="bg-accent/50 border-border text-sm" rows={3} data-testid={`textarea-notes-${stop.id}`} />
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setEditingNotes(false); setNotesText(savedNotes); }} className="flex-1" data-testid={`button-cancel-notes-${stop.id}`}>Annulla</Button>
                          <Button size="sm" onClick={(e) => { e.stopPropagation(); handleSaveNotes(); }} disabled={savingNotes} className="flex-1 bg-emerald-500 hover:bg-emerald-600" data-testid={`button-save-notes-${stop.id}`}>{savingNotes ? <Loader2 className="w-3 h-3 animate-spin" /> : "Salva"}</Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {savedNotes ? (
                          <p className="text-sm text-muted-foreground italic mb-1">"{savedNotes}"</p>
                        ) : (
                          <p className="text-xs text-muted-foreground mb-1">Nessuna nota ancora</p>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); setEditingNotes(true); }} className="text-xs font-medium text-emerald-400 hover:text-emerald-300" data-testid={`button-edit-notes-${stop.id}`}>
                          {savedNotes ? "Modifica note" : "Scrivi le tue note"}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div data-testid={`reviews-section-${stop.id}`} className="p-2.5 rounded-lg" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(249,115,22,0.12))', border: '1.5px solid rgba(245,158,11,0.3)' }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Star className="w-4 h-4 text-amber-400" />
                      <p className="text-xs font-bold text-amber-400">Recensioni</p>
                      {avgRating ? (
                        <span className="text-[10px] text-amber-300 ml-auto">{avgRating} ({reviews.length})</span>
                      ) : (
                        <span className="text-[10px] text-amber-300/70 ml-auto">0</span>
                      )}
                    </div>
                    {reviews.length > 0 ? (
                      <div className="space-y-1">
                        {reviews.slice(0, 2).map((review: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-1">
                            <div className="flex">{[1,2,3,4,5].map(i => <Star key={i} className={`w-2.5 h-2.5 ${i <= (review.rating||0) ? 'fill-amber-400 text-amber-400' : 'text-gray-600'}`} />)}</div>
                            {review.user && <span className="text-[10px] text-foreground/60 truncate">{review.user.name?.split(' ')[0]}</span>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground leading-tight">{isOwner ? "Gli altri nomadi potranno recensire le tue tappe" : "Nessuna ancora"}</p>
                    )}
                    {!isOwner && user && !showReviewForm && (
                      <button onClick={(e) => { e.stopPropagation(); setShowReviewForm(true); }} className="mt-1 w-full text-center text-[11px] font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-md py-1.5 transition-colors" data-testid={`button-leave-review-${stop.id}`}>Recensisci</button>
                    )}
                  </div>

                  {tripUserId && (
                  <div data-testid={`meetup-section-${stop.id}`} className="p-2.5 rounded-lg" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(236,72,153,0.12))', border: '1.5px solid rgba(168,85,247,0.3)' }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Users className="w-4 h-4 text-purple-400" />
                      <p className="text-xs font-bold text-purple-400">Incontri</p>
                    </div>
                    {isOwner ? (
                      <p className="text-[11px] text-muted-foreground leading-tight">I nomadi potranno chiederti un incontro qui</p>
                    ) : !showMeetupForm ? (
                      <button onClick={(e) => { e.stopPropagation(); setShowMeetupForm(true); }} className="mt-1 w-full text-center text-[11px] font-bold text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 rounded-md py-1.5 transition-colors" data-testid={`button-meetup-${stop.id}`}>Incontriamoci!</button>
                    ) : null}
                  </div>
                  )}
                </div>
              </div>

              {showReviewForm && (
                <div className="p-3 rounded-lg space-y-2" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }} data-testid={`review-form-${stop.id}`}>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button key={star} type="button" onClick={(e) => { e.stopPropagation(); setReviewRating(star); }} className="p-0.5 hover:scale-110 transition-transform" data-testid={`review-star-${stop.id}-${star}`}>
                        <Star className={`w-5 h-5 ${star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-gray-500'}`} />
                      </button>
                    ))}
                  </div>
                  <Textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Commento (opzionale)..." className="bg-accent border-border text-sm" rows={2} onClick={(e) => e.stopPropagation()} data-testid={`review-comment-${stop.id}`} />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setShowReviewForm(false); setReviewRating(0); setReviewComment(""); }} className="flex-1" data-testid={`button-cancel-review-${stop.id}`}>Annulla</Button>
                    <Button size="sm" onClick={(e) => { e.stopPropagation(); handleSubmitReview(); }} disabled={submittingReview || reviewRating === 0} className="flex-1 bg-emerald-500 hover:bg-emerald-600" data-testid={`button-submit-review-${stop.id}`}>{submittingReview ? <Loader2 className="w-3 h-3 animate-spin" /> : "Pubblica"}</Button>
                  </div>
                </div>
              )}

              {showMeetupForm && (
                <div className="p-3 rounded-lg space-y-2" style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)' }} data-testid={`meetup-form-${stop.id}`}>
                  <p className="text-xs font-medium text-purple-400">Richiesta di incontro</p>
                  <Textarea value={meetupMessage} onChange={(e) => setMeetupMessage(e.target.value)} placeholder="Ciao! Mi piacerebbe incontrarci a..." className="bg-accent border-border text-sm" rows={2} onClick={(e) => e.stopPropagation()} data-testid={`meetup-message-${stop.id}`} />
                  <Input type="date" value={meetupDate} onChange={(e) => setMeetupDate(e.target.value)} className="bg-accent border-border text-sm" onClick={(e) => e.stopPropagation()} data-testid={`meetup-date-${stop.id}`} />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setShowMeetupForm(false); setMeetupMessage(""); setMeetupDate(""); }} className="flex-1" data-testid={`button-cancel-meetup-${stop.id}`}>Annulla</Button>
                    <Button size="sm" onClick={(e) => { e.stopPropagation(); handleSubmitMeetup(); }} disabled={submittingMeetup || !meetupMessage.trim()} className="flex-1 bg-purple-500 hover:bg-purple-600" data-testid={`button-submit-meetup-${stop.id}`}>{submittingMeetup ? <Loader2 className="w-3 h-3 animate-spin" /> : "Invia"}</Button>
                  </div>
                </div>
              )}

              {stop.expenses.length > 0 && (
                <div className="space-y-2">
                  {stop.expenses.map((expense) => {
                    const expenseType = expenseTypes.find(t => t.value === expense.type);
                    const Icon = expenseType?.icon || MoreHorizontal;
                    return (
                      <div 
                        key={expense.id}
                        className="flex items-center gap-3 p-2 bg-accent/30 rounded-lg"
                        data-testid={`expense-${expense.id}`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                          <Icon className="w-4 h-4 text-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{expense.name}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{expenseType?.label}</span>
                            {expense.rating && (
                              <span className="text-xs text-amber-400">
                                {"⭐".repeat(expense.rating)}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="font-semibold text-emerald-400">
                          {currencySymbol}{(expense.cost / 100).toFixed(2)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
              
              <div className="flex gap-2 flex-wrap">
                <Button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddExpense();
                  }}
                  variant="outline"
                  size="sm"
                  className="flex-1 border-dashed border-border text-muted-foreground hover:text-foreground min-w-[120px]"
                  data-testid={`button-add-expense-${stop.id}`}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Aggiungi spesa
                </Button>
                <Button 
                  onClick={(e) => {
                    e.stopPropagation();
                    searchFlights(prevCity, stop.city, stop.arrivalDate);
                  }}
                  variant="outline"
                  size="sm"
                  className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                  data-testid={`button-find-flights-${stop.id}`}
                >
                  <Plane className="w-4 h-4 mr-2" />
                  Voli
                </Button>
                <Button 
                  onClick={(e) => {
                    e.stopPropagation();
                    searchHotels(stop.city, stop.arrivalDate, stop.departureDate);
                  }}
                  variant="outline"
                  size="sm"
                  className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                  data-testid={`button-find-hotel-${stop.id}`}
                >
                  <Hotel className="w-4 h-4 mr-2" />
                  Hotel
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const tripColors = [
  "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6", "#3b82f6", 
  "#ec4899", "#10b981", "#f97316", "#06b6d4", "#84cc16"
];

function ExploreTripsMap({ 
  trips, 
  onSelectTrip,
  onCopyStop,
  userTrips,
  onBack,
  highlightedTripId
}: { 
  trips: TripWithDetails[]; 
  onSelectTrip: (tripId: string) => void;
  onCopyStop: (stop: TripStop, targetTripId: string) => void;
  userTrips: Trip[];
  onBack: () => void;
  highlightedTripId?: string;
}) {
  const { theme } = useTheme();
  const tileUrl = theme === "dark"
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
  const [copyingStopId, setCopyingStopId] = useState<string | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(highlightedTripId || null);

  const openDirections = (lat: number, lng: number, label?: string) => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const destination = `${lat},${lng}`;
    if (isIOS) {
      window.open(`maps://maps.apple.com/?daddr=${destination}&q=${encodeURIComponent(label || "")}`, "_blank");
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}`, "_blank");
    }
  };
  
  const allStopsWithCoords = trips.flatMap((trip, tripIndex) => 
    trip.stops
      .filter(stop => stop.latitude && stop.longitude)
      .map(stop => ({ ...stop, trip, tripColor: tripColors[tripIndex % tripColors.length] }))
  );

  const tripPolylines = trips.map((trip, tripIndex) => {
    const stopsWithCoords = trip.stops
      .filter(stop => stop.latitude && stop.longitude)
      .sort((a, b) => a.orderIndex - b.orderIndex);
    
    const positions: [number, number][] = stopsWithCoords.map(
      stop => [stop.latitude!, stop.longitude!]
    );
    
    return {
      tripId: trip.id,
      positions,
      color: tripColors[tripIndex % tripColors.length],
      title: trip.title,
      user: trip.user,
    };
  }).filter(p => p.positions.length > 0);

  const defaultCenter: [number, number] = allStopsWithCoords.length > 0
    ? [allStopsWithCoords[0].latitude!, allStopsWithCoords[0].longitude!]
    : [20, 0];

  return (
    <div className="h-[calc(100vh-180px)] relative">
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-[1000] bg-card/90 backdrop-blur-sm text-foreground px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-accent transition-colors shadow-lg"
        data-testid="button-back-from-explore"
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        I Miei Viaggi
      </button>
      <MapContainer
        center={defaultCenter}
        zoom={allStopsWithCoords.length > 0 ? 4 : 2}
        style={{ height: "100%", width: "100%" }}
        className="rounded-lg overflow-hidden"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url={tileUrl}
        />
        
        {tripPolylines.map((polyline) => (
          <CurvedRouteLine
            key={polyline.tripId}
            positions={polyline.positions}
            color={polyline.color}
            opacity={selectedTripId && selectedTripId !== polyline.tripId ? 0.3 : 0.8}
            dashed={true}
          />
        ))}
        
        {allStopsWithCoords.map((stop, index) => {
          const trip = stop.trip;
          const sortedTripStops = trip.stops
            .filter(s => s.latitude && s.longitude)
            .sort((a, b) => a.orderIndex - b.orderIndex);
          const stopIdx = sortedTripStops.findIndex(s => s.id === stop.id);
          return (
          <Marker
            key={stop.id}
            position={[stop.latitude!, stop.longitude!]}
            icon={createStopMarkerIcon(stop.orderIndex, stop.tripColor, trip.user?.avatar, stop.imageUrl)}
            eventHandlers={{
              click: () => setSelectedTripId(trip.id),
            }}
          >
            <Popup className="custom-popup" maxWidth={340} minWidth={280} autoPanPadding={[20, 20]} autoPan={true}>
              <div className="w-[280px]" data-testid={`popup-explore-stop-${stop.id}`}>
                {stop.imageUrl ? (
                  <div className="relative">
                    <img src={stop.imageUrl} className="w-full h-32 object-cover" alt={stop.city} />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-bold text-sm">{stop.city}</p>
                          <p className="text-white/70 text-xs">{stop.country}</p>
                        </div>
                        {stop.rating && (
                          <div className="flex items-center gap-0.5">
                            {[1,2,3,4,5].map(i => (
                              <Star key={i} style={{width:14,height:14}} className={i <= (stop.rating||0) ? "fill-amber-400 text-amber-400" : "text-gray-300"} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 pb-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div style={{ background: stop.tripColor }} className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm">
                          {stop.orderIndex + 1}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{stop.city}</p>
                          <p className="text-xs text-gray-500">{stop.country}</p>
                        </div>
                      </div>
                      {stop.rating && (
                        <div className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map(i => (
                            <Star key={i} style={{width:12,height:12}} className={i <= (stop.rating||0) ? "fill-amber-400 text-amber-400" : "text-gray-300"} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="p-3 space-y-2">
                  <a
                    href={`/user/${trip.user?.id || trip.userId}`}
                    className="flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-1 -m-1 transition-colors"
                  >
                    <img
                      src={trip.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${trip.user?.username || trip.userId}`}
                      className="w-7 h-7 rounded-full object-cover ring-2 ring-emerald-500/20"
                      alt={trip.user?.name || "User"}
                    />
                    <div>
                      <p className="font-semibold text-xs text-emerald-600">{trip.user?.name || "Nomade"}</p>
                      <p className="text-[10px] text-gray-400">{trip.title}</p>
                    </div>
                  </a>

                  {stop.accommodationName && (
                    <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg px-2.5 py-2">
                      <Bed className="w-4 h-4 shrink-0" />
                      <div>
                        <p className="font-semibold text-xs">{stop.accommodationName}</p>
                        {stop.accommodationType && <p className="text-blue-500 dark:text-blue-400 text-[10px] capitalize">{stop.accommodationType}</p>}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-[11px] text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(stop.arrivalDate).toLocaleDateString("it-IT")}
                      {stop.departureDate && ` → ${new Date(stop.departureDate).toLocaleDateString("it-IT")}`}
                    </span>
                  </div>

                  {stop.notes && stop.notes !== "Aggiunta dalla mappa" && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">"{stop.notes}"</p>
                  )}

                  {stop.transportMode && (
                    <div className="flex items-center gap-2 text-[11px] text-gray-500">
                      <span className="capitalize">{stop.transportMode}</span>
                      {stop.distanceKm && <span>· {stop.distanceKm} km</span>}
                      {stop.co2Kg ? <span className="text-emerald-600">· {stop.co2Kg} kg CO₂</span> : null}
                    </div>
                  )}

                  <WeatherWidget latitude={stop.latitude!} longitude={stop.longitude!} />

                  <div className="flex gap-1.5 pt-1 flex-wrap">
                    <a
                      href={`/trip/${trip.id}`}
                      className="flex-1 flex items-center justify-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg py-1.5 text-[11px] font-semibold transition-colors min-w-[60px]"
                      data-testid={`link-explore-diary-${stop.id}`}
                    >
                      <ExternalLink className="w-3 h-3" />
                      Diario
                    </a>
                    {stop.latitude && stop.longitude && (
                      <button
                        onClick={() => openDirections(stop.latitude!, stop.longitude!, `${stop.city}, ${stop.country}`)}
                        className="flex items-center justify-center gap-1 bg-green-500 hover:bg-green-600 text-white rounded-lg py-1.5 px-2 text-[11px] font-semibold transition-colors"
                        data-testid={`button-explore-directions-${stop.id}`}
                        title="Indicazioni"
                      >
                        <Navigation className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={() => searchFlights(stopIdx > 0 ? sortedTripStops[stopIdx - 1].city : undefined, stop.city, stop.arrivalDate)}
                      className="flex items-center justify-center gap-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-1.5 px-2 text-[11px] font-semibold transition-colors"
                      data-testid={`button-explore-flights-${stop.id}`}
                      title="Cerca voli"
                    >
                      <Plane className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => searchHotels(stop.city, stop.arrivalDate, stop.departureDate)}
                      className="flex items-center justify-center gap-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-1.5 px-2 text-[11px] font-semibold transition-colors"
                      data-testid={`button-explore-hotel-${stop.id}`}
                      title="Cerca hotel"
                    >
                      <Hotel className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleShare("trip", trip.id, trip.title, () => {})}
                      className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
                      data-testid={`button-explore-share-${trip.id}`}
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {userTrips.length > 0 && (
                    <div className="pt-1">
                      {copyingStopId === stop.id ? (
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              onCopyStop(stop, e.target.value);
                              setCopyingStopId(null);
                            }
                          }}
                          className="w-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs py-1.5 px-2 rounded-lg border-none"
                          autoFocus
                        >
                          <option value="">Scegli viaggio...</option>
                          {userTrips.filter(t => t.status === "planned").map(t => (
                            <option key={t.id} value={t.id}>{t.title}</option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={() => setCopyingStopId(stop.id)}
                          className="w-full bg-violet-500 hover:bg-violet-600 text-white text-xs py-1.5 px-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-1"
                          data-testid={`button-explore-copy-${stop.id}`}
                        >
                          <Plus className="w-3 h-3" />
                          Aggiungi al mio viaggio
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
          );
        })}
      </MapContainer>
      
      {trips.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <div className="text-center">
            <Globe className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Nessun viaggio pubblico</h3>
            <p className="text-muted-foreground">I viaggi condivisi dagli altri nomadi appariranno qui</p>
          </div>
        </div>
      )}
      
      {trips.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4 bg-card/90 backdrop-blur-sm rounded-xl p-4 max-h-48 overflow-y-auto">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Viaggi pubblici ({trips.length})
          </h3>
          <div className="space-y-2">
            {trips.map((trip, index) => (
              <div
                key={trip.id}
                onClick={() => setSelectedTripId(trip.id)}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                  selectedTripId === trip.id ? "bg-emerald-500/20 border border-emerald-500/50" : "hover:bg-accent"
                }`}
              >
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tripColors[index % tripColors.length] }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{trip.title}</p>
                  <p className="text-xs text-muted-foreground">{trip.user?.name || trip.user?.username || "Nomade"} • {trip.stops?.length || 0} tappe</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTrip(trip.id);
                  }}
                  className="text-xs text-emerald-400 hover:text-emerald-300"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function UserLocationMarker({ position }: { position: [number, number] | null }) {
  if (!position) return null;
  
  const userIcon = L.divIcon({
    html: `<div class="user-location-marker">
      <div class="user-location-pulse"></div>
      <div class="user-location-dot"></div>
    </div>`,
    className: "user-location-icon",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
  
  return <Marker position={position} icon={userIcon} />;
}

type TransportMode = "walk" | "bike" | "train" | "car" | "plane";

function getTransportOptions(distance: number) {
  return [
    { mode: "walk" as TransportMode, label: "A piedi", icon: Footprints, available: distance <= 30, co2: 0, color: "#22c55e", duration: formatDuration(distance / SPEED_KMH.walk) },
    { mode: "bike" as TransportMode, label: "Bici", icon: Bike, available: distance <= 100, co2: 0, color: "#10b981", duration: formatDuration(distance / SPEED_KMH.bike) },
    { mode: "train" as TransportMode, label: "Treno", icon: Train, available: true, co2: Math.round(distance * CO2_PER_KM.train), color: "#3b82f6", duration: formatDuration(distance / SPEED_KMH.train) },
    { mode: "car" as TransportMode, label: "Auto", icon: Car, available: distance <= 2000, co2: Math.round(distance * CO2_PER_KM.car), color: "#f59e0b", duration: formatDuration(distance / SPEED_KMH.car) },
    { mode: "plane" as TransportMode, label: "Aereo", icon: Plane, available: distance > 200, co2: Math.round(distance * CO2_PER_KM.plane), color: "#6366f1", duration: formatDuration(distance / SPEED_KMH.plane + 2) },
  ].filter(o => o.available);
}

function TripPlannerMap({ 
  trip, 
  onAddStopFromMap,
  onClearAllStops,
  onClose,
  userAvatar,
  onStopUpdated
}: { 
  trip: TripWithDetails;
  onAddStopFromMap: (lat: number, lng: number, city: string, country: string) => void;
  onClearAllStops: () => void;
  onClose: () => void;
  userAvatar?: string | null;
  onStopUpdated?: () => void;
}) {
  const [, setLocation] = useLocation();
  const { theme } = useTheme();
  const tileUrl = theme === "dark"
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [cityName, setCityName] = useState("");
  const [countryName, setCountryName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [showCO2Panel, setShowCO2Panel] = useState(true);
  const [selectedTransports, setSelectedTransports] = useState<Record<string, TransportMode>>({});
  const [savedLegs, setSavedLegs] = useState<Record<string, boolean>>({});
  const [prevStopsCount, setPrevStopsCount] = useState(trip.stops.length);
  const { toast } = useToast();
  
  // Apri automaticamente il pannello trasporti quando viene aggiunta una nuova tappa
  useEffect(() => {
    const currentCount = trip.stops.filter(s => s.latitude && s.longitude).length;
    if (currentCount > prevStopsCount && currentCount >= 2) {
      setShowCO2Panel(true);
      toast({ title: "Scegli il mezzo di trasporto", description: "Seleziona come vuoi viaggiare per questa tratta" });
    }
    setPrevStopsCount(currentCount);
  }, [trip.stops]);
  
  // Salva il trasporto nel database
  const handleSelectTransport = async (legId: string, mode: TransportMode, stopId: string, distance: number) => {
    setSelectedTransports(prev => ({ ...prev, [legId]: mode }));
    setSavedLegs(prev => ({ ...prev, [legId]: false }));
    const co2 = Math.round(distance * CO2_PER_KM[mode]);
    
    try {
      await fetch(`/api/trips/${trip.id}/stops/${stopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ transportMode: mode, distanceKm: distance, co2Kg: co2 })
      });
      setSavedLegs(prev => ({ ...prev, [legId]: true }));
      setTimeout(() => setSavedLegs(prev => ({ ...prev, [legId]: false })), 2000);
    } catch (error) {
      console.error("Errore salvataggio trasporto:", error);
    }
  };
  
  const stopsWithCoords = trip.stops
    .filter(stop => stop.latitude && stop.longitude)
    .sort((a, b) => a.orderIndex - b.orderIndex);
  
  const polylinePositions: [number, number][] = stopsWithCoords.map(
    stop => [stop.latitude!, stop.longitude!]
  );

  const legs = stopsWithCoords.slice(0, -1).map((stop, i) => {
    const nextStop = stopsWithCoords[i + 1];
    const distance = calculateDistance(stop.latitude!, stop.longitude!, nextStop.latitude!, nextStop.longitude!);
    const options = getTransportOptions(distance);
    const legId = `${stop.id}-${nextStop.id}`;
    // Priorità: 1) selezione locale, 2) valore salvato nel DB (nextStop.transportMode), 3) opzione più eco
    const selected = selectedTransports[legId] || 
                     (nextStop.transportMode as TransportMode) || 
                     options.find(o => o.co2 === Math.min(...options.map(x => x.co2)))?.mode || 
                     "train";
    return { from: stop, to: nextStop, distance, options, legId, selected, stopId: nextStop.id };
  });

  const totalCO2 = legs.reduce((sum, leg) => {
    const opt = leg.options.find(o => o.mode === leg.selected);
    return sum + (opt?.co2 || 0);
  }, 0);

  const totalDistance = legs.reduce((sum, leg) => sum + leg.distance, 0);
  
  const defaultCenter: [number, number] = stopsWithCoords.length > 0
    ? [stopsWithCoords[0].latitude!, stopsWithCoords[0].longitude!]
    : userLocation || [45.4642, 9.1900];

  const handleMapClick = async (lat: number, lng: number) => {
    setPendingLocation({ lat, lng });
    setIsLoading(true);
    
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`
      );
      const data = await res.json();
      
      const city = data.address?.city || data.address?.town || data.address?.village || data.address?.municipality || "Città sconosciuta";
      const country = data.address?.country || "Paese sconosciuto";
      
      setCityName(city);
      setCountryName(country);
    } catch (error) {
      setCityName("Città sconosciuta");
      setCountryName("Paese sconosciuto");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmStop = () => {
    if (pendingLocation && cityName) {
      onAddStopFromMap(pendingLocation.lat, pendingLocation.lng, cityName, countryName);
      setPendingLocation(null);
      setCityName("");
      setCountryName("");
      toast({ title: "Tappa aggiunta!", description: `${cityName}, ${countryName}` });
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
          toast({ title: "Posizione trovata!" });
        },
        () => {
          toast({ title: "Errore", description: "Impossibile ottenere la posizione", variant: "destructive" });
        }
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <style>{`
        .user-location-icon { background: transparent !important; border: none !important; }
        .user-location-marker { position: relative; width: 24px; height: 24px; }
        .user-location-dot { 
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          width: 12px; height: 12px; background: #3b82f6; border-radius: 50%; 
          border: 3px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
        }
        .user-location-pulse {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          width: 24px; height: 24px; background: rgba(59, 130, 246, 0.3); border-radius: 50%;
          animation: pulse 2s ease-out infinite;
        }
        @keyframes pulse { 0% { transform: translate(-50%, -50%) scale(1); opacity: 1; } 100% { transform: translate(-50%, -50%) scale(2); opacity: 0; } }
        .pending-marker { 
          width: 32px; height: 32px; background: #ef4444; border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
      `}</style>
      
      <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
        <div className="bg-card/90 backdrop-blur-sm rounded-xl p-3 md:p-4">
          <h2 className="text-sm md:text-lg font-bold text-foreground flex items-center gap-2">
            <Route className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" />
            {trip.title}
          </h2>
          <p className="text-xs text-muted-foreground hidden md:block">Clicca sulla mappa per aggiungere tappe</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {legs.length > 0 && (
            <Button
              onClick={() => setShowCO2Panel(!showCO2Panel)}
              variant="outline"
              size="sm"
              className={`bg-card/90 ${showCO2Panel ? 'border-emerald-500 text-emerald-400' : 'border-emerald-500 text-emerald-400 animate-pulse'}`}
              data-testid="button-toggle-co2"
            >
              <Route className="w-4 h-4 md:mr-2" />
              {showCO2Panel ? (
                <span className="hidden md:inline">Percorso</span>
              ) : (
                <>Trasporti</>
              )}
            </Button>
          )}
          {stopsWithCoords.length > 0 && (
            <Button
              onClick={onClearAllStops}
              variant="outline"
              size="sm"
              className="bg-card/90 border-red-500/50 text-red-400 hover:bg-red-500/10"
              data-testid="button-clear-route"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Button
            onClick={handleGetLocation}
            variant="outline"
            size="sm"
            className="bg-card/90 border-blue-500/50 text-blue-400"
          >
            <Navigation className="w-4 h-4" />
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            size="sm"
            className="bg-card/90 border-border text-foreground"
            data-testid="button-close-map"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            <span className="ml-1">Indietro</span>
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {legs.length > 0 && showCO2Panel && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="absolute left-2 right-2 bottom-20 max-h-[40vh] md:left-auto md:right-4 md:top-20 md:bottom-20 md:max-h-none md:w-80 z-[1000] bg-card/95 backdrop-blur-sm rounded-xl p-3 md:p-4 overflow-y-auto"
            data-testid="co2-panel"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Leaf className="w-5 h-5 text-emerald-500" />
                Come viaggi?
              </h3>
              <button
                onClick={() => setShowCO2Panel(false)}
                className="p-1.5 rounded-lg bg-accent/50 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-close-co2-panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-2 bg-blue-500/20 rounded-lg mb-4 text-center">
              <p className="text-xs text-blue-300">Scegli il mezzo per ogni tratta</p>
            </div>

            <div className="bg-emerald-500/20 rounded-lg p-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-emerald-300">Distanza totale</span>
                <span className="text-foreground font-bold">{totalDistance} km</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-emerald-300">Emissioni totali</span>
                <span className="text-foreground font-bold">{totalCO2} kg CO2</span>
              </div>
            </div>

            <div className="space-y-4">
              {legs.map((leg, index) => {
                const selectedOpt = leg.options.find(o => o.mode === leg.selected);
                const greenest = leg.options.reduce((a, b) => a.co2 <= b.co2 ? a : b);
                
                return (
                  <div key={leg.legId} className="bg-accent/50 rounded-lg p-3" data-testid={`leg-${index}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-bold">
                        {index + 1}
                      </span>
                      <div className="flex-1 text-sm">
                        <span className="text-foreground font-medium">{leg.from.city}</span>
                        <span className="text-muted-foreground mx-1">→</span>
                        <span className="text-foreground font-medium">{leg.to.city}</span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground mb-2">{leg.distance} km</div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {leg.options.map((opt) => {
                        const Icon = opt.icon;
                        const isSelected = leg.selected === opt.mode;
                        const isGreen = opt.mode === greenest.mode;
                        
                        return (
                          <button
                            key={opt.mode}
                            onClick={() => handleSelectTransport(leg.legId, opt.mode as TransportMode, leg.to.id, leg.distance)}
                            className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs transition-all border ${
                              isSelected 
                                ? 'border-emerald-500 bg-emerald-500/20 text-white' 
                                : 'border-border bg-accent/50 text-foreground hover:bg-accent'
                            }`}
                            data-testid={`transport-${index}-${opt.mode}`}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="font-medium">{opt.label}</span>
                            <span className={`text-[10px] ${opt.co2 === 0 ? 'text-green-400' : 'text-amber-400'}`}>
                              {opt.co2 === 0 ? 'Eco!' : `${opt.co2}kg CO2`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    
                    {selectedOpt && (
                      <div className="mt-2 p-2 rounded-lg" style={{ backgroundColor: `${selectedOpt.color}20` }}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium" style={{ color: selectedOpt.color }}>
                            {selectedOpt.label}
                          </span>
                          {savedLegs[leg.legId] ? (
                            <span className="text-green-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Salvato!
                            </span>
                          ) : (
                            <span className="text-foreground font-bold">
                              {selectedOpt.duration}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-muted-foreground">Emissioni</span>
                          <span className={selectedOpt.co2 === 0 ? "text-green-400 font-medium" : "text-foreground"}>
                            {selectedOpt.co2 === 0 ? "Zero emissioni!" : `${selectedOpt.co2} kg CO2`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 p-3 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-lg border border-emerald-500/30">
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Suggerimento Green
              </div>
              <p className="text-xs text-foreground mt-1">
                Scegli treno o bici per ridurre le emissioni del tuo viaggio!
              </p>
            </div>
            
            <Button
              onClick={() => setShowCO2Panel(false)}
              className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 text-white font-medium"
              data-testid="button-confirm-transport"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Conferma
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <MapContainer
        center={defaultCenter}
        zoom={stopsWithCoords.length > 0 ? 6 : 4}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url={tileUrl}
        />
        <MapClickHandler onMapClick={handleMapClick} />
        <UserLocationMarker position={userLocation} />
        
        {legs.map((leg, index) => {
          const selectedOpt = leg.options.find(o => o.mode === leg.selected);
          const color = selectedOpt?.color || "#10b981";
          const isDashed = leg.selected === "walk" || leg.selected === "bike" || leg.selected === "plane";
          return (
            <CurvedRouteLine
              key={leg.legId}
              positions={[
                [leg.from.latitude!, leg.from.longitude!],
                [leg.to.latitude!, leg.to.longitude!]
              ]}
              color={color}
              dashed={isDashed}
            />
          );
        })}
        
        {stopsWithCoords.map((stop, index) => (
          <Marker
            key={stop.id}
            position={[stop.latitude!, stop.longitude!]}
            icon={createStopMarkerIcon(index, "#f97316", userAvatar, stop.imageUrl)}
          >
            <Popup className="custom-popup" maxWidth={340} minWidth={300} autoPanPadding={[20, 20]} autoPan={true}>
              <DiaryStopMapPopup stop={stop} index={index} tripUserId={trip.userId} onStopUpdated={onStopUpdated} />
            </Popup>
          </Marker>
        ))}
        
        {pendingLocation && (
          <Marker
            position={[pendingLocation.lat, pendingLocation.lng]}
            icon={L.divIcon({
              html: `<div class="pending-marker"></div>`,
              className: "pending-marker-icon",
              iconSize: [32, 32],
              iconAnchor: [16, 32],
            })}
          />
        )}
      </MapContainer>
      
      {pendingLocation && (
        <div className="absolute bottom-20 md:bottom-4 left-4 right-4 z-[1000] bg-card/95 backdrop-blur-sm rounded-xl p-4">
          <h3 className="text-foreground font-semibold mb-3">Aggiungi questa tappa?</h3>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Cercando la posizione...
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-muted-foreground text-xs">Città</Label>
                  <Input
                    value={cityName}
                    onChange={(e) => setCityName(e.target.value)}
                    className="bg-accent border-border"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Paese</Label>
                  <Input
                    value={countryName}
                    onChange={(e) => setCountryName(e.target.value)}
                    className="bg-accent border-border"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setPendingLocation(null)}
                  variant="outline"
                  className="flex-1 border-border"
                >
                  Annulla
                </Button>
                <Button
                  onClick={handleConfirmStop}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Aggiungi Tappa
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="absolute bottom-4 right-4 z-[1000] bg-card/90 backdrop-blur-sm rounded-xl p-3">
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-foreground">{stopsWithCoords.length} tappe</span>
          </div>
          {userLocation && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-foreground">Tu sei qui</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
