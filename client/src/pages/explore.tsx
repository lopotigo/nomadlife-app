import { useEffect, useState } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, MapPin, Map as MapIcon, Leaf, Users, Hotel, Briefcase, Calendar, X, CheckCircle2, Loader2, ArrowRight, Train, Plane } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom marker icon
const customIcon = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const CITIES = [
  { 
    id: "bali", 
    name: "Bali", 
    fullName: "Canggu, Bali",
    country: "Indonesia",
    nomads: 1240, 
    coworking: 15, 
    hotels: 42, 
    events: 8, 
    lat: -8.6500,
    lng: 115.1389,
  },
  { 
    id: "lisbon", 
    name: "Lisbon", 
    fullName: "Lisbon",
    country: "Portugal",
    nomads: 850, 
    coworking: 12, 
    hotels: 35, 
    events: 5, 
    lat: 38.7223,
    lng: -9.1393,
  },
  { 
    id: "mexico", 
    name: "Mexico City", 
    fullName: "Mexico City",
    country: "Mexico",
    nomads: 620, 
    coworking: 9, 
    hotels: 28, 
    events: 4, 
    lat: 19.4326,
    lng: -99.1332,
  },
  { 
    id: "chiangmai", 
    name: "Chiang Mai", 
    fullName: "Chiang Mai",
    country: "Thailand",
    nomads: 980, 
    coworking: 18, 
    hotels: 55, 
    events: 12, 
    lat: 18.7883,
    lng: 98.9853,
  },
  { 
    id: "barcelona", 
    name: "Barcelona", 
    fullName: "Barcelona",
    country: "Spain",
    nomads: 720, 
    coworking: 14, 
    hotels: 48, 
    events: 7, 
    lat: 41.3851,
    lng: 2.1734,
  },
  { 
    id: "milan", 
    name: "Milan", 
    fullName: "Milan",
    country: "Italy",
    nomads: 540, 
    coworking: 11, 
    hotels: 38, 
    events: 6, 
    lat: 45.4642,
    lng: 9.1900,
  },
  { 
    id: "rome", 
    name: "Rome", 
    fullName: "Rome",
    country: "Italy",
    nomads: 480, 
    coworking: 8, 
    hotels: 45, 
    events: 5, 
    lat: 41.9028,
    lng: 12.4964,
  },
  { 
    id: "berlin", 
    name: "Berlin", 
    fullName: "Berlin",
    country: "Germany",
    nomads: 890, 
    coworking: 20, 
    hotels: 52, 
    events: 9, 
    lat: 52.5200,
    lng: 13.4050,
  },
  { 
    id: "paris", 
    name: "Paris", 
    fullName: "Paris",
    country: "France",
    nomads: 760, 
    coworking: 16, 
    hotels: 60, 
    events: 8, 
    lat: 48.8566,
    lng: 2.3522,
  },
  { 
    id: "tokyo", 
    name: "Tokyo", 
    fullName: "Tokyo",
    country: "Japan",
    nomads: 650, 
    coworking: 22, 
    hotels: 70, 
    events: 10, 
    lat: 35.6762,
    lng: 139.6503,
  },
  { 
    id: "newyork", 
    name: "New York", 
    fullName: "New York City",
    country: "USA",
    nomads: 920, 
    coworking: 35, 
    hotels: 120, 
    events: 15, 
    lat: 40.7128,
    lng: -74.0060,
  },
  { 
    id: "sydney", 
    name: "Sydney", 
    fullName: "Sydney",
    country: "Australia",
    nomads: 680, 
    coworking: 18, 
    hotels: 65, 
    events: 9, 
    lat: -33.8688,
    lng: 151.2093,
  },
  { 
    id: "dubai", 
    name: "Dubai", 
    fullName: "Dubai",
    country: "UAE",
    nomads: 520, 
    coworking: 12, 
    hotels: 85, 
    events: 7, 
    lat: 25.2048,
    lng: 55.2708,
  },
  { 
    id: "capetown", 
    name: "Cape Town", 
    fullName: "Cape Town",
    country: "South Africa",
    nomads: 380, 
    coworking: 8, 
    hotels: 40, 
    events: 5, 
    lat: -33.9249,
    lng: 18.4241,
  },
];

interface RouteResult {
  from: string;
  to: string;
  fromCity: typeof CITIES[0] | null;
  toCity: typeof CITIES[0] | null;
  distance: number;
  ecoRoute: {
    mode: string;
    duration: string;
    co2: number;
    savings: number;
  };
  fastRoute: {
    mode: string;
    duration: string;
    co2: number;
  };
}

function findCity(name: string): typeof CITIES[0] | null {
  const lowerName = name.toLowerCase().trim();
  return CITIES.find(c => 
    c.name.toLowerCase().includes(lowerName) || 
    c.fullName.toLowerCase().includes(lowerName) ||
    lowerName.includes(c.name.toLowerCase())
  ) || null;
}

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

function calculateRoute(from: string, to: string): RouteResult | null {
  if (!from.trim() || !to.trim()) return null;
  
  const fromCity = findCity(from);
  const toCity = findCity(to);
  
  let distance: number;
  if (fromCity && toCity) {
    distance = calculateDistance(fromCity.lat, fromCity.lng, toCity.lat, toCity.lng);
  } else {
    distance = Math.floor(Math.random() * 2000) + 500;
  }
  
  const ecoRoute = {
    mode: distance > 1000 ? "Train + Bus" : "Train",
    duration: `${Math.floor(distance / 80)}h ${Math.floor((distance % 80) / 1.3)}m`,
    co2: Math.floor(distance * 0.041),
    savings: Math.floor(distance * 0.255 * 0.84),
  };

  const fastRoute = {
    mode: "Flight",
    duration: `${Math.floor(distance / 800)}h ${Math.floor((distance % 800) / 13)}m`,
    co2: Math.floor(distance * 0.255),
  };

  return {
    from,
    to,
    fromCity,
    toCity,
    distance,
    ecoRoute,
    fastRoute,
  };
}

export default function Explore() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedCity, setSelectedCity] = useState<typeof CITIES[0] | null>(null);
  const [showRoute, setShowRoute] = useState(false);
  const [transportMode, setTransportMode] = useState<"eco" | "fast">("eco");
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLocation("/auth");
    }
  }, [user, authLoading, setLocation]);

  const handleCalculateRoute = () => {
    if (!fromCity.trim() || !toCity.trim()) return;
    
    setCalculating(true);
    setTimeout(() => {
      const result = calculateRoute(fromCity, toCity);
      setRouteResult(result);
      setCalculating(false);
    }, 1000);
  };

  if (authLoading) {
    return (
      <Layout fullWidth>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout fullWidth>
      <div className="flex flex-col min-h-[500px] h-[calc(100dvh-64px)] md:h-screen relative overflow-hidden">
        {/* Header / Search */}
        <div className="absolute top-4 inset-x-4 z-[1000] space-y-2">
          <div className="bg-card/90 backdrop-blur-xl border border-border/40 p-2 rounded-2xl shadow-xl flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search destination..." 
                className="w-full bg-muted/50 border-none rounded-xl pl-9 pr-4 py-2 text-sm outline-none"
                data-testid="input-search-destination"
              />
            </div>
            <button 
              onClick={() => { setShowRoute(!showRoute); if (showRoute) setRouteResult(null); }}
              className={`p-2 rounded-xl transition-colors ${showRoute ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}
              data-testid="button-toggle-route"
            >
              <MapIcon className="w-5 h-5" />
            </button>
          </div>

          <AnimatePresence>
            {showRoute && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-card/90 backdrop-blur-xl border border-border/40 p-4 rounded-2xl shadow-xl space-y-3"
              >
                <div className="space-y-2">
                  <input 
                    type="text" 
                    placeholder="From: Milan, Rome, Berlin..." 
                    value={fromCity}
                    onChange={(e) => setFromCity(e.target.value)}
                    className="w-full bg-muted/50 rounded-xl px-3 py-2 text-xs outline-none" 
                    data-testid="input-from-city"
                  />
                  <input 
                    type="text" 
                    placeholder="To: Lisbon, Barcelona, Paris..." 
                    value={toCity}
                    onChange={(e) => setToCity(e.target.value)}
                    className="w-full bg-muted/50 rounded-xl px-3 py-2 text-xs outline-none" 
                    data-testid="input-to-city"
                  />
                </div>
                
                <button
                  onClick={handleCalculateRoute}
                  disabled={!fromCity.trim() || !toCity.trim() || calculating}
                  className="w-full py-2 bg-primary text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                  data-testid="button-calculate-route"
                >
                  {calculating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Calculate Route
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {routeResult && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-3 pt-3 border-t border-border"
                  >
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Route</p>
                      <p className="text-sm font-bold">{routeResult.from} → {routeResult.to}</p>
                      <p className="text-lg font-bold text-primary">{routeResult.distance} km</p>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => setTransportMode("eco")}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all ${transportMode === "eco" ? "bg-green-500 text-white shadow-lg shadow-green-500/20" : "bg-muted text-muted-foreground"}`}
                        data-testid="button-eco-mode"
                      >
                        <Leaf className="w-3 h-3" />
                        Eco-Route
                      </button>
                      <button 
                        onClick={() => setTransportMode("fast")}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all ${transportMode === "fast" ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground"}`}
                        data-testid="button-fast-mode"
                      >
                        <Plane className="w-3 h-3" />
                        Fastest
                      </button>
                    </div>

                    {transportMode === "eco" ? (
                      <div className="p-3 bg-green-50 rounded-xl border border-green-200 space-y-2">
                        <div className="flex items-center gap-2">
                          <Train className="w-5 h-5 text-green-600" />
                          <div>
                            <p className="text-sm font-bold text-green-900">{routeResult.ecoRoute.mode}</p>
                            <p className="text-xs text-green-700">{routeResult.ecoRoute.duration}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Leaf className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-bold text-green-900">{routeResult.ecoRoute.co2} kg CO2</span>
                          </div>
                          <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                            -{routeResult.ecoRoute.savings} kg saved!
                          </span>
                        </div>
                        <p className="text-[10px] text-green-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Reduces CO2 emissions by 84% vs flying
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 bg-muted rounded-xl space-y-2">
                        <div className="flex items-center gap-2">
                          <Plane className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-bold">{routeResult.fastRoute.mode}</p>
                            <p className="text-xs text-muted-foreground">{routeResult.fastRoute.duration}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-orange-600">
                          <span className="text-sm font-bold">{routeResult.fastRoute.co2} kg CO2</span>
                        </div>
                        <p className="text-[10px] text-orange-600">
                          Consider the eco-route to reduce your carbon footprint!
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Real World Map */}
        <div className="flex-1 relative" style={{ minHeight: "500px" }}>
          <MapContainer
            center={[20, 0]}
            zoom={2}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={true}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* City Markers */}
            {CITIES.map((city) => (
              <Marker
                key={city.id}
                position={[city.lat, city.lng]}
                icon={customIcon}
                eventHandlers={{
                  click: () => setSelectedCity(city),
                }}
              >
                <Popup>
                  <div className="text-center p-1">
                    <h3 className="font-bold text-sm">{city.fullName}</h3>
                    <p className="text-xs text-gray-500">{city.country}</p>
                    <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-blue-500" />
                        <span>{city.nomads}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-green-500" />
                        <span>{city.coworking}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Hotel className="w-3 h-3 text-orange-500" />
                        <span>{city.hotels}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-red-500" />
                        <span>{city.events}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setToCity(city.name);
                        setShowRoute(true);
                        setSelectedCity(null);
                      }}
                      className="mt-2 w-full py-1 bg-primary text-white rounded text-xs font-medium"
                    >
                      Plan Trip
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Route Line */}
            {routeResult && routeResult.fromCity && routeResult.toCity && (
              <Polyline
                positions={[
                  [routeResult.fromCity.lat, routeResult.fromCity.lng],
                  [routeResult.toCity.lat, routeResult.toCity.lng],
                ]}
                color={transportMode === "eco" ? "#22c55e" : "#6366f1"}
                weight={4}
                dashArray="10, 10"
              />
            )}
          </MapContainer>
        </div>

        {/* City Detail Modal */}
        <AnimatePresence>
          {selectedCity && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.5, y: 100 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 100 }}
              className="absolute inset-x-4 bottom-24 md:bottom-8 z-[1001] flex justify-center pointer-events-none"
            >
              <div className="bg-[#FF6B35] p-1 rounded-[2.5rem] shadow-2xl pointer-events-auto max-w-sm w-full">
                <div className="bg-white rounded-[2.3rem] p-6 relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#FFC857] rounded-full opacity-20" />
                  <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary rounded-full opacity-10" />

                  <button 
                    onClick={() => setSelectedCity(null)}
                    className="absolute top-4 right-4 p-2 hover:bg-muted rounded-full transition-colors"
                    data-testid="button-close-popup"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>

                  <div className="relative">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF6B35] mb-1 block">Trending Destination</span>
                    <h2 className="text-3xl font-display font-black leading-none text-[#032B3A] mb-1" data-testid="text-city-name">{selectedCity.fullName}</h2>
                    <p className="text-sm text-muted-foreground mb-4">{selectedCity.country}</p>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <PopupStat icon={Users} label="Nomads" value={selectedCity.nomads} color="#4A90E2" />
                      <PopupStat icon={Briefcase} label="Coworking" value={selectedCity.coworking} color="#50E3C2" />
                      <PopupStat icon={Hotel} label="Hotels" value={selectedCity.hotels} color="#F5A623" />
                      <PopupStat icon={Calendar} label="Events" value={selectedCity.events} color="#D0021B" />
                    </div>

                    <div className="mt-6 flex gap-2">
                      <button 
                        onClick={() => {
                          setToCity(selectedCity.name);
                          setShowRoute(true);
                          setSelectedCity(null);
                        }}
                        className="flex-1 py-3 bg-primary text-white rounded-2xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                        data-testid="button-plan-trip"
                      >
                        Plan Trip
                      </button>
                      <button 
                        onClick={() => setLocation("/coworking")}
                        className="flex-1 py-3 bg-muted rounded-2xl text-sm font-bold hover:bg-muted/80 transition-all"
                        data-testid="button-view-spaces"
                      >
                        View Spaces
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}

function PopupStat({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl">
      <div 
        className="w-8 h-8 rounded-lg flex items-center justify-center" 
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <p className="text-lg font-bold text-[#032B3A] leading-tight">{value}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}
