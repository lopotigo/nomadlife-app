import { useEffect, useState, useRef } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Search, MapPin, Map as MapIcon, Leaf, Users, Hotel, Briefcase, Calendar, X, CheckCircle2, Loader2, ArrowRight, Train, Plane } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
    coords: { top: "58%", left: "77%" },
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
    coords: { top: "38%", left: "44%" },
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
    coords: { top: "48%", left: "18%" },
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
    coords: { top: "50%", left: "72%" },
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
    coords: { top: "37%", left: "47%" },
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
    coords: { top: "35%", left: "49%" },
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
    coords: { top: "38%", left: "50%" },
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
    coords: { top: "32%", left: "50%" },
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
    coords: { top: "34%", left: "47%" },
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
    coords: { top: "40%", left: "85%" },
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

function calculateRoute(from: string, to: string): RouteResult | null {
  if (!from.trim() || !to.trim()) return null;
  
  const fromCity = findCity(from);
  const toCity = findCity(to);
  
  const baseDistance = Math.floor(Math.random() * 2000) + 500;
  
  const ecoRoute = {
    mode: baseDistance > 1000 ? "Train + Bus" : "Train",
    duration: `${Math.floor(baseDistance / 80)}h ${Math.floor((baseDistance % 80) / 1.3)}m`,
    co2: Math.floor(baseDistance * 0.041),
    savings: Math.floor(baseDistance * 0.255 * 0.84),
  };

  const fastRoute = {
    mode: "Flight",
    duration: `${Math.floor(baseDistance / 800)}h ${Math.floor((baseDistance % 800) / 13)}m`,
    co2: Math.floor(baseDistance * 0.255),
  };

  return {
    from,
    to,
    fromCity,
    toCity,
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
  const mapRef = useRef<HTMLDivElement>(null);

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

        {/* Map Background */}
        <div ref={mapRef} className="flex-1 bg-[#e8e4df] relative cursor-grab active:cursor-grabbing overflow-hidden">
          {/* World Map SVG */}
          <svg 
            viewBox="0 0 1000 500" 
            className="absolute inset-0 w-full h-full"
            style={{ background: "linear-gradient(180deg, #87CEEB 0%, #B0E0E6 50%, #E0F7FA 100%)" }}
          >
            {/* Ocean background */}
            <rect width="1000" height="500" fill="#B4D4E7" />
            
            {/* Simplified world continents */}
            {/* North America */}
            <path d="M50,80 Q120,60 180,90 L220,120 Q250,150 240,200 L200,250 Q150,280 100,260 L60,200 Q30,150 50,80" fill="#C5D5C5" stroke="#9AB59A" strokeWidth="1"/>
            
            {/* South America */}
            <path d="M180,280 Q220,270 240,300 L260,380 Q250,450 200,480 L160,460 Q140,400 150,340 L180,280" fill="#C5D5C5" stroke="#9AB59A" strokeWidth="1"/>
            
            {/* Europe */}
            <path d="M440,80 Q500,60 540,90 L560,130 Q550,160 520,170 L480,160 Q450,140 440,110 L440,80" fill="#C5D5C5" stroke="#9AB59A" strokeWidth="1"/>
            
            {/* Africa */}
            <path d="M460,180 Q520,170 560,200 L580,280 Q570,380 500,420 L440,400 Q420,320 440,240 L460,180" fill="#C5D5C5" stroke="#9AB59A" strokeWidth="1"/>
            
            {/* Asia */}
            <path d="M560,60 Q700,40 800,80 L860,140 Q880,200 840,260 L760,280 Q680,290 620,260 L580,200 Q560,140 560,60" fill="#C5D5C5" stroke="#9AB59A" strokeWidth="1"/>
            
            {/* Australia */}
            <path d="M760,340 Q820,320 860,360 L870,420 Q850,460 800,460 L760,440 Q740,400 760,340" fill="#C5D5C5" stroke="#9AB59A" strokeWidth="1"/>
            
            {/* Indonesia/Southeast Asia */}
            <path d="M720,260 Q780,250 820,280 L840,320 Q820,340 780,330 L740,310 Q720,290 720,260" fill="#C5D5C5" stroke="#9AB59A" strokeWidth="1"/>
          </svg>
          
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-white/20 pointer-events-none" />

          {/* Route Line SVG */}
          {routeResult && routeResult.fromCity && routeResult.toCity && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
              <defs>
                <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={transportMode === "eco" ? "#22c55e" : "#6366f1"} />
                  <stop offset="100%" stopColor={transportMode === "eco" ? "#16a34a" : "#4f46e5"} />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              {/* Animated route line */}
              <motion.line
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                x1={routeResult.fromCity.coords.left}
                y1={routeResult.fromCity.coords.top}
                x2={routeResult.toCity.coords.left}
                y2={routeResult.toCity.coords.top}
                stroke="url(#routeGradient)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="8 4"
                filter="url(#glow)"
              />
              
              {/* Start point */}
              <motion.circle
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                cx={routeResult.fromCity.coords.left}
                cy={routeResult.fromCity.coords.top}
                r="12"
                fill={transportMode === "eco" ? "#22c55e" : "#6366f1"}
                stroke="white"
                strokeWidth="3"
              />
              
              {/* End point */}
              <motion.circle
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.2 }}
                cx={routeResult.toCity.coords.left}
                cy={routeResult.toCity.coords.top}
                r="12"
                fill={transportMode === "eco" ? "#16a34a" : "#4f46e5"}
                stroke="white"
                strokeWidth="3"
              />

              {/* Moving dot along route */}
              <motion.circle
                initial={{ cx: routeResult.fromCity.coords.left, cy: routeResult.fromCity.coords.top }}
                animate={{ 
                  cx: [routeResult.fromCity.coords.left, routeResult.toCity.coords.left],
                  cy: [routeResult.fromCity.coords.top, routeResult.toCity.coords.top]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear"
                }}
                r="6"
                fill="white"
                stroke={transportMode === "eco" ? "#22c55e" : "#6366f1"}
                strokeWidth="2"
              />
            </svg>
          )}

          {/* Route Labels */}
          {routeResult && routeResult.fromCity && routeResult.toCity && (
            <>
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                style={{ top: routeResult.fromCity.coords.top, left: routeResult.fromCity.coords.left }}
                className="absolute z-30 -translate-x-1/2 -translate-y-full -mt-4"
              >
                <div className={`px-3 py-1 rounded-full text-white text-xs font-bold shadow-lg ${transportMode === "eco" ? "bg-green-500" : "bg-primary"}`}>
                  {routeResult.fromCity.name}
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.3 }}
                style={{ top: routeResult.toCity.coords.top, left: routeResult.toCity.coords.left }}
                className="absolute z-30 -translate-x-1/2 translate-y-4"
              >
                <div className={`px-3 py-1 rounded-full text-white text-xs font-bold shadow-lg ${transportMode === "eco" ? "bg-green-600" : "bg-indigo-600"}`}>
                  {routeResult.toCity.name}
                </div>
              </motion.div>
            </>
          )}

          {/* City Markers */}
          {CITIES.map(city => {
            const isInRoute = routeResult && (
              routeResult.fromCity?.id === city.id || 
              routeResult.toCity?.id === city.id
            );
            
            return (
              <motion.button
                key={city.id}
                whileHover={{ scale: 1.3 }}
                onClick={() => setSelectedCity(city)}
                style={{ top: city.coords.top, left: city.coords.left }}
                className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 p-2 rounded-full shadow-lg group transition-all ${
                  isInRoute 
                    ? "bg-transparent scale-0" 
                    : "bg-primary text-white shadow-primary/30"
                }`}
                data-testid={`marker-${city.id}`}
              >
                <MapPin className="w-5 h-5" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {city.fullName}
                </div>
              </motion.button>
            );
          })}
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
        <p className="text-lg font-black leading-none" style={{ color }}>{value}</p>
        <p className="text-[10px] text-gray-500 uppercase font-bold">{label}</p>
      </div>
    </div>
  );
}
