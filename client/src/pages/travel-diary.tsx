import { useEffect, useState, useCallback } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { useLocation, Link } from "wouter";
import { 
  Plus, MapPin, Calendar, Wallet, Star, ChevronRight, 
  Loader2, Plane, Hotel, Coffee, Utensils, Car, MoreHorizontal,
  Globe, X, Check, Edit, Trash2, Eye, Users
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
  const { toast } = useToast();

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
    
    try {
      const res = await fetch(`/api/trips/${selectedTrip.id}/stops`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          city: formData.get("city"),
          country: formData.get("country"),
          arrivalDate: formData.get("arrivalDate"),
          departureDate: formData.get("departureDate") || undefined,
          notes: formData.get("notes") || undefined,
          orderIndex: nextOrderIndex,
        }),
      });

      if (res.ok) {
        toast({ title: "Tappa aggiunta!" });
        setShowNewStop(false);
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
              calculateTotal={calculateTotalExpenses}
            />
          ) : (
            <TripsList 
              trips={trips} 
              onSelectTrip={(tripId) => fetchTripDetails(tripId)} 
            />
          )}
        </div>
        ) : (
          <ExploreTripsMap 
            trips={publicTrips} 
            onSelectTrip={(tripId) => {
              fetchTripDetails(tripId);
              setActiveTab("my-trips");
            }}
          />
        )}

        <Dialog open={showNewStop} onOpenChange={setShowNewStop}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-500" />
                Aggiungi Tappa
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddStop} className="space-y-4">
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
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600"
                data-testid="button-submit-stop"
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
      </div>
    </Layout>
  );
}

function TripsList({ trips, onSelectTrip }: { trips: Trip[]; onSelectTrip: (id: string) => void }) {
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
      <h2 className="text-lg font-semibold text-white mb-4">I Tuoi Viaggi</h2>
      {trips.map((trip, index) => (
        <motion.div
          key={trip.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          onClick={() => onSelectTrip(trip.id)}
          className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 cursor-pointer hover:bg-slate-800 transition-all"
          data-testid={`trip-card-${trip.id}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                trip.isActive ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-slate-700'
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
                  {trip.isActive && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">
                      In corso
                    </span>
                  )}
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function TripDetails({ 
  trip, 
  onBack, 
  onAddStop, 
  onAddExpense,
  onDelete,
  calculateTotal 
}: { 
  trip: TripWithDetails; 
  onBack: () => void;
  onAddStop: () => void;
  onAddExpense: (stopId: string) => void;
  onDelete: () => void;
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
              
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  onAddExpense();
                }}
                variant="outline"
                size="sm"
                className="w-full border-dashed border-slate-600 text-slate-400 hover:text-white"
                data-testid={`button-add-expense-${stop.id}`}
              >
                <Plus className="w-4 h-4 mr-2" />
                Aggiungi spesa
              </Button>
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
  onSelectTrip 
}: { 
  trips: TripWithDetails[]; 
  onSelectTrip: (tripId: string) => void;
}) {
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  
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
                <button
                  onClick={() => onSelectTrip(stop.trip.id)}
                  className="mt-3 w-full bg-emerald-500 text-white text-xs py-1.5 px-3 rounded-lg hover:bg-emerald-600"
                >
                  Vedi dettagli
                </button>
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
