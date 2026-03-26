import { useState } from "react";
import {
  MapPin, Plus, Plane, Mountain, Camera, CalendarDays, ChevronUp, ChevronDown,
  Navigation, Wifi, Coffee, Star, Clock, Thermometer, Wind, Droplets,
  Building2, Tent, Train, Car, Bike, X, Check, ArrowRight, Users, Heart,
  Sparkles, Map, BookOpen
} from "lucide-react";

const TRIPS = [
  {
    id: 1, name: "Giro d'Europa", color: "from-indigo-500 to-violet-600",
    stops: [
      { id: 1, city: "Berlino", country: "DE", emoji: "🇩🇪", lat: 52.5, lon: 13.4, arrival: "12 Mar", transport: "plane", active: false },
      { id: 2, city: "Praga", country: "CZ", emoji: "🇨🇿", lat: 50.1, lon: 14.4, arrival: "19 Mar", transport: "train", active: true },
      { id: 3, city: "Vienna", country: "AT", emoji: "🇦🇹", lat: 48.2, lon: 16.4, arrival: "28 Mar", transport: "train", active: false },
    ]
  },
  {
    id: 2, name: "Asia 2025", color: "from-amber-500 to-orange-600",
    stops: [
      { id: 4, city: "Chiang Mai", country: "TH", emoji: "🇹🇭", lat: 18.8, lon: 98.9, arrival: "Jun 5", transport: "plane", active: false },
      { id: 5, city: "Bali", country: "ID", emoji: "🇮🇩", lat: -8.4, lon: 115.2, arrival: "Jun 20", transport: "plane", active: false },
    ]
  }
];

const PANELS = ["peek", "half", "full"] as const;
type Panel = typeof PANELS[number];

const TRANSPORT_ICONS: Record<string, typeof Plane> = {
  plane: Plane, train: Train, car: Car, bike: Bike,
};

const FAB_OPTIONS = [
  { label: "Viaggio", icon: Plane, color: "bg-indigo-500" },
  { label: "Tappa", icon: Mountain, color: "bg-emerald-500" },
  { label: "Post", icon: Camera, color: "bg-amber-500" },
  { label: "Evento", icon: CalendarDays, color: "bg-rose-500" },
];

export function DiaryHub() {
  const [panel, setPanel] = useState<Panel>("half");
  const [selectedTrip, setSelectedTrip] = useState(0);
  const [fabOpen, setFabOpen] = useState(false);
  const [selectedStop, setSelectedStop] = useState<number | null>(2);

  const trip = TRIPS[selectedTrip];
  const panelH = { peek: "15%", half: "52%", full: "92%" };

  const activeStop = trip.stops.find(s => s.id === selectedStop);

  return (
    <div className="w-full h-screen bg-zinc-950 relative overflow-hidden font-sans">
      {/* Map area */}
      <div className="absolute inset-0">
        <div className="w-full h-full bg-zinc-900 relative">
          <svg className="absolute inset-0 w-full h-full opacity-10">
            <defs>
              <pattern id="grid2" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#6366f1" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid2)" />
          </svg>
          <svg className="absolute inset-0 w-full h-full opacity-20">
            <line x1="0" y1="45%" x2="100%" y2="40%" stroke="#4f46e5" strokeWidth="2"/>
            <line x1="25%" y1="0" x2="30%" y2="100%" stroke="#4f46e5" strokeWidth="1.5"/>
            <line x1="65%" y1="0" x2="60%" y2="100%" stroke="#4f46e5" strokeWidth="2"/>
          </svg>

          {/* Trip route line */}
          <svg className="absolute inset-0 w-full h-full">
            <line x1="30%" y1="38%" x2="48%" y2="44%" stroke="#6366f1" strokeWidth="2" strokeDasharray="6,4" opacity="0.7"/>
            <line x1="48%" y1="44%" x2="65%" y2="52%" stroke="#6366f1" strokeWidth="2" strokeDasharray="6,4" opacity="0.4"/>
          </svg>

          {/* Stop markers */}
          {trip.stops.map((stop, i) => {
            const positions = [
              { left: "28%", top: "35%" },
              { left: "46%", top: "42%" },
              { left: "63%", top: "49%" },
            ];
            const pos = positions[i] || { left: "50%", top: "50%" };
            const isSelected = selectedStop === stop.id;
            return (
              <button
                key={stop.id}
                style={pos}
                onClick={() => setSelectedStop(isSelected ? null : stop.id)}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10 group"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-xl border-2 transition-all ${
                  stop.active ? "bg-indigo-500 border-indigo-300 scale-110" :
                  isSelected ? "bg-zinc-700 border-zinc-400 scale-110" :
                  "bg-zinc-800 border-zinc-600 group-hover:scale-105"
                }`}>
                  <span className="text-lg">{stop.emoji}</span>
                </div>
                {stop.active && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-zinc-950 animate-pulse"/>
                )}
                <p className="absolute top-11 left-1/2 -translate-x-1/2 text-xs text-white whitespace-nowrap font-medium bg-zinc-900/80 px-1.5 py-0.5 rounded-lg">{stop.city}</p>
              </button>
            );
          })}

          {/* Stop detail popup */}
          {activeStop && (
            <div className="absolute top-4 left-4 right-4 z-20 bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 rounded-2xl p-3 shadow-2xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{activeStop.emoji}</span>
                  <div>
                    <h3 className="text-white font-bold text-base">{activeStop.city}</h3>
                    <p className="text-zinc-500 text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Arrivo {activeStop.arrival}
                    </p>
                  </div>
                  {activeStop.active && <span className="ml-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full font-medium">Sei qui</span>}
                </div>
                <button onClick={() => setSelectedStop(null)}>
                  <X className="w-4 h-4 text-zinc-500" />
                </button>
              </div>

              <div className="flex gap-2">
                <div className="flex-1 bg-zinc-800 rounded-xl p-2">
                  <p className="text-xs text-zinc-500 mb-1">Meteo</p>
                  <div className="flex items-center gap-1.5">
                    <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-white text-sm font-medium">12°C</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Wind className="w-3 h-3 text-zinc-500" />
                    <span className="text-zinc-400 text-xs">18 km/h</span>
                    <Droplets className="w-3 h-3 text-blue-400 ml-1" />
                    <span className="text-zinc-400 text-xs">65%</span>
                  </div>
                </div>
                <div className="flex-1 bg-zinc-800 rounded-xl p-2">
                  <p className="text-xs text-zinc-500 mb-1">Coworking vicino</p>
                  <div className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-white text-sm font-medium">HUB Praha</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Wifi className="w-3 h-3 text-emerald-400" />
                    <span className="text-zinc-400 text-xs">200 Mbps</span>
                    <span className="text-zinc-600 mx-1">·</span>
                    <span className="text-zinc-400 text-xs">€12/g</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Header (always visible) */}
      <div className="absolute top-0 left-0 right-0 z-30 px-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-lg">Il mio Diario</h1>
            <p className="text-zinc-500 text-xs">3 viaggi · 8 tappe</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 rounded-full bg-zinc-900/80 border border-zinc-700 flex items-center justify-center">
              <Map className="w-4 h-4 text-zinc-300" />
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-sm font-bold text-white">M</div>
          </div>
        </div>
      </div>

      {/* Sliding Panel */}
      <div
        className="absolute left-0 right-0 bottom-0 z-20 bg-zinc-950 rounded-t-3xl border-t border-zinc-800 shadow-2xl transition-all duration-300 flex flex-col"
        style={{ height: panelH[panel] }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <button
            onClick={() => {
              const idx = PANELS.indexOf(panel);
              const next = idx < PANELS.length - 1 ? PANELS[idx + 1] : PANELS[0];
              setPanel(next);
            }}
            className="w-10 h-1 bg-zinc-700 rounded-full"
          />
        </div>

        {/* Trip tabs */}
        <div className="px-4 flex gap-2 overflow-x-auto pb-2">
          {TRIPS.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setSelectedTrip(i)}
              className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                selectedTrip === i
                  ? `bg-gradient-to-r ${t.color} text-white shadow-lg`
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400"
              }`}
            >
              <Plane className="w-3.5 h-3.5" />
              {t.name}
            </button>
          ))}
        </div>

        {/* Stops list (only visible in half/full) */}
        {panel !== "peek" && (
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
            <p className="text-xs text-zinc-600 uppercase font-semibold tracking-wider mb-3">Tappe · {trip.stops.length}</p>
            {trip.stops.map((stop, i) => {
              const TIcon = TRANSPORT_ICONS[stop.transport] || Plane;
              const isSelected = selectedStop === stop.id;
              return (
                <button
                  key={stop.id}
                  onClick={() => setSelectedStop(isSelected ? null : stop.id)}
                  className={`w-full text-left rounded-2xl p-3 border transition-all ${
                    stop.active
                      ? "bg-indigo-950/50 border-indigo-500/50"
                      : isSelected
                      ? "bg-zinc-800 border-zinc-600"
                      : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Connector line */}
                    <div className="flex flex-col items-center gap-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-base ${stop.active ? "bg-indigo-500" : "bg-zinc-800"}`}>
                        {stop.emoji}
                      </div>
                      {i < trip.stops.length - 1 && (
                        <div className="w-px h-4 bg-zinc-700"/>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold text-sm">{stop.city}</span>
                        {stop.active && (
                          <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">ora</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <TIcon className="w-3 h-3 text-zinc-500" />
                        <span className="text-zinc-500 text-xs">{stop.arrival}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-700" />
                  </div>
                </button>
              );
            })}

            {/* Stats row */}
            {panel === "full" && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
                  <p className="text-indigo-400 font-bold text-lg">3</p>
                  <p className="text-zinc-500 text-xs">Paesi</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
                  <p className="text-indigo-400 font-bold text-lg">24</p>
                  <p className="text-zinc-500 text-xs">Giorni</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
                  <p className="text-emerald-400 font-bold text-lg">4.2t</p>
                  <p className="text-zinc-500 text-xs">CO₂</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Peek mode summary */}
        {panel === "peek" && (
          <div className="px-4 py-2 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${trip.color} flex items-center justify-center`}>
              <Plane className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-medium">{trip.name}</p>
              <p className="text-zinc-500 text-xs">{trip.stops.length} tappe · prossima Vienna il 28 mar</p>
            </div>
            <ChevronUp className="w-4 h-4 text-zinc-500" />
          </div>
        )}
      </div>

      {/* FAB */}
      <div className="absolute right-4 z-30" style={{ bottom: panel === "full" ? "calc(92% + 12px)" : panel === "half" ? "calc(52% + 12px)" : "calc(15% + 12px)" }}>
        {fabOpen && (
          <div className="flex flex-col gap-2 mb-3 items-end">
            {FAB_OPTIONS.map(opt => {
              const Icon = opt.icon;
              return (
                <button key={opt.label} className={`flex items-center gap-2 ${opt.color} text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg`}>
                  <Icon className="w-4 h-4" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
        <button
          onClick={() => setFabOpen(!fabOpen)}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all ${
            fabOpen ? "bg-zinc-700 rotate-45" : "bg-indigo-500 hover:bg-indigo-600"
          }`}
        >
          <Plus className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  );
}
