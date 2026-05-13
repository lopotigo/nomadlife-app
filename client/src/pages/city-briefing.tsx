import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Wifi, Star, Calendar, Users, Bot, Shield, Heart, DollarSign, Loader2 } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";

interface CityInfo {
  destination: string;
  found: boolean;
  cost: { housing: number; food: number; coworking: number; transport: number; total: number } | null;
  scores: { wifi: number; safety: number; lifestyle: number; affordability: number; community: number } | null;
  visa: string | null;
  timezone: string | null;
  weather: string | null;
  internet: string | null;
  nomadsGoing: Array<{ userId: string; userName: string; avatarUrl?: string; location?: string; startDate?: string; endDate?: string; tripTitle?: string }>;
}

interface Place { id: number; name: string; type?: string; wifi?: boolean; rating?: string; city?: string; }
interface Event { id: number; title: string; date: string; location?: string; type?: string; }

const CITY_GRADIENTS: Record<string, string> = {
  lisbona: "from-orange-400 via-pink-500 to-violet-600",
  bali: "from-green-400 via-teal-500 to-blue-600",
  bangkok: "from-yellow-400 via-orange-500 to-red-500",
  berlino: "from-slate-400 via-blue-500 to-indigo-600",
  medellin: "from-yellow-400 via-red-500 to-pink-600",
  "chiang mai": "from-emerald-400 via-teal-500 to-cyan-600",
  dubai: "from-yellow-300 via-amber-400 to-orange-500",
  tallin: "from-blue-300 via-sky-400 to-indigo-500",
};

const CITY_FLAGS: Record<string, string> = {
  lisbona: "🇵🇹", bali: "🇮🇩", bangkok: "🇹🇭", berlino: "🇩🇪",
  medellin: "🇨🇴", "chiang mai": "🇹🇭", dubai: "🇦🇪", tallin: "🇪🇪",
};

function ScoreBar({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="shrink-0 text-primary">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between mb-0.5">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-xs font-semibold text-foreground">{value.toFixed(1)}</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(value / 10) * 100}%` }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full"
          />
        </div>
      </div>
    </div>
  );
}

export default function CityBriefing() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const dest = params.get("dest") || "Lisbona";
  const destKey = dest.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const { user } = useAuth();
  const [mapOpen, setMapOpen] = useState(false);

  const gradient = Object.entries(CITY_GRADIENTS).find(([k]) => destKey.includes(k) || k.includes(destKey))?.[1] || "from-teal-400 via-blue-500 to-violet-600";
  const flag = Object.entries(CITY_FLAGS).find(([k]) => destKey.includes(k) || k.includes(destKey))?.[1] || "🌍";

  const { data: cityInfo, isLoading } = useQuery<CityInfo>({
    queryKey: ["/api/city-info", dest],
    queryFn: async () => {
      const res = await fetch(`/api/city-info?dest=${encodeURIComponent(dest)}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: places = [] } = useQuery<Place[]>({ queryKey: ["/api/places"], enabled: !!user });
  const { data: events = [] } = useQuery<Event[]>({ queryKey: ["/api/events"], enabled: !!user });

  const coworkings = places.filter(p => !p.type || p.type === "coworking").slice(0, 3);
  const upcomingEvents = events.slice(0, 3);

  return (
    <div className="relative min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="px-5 pt-12 pb-3 flex items-center gap-3">
        <button onClick={() => navigate("/")} className="w-9 h-9 flex items-center justify-center rounded-full bg-card border border-border hover:bg-muted transition-colors" data-testid="btn-back">
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
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
          <p className="text-foreground text-sm leading-relaxed">
            {isLoading ? "Sto raccogliendo le informazioni su " : "Ottima scelta 🌊 "}
            <span className="font-semibold">{dest}</span>
            {isLoading ? "…" : " — ecco tutto quello che ti serve per partire."}
          </p>
        </motion.div>

        {/* City hero */}
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}
          className={`relative rounded-2xl overflow-hidden h-32 bg-gradient-to-br ${gradient} flex items-end p-4`}>
          <div className="absolute inset-0 bg-black/25" />
          <div className="relative z-10 flex justify-between items-end w-full">
            <div>
              <p className="text-white text-xl font-bold">{flag} {dest}</p>
              <p className="text-white/75 text-xs">
                {cityInfo?.timezone || "…"} · {cityInfo?.weather || "…"}
              </p>
            </div>
            <div className="bg-teal-500 rounded-full px-3 py-1 text-xs font-semibold text-white">⭐ Top nomad city</div>
          </div>
        </motion.div>

        {/* Cost of life — real data */}
        <div className="bg-card border border-border rounded-2xl px-4 py-3 shadow-sm">
          <p className="text-muted-foreground text-xs uppercase tracking-widest mb-3">Costo della vita / mese</p>
          {isLoading ? (
            <div className="flex items-center justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : cityInfo?.cost ? (
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Alloggio", value: `€${cityInfo.cost.housing}`, icon: "🏠" },
                { label: "Cibo", value: `€${cityInfo.cost.food}`, icon: "🍽️" },
                { label: "Coworking", value: `€${cityInfo.cost.coworking}`, icon: "💻" },
                { label: "Totale", value: `€${cityInfo.cost.total}`, icon: "💰", highlight: true },
              ].map((item, i) => (
                <div key={i} className={`flex flex-col items-center gap-1 ${item.highlight ? "bg-primary/10 rounded-xl py-1" : ""}`}>
                  <span className="text-base">{item.icon}</span>
                  <span className={`font-bold text-xs ${item.highlight ? "text-primary" : "text-foreground"}`}>{item.value}</span>
                  <span className="text-muted-foreground text-[10px] text-center leading-tight">{item.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs text-center py-2">Dati non ancora disponibili per questa città</p>
          )}
        </div>

        {/* Quality scores */}
        {cityInfo?.scores && (
          <div className="bg-card border border-border rounded-2xl px-4 py-3 shadow-sm">
            <p className="text-muted-foreground text-xs uppercase tracking-widest mb-3">Qualità per nomadi</p>
            <div className="flex flex-col gap-2.5">
              <ScoreBar label="WiFi & Connettività" value={cityInfo.scores.wifi} icon={<Wifi className="w-3.5 h-3.5" />} />
              <ScoreBar label="Sicurezza" value={cityInfo.scores.safety} icon={<Shield className="w-3.5 h-3.5" />} />
              <ScoreBar label="Stile di vita" value={cityInfo.scores.lifestyle} icon={<Heart className="w-3.5 h-3.5" />} />
              <ScoreBar label="Accessibilità economica" value={cityInfo.scores.affordability} icon={<DollarSign className="w-3.5 h-3.5" />} />
              <ScoreBar label="Community nomadi" value={cityInfo.scores.community} icon={<Users className="w-3.5 h-3.5" />} />
            </div>
          </div>
        )}

        {/* Visa info */}
        {cityInfo?.visa && (
          <div className="bg-card border border-border rounded-2xl px-4 py-3 shadow-sm flex items-start gap-3">
            <span className="text-xl shrink-0">🛂</span>
            <div>
              <p className="text-foreground text-sm font-semibold mb-0.5">Visto</p>
              <p className="text-muted-foreground text-xs leading-relaxed">{cityInfo.visa}</p>
            </div>
          </div>
        )}

        {/* Nomads going there — real data from trips */}
        <div className="bg-card border border-border rounded-2xl px-4 py-3 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <p className="text-foreground text-sm font-semibold">Nomadi che vanno a {dest}</p>
            </div>
            <button onClick={() => navigate("/matchmaking")} className="text-primary text-xs font-medium" data-testid="btn-all-nomads">Tutti →</button>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
          ) : cityInfo?.nomadsGoing && cityInfo.nomadsGoing.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {cityInfo.nomadsGoing.map((n, i) => (
                <div key={n.userId} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {(n.userName).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-sm font-medium truncate">{n.userName}</p>
                    <p className="text-muted-foreground text-xs truncate">
                      {n.tripTitle || "Viaggio pianificato"}
                      {n.startDate ? ` · ${new Date(n.startDate).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}` : ""}
                    </p>
                  </div>
                  <button onClick={() => navigate("/chat")} className="text-xs bg-muted text-foreground rounded-xl px-2.5 py-1.5 hover:bg-muted/80 transition-colors shrink-0" data-testid={`btn-msg-${i}`}>
                    Scrivi
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-3 gap-2">
              <p className="text-muted-foreground text-xs text-center">Nessun nomade ha ancora pianificato un viaggio qui.</p>
              <button onClick={() => navigate("/diary")} className="text-xs text-primary font-medium">Sii il primo → Crea un viaggio</button>
            </div>
          )}
        </div>

        {/* Coworking + inline map */}
        <div className="bg-card border border-border rounded-2xl px-4 py-3 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-primary" />
              <p className="text-foreground text-sm font-semibold">Coworking</p>
            </div>
            <button onClick={() => setMapOpen(v => !v)} className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${mapOpen ? "bg-primary text-primary-foreground" : "bg-muted text-primary"}`} data-testid="btn-toggle-map">
              <MapPin className="w-3 h-3" />
              {mapOpen ? "Chiudi mappa" : "Vedi sulla mappa"}
            </button>
          </div>

          {mapOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 140 }} className="mb-3 rounded-xl overflow-hidden border border-border" style={{ height: 140 }}>
              <div className="relative w-full h-full bg-muted flex items-center justify-center">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
                {[{ top: "28%", left: "38%" }, { top: "52%", left: "58%" }, { top: "40%", left: "22%" }].map((pin, i) => (
                  <div key={i} className="absolute" style={{ top: pin.top, left: pin.left }}>
                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground shadow-lg">💻</div>
                  </div>
                ))}
                <button onClick={() => navigate("/map")} className="absolute bottom-2 right-2 text-xs bg-card border border-border text-foreground px-2 py-1 rounded-lg shadow-sm">Apri mappa completa →</button>
              </div>
            </motion.div>
          )}

          {coworkings.length === 0 ? (
            <div className="flex flex-col items-center py-3 gap-1">
              <p className="text-muted-foreground text-xs text-center">Nessun coworking nel database per questa città.</p>
              <button onClick={() => navigate("/map")} className="text-xs text-primary font-medium">Aggiungine uno sulla mappa →</button>
            </div>
          ) : (
            <div className="flex flex-col">
              {coworkings.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                  <div>
                    <p className="text-foreground text-sm font-medium">{c.name}</p>
                    <p className="text-muted-foreground text-xs flex items-center gap-1">
                      {c.wifi && <><Wifi className="w-3 h-3" /> WiFi ·</>}
                      {c.rating && <><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {c.rating}</>}
                    </p>
                  </div>
                  <button onClick={() => navigate("/booking")} className="text-xs bg-primary text-primary-foreground rounded-xl px-3 py-1.5 font-medium" data-testid={`btn-book-${c.id}`}>
                    Prenota
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Internet info */}
        {cityInfo?.internet && (
          <div className="bg-card border border-border rounded-2xl px-4 py-3 shadow-sm flex items-start gap-3">
            <span className="text-xl shrink-0">📶</span>
            <div>
              <p className="text-foreground text-sm font-semibold mb-0.5">Connettività</p>
              <p className="text-muted-foreground text-xs leading-relaxed">{cityInfo.internet}</p>
            </div>
          </div>
        )}

        {/* Events */}
        <div className="bg-card border border-border rounded-2xl px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-primary" />
            <p className="text-foreground text-sm font-semibold">Prossimi eventi</p>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="text-muted-foreground text-xs text-center py-2">Nessun evento in programma</p>
          ) : (
            <div className="flex flex-col">
              {upcomingEvents.map((e) => (
                <div key={e.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-foreground text-sm">{e.title}</p>
                    <p className="text-muted-foreground text-xs">{new Date(e.date).toLocaleDateString("it-IT", { day: "numeric", month: "short" })} · {e.location || dest}</p>
                  </div>
                  <button onClick={() => navigate("/events-calendar")} className="text-xs bg-muted text-foreground rounded-full px-2.5 py-0.5" data-testid={`btn-event-${e.id}`}>
                    {e.type || "Evento"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        <button onClick={() => navigate("/diary")} className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 rounded-2xl py-4 text-white font-semibold text-base shadow-lg shadow-teal-500/20 active:scale-[0.98] transition-transform" data-testid="btn-plan-trip">
          🗓️ Pianifica il viaggio a {dest}
        </button>

      </div>

      <BottomNav activePage="ai" />
    </div>
  );
}
