import { useEffect, useState } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Calendar, Users, CheckCircle2, MapPin, Loader2, Search, Wifi, Coffee, Monitor, X, Star, Filter, Building2, Hotel, Home, CalendarDays, Ticket } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Place, Event } from "@shared/schema";

const PLACE_TYPES = [
  { value: "all", label: "All", icon: Building2 },
  { value: "coworking", label: "Coworking", icon: Monitor },
  { value: "hotel", label: "Hotels", icon: Hotel },
  { value: "hostel", label: "Hostels", icon: Home },
];

const AMENITIES = ["WiFi", "Coffee", "Meeting Rooms", "24/7 Access", "Kitchen", "Parking", "Air Conditioning", "Printer"];

export default function Coworking() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [places, setPlaces] = useState<Place[]>([]);
  const [events, setEvents] = useState<(Event & { host?: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [step, setStep] = useState(1);
  const [guestName, setGuestName] = useState("");
  
  const [activeTab, setActiveTab] = useState<"places" | "events">("places");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedCity, setSelectedCity] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [eventType, setEventType] = useState<"all" | "public" | "nomad">("all");

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setLocation("/auth");
      return;
    }

    setGuestName(user.name);
    fetchData();
  }, [user, authLoading, setLocation]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [placesRes, eventsRes] = await Promise.all([
        fetch("/api/places", { credentials: "include" }),
        fetch("/api/events", { credentials: "include" }),
      ]);
      const [placesData, eventsData] = await Promise.all([placesRes.json(), eventsRes.json()]);
      setPlaces(Array.isArray(placesData) ? placesData : []);
      setEvents(Array.isArray(eventsData) ? eventsData : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const searchPlaces = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("query", searchQuery);
      if (selectedCity) params.set("city", selectedCity);
      if (selectedType !== "all") params.set("type", selectedType);
      if (priceRange[0] > 0) params.set("priceMin", priceRange[0].toString());
      if (priceRange[1] < 500) params.set("priceMax", priceRange[1].toString());
      if (selectedAmenities.length > 0) params.set("amenities", selectedAmenities.join(","));

      const res = await fetch(`/api/places/search?${params.toString()}`, { credentials: "include" });
      const data = await res.json();
      setPlaces(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      const timeoutId = setTimeout(() => {
        searchPlaces();
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, selectedType, selectedCity, priceRange, selectedAmenities]);

  const handleBook = async () => {
    if (!selectedPlace || !user) return;

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
      toast({ title: "Booking failed", description: "Please try again", variant: "destructive" });
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
        toast({ title: "Registered!", description: "You're signed up for this event" });
        fetchData();
      } else {
        throw new Error("Registration failed");
      }
    } catch (error) {
      toast({ title: "Registration failed", variant: "destructive" });
    }
  };

  const filteredEvents = events.filter((e) => eventType === "all" || e.type === eventType);

  const cities = Array.from(new Set(places.map((p) => p.city)));

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen bg-slate-950">
          <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="max-w-6xl mx-auto p-4 space-y-6">
          <header className="flex flex-col gap-4">
            <h1 className="text-3xl font-black text-white">Explore & Book</h1>
            
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("places")}
                className={`px-4 py-2 rounded-xl font-medium text-sm transition-colors ${activeTab === "places" ? "bg-teal-500 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}
                data-testid="tab-places"
              >
                <Building2 className="w-4 h-4 inline-block mr-2" />
                Places
              </button>
              <button
                onClick={() => setActiveTab("events")}
                className={`px-4 py-2 rounded-xl font-medium text-sm transition-colors ${activeTab === "events" ? "bg-teal-500 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}
                data-testid="tab-events"
              >
                <CalendarDays className="w-4 h-4 inline-block mr-2" />
                Events
              </button>
            </div>
          </header>

          {activeTab === "places" && (
            <>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search coworking spaces, hotels, hostels..."
                    className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                    data-testid="input-search"
                  />
                </div>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                  data-testid="select-city"
                >
                  <option value="">All Cities</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="border-slate-700 text-slate-400"
                  data-testid="button-filters"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2">
                {PLACE_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedType(type.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${selectedType === type.value ? "bg-teal-500 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}
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
                    className="bg-slate-800 rounded-2xl p-4 space-y-4 overflow-hidden"
                  >
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Amenities</label>
                      <div className="flex flex-wrap gap-2">
                        {AMENITIES.map((amenity) => (
                          <button
                            key={amenity}
                            onClick={() => setSelectedAmenities((prev) => prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity])}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedAmenities.includes(amenity) ? "bg-teal-500 text-white" : "bg-slate-700 text-slate-400 hover:text-white"}`}
                            data-testid={`filter-amenity-${amenity.toLowerCase().replace(/\s/g, "-")}`}
                          >
                            {amenity}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Price Range: ${priceRange[0]} - ${priceRange[1]}</label>
                      <input
                        type="range"
                        min="0"
                        max="500"
                        value={priceRange[1]}
                        onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                        className="w-full"
                      />
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { setSelectedAmenities([]); setPriceRange([0, 500]); setSelectedCity(""); setSelectedType("all"); }}>
                      Clear Filters
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {places.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-slate-500">
                    <p>No places found matching your criteria.</p>
                  </div>
                ) : (
                  places.map((place) => (
                    <motion.div
                      key={place.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 hover:border-teal-500/50 transition-colors cursor-pointer group"
                      onClick={() => { setSelectedPlace(place); setStep(1); }}
                      data-testid={`button-place-${place.id}`}
                    >
                      <div className="h-40 relative overflow-hidden">
                        {place.imageUrl ? (
                          <img src={place.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                            <Building2 className="w-12 h-12 text-slate-600" />
                          </div>
                        )}
                        <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg uppercase">
                          {place.type}
                        </div>
                        {place.rating > 0 && (
                          <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            {(place.rating / 10).toFixed(1)}
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-lg text-white" data-testid={`text-place-name-${place.id}`}>{place.name}</h3>
                        <div className="flex items-center gap-1 text-slate-400 text-xs mt-1">
                          <MapPin className="w-3 h-3" />
                          {place.location}
                        </div>
                        {place.amenities && place.amenities.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {place.amenities.slice(0, 3).map((amenity) => (
                              <span key={amenity} className="text-[10px] px-2 py-0.5 bg-slate-700 rounded-full text-slate-400">
                                {amenity}
                              </span>
                            ))}
                            {place.amenities.length > 3 && (
                              <span className="text-[10px] px-2 py-0.5 bg-slate-700 rounded-full text-slate-400">
                                +{place.amenities.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex justify-between items-center mt-3">
                          <span className="text-teal-400 font-bold" data-testid={`text-place-price-${place.id}`}>{place.price}</span>
                          <span className="text-xs text-slate-500">{place.reviews} reviews</span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </>
          )}

          {activeTab === "events" && (
            <>
              <div className="flex gap-2">
                {[{ value: "all", label: "All Events" }, { value: "public", label: "Public" }, { value: "nomad", label: "Nomads Only" }].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setEventType(type.value as any)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${eventType === type.value ? "bg-teal-500 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}
                    data-testid={`filter-event-${type.value}`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEvents.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-slate-500">
                    <p>No events found. Check back soon!</p>
                  </div>
                ) : (
                  filteredEvents.map((event) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700"
                      data-testid={`event-card-${event.id}`}
                    >
                      {event.imageUrl && (
                        <img src={event.imageUrl} className="w-full h-32 object-cover" />
                      )}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${event.type === "nomad" ? "bg-teal-500/20 text-teal-400" : "bg-blue-500/20 text-blue-400"}`}>
                              {event.type === "nomad" ? "Nomads Only" : "Public"}
                            </span>
                            <h3 className="font-bold text-lg text-white mt-2">{event.title}</h3>
                          </div>
                          <Ticket className="w-5 h-5 text-slate-500" />
                        </div>
                        <p className="text-sm text-slate-400 mt-2 line-clamp-2">{event.description}</p>
                        <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
                          <CalendarDays className="w-4 h-4" />
                          {new Date(event.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                          <MapPin className="w-4 h-4" />
                          {event.city}
                        </div>
                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-700">
                          <div className="text-sm">
                            <span className="text-teal-400 font-bold">{event.price === 0 ? "Free" : `$${event.price}`}</span>
                            {event.capacity && <span className="text-slate-500 ml-2">{event.attendees}/{event.capacity} spots</span>}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleRegisterEvent(event.id)}
                            className="bg-teal-500 hover:bg-teal-600 text-white"
                            data-testid={`button-register-${event.id}`}
                          >
                            Register
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
                className="bg-slate-900 w-full max-w-lg rounded-t-[2rem] md:rounded-[2rem] overflow-hidden border border-slate-700"
                onClick={e => e.stopPropagation()}
              >
                {selectedPlace.imageUrl && (
                  <img src={selectedPlace.imageUrl} className="w-full h-48 object-cover" />
                )}
                <div className="p-6">
                  {step === 1 && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h2 className="text-2xl font-bold text-white">{selectedPlace.name}</h2>
                          <p className="text-sm text-slate-400 mt-1 flex items-center gap-1">
                            <MapPin className="w-4 h-4" /> {selectedPlace.location}
                          </p>
                        </div>
                        <button onClick={() => setSelectedPlace(null)} className="text-slate-400 hover:text-white">
                          <X className="w-6 h-6" />
                        </button>
                      </div>

                      {selectedPlace.description && (
                        <p className="text-sm text-slate-400">{selectedPlace.description}</p>
                      )}

                      {selectedPlace.amenities && selectedPlace.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedPlace.amenities.map((amenity) => (
                            <span key={amenity} className="text-xs px-3 py-1 bg-slate-800 rounded-full text-slate-400 flex items-center gap-1">
                              {amenity === "WiFi" && <Wifi className="w-3 h-3" />}
                              {amenity === "Coffee" && <Coffee className="w-3 h-3" />}
                              {amenity}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-800 rounded-xl">
                          <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Check-in</label>
                          <div className="flex items-center gap-2 text-sm font-medium text-white">
                            <Calendar className="w-4 h-4 text-teal-400" />
                            {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </div>
                        </div>
                        <div className="p-3 bg-slate-800 rounded-xl">
                          <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Guest Name</label>
                          <div className="flex items-center gap-2 text-sm font-medium text-white">
                            <Users className="w-4 h-4 text-teal-400" />
                            <input
                              type="text"
                              value={guestName}
                              onChange={(e) => setGuestName(e.target.value)}
                              className="bg-transparent border-none outline-none w-full text-white"
                              data-testid="input-guest-name"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-slate-700">
                        <div>
                          <p className="text-xs text-slate-500">Total</p>
                          <p className="text-2xl font-bold text-teal-400">{selectedPlace.price}</p>
                        </div>
                        <Button onClick={handleBook} className="bg-teal-500 hover:bg-teal-600 text-white px-8" data-testid="button-confirm-booking">
                          Book Now
                        </Button>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="py-12 text-center">
                      <Loader2 className="w-12 h-12 animate-spin text-teal-400 mx-auto" />
                      <p className="mt-4 text-slate-400">Processing your booking...</p>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="py-12 text-center">
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                      </motion.div>
                      <h3 className="text-xl font-bold text-white mt-4">Booking Confirmed!</h3>
                      <p className="text-slate-400 mt-2">Your reservation at {selectedPlace.name} is confirmed.</p>
                      <Button onClick={() => setSelectedPlace(null)} className="mt-6 bg-teal-500 hover:bg-teal-600" data-testid="button-close-modal">
                        Done
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
