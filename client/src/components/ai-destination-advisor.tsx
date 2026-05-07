import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Sparkles, X, Wifi, Globe, DollarSign, Shield, Users, Sun,
  Plane, Hotel, MapPin, ChevronRight, Loader2, Check, Star,
  Route, Calendar, ArrowRight, Zap, ExternalLink, CheckCircle2
} from "lucide-react";

interface DestinationCard {
  city: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  iataCode?: string;
  monthlyCostMin: number;
  monthlyCostMax: number;
  internetMbps: number;
  visaInfo: string;
  visaDifficulty: "easy" | "medium" | "hard";
  nomadScore: number;
  climate: string;
  highlights: string[];
  pros: string[];
  bestFor: string;
}

interface TripStop {
  city: string;
  country: string;
  lat: number;
  lng: number;
  durationDays: number;
  transportMode: string;
  estimatedMonthlyCost: number;
  highlights: string;
}

interface TripPlan {
  title: string;
  totalDays: number;
  stops: TripStop[];
}

interface Props {
  currentCity?: string;
  currentCountry?: string;
  currentLat?: number;
  currentLng?: number;
  onTripSaved?: () => void;
}

const PRIORITY_OPTIONS = [
  { id: "cost", label: "Costo basso", icon: DollarSign, color: "#10b981" },
  { id: "internet", label: "Internet veloce", icon: Wifi, color: "#3b82f6" },
  { id: "climate", label: "Clima caldo", icon: Sun, color: "#f59e0b" },
  { id: "visa", label: "Visto facile", icon: Globe, color: "#8b5cf6" },
  { id: "community", label: "Community nomadi", icon: Users, color: "#ec4899" },
  { id: "safety", label: "Alta sicurezza", icon: Shield, color: "#6366f1" },
];

const DURATION_OPTIONS = [
  { label: "1 sett.", weeks: 1 },
  { label: "2 sett.", weeks: 2 },
  { label: "1 mese", weeks: 4 },
  { label: "2 mesi", weeks: 8 },
  { label: "3 mesi+", weeks: 12 },
];

function VisaBadge({ difficulty }: { difficulty: "easy" | "medium" | "hard" }) {
  const map = { easy: ["Visto libero", "bg-green-100 text-green-700"], medium: ["Visto semplice", "bg-yellow-100 text-yellow-700"], hard: ["Visto richiesto", "bg-red-100 text-red-700"] };
  const [label, cls] = map[difficulty];
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

function NomadScore({ score }: { score: number }) {
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-1">
      <div className="relative w-8 h-8">
        <svg viewBox="0 0 36 36" className="w-8 h-8 -rotate-90">
          <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" strokeWidth="3" />
          <circle cx="18" cy="18" r="15" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${(score / 100) * 94.2} 94.2`} strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold" style={{ color }}>{score}</span>
      </div>
      <span className="text-[10px] text-gray-500 leading-tight">Nomad<br/>Score</span>
    </div>
  );
}

export function AiDestinationAdvisor({ currentCity, currentCountry, currentLat, currentLng, onTripSaved }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"form" | "results" | "trip">("form");
  const [budget, setBudget] = useState(1500);
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [priorities, setPriorities] = useState<string[]>(["internet", "cost"]);
  const [loading, setLoading] = useState(false);
  const [destinations, setDestinations] = useState<DestinationCard[]>([]);
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  const [buildingTrip, setBuildingTrip] = useState(false);
  const [savingTrip, setSavingTrip] = useState(false);
  const [tripSaved, setTripSaved] = useState(false);

  const togglePriority = (id: string) => {
    setPriorities(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const searchDestinations = useCallback(async () => {
    setLoading(true);
    setStep("results");
    setDestinations([]);
    try {
      const res = await fetch("/api/ai/destination-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentCity: currentCity || "Unknown",
          currentCountry: currentCountry || "Unknown",
          budget,
          durationWeeks,
          priorities,
        }),
      });
      if (!res.ok) throw new Error("Errore nella ricerca");
      const data = await res.json();
      setDestinations(data.destinations || []);
    } catch {
      toast({ title: "Errore", description: "Impossibile caricare suggerimenti. Riprova.", variant: "destructive" });
      setStep("form");
    } finally {
      setLoading(false);
    }
  }, [currentCity, currentCountry, budget, durationWeeks, priorities, toast]);

  const buildQuickTrip = useCallback(async () => {
    setBuildingTrip(true);
    setStep("trip");
    setTripPlan(null);
    try {
      const res = await fetch("/api/ai/quick-trip-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentCity: currentCity || "Unknown",
          currentCountry: currentCountry || "Unknown",
          currentLat: currentLat || 0,
          currentLng: currentLng || 0,
          budget,
          totalDays: durationWeeks * 7,
          style: priorities.includes("cost") ? "budget" : priorities.includes("community") ? "social" : "balanced",
        }),
      });
      if (!res.ok) throw new Error("Errore");
      const data = await res.json();
      setTripPlan(data.trip || null);
    } catch {
      toast({ title: "Errore", description: "Impossibile generare il piano. Riprova.", variant: "destructive" });
      setStep("results");
    } finally {
      setBuildingTrip(false);
    }
  }, [currentCity, currentCountry, currentLat, currentLng, budget, durationWeeks, priorities, toast]);

  const saveTrip = useCallback(async () => {
    if (!tripPlan || !user) return;
    setSavingTrip(true);
    try {
      const startDate = new Date();
      const tripRes = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: tripPlan.title,
          description: `Piano generato da NomadBot · Budget €${budget}/mese · ${durationWeeks} settimane`,
          startDate: startDate.toISOString(),
          startLocation: currentCity || "Posizione attuale",
          endLocation: tripPlan.stops[tripPlan.stops.length - 1]?.city || "Destinazione finale",
          isPublic: false,
          status: "planned",
        }),
      });
      if (!tripRes.ok) throw new Error("Errore creazione viaggio");
      const trip = await tripRes.json();

      let currentDate = new Date(startDate);
      for (let i = 0; i < tripPlan.stops.length; i++) {
        const stop = tripPlan.stops[i];
        await fetch(`/api/trips/${trip.id}/stops`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            city: stop.city,
            country: stop.country,
            latitude: stop.lat,
            longitude: stop.lng,
            orderIndex: i,
            arrivalDate: currentDate.toISOString(),
            transportMode: stop.transportMode || "plane",
            notes: stop.highlights,
          }),
        });
        currentDate = new Date(currentDate.getTime() + stop.durationDays * 86400000);
      }

      setTripSaved(true);
      toast({ title: "Viaggio salvato!", description: `"${tripPlan.title}" è ora nella tua Diary.` });
      setTimeout(() => {
        setIsOpen(false);
        setStep("form");
        setTripSaved(false);
        onTripSaved?.();
      }, 1800);
    } catch {
      toast({ title: "Errore", description: "Impossibile salvare il viaggio.", variant: "destructive" });
    } finally {
      setSavingTrip(false);
    }
  }, [tripPlan, user, budget, durationWeeks, currentCity, onTripSaved, toast]);

  const buildFlightUrl = (dest: DestinationCard) => {
    const marker = "578583";
    return `https://www.aviasales.com/?marker=${marker}&origin=&destination=${dest.iataCode || dest.city.substring(0, 3).toUpperCase()}`;
  };

  const buildHotelUrl = (dest: DestinationCard) => {
    const checkIn = new Date(); checkIn.setDate(checkIn.getDate() + 7);
    const checkOut = new Date(checkIn); checkOut.setDate(checkOut.getDate() + durationWeeks * 7);
    const fmt = (d: Date) => d.toISOString().split("T")[0];
    return `https://hotellook.com/search?destination=${encodeURIComponent(dest.city)}&checkIn=${fmt(checkIn)}&checkOut=${fmt(checkOut)}&adults=1&marker=578583`;
  };

  return (
    <>
      <button
        onClick={() => { setIsOpen(true); setStep("form"); }}
        data-testid="button-destination-advisor"
        className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl px-4 py-2.5 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 text-sm font-semibold"
      >
        <Sparkles className="w-4 h-4" />
        Dove vado?
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[2000] backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed bottom-0 left-0 right-0 z-[2001] bg-white dark:bg-gray-900 rounded-t-3xl max-h-[92vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                <div className="flex items-center gap-2">
                  {step !== "form" && (
                    <button
                      onClick={() => setStep(step === "trip" ? "results" : "form")}
                      className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mr-1"
                    >
                      <ChevronRight className="w-4 h-4 rotate-180 text-gray-500" />
                    </button>
                  )}
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base leading-tight">
                      {step === "form" ? "AI Destination Advisor" : step === "results" ? "Destinazioni per te" : "Piano di viaggio"}
                    </h2>
                    <p className="text-[11px] text-gray-500">
                      {step === "form" ? (currentCity ? `Da ${currentCity}` : "Dimmi dove vuoi andare") : step === "results" ? `${destinations.length || "..."} suggerimenti AI` : "Generato da NomadBot"}
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 overscroll-contain" style={{ paddingBottom: step === "results" ? "80px" : 0 }}>

                {/* STEP 1: FORM */}
                {step === "form" && (
                  <div className="p-5 space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Budget mensile</label>
                        <span className="text-lg font-bold text-violet-600">€{budget.toLocaleString("it-IT")}</span>
                      </div>
                      <Slider
                        min={400} max={5000} step={100}
                        value={[budget]}
                        onValueChange={([v]) => setBudget(v)}
                        className="w-full"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                        <span>€400 budget</span><span>€5.000 comfort</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-3">Durata tappa</label>
                      <div className="flex gap-2 flex-wrap">
                        {DURATION_OPTIONS.map(opt => (
                          <button
                            key={opt.weeks}
                            onClick={() => setDurationWeeks(opt.weeks)}
                            className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all border ${durationWeeks === opt.weeks ? "bg-violet-600 text-white border-violet-600 shadow-sm" : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-violet-300"}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-3">Cosa conta di più? <span className="text-gray-400 font-normal">(scegline fino a 3)</span></label>
                      <div className="grid grid-cols-2 gap-2">
                        {PRIORITY_OPTIONS.map(opt => {
                          const Icon = opt.icon;
                          const active = priorities.includes(opt.id);
                          return (
                            <button
                              key={opt.id}
                              onClick={() => togglePriority(opt.id)}
                              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${active ? "border-2 shadow-sm" : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500"}`}
                              style={active ? { borderColor: opt.color, background: `${opt.color}18`, color: opt.color } : {}}
                            >
                              <Icon className="w-4 h-4 flex-shrink-0" />
                              {opt.label}
                              {active && <Check className="w-3.5 h-3.5 ml-auto" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <Button
                      onClick={searchDestinations}
                      disabled={priorities.length === 0}
                      className="w-full h-12 text-base font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-2xl shadow-lg"
                    >
                      <Sparkles className="w-5 h-5 mr-2" />
                      Trova le mie destinazioni
                    </Button>
                  </div>
                )}

                {/* STEP 2: RESULTS */}
                {step === "results" && (
                  <div className="p-4 space-y-4">
                    {loading ? (
                      <div className="space-y-3 pt-2">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="rounded-2xl border border-gray-100 dark:border-gray-800 p-4 animate-pulse">
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-12 rounded-2xl bg-gray-200 dark:bg-gray-700" />
                              <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                              </div>
                            </div>
                            <div className="mt-3 space-y-1.5">
                              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded" />
                              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
                            </div>
                          </div>
                        ))}
                        <p className="text-center text-sm text-gray-400 animate-pulse pt-2">NomadBot sta analizzando le destinazioni...</p>
                      </div>
                    ) : (
                      <>
                        {destinations.map((dest, i) => (
                          <motion.div
                            key={`${dest.city}-${i}`}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="p-4">
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <div className="flex items-start gap-3">
                                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xl shadow-sm flex-shrink-0">
                                    {dest.countryCode ? (
                                      <span className="text-2xl">{dest.countryCode.split("").map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join("")}</span>
                                    ) : "🌍"}
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-base leading-tight">{dest.city}</h3>
                                    <p className="text-sm text-gray-500">{dest.country}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <VisaBadge difficulty={dest.visaDifficulty} />
                                    </div>
                                  </div>
                                </div>
                                <NomadScore score={dest.nomadScore} />
                              </div>

                              <div className="grid grid-cols-3 gap-2 mb-3">
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-2 text-center">
                                  <DollarSign className="w-4 h-4 text-emerald-600 mx-auto mb-0.5" />
                                  <p className="text-[11px] font-bold text-emerald-700">€{dest.monthlyCostMin}-{dest.monthlyCostMax}</p>
                                  <p className="text-[9px] text-emerald-600">al mese</p>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-2 text-center">
                                  <Wifi className="w-4 h-4 text-blue-600 mx-auto mb-0.5" />
                                  <p className="text-[11px] font-bold text-blue-700">{dest.internetMbps} Mbps</p>
                                  <p className="text-[9px] text-blue-600">velocità avg</p>
                                </div>
                                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-2 text-center">
                                  <Sun className="w-4 h-4 text-amber-600 mx-auto mb-0.5" />
                                  <p className="text-[11px] font-bold text-amber-700 truncate">{dest.climate}</p>
                                  <p className="text-[9px] text-amber-600">clima</p>
                                </div>
                              </div>

                              {dest.highlights.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                  {dest.highlights.slice(0, 4).map((h, hi) => (
                                    <span key={hi} className="text-[11px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">{h}</span>
                                  ))}
                                </div>
                              )}

                              {dest.bestFor && (
                                <p className="text-[12px] text-gray-500 mb-3 flex items-start gap-1.5">
                                  <Zap className="w-3.5 h-3.5 text-violet-500 mt-0.5 flex-shrink-0" />
                                  {dest.bestFor}
                                </p>
                              )}

                              <div className="flex gap-2">
                                <a
                                  href={buildFlightUrl(dest)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 flex items-center justify-center gap-1.5 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 rounded-xl py-2 text-[12px] font-semibold hover:bg-sky-100 transition-colors"
                                >
                                  <Plane className="w-3.5 h-3.5" /> Cerca voli
                                </a>
                                <a
                                  href={buildHotelUrl(dest)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 flex items-center justify-center gap-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 rounded-xl py-2 text-[12px] font-semibold hover:bg-orange-100 transition-colors"
                                >
                                  <Hotel className="w-3.5 h-3.5" /> Hotel
                                </a>
                              </div>
                            </div>
                          </motion.div>
                        ))}

                      </>
                    )}
                  </div>
                )}

                {/* STEP 3: TRIP PLAN */}
                {step === "trip" && (
                  <div className="p-4 space-y-4">
                    {buildingTrip ? (
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-center gap-3 py-6">
                          <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                          <p className="text-sm text-gray-500">NomadBot sta pianificando il tuo viaggio...</p>
                        </div>
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} className="rounded-2xl border border-gray-100 dark:border-gray-800 p-4 animate-pulse">
                            <div className="flex gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                              <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : tripPlan ? (
                      <>
                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-800">
                          <h3 className="font-bold text-base text-emerald-800 dark:text-emerald-300">{tripPlan.title}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-[12px] text-emerald-600">
                              <Calendar className="w-3.5 h-3.5" />{tripPlan.totalDays} giorni
                            </span>
                            <span className="flex items-center gap-1 text-[12px] text-emerald-600">
                              <MapPin className="w-3.5 h-3.5" />{tripPlan.stops.length} tappe
                            </span>
                            <span className="flex items-center gap-1 text-[12px] text-emerald-600">
                              <DollarSign className="w-3.5 h-3.5" />~€{budget}/mese
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {tripPlan.stops.map((stop, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -12 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.06 }}
                              className="flex gap-3 items-start"
                            >
                              <div className="flex flex-col items-center flex-shrink-0">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                                  {i + 1}
                                </div>
                                {i < tripPlan.stops.length - 1 && <div className="w-px h-6 bg-gradient-to-b from-violet-300 to-transparent mt-1" />}
                              </div>
                              <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-3 mb-1">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-semibold text-sm">{stop.city}</p>
                                    <p className="text-[11px] text-gray-500">{stop.country}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[11px] font-semibold text-violet-600">{stop.durationDays} gg</p>
                                    <p className="text-[10px] text-gray-400">~€{stop.estimatedMonthlyCost}/mese</p>
                                  </div>
                                </div>
                                {stop.highlights && (
                                  <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">{stop.highlights}</p>
                                )}
                                <div className="flex items-center gap-1 mt-1.5">
                                  <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-0.5 rounded-full capitalize">
                                    {stop.transportMode === "plane" ? "✈️ Aereo" : stop.transportMode === "train" ? "🚂 Treno" : stop.transportMode === "bus" ? "🚌 Bus" : "🚗 Auto"}
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>

                        <div className="pb-6">
                          {tripSaved ? (
                            <div className="w-full h-12 flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 rounded-2xl border border-emerald-200 font-semibold">
                              <CheckCircle2 className="w-5 h-5" /> Viaggio salvato nella Diary!
                            </div>
                          ) : (
                            <Button
                              onClick={saveTrip}
                              disabled={savingTrip || !user}
                              className="w-full h-12 text-base font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-2xl shadow-lg"
                            >
                              {savingTrip ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Star className="w-5 h-5 mr-2" />}
                              {savingTrip ? "Salvataggio..." : user ? "Salva nella mia Diary" : "Accedi per salvare"}
                            </Button>
                          )}
                        </div>
                      </>
                    ) : null}
                  </div>
                )}
              </div>

              {/* ── Sticky footer: Pianifica button (results step only) ── */}
              {step === "results" && !loading && destinations.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex-shrink-0 px-4 pb-5 pt-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900"
                >
                  <Button
                    onClick={buildQuickTrip}
                    data-testid="button-build-trip"
                    className="w-full h-12 text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-2xl shadow-lg"
                  >
                    <Route className="w-4 h-4 mr-2" />
                    Pianifica viaggio completo
                  </Button>
                </motion.div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ===== INLINE SPOT RATING WIDGET =====
interface SpotRatingProps {
  locationId: string;
  initialRating?: number;
  totalRatings?: number;
}

export function SpotRatingWidget({ locationId, initialRating = 0, totalRatings = 0 }: SpotRatingProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [hoveredStar, setHoveredStar] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [avgRating, setAvgRating] = useState(initialRating);
  const [count, setCount] = useState(totalRatings);
  const [submitting, setSubmitting] = useState(false);

  const submitRating = async (rating: number) => {
    if (!user) { toast({ title: "Accedi per votare", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/locations/${locationId}/ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUserRating(rating);
      setAvgRating(data.avgRating || rating);
      setCount(data.count || count + 1);
      toast({ title: "Grazie per la valutazione!" });
    } catch {
      toast({ title: "Errore", description: "Impossibile salvare la valutazione.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoveredStar || userRating || avgRating;

  return (
    <div className="flex items-center gap-2 px-2 py-1.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            disabled={submitting || userRating > 0}
            onMouseEnter={() => !userRating && setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(0)}
            onClick={() => !userRating && submitRating(star)}
            className="transition-transform hover:scale-110 disabled:cursor-default"
          >
            <Star
              className={`w-4 h-4 transition-colors ${star <= displayRating ? "text-amber-400 fill-amber-400" : "text-gray-300"}`}
            />
          </button>
        ))}
      </div>
      <span className="text-[11px] text-gray-500">
        {userRating > 0 ? "Tua valutazione" : count > 0 ? `${avgRating.toFixed(1)} (${count})` : "Valuta questo posto"}
      </span>
    </div>
  );
}
