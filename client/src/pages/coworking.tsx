import { useEffect, useState, useCallback } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Calendar, Users, CheckCircle2, MapPin, Loader2, Search, Wifi, Coffee, Monitor, X, Star, Filter, Building2, Hotel, Home, CalendarDays, Ticket, MessageSquare, Navigation, Globe, ExternalLink, Plane, Car, Bus, Shield } from "lucide-react";
import { getAffiliateLinks } from "@/lib/travelpayouts";
import { PlaceReviews } from "@/components/place-reviews";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Place, Event } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

function UserRatingBadge({ placeId }: { placeId: string }) {
  const { data: ratings } = useQuery({
    queryKey: ["place-ratings", placeId],
    queryFn: async () => {
      const res = await fetch(`/api/places/${placeId}/ratings`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60000,
  });

  if (!ratings || ratings.reviewCount === 0) return null;

  const avgRating = ratings.overall || 0;

  return (
    <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
      {avgRating.toFixed(1)}
      <span className="text-[10px] opacity-70">({ratings.reviewCount})</span>
    </div>
  );
}

const PLACE_TYPES = [
  { value: "all", label: "Tutti", icon: Building2 },
  { value: "coworking", label: "Coworking", icon: Monitor },
  { value: "hotel", label: "Hotel", icon: Hotel },
  { value: "hostel", label: "Ostelli", icon: Home },
  { value: "cafe", label: "Caffè WiFi", icon: Coffee },
];

const AMENITIES = ["WiFi", "Coffee", "Meeting Rooms", "24/7 Access", "Kitchen", "Parking", "Air Conditioning", "Outdoor Seating"];

const POPULAR_CITIES = [
  "Bangkok", "Bali", "Lisbon", "Chiang Mai", "Berlin", "Medellín",
  "Mexico City", "Buenos Aires", "Porto", "Tbilisi", "Da Nang",
  "Cape Town", "Tulum", "Playa del Carmen",
];

interface OverpassResult {
  id: string;
  name: string;
  type: string;
  location: string;
  city: string;
  country: string;
  description: string | null;
  price: string;
  pricePerNight: number | null;
  pricePerHour: number | null;
  currency: string;
  imageUrl: string | null;
  rating: number;
  reviews: number;
  tags: string[];
  amenities: string[];
  capacity: number | null;
  latitude: number | null;
  longitude: number | null;
  source?: "osm";
  website?: string | null;
  phone?: string | null;
  openingHours?: string | null;
}

export default function Coworking() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [places, setPlaces] = useState<(Place | OverpassResult)[]>([]);
  const [events, setEvents] = useState<(Event & { host?: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [guestName, setGuestName] = useState("");

  const [activeTab, setActiveTab] = useState<"places" | "events">("places");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [eventType, setEventType] = useState<"all" | "public" | "nomad">("all");
  const [urlParamsApplied, setUrlParamsApplied] = useState(false);

  const [nearbyMode, setNearbyMode] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [searchRadius, setSearchRadius] = useState(5000);
  const [searchSource, setSearchSource] = useState<string>("");
  const [osmCount, setOsmCount] = useState(0);
  const [localCount, setLocalCount] = useState(0);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLocation("/auth");
      return;
    }

    setGuestName(user.name);

    if (!urlParamsApplied) {
      const params = new URLSearchParams(window.location.search);
      const cityParam = params.get("city");
      const typeParam = params.get("type");
      if (cityParam) setSearchQuery(cityParam);
      if (typeParam && ["hotel", "hostel", "coworking", "cafe"].includes(typeParam)) {
        setSelectedType(typeParam);
      }
      setUrlParamsApplied(true);
    }

    fetchEvents();
  }, [user, authLoading, setLocation]);

  const fetchEvents = async () => {
    try {
      const eventsRes = await fetch("/api/events", { credentials: "include" });
      const eventsData = await eventsRes.json();
      setEvents(Array.isArray(eventsData) ? eventsData : []);
    } catch (error) {
      console.error(error);
    }
  };

  const searchOverpass = useCallback(async (params: {
    city?: string;
    lat?: number;
    lng?: number;
    radius?: number;
    type?: string;
  }) => {
    setLoading(true);
    try {
      const searchParams = new URLSearchParams();
      if (params.city) searchParams.set("city", params.city);
      if (params.lat !== undefined) searchParams.set("lat", params.lat.toString());
      if (params.lng !== undefined) searchParams.set("lng", params.lng.toString());
      if (params.radius) searchParams.set("radius", params.radius.toString());
      if (params.type && params.type !== "all") searchParams.set("type", params.type);

      const res = await fetch(`/api/places/overpass?${searchParams.toString()}`, { credentials: "include" });
      const data = await res.json();

      if (data.results) {
        setPlaces(data.results);
        setSearchSource(data.source || "");
        setOsmCount(data.osmCount || 0);
        setLocalCount(data.localCount || 0);
      } else {
        setPlaces([]);
      }
    } catch (error) {
      console.error("Search error:", error);
      toast({ title: "Errore ricerca", description: "Impossibile cercare i luoghi. Riprova.", variant: "destructive" });
      try {
        const fallbackRes = await fetch("/api/places", { credentials: "include" });
        const fallbackData = await fallbackRes.json();
        setPlaces(Array.isArray(fallbackData) ? fallbackData : []);
        setSearchSource("local-fallback");
      } catch {
        setPlaces([]);
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!user || !urlParamsApplied) return;

    if (nearbyMode && userCoords) {
      const timeout = setTimeout(() => {
        searchOverpass({
          lat: userCoords.lat,
          lng: userCoords.lng,
          radius: searchRadius,
          type: selectedType,
        });
      }, 300);
      return () => clearTimeout(timeout);
    } else if (searchQuery.length >= 2) {
      const timeout = setTimeout(() => {
        searchOverpass({
          city: searchQuery,
          radius: searchRadius,
          type: selectedType,
        });
      }, 600);
      return () => clearTimeout(timeout);
    } else if (!nearbyMode && searchQuery.length < 2) {
      setLoading(true);
      fetch("/api/places", { credentials: "include" })
        .then(res => res.json())
        .then(data => {
          setPlaces(Array.isArray(data) ? data : []);
          setSearchSource("local");
          setOsmCount(0);
          setLocalCount(Array.isArray(data) ? data.length : 0);
        })
        .catch(() => setPlaces([]))
        .finally(() => setLoading(false));
    }
  }, [user, urlParamsApplied, searchQuery, selectedType, nearbyMode, userCoords, searchRadius, searchOverpass]);

  const handleNearbyToggle = () => {
    if (!nearbyMode) {
      if (userCoords) {
        setNearbyMode(true);
        return;
      }
      setGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setNearbyMode(true);
          setGettingLocation(false);
          toast({ title: "Posizione trovata!", description: "Cerco luoghi vicino a te..." });
        },
        () => {
          setGettingLocation(false);
          toast({ title: "GPS non disponibile", description: "Abilita la posizione o cerca per città.", variant: "destructive" });
        },
        { enableHighAccuracy: true, timeout: 15000 }
      );
    } else {
      setNearbyMode(false);
    }
  };

  const handleCityQuickSearch = (city: string) => {
    setNearbyMode(false);
    setSearchQuery(city);
  };

  const handleBook = async () => {
    if (!selectedPlace || !user) return;
    if (selectedPlace.source === "osm") {
      if (selectedPlace.website) {
        window.open(selectedPlace.website, "_blank");
      } else {
        toast({ title: "Prenotazione esterna", description: "Cerca questo luogo su Google Maps per prenotare.", variant: "default" });
      }
      return;
    }

    setStep(2);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          placeId: selectedPlace.id,
          checkInDate: new Date().toISOString(),
          guestName,
        }),
      });

      if (res.ok) {
        setTimeout(() => setStep(3), 1500);
      } else {
        throw new Error("Booking failed");
      }
    } catch (error) {
      toast({ title: "Prenotazione fallita", description: "Riprova più tardi", variant: "destructive" });
      setStep(1);
    }
  };

  const handleRegisterEvent = async (eventId: string) => {
    try {
      const res = await fetch(`/api/events/${eventId}/register`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "Registrato!", description: "Sei iscritto a questo evento" });
        fetchEvents();
      } else {
        throw new Error("Registration failed");
      }
    } catch (error) {
      toast({ title: "Registrazione fallita", variant: "destructive" });
    }
  };

  const filteredPlaces = places.filter(p => {
    if (selectedAmenities.length > 0 && p.amenities) {
      const hasAll = selectedAmenities.every(a => p.amenities?.includes(a));
      if (!hasAll) return false;
    }
    return true;
  });

  const filteredEvents = events.filter((e) => eventType === "all" || e.type === eventType);

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto p-4 space-y-6">
          <header className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-black text-foreground" data-testid="text-page-title">Esplora & Prenota</h1>
              {searchSource && searchSource !== "local" && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Globe className="w-3.5 h-3.5" />
                  <span>{osmCount} da OpenStreetMap, {localCount} locali</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("places")}
                className={`px-4 py-2 rounded-xl font-medium text-sm transition-colors ${activeTab === "places" ? "bg-teal-500 text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                data-testid="tab-places"
              >
                <Building2 className="w-4 h-4 inline-block mr-2" />
                Luoghi
              </button>
              <button
                onClick={() => setActiveTab("events")}
                className={`px-4 py-2 rounded-xl font-medium text-sm transition-colors ${activeTab === "events" ? "bg-teal-500 text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                data-testid="tab-events"
              >
                <CalendarDays className="w-4 h-4 inline-block mr-2" />
                Eventi
              </button>
            </div>
          </header>

          {activeTab === "places" && (
            <>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setNearbyMode(false); }}
                      placeholder="Cerca per città (es. Bangkok, Bali, Milano...)"
                      className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                      data-testid="input-search"
                    />
                  </div>
                  <Button
                    variant={nearbyMode ? "default" : "outline"}
                    onClick={handleNearbyToggle}
                    disabled={gettingLocation}
                    className={`gap-2 ${nearbyMode ? "bg-teal-500 hover:bg-teal-600 text-white" : "border-border"}`}
                    data-testid="button-nearby"
                  >
                    {gettingLocation ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Navigation className="w-4 h-4" />
                    )}
                    {nearbyMode ? "Vicino a me" : "Cerca vicino a me"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="border-border text-muted-foreground"
                    data-testid="button-filters"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Filtri
                  </Button>
                </div>

                {!nearbyMode && searchQuery.length < 2 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                    {POPULAR_CITIES.map(city => (
                      <button
                        key={city}
                        onClick={() => handleCityQuickSearch(city)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 whitespace-nowrap transition-colors"
                        data-testid={`button-city-${city.toLowerCase()}`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                )}

                {nearbyMode && (
                  <div className="flex items-center gap-4 bg-muted/50 rounded-xl p-3">
                    <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                      Raggio: {searchRadius >= 1000 ? `${(searchRadius / 1000).toFixed(0)}km` : `${searchRadius}m`}
                    </label>
                    <input
                      type="range"
                      min="1000"
                      max="50000"
                      step="1000"
                      value={searchRadius}
                      onChange={(e) => setSearchRadius(parseInt(e.target.value))}
                      className="flex-1 accent-teal-500"
                      data-testid="slider-radius"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2">
                {PLACE_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedType(type.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${selectedType === type.value ? "bg-teal-500 text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                    data-testid={`filter-type-${type.value}`}
                  >
                    <type.icon className="w-4 h-4" />
                    {type.label}
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-muted rounded-2xl p-4 space-y-4 overflow-hidden"
                  >
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Servizi</label>
                      <div className="flex flex-wrap gap-2">
                        {AMENITIES.map((amenity) => (
                          <button
                            key={amenity}
                            onClick={() => setSelectedAmenities((prev) => prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity])}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedAmenities.includes(amenity) ? "bg-teal-500 text-white" : "bg-accent text-muted-foreground hover:text-foreground"}`}
                            data-testid={`filter-amenity-${amenity.toLowerCase().replace(/\s/g, "-")}`}
                          >
                            {amenity}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { setSelectedAmenities([]); setSelectedType("all"); }}>
                      Resetta Filtri
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              {searchQuery.length >= 2 && (
                <div className="bg-gradient-to-r from-teal-500/10 to-blue-500/10 border border-teal-500/20 rounded-2xl p-4" data-testid="travel-services-panel">
                  <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-teal-500" />
                    Servizi di viaggio per {searchQuery}
                  </h3>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {getAffiliateLinks(searchQuery).map((link) => {
                      const iconMap: Record<string, any> = { hotel: Hotel, plane: Plane, car: Car, bus: Bus, shield: Shield };
                      const Icon = iconMap[link.icon] || ExternalLink;
                      return (
                        <a
                          key={link.provider}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 bg-background/80 hover:bg-teal-500/20 border border-border hover:border-teal-500/40 rounded-xl text-xs font-medium whitespace-nowrap transition-all"
                          data-testid={`affiliate-link-${link.provider.toLowerCase()}`}
                        >
                          <Icon className="w-3.5 h-3.5 text-teal-500" />
                          {link.label}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
                  <p className="text-sm text-muted-foreground">
                    {nearbyMode ? "Cerco luoghi vicino a te..." : searchQuery ? `Cerco in "${searchQuery}"...` : "Caricamento..."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPlaces.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                      <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">Nessun luogo trovato</p>
                      <p className="text-sm mt-1">Prova a cercare un'altra città o amplia il raggio di ricerca.</p>
                    </div>
                  ) : (
                    filteredPlaces.map((place) => {
                      const isOsm = (place as OverpassResult).source === "osm";
                      return (
                        <motion.div
                          key={place.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-muted rounded-2xl overflow-hidden border border-border hover:border-teal-500/50 transition-colors cursor-pointer group"
                          onClick={() => { setSelectedPlace(place); setStep(1); }}
                          data-testid={`button-place-${place.id}`}
                        >
                          <div className="h-40 relative overflow-hidden">
                            {place.imageUrl ? (
                              <img src={place.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-teal-500/20 to-blue-500/20 flex items-center justify-center">
                                {place.type === "coworking" && <Monitor className="w-12 h-12 text-teal-400/50" />}
                                {place.type === "hotel" && <Hotel className="w-12 h-12 text-blue-400/50" />}
                                {place.type === "hostel" && <Home className="w-12 h-12 text-purple-400/50" />}
                                {place.type === "cafe" && <Coffee className="w-12 h-12 text-amber-400/50" />}
                                {!["coworking", "hotel", "hostel", "cafe"].includes(place.type) && <Building2 className="w-12 h-12 text-muted-foreground/50" />}
                              </div>
                            )}
                            <div className="absolute top-3 left-3 flex items-center gap-1.5">
                              <span className="bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg uppercase">
                                {place.type}
                              </span>
                              {isOsm && (
                                <span className="bg-green-500/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                                  <Globe className="w-2.5 h-2.5" />
                                  OSM
                                </span>
                              )}
                            </div>
                            {!isOsm && <UserRatingBadge placeId={place.id} />}
                          </div>
                          <div className="p-4">
                            <h3 className="font-bold text-lg text-foreground line-clamp-1" data-testid={`text-place-name-${place.id}`}>{place.name}</h3>
                            <div className="flex items-center gap-1 text-muted-foreground text-xs mt-1">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="line-clamp-1">{place.location}</span>
                            </div>
                            {place.amenities && place.amenities.length > 0 && (
                              <div className="flex gap-1 mt-2 flex-wrap">
                                {place.amenities.slice(0, 3).map((amenity) => (
                                  <span key={amenity} className="text-[10px] px-2 py-0.5 bg-accent rounded-full text-muted-foreground">
                                    {amenity}
                                  </span>
                                ))}
                                {place.amenities.length > 3 && (
                                  <span className="text-[10px] px-2 py-0.5 bg-accent rounded-full text-muted-foreground">
                                    +{place.amenities.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="flex justify-between items-center mt-3">
                              <span className="text-teal-400 font-bold" data-testid={`text-place-price-${place.id}`}>
                                {place.price !== "N/A" ? place.price : "Info sul sito"}
                              </span>
                              {!isOsm && <span className="text-xs text-muted-foreground">{place.reviews} reviews</span>}
                              {isOsm && (place as OverpassResult).openingHours && (
                                <span className="text-xs text-muted-foreground">{(place as OverpassResult).openingHours}</span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              )}
            </>
          )}

          {activeTab === "events" && (
            <>
              <div className="flex gap-2">
                {[{ value: "all", label: "Tutti gli Eventi" }, { value: "public", label: "Pubblici" }, { value: "nomad", label: "Solo Nomadi" }].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setEventType(type.value as any)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${eventType === type.value ? "bg-teal-500 text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                    data-testid={`filter-event-${type.value}`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEvents.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    <p>Nessun evento trovato. Torna a controllare presto!</p>
                  </div>
                ) : (
                  filteredEvents.map((event) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-muted rounded-2xl overflow-hidden border border-border"
                      data-testid={`event-card-${event.id}`}
                    >
                      {event.imageUrl && (
                        <img src={event.imageUrl} className="w-full h-32 object-cover" />
                      )}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${event.type === "nomad" ? "bg-teal-500/20 text-teal-400" : "bg-blue-500/20 text-blue-400"}`}>
                              {event.type === "nomad" ? "Solo Nomadi" : "Pubblico"}
                            </span>
                            <h3 className="font-bold text-lg text-foreground mt-2">{event.title}</h3>
                          </div>
                          <Ticket className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{event.description}</p>
                        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                          <CalendarDays className="w-4 h-4" />
                          {new Date(event.startDate).toLocaleDateString("it-IT", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          {event.city}
                        </div>
                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
                          <div className="text-sm">
                            <span className="text-teal-400 font-bold">{event.price === 0 ? "Gratis" : `€${event.price}`}</span>
                            {event.capacity && <span className="text-muted-foreground ml-2">{event.attendees}/{event.capacity} posti</span>}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleRegisterEvent(event.id)}
                            className="bg-teal-500 hover:bg-teal-600 text-white"
                            data-testid={`button-register-${event.id}`}
                          >
                            Registrati
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <AnimatePresence>
          {selectedPlace && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => setSelectedPlace(null)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                className="bg-background w-full max-w-lg max-h-[90vh] rounded-t-[2rem] md:rounded-[2rem] overflow-hidden border border-border flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                {selectedPlace.imageUrl && (
                  <img src={selectedPlace.imageUrl} className="w-full h-48 object-cover flex-shrink-0" />
                )}
                <div className="p-6 overflow-y-auto flex-1">
                  {step === 1 && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-2xl font-bold text-foreground">{selectedPlace.name}</h2>
                            {selectedPlace.source === "osm" && (
                              <span className="bg-green-500/20 text-green-600 dark:text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-lg">OSM</span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin className="w-4 h-4" /> {selectedPlace.location}
                          </p>
                          {selectedPlace.city && selectedPlace.country && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {selectedPlace.city}{selectedPlace.country ? `, ${selectedPlace.country}` : ""}
                            </p>
                          )}
                        </div>
                        <button onClick={() => setSelectedPlace(null)} className="text-muted-foreground hover:text-foreground">
                          <X className="w-6 h-6" />
                        </button>
                      </div>

                      {selectedPlace.description && (
                        <p className="text-sm text-muted-foreground">{selectedPlace.description}</p>
                      )}

                      {selectedPlace.openingHours && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CalendarDays className="w-4 h-4 text-teal-400" />
                          <span>Orari: {selectedPlace.openingHours}</span>
                        </div>
                      )}

                      {selectedPlace.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Tel: {selectedPlace.phone}</span>
                        </div>
                      )}

                      {selectedPlace.amenities && selectedPlace.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedPlace.amenities.map((amenity: string) => (
                            <span key={amenity} className="text-xs px-3 py-1 bg-muted rounded-full text-muted-foreground flex items-center gap-1">
                              {amenity === "WiFi" && <Wifi className="w-3 h-3" />}
                              {amenity === "Coffee" && <Coffee className="w-3 h-3" />}
                              {amenity}
                            </span>
                          ))}
                        </div>
                      )}

                      {selectedPlace.source !== "osm" && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-muted rounded-xl">
                              <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Check-in</label>
                              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                <Calendar className="w-4 h-4 text-teal-400" />
                                {new Date().toLocaleDateString("it-IT", { month: "short", day: "numeric", year: "numeric" })}
                              </div>
                            </div>
                            <div className="p-3 bg-muted rounded-xl">
                              <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Nome Ospite</label>
                              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                <Users className="w-4 h-4 text-teal-400" />
                                <input
                                  type="text"
                                  value={guestName}
                                  onChange={(e) => setGuestName(e.target.value)}
                                  className="bg-transparent border-none outline-none w-full text-foreground"
                                  data-testid="input-guest-name"
                                />
                              </div>
                            </div>
                          </div>

                          <PlaceReviews placeId={selectedPlace.id} currentUserId={user?.id} />
                        </>
                      )}

                      <div className="flex justify-between items-center pt-4 border-t border-border">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {selectedPlace.source === "osm" ? "Fonte: OpenStreetMap" : "Totale"}
                          </p>
                          <p className="text-2xl font-bold text-teal-400">
                            {selectedPlace.price !== "N/A" ? selectedPlace.price : "Vedi sito"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {selectedPlace.website && (
                            <Button
                              variant="outline"
                              onClick={() => window.open(selectedPlace.website, "_blank")}
                              className="gap-2"
                              data-testid="button-visit-website"
                            >
                              <ExternalLink className="w-4 h-4" />
                              Sito web
                            </Button>
                          )}
                          {selectedPlace.latitude && selectedPlace.longitude && (
                            <Button
                              variant="outline"
                              onClick={() => window.open(`https://www.google.com/maps?q=${selectedPlace.latitude},${selectedPlace.longitude}`, "_blank")}
                              data-testid="button-open-maps"
                            >
                              <MapPin className="w-4 h-4" />
                            </Button>
                          )}
                          {selectedPlace.source !== "osm" && (
                            <Button onClick={handleBook} className="bg-teal-500 hover:bg-teal-600 text-white px-8" data-testid="button-confirm-booking">
                              Prenota
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="py-12 text-center">
                      <Loader2 className="w-12 h-12 animate-spin text-teal-400 mx-auto" />
                      <p className="mt-4 text-muted-foreground">Elaboro la prenotazione...</p>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="py-12 text-center">
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                      </motion.div>
                      <h3 className="text-xl font-bold text-foreground mt-4">Prenotazione Confermata!</h3>
                      <p className="text-muted-foreground mt-2">La tua prenotazione presso {selectedPlace.name} è confermata.</p>
                      <Button onClick={() => setSelectedPlace(null)} className="mt-6 bg-teal-500 hover:bg-teal-600" data-testid="button-close-modal">
                        Fatto
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
