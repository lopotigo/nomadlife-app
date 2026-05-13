import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Wifi, Star, Calendar, Users, Bot } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";

interface UserNomad {
  id: number;
  name: string;
  username: string;
  location?: string;
  bio?: string;
}

interface CoworkingPlace {
  id: number;
  name: string;
  city?: string;
  type?: string;
  wifi?: boolean;
  rating?: string;
  price?: string;
}

interface Event {
  id: number;
  title: string;
  date: string;
  location?: string;
  type?: string;
}

const CITY_DATA: Record<string, { emoji: string; country: string; tz: string; temp: string; gradient: string }> = {
  lisbona: { emoji: "🇵🇹", country: "Portogallo", tz: "GMT+1", temp: "24°C a Giugno", gradient: "from-orange-400 via-pink-500 to-violet-600" },
  bali: { emoji: "🇮🇩", country: "Indonesia", tz: "GMT+8", temp: "30°C tutto l'anno", gradient: "from-green-400 via-teal-500 to-blue-600" },
  bangkok: { emoji: "🇹🇭", country: "Thailandia", tz: "GMT+7", temp: "32°C", gradient: "from-yellow-400 via-orange-500 to-red-500" },
  berlino: { emoji: "🇩🇪", country: "Germania", tz: "GMT+2", temp: "20°C d'estate", gradient: "from-slate-400 via-blue-500 to-indigo-600" },
  "medellín": { emoji: "🇨🇴", country: "Colombia", tz: "GMT-5", temp: "22°C tutto l'anno", gradient: "from-yellow-400 via-red-500 to-pink-600" },
};

const COST_ESTIMATES: Record<string, { housing: string; food: string; cowork: string; total: string }> = {
  lisbona: { housing: "~€900", food: "~€300", cowork: "~€150", total: "~€1.4k" },
  bali: { housing: "~€400", food: "~€200", cowork: "~€80", total: "~€700" },
  bangkok: { housing: "~€500", food: "~€150", cowork: "~€100", total: "~€800" },
  berlino: { housing: "~€1.200", food: "~€400", cowork: "~€200", total: "~€1.9k" },
  "medellín": { housing: "~€350", food: "~€180", cowork: "~€70", total: "~€600" },
};

const DEFAULT_CITY = { emoji: "🌍", country: "", tz: "GMT", temp: "Varia", gradient: "from-teal-400 via-blue-500 to-violet-600" };
const DEFAULT_COST = { housing: "N/A", food: "N/A", cowork: "N/A", total: "N/A" };

export default function CityBriefing() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const dest = params.get("dest") || "Lisbona";
  const destKey = dest.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const { user } = useAuth();
  const [mapOpen, setMapOpen] = useState(false);

  const cityInfo = CITY_DATA[destKey] || DEFAULT_CITY;
  const costInfo = COST_ESTIMATES[destKey] || DEFAULT_COST;

  const { data: allUsers = [] } = useQuery<UserNomad[]>({
    queryKey: ["/api/users"],
    enabled: !!user,
  });

  const { data: places = [] } = useQuery<CoworkingPlace[]>({
    queryKey: ["/api/places"],
    enabled: !!user,
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    enabled: !!user,
  });

  const nomads = allUsers.filter(u => u.id !== user?.id).slice(0, 3);
  const coworkings = places.filter(p => p.type === "coworking" || !p.type).slice(0, 3);
  const upcomingEvents = events.slice(0, 3);

  return (
    <div className="relative min-h-screen bg-background flex flex-col">

      {/* Header */}
      <div className="px-5 pt-12 pb-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-card border border-border hover:bg-muted transition-colors"
          data-testid="btn-back"
        >
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-muted-foreground text-sm font-medium">NomadBot</span>
        </div>
        <div className="ml-auto w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28 flex flex-col gap-3">

        {/* AI message */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm"
        >
          <p className="text-foreground text-sm leading-relaxed">
            Ottima scelta 🌊 <span className="font-semibold">{dest}</span> è una delle destinazioni preferite dai nomadi digitali. Ecco tutto quello che ti serve.
          </p>
        </motion.div>

        {/* City hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
          className={`relative rounded-2xl overflow-hidden h-32 bg-gradient-to-br ${cityInfo.gradient} flex items-end p-4`}
        >
          <div className="absolute inset-0 bg-black/25" />
          <div className="relative z-10 flex justify-between items-end w-full">
            <div>
              <p className="text-white text-xl font-bold">{cityInfo.emoji} {dest}</p>
              <p className="text-white/75 text-xs">{cityInfo.country}{cityInfo.tz ? ` · ${cityInfo.tz}` : ""} · ☀️ {cityInfo.temp}</p>
            </div>
            <div className="bg-teal-500 rounded-full px-3 py-1 text-xs font-semibold text-white">
              ⭐ Top nomad city
            </div>
          </div>
        </motion.div>

        {/* Cost of life */}
        <div className="bg-card border border-border rounded-2xl px-4 py-3 shadow-sm">
          <p className="text-muted-foreground text-xs uppercase tracking-widest mb-3">Costo della vita / mese</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Alloggio", value: costInfo.housing, icon: "🏠" },
              { label: "Cibo", value: costInfo.food, icon: "🍽️" },
              { label: "Coworking", value: costInfo.cowork, icon: "💻" },
              { label: "Totale", value: costInfo.total, icon: "💰", highlight: true },
            ].map((item, i) => (
              <div key={i} className={`flex flex-col items-center gap-1 ${item.highlight ? "bg-primary/10 rounded-xl py-1" : ""}`}>
                <span className="text-base">{item.icon}</span>
                <span className={`font-bold text-xs ${item.highlight ? "text-primary" : "text-foreground"}`}>{item.value}</span>
                <span className="text-muted-foreground text-[10px] text-center leading-tight">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Nomads going there */}
        <div className="bg-card border border-border rounded-2xl px-4 py-3 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <p className="text-foreground text-sm font-semibold">Nomadi nella community</p>
            </div>
            <button onClick={() => navigate("/matchmaking")} className="text-primary text-xs font-medium" data-testid="btn-all-nomads">Tutti →</button>
          </div>
          <div className="flex flex-col gap-2.5">
            {nomads.length === 0 ? (
              <p className="text-muted-foreground text-xs text-center py-2">Nessun nomade ancora registrato</p>
            ) : nomads.map((n, i) => (
              <div key={n.id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {(n.name || n.username).slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm font-medium truncate">{n.name || n.username}</p>
                  <p className="text-muted-foreground text-xs truncate">{n.location || "Nomade digitale"}</p>
                </div>
                <button
                  onClick={() => navigate("/chat")}
                  className="text-xs bg-muted text-foreground rounded-xl px-2.5 py-1.5 hover:bg-muted/80 transition-colors shrink-0"
                  data-testid={`btn-msg-${n.id}`}
                >
                  Scrivi
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Coworking + inline map */}
        <div className="bg-card border border-border rounded-2xl px-4 py-3 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-primary" />
              <p className="text-foreground text-sm font-semibold">Coworking</p>
            </div>
            <button
              onClick={() => setMapOpen(v => !v)}
              className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${mapOpen ? "bg-primary text-primary-foreground" : "bg-muted text-primary"}`}
              data-testid="btn-toggle-map"
            >
              <MapPin className="w-3 h-3" />
              {mapOpen ? "Chiudi mappa" : "Vedi sulla mappa"}
            </button>
          </div>

          {/* Inline map */}
          {mapOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 140 }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 rounded-xl overflow-hidden border border-border"
            >
              <div className="relative w-full h-full bg-muted flex items-center justify-center" style={{ height: 140 }}>
                <div className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
                    backgroundSize: "24px 24px"
                  }}
                />
                {[
                  { top: "28%", left: "38%", label: "Centro 1" },
                  { top: "52%", left: "58%", label: "Centro 2" },
                  { top: "40%", left: "22%", label: "Centro 3" },
                ].map((pin, i) => (
                  <div key={i} className="absolute" style={{ top: pin.top, left: pin.left }}>
                    <div className="relative">
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground shadow-lg">💻</div>
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-card text-foreground text-[10px] px-1.5 py-0.5 rounded border border-border whitespace-nowrap shadow-sm">{pin.label}</div>
                    </div>
                  </div>
                ))}
                <p className="absolute bottom-1 right-2 text-[10px] text-muted-foreground">© OpenStreetMap</p>
              </div>
            </motion.div>
          )}

          <div className="flex flex-col gap-0">
            {coworkings.length === 0 ? (
              <p className="text-muted-foreground text-xs text-center py-2">Nessun coworking nel database ancora</p>
            ) : coworkings.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                <div>
                  <p className="text-foreground text-sm font-medium">{c.name}</p>
                  <p className="text-muted-foreground text-xs flex items-center gap-1">
                    {c.wifi && <><Wifi className="w-3 h-3" /> WiFi ·</>}
                    {c.rating && <><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {c.rating}</>}
                  </p>
                </div>
                <button
                  onClick={() => navigate("/booking")}
                  className="text-xs bg-primary text-primary-foreground rounded-xl px-3 py-1.5 font-medium hover:opacity-90 transition-opacity"
                  data-testid={`btn-book-${c.id}`}
                >
                  Prenota
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Events */}
        <div className="bg-card border border-border rounded-2xl px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-primary" />
            <p className="text-foreground text-sm font-semibold">Prossimi eventi</p>
          </div>
          <div className="flex flex-col gap-0">
            {upcomingEvents.length === 0 ? (
              <p className="text-muted-foreground text-xs text-center py-2">Nessun evento in programma</p>
            ) : upcomingEvents.map((e, i) => (
              <div key={e.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-foreground text-sm">{e.title}</p>
                  <p className="text-muted-foreground text-xs">{new Date(e.date).toLocaleDateString("it-IT", { day: "numeric", month: "short" })} · {e.location || dest}</p>
                </div>
                <button
                  onClick={() => navigate("/events-calendar")}
                  className="text-xs bg-muted text-foreground rounded-full px-2.5 py-0.5"
                  data-testid={`btn-event-${e.id}`}
                >
                  {e.type || "Evento"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate("/diary")}
          className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 rounded-2xl py-4 text-white font-semibold text-base shadow-lg shadow-teal-500/20 active:scale-[0.98] transition-transform"
          data-testid="btn-plan-trip"
        >
          🗓️ Pianifica il viaggio a {dest}
        </button>

      </div>

      <BottomNav activePage="ai" />
    </div>
  );
}
