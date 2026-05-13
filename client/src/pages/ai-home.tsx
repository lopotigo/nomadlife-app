import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { BottomNav } from "@/components/bottom-nav";
import { Bot, Camera, Mic, Send, ArrowRight } from "lucide-react";

interface UserNomad {
  id: number;
  name: string;
  username: string;
  location?: string;
  bio?: string;
  skills?: string[];
  avatarUrl?: string;
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

const SKILL_COLORS = [
  "from-teal-500 to-cyan-600",
  "from-violet-500 to-purple-600",
  "from-orange-400 to-pink-500",
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-green-600",
];

export default function AiHome() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [destination, setDestination] = useState("");
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: allUsers = [] } = useQuery<UserNomad[]>({
    queryKey: ["/api/users"],
    enabled: !!user,
  });

  const nearbyNomads = allUsers
    .filter(u => u.id !== user?.id)
    .slice(0, 3);

  const firstName = user?.name?.split(" ")[0] || user?.username || "nomade";

  function handleSearch(dest?: string) {
    const q = dest || destination;
    if (!q.trim()) return;
    navigate(`/city?dest=${encodeURIComponent(q.trim())}`);
  }

  function handleVoice() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = "it-IT";
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setDestination(text);
      setTimeout(() => handleSearch(text), 400);
    };
    recognition.start();
  }

  const quickDestinations = ["Lisbona", "Bali", "Bangkok", "Berlino", "Medellín"];

  return (
    <div className="relative min-h-screen bg-background flex flex-col">

      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">Ciao, {firstName} 👋</p>
          <h1 className="text-foreground text-xl font-bold mt-0.5">Dove vai?</h1>
        </div>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
          <Bot className="w-5 h-5 text-white" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28 flex flex-col gap-5">

        {/* AI greeting bubble */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm"
        >
          <p className="text-foreground text-sm leading-relaxed">
            Dimmi la prossima destinazione — ti trovo coworking, nomadi che ci saranno insieme a te, eventi e il costo della vita. In un secondo. ✈️
          </p>
        </motion.div>

        {/* Three action buttons */}
        <div className="flex flex-col gap-2.5">

          {/* Camera */}
          <motion.button
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 }}
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-card hover:bg-muted/60 border border-border rounded-2xl py-4 flex items-center gap-4 px-5 transition-all active:scale-[0.98] shadow-sm"
            data-testid="btn-camera"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/30 shrink-0">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div className="text-left flex-1">
              <p className="text-foreground font-semibold text-sm">Scatta una foto</p>
              <p className="text-muted-foreground text-xs mt-0.5">Mostrami dove sei o vuoi andare</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </motion.button>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={e => {
              if (e.target.files?.[0]) navigate("/chat");
            }}
          />

          {/* Voice */}
          <motion.button
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            onClick={handleVoice}
            className={`w-full bg-card border rounded-2xl py-4 flex items-center gap-4 px-5 transition-all active:scale-[0.98] shadow-sm ${isListening ? "border-violet-500 bg-violet-500/5" : "border-border hover:bg-muted/60"}`}
            data-testid="btn-voice"
          >
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0 ${isListening ? "animate-pulse" : ""}`}>
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div className="text-left flex-1">
              <p className="text-foreground font-semibold text-sm">
                {isListening ? "Ascoltando…" : "Dimmi dove vai"}
              </p>
              <p className="text-muted-foreground text-xs mt-0.5">Parla e penso a tutto io</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </motion.button>

          {/* Text input */}
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="relative"
          >
            <input
              type="text"
              value={destination}
              onChange={e => setDestination(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="Scrivi una destinazione…"
              className="w-full bg-card border border-border focus:border-primary rounded-2xl py-4 pl-5 pr-14 text-foreground placeholder-muted-foreground text-sm outline-none transition-colors shadow-sm"
              data-testid="input-destination"
            />
            <button
              onClick={() => handleSearch()}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-primary flex items-center justify-center transition-opacity hover:opacity-80"
              data-testid="btn-search-destination"
            >
              <Send className="w-4 h-4 text-primary-foreground" />
            </button>
          </motion.div>
        </div>

        {/* Quick destinations */}
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-widest mb-2.5">Destinazioni popolari</p>
          <div className="flex gap-2 flex-wrap">
            {quickDestinations.map((d, i) => (
              <button
                key={d}
                onClick={() => handleSearch(d)}
                className="px-3 py-1.5 rounded-full bg-card border border-border text-foreground text-xs font-medium hover:border-primary hover:text-primary transition-colors"
                data-testid={`btn-quick-dest-${i}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Nearby nomads */}
        <div className="bg-card border border-border rounded-2xl px-4 py-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <div>
              <p className="text-foreground text-sm font-semibold">Nomadi vicino a te</p>
              <p className="text-muted-foreground text-xs mt-0.5">{user?.location || "Posizione attuale"}</p>
            </div>
            <button
              onClick={() => navigate("/matchmaking")}
              className="text-primary text-xs font-medium"
              data-testid="btn-see-all-nomads"
            >
              Tutti →
            </button>
          </div>

          <AnimatePresence>
            {nearbyNomads.length === 0 ? (
              <p className="text-muted-foreground text-xs text-center py-3">Nessun nomade trovato nelle vicinanze</p>
            ) : (
              <div className="flex flex-col gap-3">
                {nearbyNomads.map((nomad, i) => (
                  <motion.div
                    key={nomad.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex items-center gap-3"
                  >
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${SKILL_COLORS[i % SKILL_COLORS.length]} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
                      {nomad.avatarUrl
                        ? <img src={nomad.avatarUrl} className="w-full h-full rounded-full object-cover" alt={nomad.name} />
                        : getInitials(nomad.name || nomad.username)
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-sm font-medium truncate">{nomad.name || nomad.username}</p>
                      <p className="text-muted-foreground text-xs truncate">
                        {nomad.location || "Posizione sconosciuta"}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/chat`)}
                      className="text-xs bg-muted hover:bg-muted/80 text-foreground rounded-xl px-3 py-1.5 transition-colors shrink-0"
                      data-testid={`btn-message-nomad-${nomad.id}`}
                    >
                      Scrivi
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "I tuoi viaggi", value: "Diario", icon: "✈️", href: "/diary" },
            { label: "Marketplace", value: "Mercato", icon: "🛍️", href: "/marketplace" },
            { label: "Prossimi eventi", value: "Eventi", icon: "📅", href: "/events-calendar" },
          ].map((s, i) => (
            <button
              key={i}
              onClick={() => navigate(s.href)}
              className="bg-card border border-border rounded-xl py-3 flex flex-col items-center gap-1.5 hover:border-primary/50 transition-colors"
              data-testid={`btn-shortcut-${i}`}
            >
              <span className="text-xl">{s.icon}</span>
              <span className="text-foreground font-semibold text-xs">{s.value}</span>
              <span className="text-muted-foreground text-[10px]">{s.label}</span>
            </button>
          ))}
        </div>

      </div>

      <BottomNav activePage="ai" />
    </div>
  );
}
