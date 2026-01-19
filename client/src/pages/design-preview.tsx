import { useState } from "react";
import { MapPin, Compass, Plane, Leaf, Users, Globe, Sun, Moon, Wind, Mountain, Coffee, Wifi, Heart, MessageCircle, Share2, Camera, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export default function DesignPreview() {
  const [activeDesign, setActiveDesign] = useState<"A" | "B" | "C" | "D" | "E">("E");

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-700 p-4">
        <h1 className="text-xl font-bold text-center mb-4">Design Preview - NomadLife</h1>
        <div className="flex justify-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveDesign("E")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeDesign === "E" 
                ? "bg-teal-500 text-white" 
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            E) Map + Posts
          </button>
          <button
            onClick={() => setActiveDesign("D")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeDesign === "D" 
                ? "bg-violet-500 text-white" 
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            D) 3 Colonne
          </button>
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

      {activeDesign === "E" ? (
        <DesignE />
      ) : activeDesign === "D" ? (
        <DesignD />
      ) : (
        <div className="max-w-md mx-auto bg-slate-800 min-h-screen">
          {activeDesign === "A" && <DesignA />}
          {activeDesign === "B" && <DesignB />}
          {activeDesign === "C" && <DesignC />}
        </div>
      )}
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

function DesignD() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-0 min-h-screen">
        
        <div className="col-span-3 bg-slate-900/50 border-r border-slate-800 p-4 sticky top-16 h-[calc(100vh-64px)]">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Compass className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">NomadLife</h1>
              <p className="text-xs text-slate-500">Explore the world</p>
            </div>
          </div>

          <nav className="space-y-2">
            {[
              { icon: Globe, label: "Feed", active: true, color: "violet" },
              { icon: MapPin, label: "Explore Map", active: false },
              { icon: Coffee, label: "Coworking", active: false },
              { icon: MessageCircle, label: "Messages", active: false },
              { icon: Plane, label: "My Trips", active: false },
              { icon: Leaf, label: "Eco Impact", active: false },
              { icon: Users, label: "Community", active: false },
            ].map((item, i) => (
              <button
                key={i}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  item.active 
                    ? "bg-violet-500/20 text-violet-400 border border-violet-500/30" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-gradient-to-r from-violet-500/20 to-purple-500/20 rounded-2xl p-4 border border-violet-500/30">
              <div className="flex items-center gap-2 mb-2">
                <Leaf className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium">Eco Score</span>
              </div>
              <div className="text-2xl font-bold text-green-400">87/100</div>
              <p className="text-xs text-slate-400 mt-1">Top 15% dei nomadi!</p>
            </div>
          </div>
        </div>

        <div className="col-span-5 border-r border-slate-800 overflow-y-auto">
          <div className="sticky top-0 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 p-4 z-10">
            <h2 className="text-xl font-bold">Feed</h2>
          </div>

          <div className="p-4 space-y-4">
            <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-500" />
                <input 
                  type="text" 
                  placeholder="Condividi la tua avventura..." 
                  className="flex-1 bg-slate-700/50 rounded-full px-4 py-2 text-sm placeholder:text-slate-500 border border-slate-600 focus:border-violet-500 focus:outline-none"
                />
                <button className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center hover:bg-violet-600 transition-colors">
                  <Camera className="w-5 h-5" />
                </button>
              </div>
            </div>

            {[
              {
                user: "Sarah Chen",
                avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
                location: "Bali, Indonesia",
                time: "2h",
                content: "Il tramonto da Uluwatu oggi era incredibile! Chi vuole fare surf domani mattina?",
                image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600",
                likes: 124,
                comments: 18,
                eco: true
              },
              {
                user: "Marco Rossi",
                avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
                location: "Lisbon, Portugal",
                time: "5h",
                content: "Nuovo coworking scoperto vicino al LX Factory. WiFi velocissimo e ottimo caffe!",
                image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600",
                likes: 89,
                comments: 12,
                eco: false
              },
              {
                user: "Elena Vasquez",
                avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
                location: "Tokyo, Japan",
                time: "8h",
                content: "Cherry blossom season is magical. Working from a cafe with this view!",
                image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600",
                likes: 234,
                comments: 42,
                eco: true
              }
            ].map((post, i) => (
              <div key={i} className="bg-slate-800/50 rounded-2xl overflow-hidden border border-slate-700 hover:border-violet-500/50 transition-colors">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={post.avatar} className="w-10 h-10 rounded-full object-cover border-2 border-violet-500" />
                    <div>
                      <p className="font-bold text-sm">{post.user}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {post.location} - {post.time}
                      </p>
                    </div>
                  </div>
                  {post.eco && (
                    <div className="px-2 py-1 bg-green-500/20 rounded-full flex items-center gap-1">
                      <Leaf className="w-3 h-3 text-green-400" />
                      <span className="text-xs text-green-400">Eco</span>
                    </div>
                  )}
                </div>
                <img src={post.image} className="w-full aspect-video object-cover" />
                <div className="p-4">
                  <p className="text-sm mb-3">{post.content}</p>
                  <div className="flex items-center gap-4 text-slate-400">
                    <button className="flex items-center gap-1 hover:text-red-400 transition-colors">
                      <Heart className="w-5 h-5" />
                      <span className="text-sm">{post.likes}</span>
                    </button>
                    <button className="flex items-center gap-1 hover:text-violet-400 transition-colors">
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm">{post.comments}</span>
                    </button>
                    <button className="ml-auto hover:text-violet-400 transition-colors">
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-4 p-4 sticky top-16 h-[calc(100vh-64px)] overflow-y-auto">
          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-400 mb-3">Nomadi nelle vicinanze</h3>
            <div className="space-y-3">
              {[
                { name: "Alex Kim", location: "Bali, 2km", status: "Working", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100", online: true },
                { name: "Maria Santos", location: "Bali, 5km", status: "Exploring", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100", online: true },
                { name: "Tom Wilson", location: "Bali, 8km", status: "Chilling", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100", online: false },
              ].map((user, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer border border-slate-700">
                  <div className="relative">
                    <img src={user.avatar} className="w-12 h-12 rounded-full object-cover" />
                    {user.online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{user.name}</p>
                    <p className="text-xs text-slate-400">{user.location}</p>
                  </div>
                  <div className="px-2 py-1 bg-violet-500/20 rounded-full">
                    <span className="text-xs text-violet-300">{user.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-400 mb-3">Suggeriti per te</h3>
            <div className="space-y-3">
              {[
                { name: "Digital Nomad Hub", members: "12.4k", type: "Community", avatar: "DN" },
                { name: "Eco Travelers", members: "8.2k", type: "Community", avatar: "ET" },
              ].map((group, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-sm font-bold">
                    {group.avatar}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{group.name}</p>
                    <p className="text-xs text-slate-400">{group.members} members</p>
                  </div>
                  <button className="px-3 py-1.5 bg-violet-500 rounded-full text-xs font-medium hover:bg-violet-600 transition-colors">
                    Join
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 rounded-2xl p-4 border border-violet-500/20">
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <Globe className="w-5 h-5 text-violet-400" />
              Trending Destinations
            </h3>
            <div className="space-y-2">
              {[
                { city: "Bali", country: "Indonesia", nomads: 1247, trend: "+12%" },
                { city: "Lisbon", country: "Portugal", nomads: 892, trend: "+8%" },
                { city: "Medellin", country: "Colombia", nomads: 654, trend: "+23%" },
              ].map((dest, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                  <div>
                    <p className="font-medium text-sm">{dest.city}</p>
                    <p className="text-xs text-slate-400">{dest.country}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{dest.nomads}</p>
                    <p className="text-xs text-green-400">{dest.trend}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DesignE() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-0 min-h-screen">
        
        <div className="col-span-2 bg-slate-900/80 border-r border-slate-800 p-3 sticky top-16 h-[calc(100vh-64px)]">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold">NomadLife</span>
          </div>

          <nav className="space-y-1">
            {[
              { icon: Globe, label: "Map Feed", active: true },
              { icon: Compass, label: "Explore", active: false },
              { icon: Coffee, label: "Coworking", active: false },
              { icon: MessageCircle, label: "Chat", active: false },
              { icon: Plane, label: "Trips", active: false },
              { icon: Leaf, label: "Eco", active: false },
              { icon: Users, label: "People", active: false },
            ].map((item, i) => (
              <button
                key={i}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all text-sm ${
                  item.active 
                    ? "bg-teal-500/20 text-teal-400 border border-teal-500/30" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="absolute bottom-3 left-3 right-3">
            <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Leaf className="w-3 h-3 text-emerald-400" />
                <span className="text-xs">CO2 Saved</span>
              </div>
              <div className="text-lg font-bold text-emerald-400">-127kg</div>
            </div>
          </div>
        </div>

        <div className="col-span-7 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900">
            <div className="absolute inset-0 opacity-20">
              <svg viewBox="0 0 800 600" className="w-full h-full">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(20,184,166,0.3)" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)"/>
                
                <ellipse cx="200" cy="250" rx="80" ry="40" fill="rgba(20,184,166,0.1)" stroke="rgba(20,184,166,0.3)" strokeWidth="1"/>
                <ellipse cx="500" cy="200" rx="60" ry="30" fill="rgba(20,184,166,0.1)" stroke="rgba(20,184,166,0.3)" strokeWidth="1"/>
                <ellipse cx="600" cy="400" rx="100" ry="50" fill="rgba(20,184,166,0.1)" stroke="rgba(20,184,166,0.3)" strokeWidth="1"/>
                
                <path d="M200 250 Q350 200 500 200" stroke="rgba(20,184,166,0.4)" strokeWidth="2" fill="none" strokeDasharray="5,5"/>
                <path d="M500 200 Q550 300 600 400" stroke="rgba(20,184,166,0.4)" strokeWidth="2" fill="none" strokeDasharray="5,5"/>
              </svg>
            </div>
            
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
              <div className="bg-slate-900/90 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-700 flex items-center gap-2">
                <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
                <span className="text-sm">Live Map</span>
                <span className="text-xs text-slate-400">• 24 nomadi online</span>
              </div>
              <div className="flex gap-2">
                <button className="bg-slate-900/90 backdrop-blur-sm p-2 rounded-lg border border-slate-700 hover:border-teal-500/50 transition-colors">
                  <MapPin className="w-4 h-4" />
                </button>
                <button className="bg-slate-900/90 backdrop-blur-sm p-2 rounded-lg border border-slate-700 hover:border-teal-500/50 transition-colors">
                  <Leaf className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="absolute" style={{ top: "30%", left: "25%" }}>
              <div className="relative group cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 p-0.5 animate-pulse">
                  <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100" className="w-full h-full rounded-full object-cover" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900" />
                
                <div className="absolute left-14 top-0 w-64 bg-slate-900/95 backdrop-blur-md rounded-xl p-3 border border-teal-500/30 shadow-xl opacity-100">
                  <div className="flex items-center gap-2 mb-2">
                    <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100" className="w-8 h-8 rounded-full object-cover" />
                    <div>
                      <p className="font-bold text-sm">Sarah Chen</p>
                      <p className="text-xs text-teal-400">Bali, Indonesia</p>
                    </div>
                  </div>
                  <img src="https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=300" className="w-full h-24 object-cover rounded-lg mb-2" />
                  <p className="text-xs text-slate-300">Sunset vibes at Uluwatu! Best coworking day ever</p>
                  <div className="flex items-center gap-3 mt-2 text-slate-400">
                    <span className="text-xs flex items-center gap-1"><Heart className="w-3 h-3" /> 89</span>
                    <span className="text-xs flex items-center gap-1"><MessageCircle className="w-3 h-3" /> 12</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute" style={{ top: "25%", left: "60%" }}>
              <div className="relative group cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 p-0.5">
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100" className="w-full h-full rounded-full object-cover" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900" />
              </div>
            </div>

            <div className="absolute" style={{ top: "55%", left: "70%" }}>
              <div className="relative group cursor-pointer">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 p-0.5 animate-pulse" style={{animationDelay: "0.5s"}}>
                  <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100" className="w-full h-full rounded-full object-cover" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900" />
                <div className="absolute -top-2 -right-2 bg-rose-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">NEW</div>
              </div>
            </div>

            <div className="absolute" style={{ top: "45%", left: "35%" }}>
              <div className="w-8 h-8 rounded-full bg-slate-700/80 border border-slate-600 flex items-center justify-center">
                <Coffee className="w-4 h-4 text-amber-400" />
              </div>
            </div>

            <div className="absolute" style={{ top: "35%", left: "55%" }}>
              <div className="w-8 h-8 rounded-full bg-slate-700/80 border border-slate-600 flex items-center justify-center">
                <Wifi className="w-4 h-4 text-teal-400" />
              </div>
            </div>

            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 border border-slate-700">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500" />
                  <input 
                    type="text" 
                    placeholder="Share your location update..." 
                    className="flex-1 bg-slate-800 rounded-full px-4 py-2 text-sm placeholder:text-slate-500 border border-slate-700 focus:border-teal-500 focus:outline-none"
                  />
                  <button className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center hover:bg-teal-600 transition-colors">
                    <MapPin className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 rounded-full text-xs text-slate-400 hover:text-white transition-colors">
                    <Camera className="w-3 h-3" /> Photo
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 rounded-full text-xs text-slate-400 hover:text-white transition-colors">
                    <MapPin className="w-3 h-3" /> Location
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 rounded-full text-xs text-emerald-400">
                    <Leaf className="w-3 h-3" /> Eco Route
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-3 bg-slate-900/50 border-l border-slate-800 p-4 sticky top-16 h-[calc(100vh-64px)] overflow-y-auto">
          <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" /> Nearby Nomads
          </h3>
          
          <div className="space-y-2 mb-6">
            {[
              { name: "Sarah Chen", location: "Bali", status: "Posted 2m ago", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100", online: true, hasPost: true },
              { name: "Marco Rossi", location: "Lisbon", status: "Working", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100", online: true, hasPost: false },
              { name: "Elena V.", location: "Tokyo", status: "Just posted", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100", online: true, hasPost: true },
              { name: "Alex Kim", location: "Bali", status: "Exploring", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100", online: false, hasPost: false },
            ].map((user, i) => (
              <div key={i} className={`flex items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer ${user.hasPost ? "bg-teal-500/10 border border-teal-500/20" : "hover:bg-slate-800"}`}>
                <div className="relative">
                  <img src={user.avatar} className="w-9 h-9 rounded-full object-cover" />
                  {user.online && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-900" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{user.name}</p>
                  <p className="text-xs text-slate-400 truncate">{user.status}</p>
                </div>
                {user.hasPost && (
                  <div className="w-2 h-2 bg-teal-400 rounded-full" />
                )}
              </div>
            ))}
          </div>

          <h3 className="text-sm font-medium text-slate-400 mb-3">Recent Posts</h3>
          <div className="space-y-3">
            {[
              { user: "Sarah", image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=200", location: "Uluwatu, Bali" },
              { user: "Elena", image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=200", location: "Shibuya, Tokyo" },
            ].map((post, i) => (
              <div key={i} className="bg-slate-800/50 rounded-xl overflow-hidden border border-slate-700 hover:border-teal-500/30 transition-colors cursor-pointer">
                <img src={post.image} className="w-full h-20 object-cover" />
                <div className="p-2">
                  <p className="text-xs font-medium">{post.user}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {post.location}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-gradient-to-br from-teal-500/10 to-emerald-500/10 rounded-xl p-3 border border-teal-500/20">
            <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Globe className="w-4 h-4 text-teal-400" />
              Hot Spots
            </h3>
            <div className="space-y-2">
              {[
                { city: "Bali", nomads: 127 },
                { city: "Lisbon", nomads: 89 },
                { city: "Tokyo", nomads: 64 },
              ].map((spot, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>{spot.city}</span>
                  <span className="text-teal-400">{spot.nomads}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
