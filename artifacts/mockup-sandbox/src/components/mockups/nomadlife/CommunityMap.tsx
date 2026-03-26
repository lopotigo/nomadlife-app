import { useState } from "react";
import {
  Heart, Calendar, Sparkles, MessageCircle, Plane, Users, Compass, MapPin,
  Search, Bell, SlidersHorizontal, X, ChevronDown, Wifi, Coffee, Zap,
  Star, Navigation, Plus
} from "lucide-react";

const FILTERS = [
  { key: "posts", label: "Post", icon: Heart, color: "bg-rose-500", activeText: "text-white", inactive: "bg-zinc-800 text-zinc-400 border border-zinc-700" },
  { key: "events", label: "Eventi", icon: Calendar, color: "bg-violet-500", activeText: "text-white", inactive: "bg-zinc-800 text-zinc-400 border border-zinc-700" },
  { key: "moments", label: "Momenti", icon: Sparkles, color: "bg-orange-500", activeText: "text-white", inactive: "bg-zinc-800 text-zinc-400 border border-zinc-700" },
  { key: "groups", label: "Gruppi", icon: MessageCircle, color: "bg-cyan-500", activeText: "text-white", inactive: "bg-zinc-800 text-zinc-400 border border-zinc-700" },
  { key: "trips", label: "Viaggi", icon: Plane, color: "bg-amber-500", activeText: "text-white", inactive: "bg-zinc-800 text-zinc-400 border border-zinc-700" },
  { key: "following", label: "Seguiti", icon: Users, color: "bg-blue-500", activeText: "text-white", inactive: "bg-zinc-800 text-zinc-400 border border-zinc-700" },
  { key: "guides", label: "Guide", icon: Compass, color: "bg-violet-600", activeText: "text-white", inactive: "bg-zinc-800 text-zinc-400 border border-zinc-700" },
  { key: "spots", label: "Spot", icon: MapPin, color: "bg-emerald-500", activeText: "text-white", inactive: "bg-zinc-800 text-zinc-400 border border-zinc-700" },
];

const MAP_MARKERS = [
  { id: 1, x: 38, y: 42, type: "post", color: "bg-rose-500", label: "Marco R.", sub: "Berlino" },
  { id: 2, x: 55, y: 30, type: "event", color: "bg-violet-500", label: "Nomad Meetup", sub: "Amsterdam" },
  { id: 3, x: 28, y: 58, type: "spot", color: "bg-emerald-500", label: "Betahaus", sub: "Barcellona" },
  { id: 4, x: 62, y: 55, type: "trip", color: "bg-amber-500", label: "Sofia M.", sub: "Vienna→Praha" },
  { id: 5, x: 45, y: 68, type: "moment", color: "bg-orange-500", label: "Luca T.", sub: "Roma" },
  { id: 6, x: 72, y: 40, type: "guide", color: "bg-violet-600", label: "City Guide", sub: "Varsavia" },
  { id: 7, x: 20, y: 35, type: "following", color: "bg-blue-500", label: "Anna K.", sub: "Lisbona" },
];

export function CommunityMap() {
  const [activeFilters, setActiveFilters] = useState<Record<string, boolean>>({
    posts: true, events: true, moments: false, groups: false,
    trips: true, following: true, guides: false, spots: true,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeMarker, setActiveMarker] = useState<number | null>(3);

  const toggle = (key: string) => setActiveFilters(f => ({ ...f, [key]: !f[key] }));

  const visibleMarkers = MAP_MARKERS.filter(m => activeFilters[m.type]);

  return (
    <div className="w-full h-screen bg-zinc-950 flex flex-col overflow-hidden font-sans relative">
      {/* Header */}
      <div className="relative z-20 px-4 pt-4 pb-2 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-xl tracking-tight">Mappa Comune</h1>
            <p className="text-zinc-500 text-xs">247 nomadi attivi ora</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <Bell className="w-4 h-4 text-zinc-400" />
            </button>
            <button className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <Search className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Pill bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {FILTERS.map(f => {
            const active = activeFilters[f.key];
            const Icon = f.icon;
            return (
              <button
                key={f.key}
                onClick={() => toggle(f.key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  active ? `${f.color} text-white shadow-lg` : f.inactive
                }`}
              >
                <Icon className="w-3 h-3" />
                {f.label}
              </button>
            );
          })}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700"
          >
            <SlidersHorizontal className="w-3 h-3" />
            Avanzato
          </button>
        </div>
      </div>

      {/* Map background */}
      <div className="flex-1 relative overflow-hidden">
        {/* Fake map tiles */}
        <div className="absolute inset-0 bg-zinc-900">
          {/* Grid lines to simulate map */}
          <svg className="absolute inset-0 w-full h-full opacity-10">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#6366f1" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
          {/* Simulated roads */}
          <svg className="absolute inset-0 w-full h-full opacity-20">
            <line x1="0" y1="40%" x2="100%" y2="45%" stroke="#4f46e5" strokeWidth="2"/>
            <line x1="30%" y1="0" x2="35%" y2="100%" stroke="#4f46e5" strokeWidth="1.5"/>
            <line x1="60%" y1="0" x2="55%" y2="100%" stroke="#4f46e5" strokeWidth="2"/>
            <line x1="0" y1="70%" x2="100%" y2="65%" stroke="#4f46e5" strokeWidth="1"/>
            <path d="M0,30 Q50,20 100,35" stroke="#6366f1" strokeWidth="1" fill="none"/>
            <path d="M10,80 Q60,60 90,85" stroke="#6366f1" strokeWidth="1.5" fill="none"/>
          </svg>
          {/* Water area */}
          <div className="absolute top-10 right-10 w-32 h-20 rounded-2xl bg-blue-950/40 border border-blue-900/30"/>
        </div>

        {/* Map markers */}
        {visibleMarkers.map(m => (
          <button
            key={m.id}
            onClick={() => setActiveMarker(activeMarker === m.id ? null : m.id)}
            style={{ left: `${m.x}%`, top: `${m.y}%` }}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10 group"
          >
            <div className={`w-9 h-9 rounded-full ${m.color} flex items-center justify-center shadow-lg border-2 border-white/20 transition-transform group-hover:scale-110 ${activeMarker === m.id ? 'scale-110 ring-2 ring-white/40' : ''}`}>
              {(() => {
                const filter = FILTERS.find(f => f.key === m.type);
                if (!filter) return null;
                const Icon = filter.icon;
                return <Icon className="w-4 h-4 text-white" />;
              })()}
            </div>
            {/* Pulse */}
            <div className={`absolute inset-0 rounded-full ${m.color} opacity-30 animate-ping`}/>
          </button>
        ))}

        {/* Popup for active marker */}
        {activeMarker !== null && (() => {
          const m = MAP_MARKERS.find(x => x.id === activeMarker);
          if (!m) return null;
          return (
            <div
              style={{ left: `${Math.min(m.x, 70)}%`, top: `${Math.max(m.y - 20, 5)}%` }}
              className="absolute z-20 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-3 w-56"
            >
              <button onClick={() => setActiveMarker(null)} className="absolute top-2 right-2">
                <X className="w-3 h-3 text-zinc-500" />
              </button>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 rounded-full ${m.color} flex items-center justify-center`}>
                  {(() => {
                    const filter = FILTERS.find(f => f.key === m.type);
                    if (!filter) return null;
                    const Icon = filter.icon;
                    return <Icon className="w-3.5 h-3.5 text-white" />;
                  })()}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{m.label}</p>
                  <p className="text-zinc-500 text-xs">{m.sub}</p>
                </div>
              </div>
              {m.type === "spot" && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-zinc-400">
                    <Wifi className="w-3 h-3 text-emerald-400" />
                    <span>WiFi 120 Mbps</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-zinc-400">
                    <Coffee className="w-3 h-3 text-amber-400" />
                    <span>Caffè incluso</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-zinc-400">
                    <Zap className="w-3 h-3 text-yellow-400" />
                    <span>Prese disponibili</span>
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-3 h-3 ${s <= 4 ? 'text-amber-400 fill-amber-400' : 'text-zinc-600'}`} />
                    ))}
                    <span className="text-xs text-zinc-500 ml-1">4.2</span>
                  </div>
                </div>
              )}
              {m.type === "post" && (
                <p className="text-xs text-zinc-300 mt-1">"Berlino in inverno è sottovalutata dai nomadi — coworking vuoti, prezzi bassi 🔥"</p>
              )}
              {m.type === "event" && (
                <div className="mt-1">
                  <p className="text-xs text-zinc-400">Venerdì 28 mar · 19:00</p>
                  <p className="text-xs text-zinc-300 mt-0.5">23 partecipanti confermati</p>
                  <button className="mt-2 w-full bg-violet-500 text-white text-xs py-1 rounded-lg font-medium">Partecipa</button>
                </div>
              )}
            </div>
          );
        })()}

        {/* Bottom controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
          <button className="w-9 h-9 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center shadow">
            <Navigation className="w-4 h-4 text-zinc-300" />
          </button>
          <button className="w-9 h-9 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center shadow">
            <Plus className="w-4 h-4 text-zinc-300" />
          </button>
        </div>

        {/* Counter bar */}
        <div className="absolute bottom-4 left-4 right-16 z-10">
          <div className="bg-zinc-900/90 backdrop-blur border border-zinc-800 rounded-2xl px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {FILTERS.filter(f => activeFilters[f.key]).map(f => (
                <div key={f.key} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${f.color}`} />
                  <span className="text-xs text-zinc-400">{f.label}</span>
                </div>
              ))}
            </div>
            <span className="text-xs text-zinc-500">{visibleMarkers.length} marker</span>
          </div>
        </div>
      </div>
    </div>
  );
}
