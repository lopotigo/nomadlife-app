import Layout from "@/components/layout";
import { Search, MapPin, Map as MapIcon, Leaf, Users, Hotel, Briefcase, Calendar, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PLACES } from "@/lib/mock-data";

export default function Explore() {
  const [selectedCity, setSelectedCity] = useState<any>(null);
  const [showRoute, setShowRoute] = useState(false);
  const [transportMode, setTransportMode] = useState("eco");

  const cities = [
    { 
      id: "bali", 
      name: "Canggu, Bali", 
      nomads: 1240, 
      coworking: 15, 
      hotels: 42, 
      events: 8, 
      coords: { top: "60%", left: "75%" },
      emissions: "12kg CO2"
    },
    { 
      id: "lisbon", 
      name: "Lisbon, Portugal", 
      nomads: 850, 
      coworking: 12, 
      hotels: 35, 
      events: 5, 
      coords: { top: "40%", left: "45%" },
      emissions: "8kg CO2"
    },
    { 
      id: "mexico", 
      name: "Mexico City", 
      nomads: 620, 
      coworking: 9, 
      hotels: 28, 
      events: 4, 
      coords: { top: "50%", left: "25%" },
      emissions: "15kg CO2"
    }
  ];

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
                placeholder="Search destination or route..." 
                className="w-full bg-muted/50 border-none rounded-xl pl-9 pr-4 py-2 text-sm outline-none"
              />
            </div>
            <button 
              onClick={() => setShowRoute(!showRoute)}
              className={`p-2 rounded-xl transition-colors ${showRoute ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}
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
                  <input type="text" placeholder="From: Milan" className="w-full bg-muted/50 rounded-xl px-3 py-2 text-xs outline-none" />
                  <input type="text" placeholder="To: Rome" className="w-full bg-muted/50 rounded-xl px-3 py-2 text-xs outline-none" />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setTransportMode("eco")}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all ${transportMode === "eco" ? "bg-green-500 text-white shadow-lg shadow-green-500/20" : "bg-muted text-muted-foreground"}`}
                  >
                    <Leaf className="w-3 h-3" />
                    Eco-Route
                  </button>
                  <button 
                    onClick={() => setTransportMode("fast")}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${transportMode === "fast" ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground"}`}
                  >
                    Fastest
                  </button>
                </div>
                {transportMode === "eco" && (
                  <p className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Reduces CO2 emissions by 45% vs driving
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Map Background */}
        <div className="flex-1 bg-[#f8f5f2] relative cursor-grab active:cursor-grabbing overflow-hidden">
          {/* Topography Pattern */}
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/topography.png')] pointer-events-none" />
          
          {/* Decorative Map Elements */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <Globe className="w-[80%] h-[80%] stroke-[0.5]" />
          </div>

          {/* City Markers */}
          {cities.map(city => (
            <motion.button
              key={city.id}
              whileHover={{ scale: 1.2 }}
              onClick={() => setSelectedCity(city)}
              style={{ top: city.coords.top, left: city.coords.left }}
              className="absolute z-10 p-2 bg-primary text-white rounded-full shadow-lg shadow-primary/30 group"
            >
              <MapPin className="w-5 h-5" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {city.name}
              </div>
            </motion.button>
          ))}
        </div>

        {/* Cartoonish Popup */}
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
                  {/* Decorative blobs */}
                  <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#FFC857] rounded-full opacity-20" />
                  <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary rounded-full opacity-10" />

                  <button 
                    onClick={() => setSelectedCity(null)}
                    className="absolute top-4 right-4 p-2 hover:bg-muted rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>

                  <div className="relative">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF6B35] mb-1 block">Trending Destination</span>
                    <h2 className="text-3xl font-display font-black leading-none text-[#032B3A] mb-4">{selectedCity.name}</h2>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <PopupStat icon={Users} label="Nomads" value={selectedCity.nomads} color="#4A90E2" />
                      <PopupStat icon={Briefcase} label="Spaces" value={selectedCity.coworking} color="#50E3C2" />
                      <PopupStat icon={Hotel} label="Hotels" value={selectedCity.hotels} color="#F5A623" />
                      <PopupStat icon={Calendar} label="Events" value={selectedCity.events} color="#D0021B" />
                    </div>

                    <div className="mt-6 p-4 bg-green-50 rounded-2xl border-2 border-dashed border-green-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-500/20">
                          <Leaf className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Eco Impact</p>
                          <p className="text-sm font-black text-green-900">-{selectedCity.emissions}</p>
                        </div>
                      </div>
                      <button className="bg-white px-4 py-2 rounded-xl text-[10px] font-bold text-green-600 shadow-sm hover:shadow-md transition-all active:scale-95">BOOK ECO</button>
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

function PopupStat({ icon: Icon, label, value, color }: any) {
  return (
    <div className="p-3 rounded-2xl bg-muted/30 flex items-center gap-3 border-b-4 border-black/5">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: color }}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-lg font-black leading-none">{value}</p>
        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function CheckCircle2({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
