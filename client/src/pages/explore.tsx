import { useEffect, useState } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Search, MapPin, Map as MapIcon, Leaf, Users, Hotel, Briefcase, Calendar, X, Globe, CheckCircle2, Loader2, ArrowRight, Train, Plane, Car } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CITIES = [
  { 
    id: "bali", 
    name: "Canggu, Bali", 
    country: "Indonesia",
    nomads: 1240, 
    coworking: 15, 
    hotels: 42, 
    events: 8, 
    coords: { top: "60%", left: "75%" },
  },
  { 
    id: "lisbon", 
    name: "Lisbon", 
    country: "Portugal",
    nomads: 850, 
    coworking: 12, 
    hotels: 35, 
    events: 5, 
    coords: { top: "40%", left: "45%" },
  },
  { 
    id: "mexico", 
    name: "Mexico City", 
    country: "Mexico",
    nomads: 620, 
    coworking: 9, 
    hotels: 28, 
    events: 4, 
    coords: { top: "50%", left: "25%" },
  },
  { 
    id: "chiangmai", 
    name: "Chiang Mai", 
    country: "Thailand",
    nomads: 980, 
    coworking: 18, 
    hotels: 55, 
    events: 12, 
    coords: { top: "55%", left: "70%" },
  },
  { 
    id: "barcelona", 
    name: "Barcelona", 
    country: "Spain",
    nomads: 720, 
    coworking: 14, 
    hotels: 48, 
    events: 7, 
    coords: { top: "42%", left: "48%" },
  },
];

interface RouteResult {
  from: string;
  to: string;
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

function calculateRoute(from: string, to: string): RouteResult | null {
  if (!from.trim() || !to.trim()) return null;
  
  // Simulated distances (in km) based on city pairs
  const baseDistance = Math.floor(Math.random() * 2000) + 500;
  
  // Eco route (train/bus) - slower but less CO2
  const ecoRoute = {
    mode: baseDistance > 1000 ? "Train + Bus" : "Train",
    duration: `${Math.floor(baseDistance / 80)}h ${Math.floor((baseDistance % 80) / 1.3)}m`,
    co2: Math.floor(baseDistance * 0.041), // Train emits ~41g CO2/km per passenger
    savings: Math.floor(baseDistance * 0.255 * 0.84), // 84% less than flying
  };

  // Fast route (plane) - faster but more CO2
  const fastRoute = {
    mode: "Flight",
    duration: `${Math.floor(baseDistance / 800)}h ${Math.floor((baseDistance % 800) / 13)}m`,
    co2: Math.floor(baseDistance * 0.255), // Plane emits ~255g CO2/km per passenger
  };

  return {
    from,
    to,
    distance: baseDistance,
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
    // Simulate API call delay
    setTimeout(() => {
      const result = calculateRoute(fromCity, toCity);
      setRouteResult(result);
      setCalculating(false);
    }, 1000);
  };

  if (authLoading) {
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
      <div className="flex flex-col h-[calc(100vh-64px)] md:h-screen relative overflow-hidden">
        {/* Header / Search */}
        <div className="absolute top-4 inset-x-4 z-40 space-y-2">
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
              onClick={() => { setShowRoute(!showRoute); setRouteResult(null); }}
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
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Distance</p>
                      <p className="text-lg font-bold">{routeResult.distance} km</p>
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

        {/* Map Background */}
        <div className="flex-1 bg-[#f8f5f2] relative cursor-grab active:cursor-grabbing overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/topography.png')] pointer-events-none" />
          
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <Globe className="w-[80%] h-[80%] stroke-[0.5]" />
          </div>

          {/* City Markers */}
          {CITIES.map(city => (
            <motion.button
              key={city.id}
              whileHover={{ scale: 1.2 }}
              onClick={() => setSelectedCity(city)}
              style={{ top: city.coords.top, left: city.coords.left }}
              className="absolute z-10 p-2 bg-primary text-white rounded-full shadow-lg shadow-primary/30 group"
              data-testid={`marker-${city.id}`}
            >
              <MapPin className="w-5 h-5" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {city.name}
              </div>
            </motion.button>
          ))}
        </div>

        {/* City Popup */}
        <AnimatePresence>
          {selectedCity && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.5, y: 100 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 100 }}
              className="absolute inset-x-4 bottom-24 md:bottom-8 z-50 flex justify-center pointer-events-none"
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
                    <h2 className="text-3xl font-display font-black leading-none text-[#032B3A] mb-1" data-testid="text-city-name">{selectedCity.name}</h2>
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
        <p className="text-lg font-black leading-none" style={{ color }}>{value}</p>
        <p className="text-[10px] text-gray-500 uppercase font-bold">{label}</p>
      </div>
    </div>
  );
}
