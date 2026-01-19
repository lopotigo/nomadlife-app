import { useState } from "react";
import { MapPin, Compass, Plane, Leaf, Users, Globe, Sun, Moon, Wind, Mountain, Coffee, Wifi, Heart, MessageCircle, Share2, Camera, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export default function DesignPreview() {
  const [activeDesign, setActiveDesign] = useState<"A" | "B" | "C">("A");

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-700 p-4">
        <h1 className="text-xl font-bold text-center mb-4">Design Preview - NomadLife</h1>
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setActiveDesign("A")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeDesign === "A" 
                ? "bg-emerald-500 text-white" 
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            A) Map-First
          </button>
          <button
            onClick={() => setActiveDesign("B")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeDesign === "B" 
                ? "bg-amber-500 text-white" 
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            B) Eco-Travel
          </button>
          <button
            onClick={() => setActiveDesign("C")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeDesign === "C" 
                ? "bg-cyan-500 text-white" 
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            C) Mix
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto bg-slate-800 min-h-screen">
        {activeDesign === "A" && <DesignA />}
        {activeDesign === "B" && <DesignB />}
        {activeDesign === "C" && <DesignC />}
      </div>
    </div>
  );
}

function DesignA() {
  return (
    <div className="relative">
      <div className="h-[60vh] bg-gradient-to-b from-emerald-900/50 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <svg viewBox="0 0 400 400" className="w-full h-full">
            <defs>
              <pattern id="topo" patternUnits="userSpaceOnUse" width="100" height="100">
                <path d="M0 50 Q25 30, 50 50 T100 50" stroke="rgba(16,185,129,0.3)" fill="none" strokeWidth="1"/>
                <path d="M0 70 Q25 50, 50 70 T100 70" stroke="rgba(16,185,129,0.2)" fill="none" strokeWidth="1"/>
                <path d="M0 30 Q25 10, 50 30 T100 30" stroke="rgba(16,185,129,0.2)" fill="none" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#topo)"/>
          </svg>
        </div>
        
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
          <div className="flex items-center gap-2">
            <Compass className="w-6 h-6 text-emerald-400" />
            <span className="font-bold text-lg">NomadLife</span>
          </div>
          <div className="flex items-center gap-2 bg-emerald-500/20 px-3 py-1.5 rounded-full border border-emerald-500/30">
            <Globe className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-300">247 online</span>
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-64 h-64">
            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 animate-pulse" />
            <div className="absolute inset-4 rounded-full border border-emerald-500/30" />
            <div className="absolute inset-8 rounded-full border border-emerald-500/40" />
            
            <div className="absolute top-8 left-12 w-3 h-3 bg-amber-400 rounded-full animate-ping" />
            <div className="absolute top-8 left-12 w-3 h-3 bg-amber-400 rounded-full" />
            
            <div className="absolute top-20 right-8 w-3 h-3 bg-cyan-400 rounded-full animate-ping" style={{animationDelay: "0.5s"}} />
            <div className="absolute top-20 right-8 w-3 h-3 bg-cyan-400 rounded-full" />
            
            <div className="absolute bottom-16 left-20 w-3 h-3 bg-rose-400 rounded-full animate-ping" style={{animationDelay: "1s"}} />
            <div className="absolute bottom-16 left-20 w-3 h-3 bg-rose-400 rounded-full" />
            
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-4xl font-bold text-emerald-400">3</p>
                <p className="text-xs text-slate-400">nomadi vicino a te</p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 to-transparent h-32" />
      </div>

      <div className="p-4 -mt-16 relative z-10">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-emerald-400" />
          Nomadi nelle vicinanze
        </h2>
        
        <div className="space-y-3">
          {[
            { name: "Sarah", location: "Bali, 2km", status: "Working", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100" },
            { name: "Marco", location: "Bali, 5km", status: "Exploring", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100" },
          ].map((nomad, i) => (
            <div key={i} className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 border border-emerald-500/20 flex items-center gap-4">
              <img src={nomad.avatar} className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500" />
              <div className="flex-1">
                <p className="font-bold">{nomad.name}</p>
                <p className="text-sm text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {nomad.location}
                </p>
              </div>
              <div className="px-3 py-1 bg-emerald-500/20 rounded-full text-xs text-emerald-300">
                {nomad.status}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900/95 backdrop-blur-md border-t border-slate-700 p-2">
        <div className="flex justify-around">
          {[
            { icon: Globe, label: "Map", active: true },
            { icon: Users, label: "Nomads", active: false },
            { icon: Compass, label: "Explore", active: false },
            { icon: MessageCircle, label: "Chat", active: false },
          ].map((item, i) => (
            <button key={i} className={`flex flex-col items-center p-2 rounded-xl ${item.active ? "text-emerald-400" : "text-slate-500"}`}>
              <item.icon className="w-6 h-6" />
              <span className="text-xs mt-1">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function DesignB() {
  return (
    <div className="bg-gradient-to-b from-amber-950 via-orange-950 to-slate-900 min-h-screen">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold">NomadLife</h1>
            <p className="text-xs text-amber-400/70">Viaggia sostenibile</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-green-500/20 px-3 py-1.5 rounded-full">
          <Leaf className="w-4 h-4 text-green-400" />
          <span className="text-sm text-green-300">-12kg CO₂</span>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { city: "Bali", temp: "28°", icon: Sun, color: "from-amber-500 to-orange-500" },
            { city: "Tokyo", temp: "15°", icon: Mountain, color: "from-rose-500 to-pink-500" },
            { city: "Lisbon", temp: "22°", icon: Wind, color: "from-cyan-500 to-blue-500" },
          ].map((dest, i) => (
            <div key={i} className={`flex-shrink-0 w-28 h-36 rounded-2xl bg-gradient-to-br ${dest.color} p-3 flex flex-col justify-between`}>
              <dest.icon className="w-8 h-8 text-white/80" />
              <div>
                <p className="text-2xl font-bold text-white">{dest.temp}</p>
                <p className="text-sm text-white/80">{dest.city}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Plane className="w-5 h-5 text-amber-400" />
          Journey Feed
        </h2>

        <div className="bg-slate-800/50 rounded-3xl overflow-hidden border border-amber-500/20">
          <div className="h-48 bg-gradient-to-br from-amber-600/20 to-orange-600/20 relative">
            <img src="https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400" className="w-full h-full object-cover" />
            <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs">Eco-friendly trip</span>
            </div>
            <div className="absolute bottom-3 right-3 bg-green-500/90 px-3 py-1.5 rounded-full flex items-center gap-1">
              <Leaf className="w-3 h-3" />
              <span className="text-xs font-bold">-5kg CO₂</span>
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100" className="w-10 h-10 rounded-full object-cover" />
              <div>
                <p className="font-bold">Marco Rossi</p>
                <p className="text-xs text-slate-400">Bali → Singapore • Treno</p>
              </div>
            </div>
            <p className="text-sm text-slate-300 mb-3">Ho scelto il treno invece dell'aereo. 8 ore di viaggio ma vista incredibile!</p>
            <div className="flex items-center gap-4 text-slate-400">
              <button className="flex items-center gap-1 hover:text-amber-400 transition-colors">
                <Heart className="w-5 h-5" />
                <span className="text-sm">124</span>
              </button>
              <button className="flex items-center gap-1 hover:text-amber-400 transition-colors">
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm">23</span>
              </button>
              <button className="ml-auto flex items-center gap-1 text-green-400">
                <Leaf className="w-4 h-4" />
                <span className="text-xs">Eco choice</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl p-4 border border-green-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Il tuo impatto questo mese</span>
            <span className="text-green-400 font-bold">-47kg CO₂</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full w-3/4 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" />
          </div>
          <p className="text-xs text-slate-400 mt-2">Meglio del 78% dei viaggiatori!</p>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900/95 backdrop-blur-md border-t border-amber-500/20 p-2">
        <div className="flex justify-around">
          {[
            { icon: Sun, label: "Feed", active: true, color: "text-amber-400" },
            { icon: Compass, label: "Explore", active: false },
            { icon: Leaf, label: "Impact", active: false },
            { icon: Users, label: "Community", active: false },
          ].map((item, i) => (
            <button key={i} className={`flex flex-col items-center p-2 rounded-xl ${item.active ? item.color || "text-amber-400" : "text-slate-500"}`}>
              <item.icon className="w-6 h-6" />
              <span className="text-xs mt-1">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function DesignC() {
  return (
    <div className="bg-slate-900 min-h-screen">
      <div className="h-48 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/30 via-blue-600/20 to-slate-900">
          <div className="absolute inset-0 opacity-40">
            <svg viewBox="0 0 400 200" className="w-full h-full">
              <defs>
                <linearGradient id="ocean" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(6,182,212,0.3)" />
                  <stop offset="100%" stopColor="rgba(59,130,246,0.1)" />
                </linearGradient>
              </defs>
              <path d="M0 100 Q50 80, 100 100 T200 100 T300 100 T400 100 L400 200 L0 200 Z" fill="url(#ocean)" />
              <path d="M0 120 Q50 100, 100 120 T200 120 T300 120 T400 120 L400 200 L0 200 Z" fill="url(#ocean)" opacity="0.5" />
            </svg>
          </div>
        </div>
        
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">NomadLife</span>
          </div>
          <button className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <Globe className="w-5 h-5" />
          </button>
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-3 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold">Bali, Indonesia</p>
              <p className="text-xs text-slate-400">42 nomadi attivi • 12 coworking</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
          {["Tutti", "Coworking", "Caffè", "Eventi", "Alloggi"].map((tab, i) => (
            <button 
              key={i} 
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                i === 0 
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white" 
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div className="bg-slate-800 rounded-2xl overflow-hidden">
            <div className="flex">
              <div className="w-1/3 h-32 bg-gradient-to-br from-cyan-600/20 to-blue-600/20">
                <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=200" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 p-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Coffee className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs text-cyan-400">Coworking</span>
                  </div>
                  <h3 className="font-bold">Dojo Bali</h3>
                  <p className="text-xs text-slate-400">Ocean views • Fast WiFi</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Wifi className="w-3 h-3 text-green-400" />
                    <span className="text-xs text-green-400">100 Mbps</span>
                  </div>
                  <span className="text-sm font-bold text-cyan-400">$15/day</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-2xl overflow-hidden">
            <div className="relative h-48">
              <img src="https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100" className="w-8 h-8 rounded-full object-cover border-2 border-cyan-400" />
                  <div>
                    <p className="font-bold text-sm">Sarah Chen</p>
                    <p className="text-xs text-slate-400">2h ago • Canggu</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4">
              <p className="text-sm mb-3">Sunset session al Dojo! Chi si unisce domani? 🌅</p>
              <div className="flex items-center gap-4 text-slate-400">
                <button className="flex items-center gap-1">
                  <Heart className="w-5 h-5" />
                  <span className="text-sm">89</span>
                </button>
                <button className="flex items-center gap-1">
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm">12</span>
                </button>
                <button className="ml-auto">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900/95 backdrop-blur-md border-t border-cyan-500/20 p-2">
        <div className="flex justify-around items-center">
          {[
            { icon: Compass, label: "Discover", active: true },
            { icon: MapPin, label: "Map", active: false },
            { icon: Camera, label: "", active: false, special: true },
            { icon: MessageCircle, label: "Chat", active: false },
            { icon: Users, label: "Profile", active: false },
          ].map((item, i) => (
            <button 
              key={i} 
              className={`flex flex-col items-center p-2 rounded-xl ${
                item.special 
                  ? "w-14 h-14 -mt-6 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30" 
                  : item.active ? "text-cyan-400" : "text-slate-500"
              }`}
            >
              <item.icon className={item.special ? "w-6 h-6 text-white" : "w-6 h-6"} />
              {!item.special && <span className="text-xs mt-1">{item.label}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
