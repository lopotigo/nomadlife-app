import { useEffect, useState, useCallback } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { useLocation, Link } from "wouter";
import { 
  Plus, MapPin, Calendar, Wallet, Star, ChevronRight, 
  Loader2, Plane, Hotel, Coffee, Utensils, Car, MoreHorizontal,
  Globe, X, Check, Edit, Trash2, Eye, Users, Image, Video, LocateFixed
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
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation, Route, Play, Train, Footprints, Bike, Leaf, CheckCircle2 } from "lucide-react";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function createStopMarkerIcon(orderIndex: number) {
  return L.divIcon({
    html: `<div class="stop-marker">${orderIndex + 1}</div>`,
    className: "custom-stop-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

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
  { value: "coworking", label: "Coworking", icon: Coffee },
  { value: "food", label: "Ristorante", icon: Utensils },
  { value: "transport", label: "Trasporto", icon: Car },
  { value: "other", label: "Altro", icon: MoreHorizontal },
];

export default function TravelDiary() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [publicTrips, setPublicTrips] = useState<TripWithDetails[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<TripWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewTrip, setShowNewTrip] = useState(false);
  const [showNewStop, setShowNewStop] = useState(false);
  const [showNewExpense, setShowNewExpense] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"my-trips" | "explore">("my-trips");
  const [showPlannerMap, setShowPlannerMap] = useState(false);
  const [stopImageUrl, setStopImageUrl] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
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
  }, [user, authLoading, setLocation, fetchTrips]);

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
          orderIndex: nextOrderIndex,
        }),
      });

      if (res.ok) {
        toast({ title: "Tappa aggiunta!" });
        setShowNewStop(false);
        setStopImageUrl(null);
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

  const handleAddExpense = async (e: React.FormEvent<HTMLFormElement>, stopId: string) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const res = await fetch(`/api/stops/${stopId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: formData.get("type"),
          name: formData.get("name"),
          cost: Math.round(parseFloat(formData.get("cost") as string) * 100),
          currency: formData.get("currency") || "EUR",
          rating: formData.get("rating") ? parseInt(formData.get("rating") as string) : undefined,
          review: formData.get("review") || undefined,
        }),
      });

      if (res.ok) {
        toast({ title: "Spesa aggiunta!" });
        setShowNewExpense(null);
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <style>{`
          .custom-stop-marker { background: transparent; border: none; }
          .stop-marker {
            width: 32px; height: 32px; border-radius: 50%;
            background: linear-gradient(135deg, #14b8a6, #0891b2);
            border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex; align-items: center; justify-content: center;
            font-weight: bold; color: white; font-size: 14px;
          }
          .leaflet-popup-content-wrapper { background: #1e293b; color: white; border-radius: 12px; }
          .leaflet-popup-tip { background: #1e293b; }
          .leaflet-popup-close-button { color: white !important; }
        `}</style>
        
        <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50 p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Plane className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Viaggi</h1>
                <p className="text-xs text-slate-400">Diario di viaggio</p>
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
              <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-emerald-500" />
                    Crea Nuovo Viaggio
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateTrip} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Titolo del viaggio</Label>
                    <Input 
                      id="title"
                      name="title" 
                      placeholder="Es: Avventura in Thailandia" 
                      required 
                      className="bg-slate-700 border-slate-600"
                      data-testid="input-trip-title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Descrizione (opzionale)</Label>
                    <Textarea 
                      id="description"
                      name="description" 
                      placeholder="Racconta il tuo viaggio..." 
                      className="bg-slate-700 border-slate-600"
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
                        className="bg-slate-700 border-slate-600"
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
                        className="bg-slate-700 border-slate-600"
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
                        className="bg-slate-700 border-slate-600"
                        data-testid="input-start-date"
                      />
                    </div>
                    <div>
                      <Label htmlFor="currency">Valuta</Label>
                      <Select name="currency" defaultValue="EUR">
                        <SelectTrigger className="bg-slate-700 border-slate-600" data-testid="select-currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
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
                      <SelectTrigger className="bg-slate-700 border-slate-600" data-testid="select-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
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
                      className="w-4 h-4 rounded bg-slate-700"
                      data-testid="checkbox-public"
                    />
                    <Label htmlFor="isPublic" className="text-sm text-slate-300">
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
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
              data-testid="tab-my-trips"
            >
              <Plane className="w-4 h-4 inline mr-2" />
              I Miei Viaggi
            </button>
            <button
              onClick={() => setActiveTab("explore")}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === "explore" 
                  ? "bg-emerald-500 text-white" 
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
              data-testid="tab-explore"
            >
              <Globe className="w-4 h-4 inline mr-2" />
              Esplora Viaggi
            </button>
          </div>
        </header>

        {activeTab === "my-trips" ? (
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
            />
          ) : (
            <TripsList 
              trips={trips} 
              onSelectTrip={(tripId) => fetchTripDetails(tripId)}
              onViewOnMap={(tripId) => {
                fetchTripDetails(tripId);
                setActiveTab("explore");
              }}
              onPlanRoute={(tripId) => {
                fetchTripDetails(tripId);
                setTimeout(() => setShowPlannerMap(true), 300);
              }}
            />
          )}
        </div>
        ) : (
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

        <Dialog open={showNewStop} onOpenChange={(open) => { setShowNewStop(open); if (!open) setStopImageUrl(null); }}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
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
                    className="bg-slate-700 border-slate-600"
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
                    className="bg-slate-700 border-slate-600"
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
                    className="bg-slate-700 border-slate-600"
                    data-testid="input-arrival-date"
                  />
                </div>
                <div>
                  <Label htmlFor="departureDate">Partenza</Label>
                  <Input 
                    id="departureDate"
                    type="date" 
                    name="departureDate" 
                    className="bg-slate-700 border-slate-600"
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
                  className="bg-slate-700 border-slate-600"
                  data-testid="input-stop-notes"
                />
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
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-emerald-500 transition-colors">
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
                          <span className="text-xs text-slate-400">{uploadProgress}%</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex gap-2">
                            <Image className="w-5 h-5 text-slate-400" />
                            <Video className="w-5 h-5 text-slate-400" />
                          </div>
                          <span className="text-xs text-slate-400">Carica foto o video</span>
                        </div>
                      )}
                    </label>
                  )}
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600"
                data-testid="button-submit-stop"
                disabled={isUploadingStopMedia}
              >
                <Plus className="w-4 h-4 mr-2" />
                Aggiungi Tappa
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!showNewExpense} onOpenChange={() => setShowNewExpense(null)}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-500" />
                Aggiungi Spesa
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => showNewExpense && handleAddExpense(e, showNewExpense)} className="space-y-4">
              <div>
                <Label htmlFor="type">Tipo</Label>
                <Select name="type" defaultValue="hotel">
                  <SelectTrigger className="bg-slate-700 border-slate-600" data-testid="select-expense-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
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
                  placeholder="Es: Hotel Paradise" 
                  required 
                  className="bg-slate-700 border-slate-600"
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
                    className="bg-slate-700 border-slate-600"
                    data-testid="input-expense-cost"
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Valuta</Label>
                  <Select name="currency" defaultValue="EUR">
                    <SelectTrigger className="bg-slate-700 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="EUR">€ EUR</SelectItem>
                      <SelectItem value="USD">$ USD</SelectItem>
                      <SelectItem value="THB">฿ THB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="rating">Valutazione (1-5)</Label>
                <Select name="rating">
                  <SelectTrigger className="bg-slate-700 border-slate-600" data-testid="select-rating">
                    <SelectValue placeholder="Opzionale" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {"⭐".repeat(n)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="review">Recensione (opzionale)</Label>
                <Textarea 
                  id="review"
                  name="review" 
                  placeholder="La tua esperienza..." 
                  className="bg-slate-700 border-slate-600"
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
            onClose={() => setShowPlannerMap(false)}
          />
        )}
      </div>
    </Layout>
  );
}

function TripsList({ trips, onSelectTrip, onViewOnMap, onPlanRoute }: { trips: Trip[]; onSelectTrip: (id: string) => void; onViewOnMap: (id: string) => void; onPlanRoute: (id: string) => void }) {
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
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-800 flex items-center justify-center">
          <Plane className="w-10 h-10 text-slate-600" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Nessun viaggio ancora</h3>
        <p className="text-slate-400 mb-6">Inizia a documentare le tue avventure!</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">I Tuoi Viaggi</h2>
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
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
            data-testid={`filter-${tab.value}`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>
      
      {filteredTrips.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          Nessun viaggio in questa categoria
        </div>
      ) : (
        filteredTrips.map((trip, index) => (
          <motion.div
            key={trip.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50"
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
                  <h3 className="font-semibold text-white">{trip.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <MapPin className="w-3 h-3" />
                    <span>{trip.startLocation} → {trip.endLocation}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(trip.startDate).toLocaleDateString("it-IT")}</span>
                    {getStatusBadge(trip.status)}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500" />
            </div>
          <div className="mt-3 pt-3 border-t border-slate-700/50 flex gap-2">
            <button
              onClick={() => onSelectTrip(trip.id)}
              className="flex-1 py-2 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              data-testid={`button-trip-details-${trip.id}`}
            >
              <Edit className="w-4 h-4" />
              Dettagli
            </button>
            <button
              onClick={() => onViewOnMap(trip.id)}
              className="flex-1 py-2 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              data-testid={`button-view-on-map-${trip.id}`}
            >
              <Globe className="w-4 h-4" />
              Vedi Mappa
            </button>
            <button
              onClick={() => onPlanRoute(trip.id)}
              className="flex-1 py-2 px-3 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              data-testid={`button-plan-route-${trip.id}`}
            >
              <Route className="w-4 h-4" />
              Crea Percorso
            </button>
          </div>
        </motion.div>
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
  calculateTotal 
}: { 
  trip: TripWithDetails; 
  onBack: () => void;
  onAddStop: () => void;
  onAddExpense: (stopId: string) => void;
  onDelete: () => void;
  onOpenPlannerMap: () => void;
  calculateTotal: (trip: TripWithDetails) => number;
}) {
  const totalExpenses = calculateTotal(trip);
  const currencySymbol = trip.currency === "EUR" ? "€" : trip.currency === "USD" ? "$" : trip.currency;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          data-testid="button-back"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Indietro
        </button>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onOpenPlannerMap}
            className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
            data-testid="button-plan-on-map"
          >
            <Route className="w-4 h-4 mr-1" />
            Crea percorso
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
            <h2 className="text-2xl font-bold text-white">{trip.title}</h2>
            {trip.description && (
              <p className="text-slate-300 mt-1">{trip.description}</p>
            )}
          </div>
          {trip.isActive && (
            <span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-sm font-medium">
              In corso
            </span>
          )}
        </div>
        <div className="flex items-center gap-6 text-slate-300">
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
            <p className="text-sm text-slate-400">Spese totali</p>
            <p className="text-2xl font-bold text-white">
              {currencySymbol}{(totalExpenses / 100).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-400">Tappe</p>
            <p className="text-2xl font-bold text-white">{trip.stops.length}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Tappe del viaggio</h3>
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
        <div className="text-center py-8 bg-slate-800/50 rounded-xl border border-dashed border-slate-700">
          <MapPin className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400">Nessuna tappa ancora</p>
          <p className="text-sm text-slate-500">Aggiungi la tua prima destinazione</p>
        </div>
      ) : (
        <div className="space-y-4">
          {trip.stops.map((stop, index) => (
            <StopCard 
              key={stop.id} 
              stop={stop} 
              index={index}
              currency={trip.currency}
              onAddExpense={() => onAddExpense(stop.id)}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

function StopCard({ 
  stop, 
  index, 
  currency,
  onAddExpense 
}: { 
  stop: TripStop & { expenses: TripExpense[] }; 
  index: number;
  currency: string;
  onAddExpense: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const currencySymbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : currency;
  const totalStopExpenses = stop.expenses.reduce((sum, e) => sum + e.cost, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden"
      data-testid={`stop-card-${stop.id}`}
    >
      <div 
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">
            {index + 1}
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-white">{stop.city}, {stop.country}</h4>
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <span>{new Date(stop.arrivalDate).toLocaleDateString("it-IT")}</span>
              {stop.departureDate && (
                <span>→ {new Date(stop.departureDate).toLocaleDateString("it-IT")}</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-400">{stop.expenses.length} spese</p>
            <p className="font-semibold text-emerald-400">
              {currencySymbol}{(totalStopExpenses / 100).toFixed(2)}
            </p>
          </div>
          <ChevronRight className={`w-5 h-5 text-slate-500 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-700/50"
          >
            <div className="p-4 space-y-3">
              {stop.notes && (
                <p className="text-sm text-slate-400 italic">"{stop.notes}"</p>
              )}
              
              {stop.expenses.length > 0 && (
                <div className="space-y-2">
                  {stop.expenses.map((expense) => {
                    const expenseType = expenseTypes.find(t => t.value === expense.type);
                    const Icon = expenseType?.icon || MoreHorizontal;
                    return (
                      <div 
                        key={expense.id}
                        className="flex items-center gap-3 p-2 bg-slate-700/30 rounded-lg"
                        data-testid={`expense-${expense.id}`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-600 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-slate-300" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{expense.name}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">{expenseType?.label}</span>
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
              
              <div className="flex gap-2">
                <Button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddExpense();
                  }}
                  variant="outline"
                  size="sm"
                  className="flex-1 border-dashed border-slate-600 text-slate-400 hover:text-white"
                  data-testid={`button-add-expense-${stop.id}`}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Aggiungi spesa
                </Button>
                <Link href={`/coworking?city=${encodeURIComponent(stop.city)}&type=hotel`}>
                  <Button 
                    onClick={(e) => e.stopPropagation()}
                    variant="outline"
                    size="sm"
                    className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                    data-testid={`button-find-hotel-${stop.id}`}
                  >
                    <Hotel className="w-4 h-4 mr-2" />
                    Cerca alloggio
                  </Button>
                </Link>
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
  const [copyingStopId, setCopyingStopId] = useState<string | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(highlightedTripId || null);
  
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
        className="absolute top-4 left-4 z-[1000] bg-slate-800/90 backdrop-blur-sm text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-slate-700 transition-colors shadow-lg"
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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {tripPolylines.map((polyline) => (
          <Polyline
            key={polyline.tripId}
            positions={polyline.positions}
            pathOptions={{ 
              color: polyline.color, 
              weight: 3,
              opacity: selectedTripId && selectedTripId !== polyline.tripId ? 0.3 : 0.8,
              dashArray: "10, 5",
            }}
            eventHandlers={{
              click: () => setSelectedTripId(polyline.tripId),
            }}
          />
        ))}
        
        {allStopsWithCoords.map((stop, index) => (
          <Marker
            key={stop.id}
            position={[stop.latitude!, stop.longitude!]}
            icon={createStopMarkerIcon(stop.orderIndex)}
            eventHandlers={{
              click: () => setSelectedTripId(stop.trip.id),
            }}
          >
            <Popup>
              <div className="min-w-[200px]">
                <h3 className="font-bold text-base mb-1">{stop.city}, {stop.country}</h3>
                <p className="text-xs text-slate-300 mb-2">
                  {new Date(stop.arrivalDate).toLocaleDateString("it-IT")}
                  {stop.departureDate && ` - ${new Date(stop.departureDate).toLocaleDateString("it-IT")}`}
                </p>
                <div className="border-t border-slate-600 pt-2 mt-2">
                  <p className="text-xs text-slate-400">Viaggio:</p>
                  <p className="font-medium" style={{ color: stop.tripColor }}>{stop.trip.title}</p>
                  <p className="text-xs text-slate-400 mt-1">di {stop.trip.user.name}</p>
                </div>
                {stop.notes && (
                  <p className="text-xs text-slate-300 mt-2 italic">"{stop.notes}"</p>
                )}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => onSelectTrip(stop.trip.id)}
                    className="flex-1 bg-slate-600 text-white text-xs py-1.5 px-2 rounded-lg hover:bg-slate-500"
                  >
                    Vedi dettagli
                  </button>
                  {userTrips.length > 0 && (
                    copyingStopId === stop.id ? (
                      <div className="flex-1">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              onCopyStop(stop, e.target.value);
                              setCopyingStopId(null);
                            }
                          }}
                          className="w-full bg-slate-700 text-white text-xs py-1.5 px-2 rounded-lg"
                          autoFocus
                        >
                          <option value="">Scegli viaggio...</option>
                          {userTrips.filter(t => t.status === "planned").map(trip => (
                            <option key={trip.id} value={trip.id}>{trip.title}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <button
                        onClick={() => setCopyingStopId(stop.id)}
                        className="flex-1 bg-blue-500 text-white text-xs py-1.5 px-2 rounded-lg hover:bg-blue-600"
                      >
                        + Aggiungi al mio viaggio
                      </button>
                    )
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {trips.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
          <div className="text-center">
            <Globe className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Nessun viaggio pubblico</h3>
            <p className="text-slate-400">I viaggi condivisi dagli altri nomadi appariranno qui</p>
          </div>
        </div>
      )}
      
      {trips.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4 bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 max-h-48 overflow-y-auto">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Viaggi pubblici ({trips.length})
          </h3>
          <div className="space-y-2">
            {trips.map((trip, index) => (
              <div
                key={trip.id}
                onClick={() => setSelectedTripId(trip.id)}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                  selectedTripId === trip.id ? "bg-emerald-500/20 border border-emerald-500/50" : "hover:bg-slate-700"
                }`}
              >
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tripColors[index % tripColors.length] }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{trip.title}</p>
                  <p className="text-xs text-slate-400">{trip.user.name} • {trip.stops.length} tappe</p>
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

const CO2_PER_KM = { walk: 0, bike: 0, train: 0.041, car: 0.171, plane: 0.255 };
const SPEED_KMH = { walk: 5, bike: 20, train: 80, car: 90, plane: 800 };

type TransportMode = "walk" | "bike" | "train" | "car" | "plane";

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

function getTransportOptions(distance: number) {
  return [
    { mode: "walk" as TransportMode, label: "A piedi", icon: Footprints, available: distance <= 30, co2: 0, color: "#22c55e" },
    { mode: "bike" as TransportMode, label: "Bici", icon: Bike, available: distance <= 100, co2: 0, color: "#10b981" },
    { mode: "train" as TransportMode, label: "Treno", icon: Train, available: true, co2: Math.round(distance * CO2_PER_KM.train), color: "#3b82f6" },
    { mode: "car" as TransportMode, label: "Auto", icon: Car, available: distance <= 2000, co2: Math.round(distance * CO2_PER_KM.car), color: "#f59e0b" },
    { mode: "plane" as TransportMode, label: "Aereo", icon: Plane, available: distance > 200, co2: Math.round(distance * CO2_PER_KM.plane), color: "#6366f1" },
  ].filter(o => o.available);
}

function TripPlannerMap({ 
  trip, 
  onAddStopFromMap,
  onClose 
}: { 
  trip: TripWithDetails;
  onAddStopFromMap: (lat: number, lng: number, city: string, country: string) => void;
  onClose: () => void;
}) {
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [cityName, setCityName] = useState("");
  const [countryName, setCountryName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [showCO2Panel, setShowCO2Panel] = useState(false);
  const [selectedTransports, setSelectedTransports] = useState<Record<string, TransportMode>>({});
  const { toast } = useToast();
  
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
    const selected = selectedTransports[legId] || options.find(o => o.co2 === Math.min(...options.map(x => x.co2)))?.mode || "train";
    return { from: stop, to: nextStop, distance, options, legId, selected };
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
    <div className="fixed inset-0 z-50 bg-slate-900">
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
      
      <div className="absolute top-4 left-4 right-4 z-[1000] flex items-center justify-between">
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Route className="w-5 h-5 text-emerald-500" />
            Pianifica: {trip.title}
          </h2>
          <p className="text-sm text-slate-400">Clicca sulla mappa per aggiungere tappe</p>
        </div>
        <div className="flex gap-2">
          {legs.length > 0 && (
            <Button
              onClick={() => setShowCO2Panel(!showCO2Panel)}
              variant="outline"
              className={`bg-slate-800/90 ${showCO2Panel ? 'border-emerald-500 text-emerald-400' : 'border-emerald-500/50 text-emerald-400'}`}
              data-testid="button-toggle-co2"
            >
              <Leaf className="w-4 h-4 mr-2" />
              CO2 {totalCO2} kg
            </Button>
          )}
          <Button
            onClick={handleGetLocation}
            variant="outline"
            className="bg-slate-800/90 border-blue-500/50 text-blue-400"
          >
            <Navigation className="w-4 h-4 mr-2" />
            La mia posizione
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="bg-slate-800/90 border-slate-600"
          >
            <X className="w-4 h-4 mr-2" />
            Chiudi
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showCO2Panel && legs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="absolute top-20 right-4 bottom-20 w-80 z-[1000] bg-slate-800/95 backdrop-blur-sm rounded-xl p-4 overflow-y-auto"
            data-testid="co2-panel"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Leaf className="w-5 h-5 text-emerald-500" />
                Emissioni CO2
              </h3>
              <button onClick={() => setShowCO2Panel(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-500/20 rounded-lg p-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-emerald-300">Distanza totale</span>
                <span className="text-white font-bold">{totalDistance} km</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-emerald-300">Emissioni totali</span>
                <span className="text-white font-bold">{totalCO2} kg CO2</span>
              </div>
            </div>

            <div className="space-y-4">
              {legs.map((leg, index) => {
                const selectedOpt = leg.options.find(o => o.mode === leg.selected);
                const greenest = leg.options.reduce((a, b) => a.co2 <= b.co2 ? a : b);
                
                return (
                  <div key={leg.legId} className="bg-slate-700/50 rounded-lg p-3" data-testid={`leg-${index}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-bold">
                        {index + 1}
                      </span>
                      <div className="flex-1 text-sm">
                        <span className="text-white font-medium">{leg.from.city}</span>
                        <span className="text-slate-400 mx-1">→</span>
                        <span className="text-white font-medium">{leg.to.city}</span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-slate-400 mb-2">{leg.distance} km</div>
                    
                    <div className="flex flex-wrap gap-1">
                      {leg.options.map((opt) => {
                        const Icon = opt.icon;
                        const isSelected = leg.selected === opt.mode;
                        const isGreen = opt.mode === greenest.mode;
                        
                        return (
                          <button
                            key={opt.mode}
                            onClick={() => setSelectedTransports(prev => ({ ...prev, [leg.legId]: opt.mode }))}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all ${
                              isSelected 
                                ? 'bg-emerald-500 text-white' 
                                : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                            }`}
                            data-testid={`transport-${index}-${opt.mode}`}
                          >
                            <Icon className="w-3 h-3" />
                            <span>{opt.co2}kg</span>
                            {isGreen && <Leaf className="w-3 h-3 text-green-300" />}
                          </button>
                        );
                      })}
                    </div>
                    
                    {selectedOpt && (
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-slate-400">
                          {selectedOpt.label}
                        </span>
                        <span className={selectedOpt.co2 === 0 ? "text-green-400" : "text-slate-300"}>
                          {selectedOpt.co2 === 0 ? "Zero emissioni!" : `${selectedOpt.co2} kg CO2`}
                        </span>
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
              <p className="text-xs text-slate-300 mt-1">
                Scegli treno o bici per ridurre le emissioni del tuo viaggio!
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <MapContainer
        center={defaultCenter}
        zoom={stopsWithCoords.length > 0 ? 6 : 4}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <MapClickHandler onMapClick={handleMapClick} />
        <UserLocationMarker position={userLocation} />
        
        {polylinePositions.length > 1 && (
          <Polyline
            positions={polylinePositions}
            pathOptions={{ color: "#10b981", weight: 4, opacity: 0.8, dashArray: "10, 5" }}
          />
        )}
        
        {stopsWithCoords.map((stop, index) => (
          <Marker
            key={stop.id}
            position={[stop.latitude!, stop.longitude!]}
            icon={createStopMarkerIcon(index)}
          >
            <Popup>
              <div className="min-w-[150px]">
                <h3 className="font-bold">{stop.city}, {stop.country}</h3>
                <p className="text-xs text-slate-400">Tappa {index + 1}</p>
              </div>
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
        <div className="absolute bottom-4 left-4 right-4 z-[1000] bg-slate-800/95 backdrop-blur-sm rounded-xl p-4">
          <h3 className="text-white font-semibold mb-3">Aggiungi questa tappa?</h3>
          {isLoading ? (
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Cercando la posizione...
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-400 text-xs">Città</Label>
                  <Input
                    value={cityName}
                    onChange={(e) => setCityName(e.target.value)}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <div>
                  <Label className="text-slate-400 text-xs">Paese</Label>
                  <Input
                    value={countryName}
                    onChange={(e) => setCountryName(e.target.value)}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setPendingLocation(null)}
                  variant="outline"
                  className="flex-1 border-slate-600"
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

      <div className="absolute bottom-4 right-4 z-[1000] bg-slate-800/90 backdrop-blur-sm rounded-xl p-3">
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-slate-300">{stopsWithCoords.length} tappe</span>
          </div>
          {userLocation && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-slate-300">Tu sei qui</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
