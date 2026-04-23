import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X, Loader2, Plus, Check, ChevronRight } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface Trip {
  id: string;
  name: string;
  stops?: { orderIndex: number }[];
}

interface QuickCheckInProps {
  open: boolean;
  onClose: () => void;
}

type Step = "detecting" | "confirm" | "select-trip" | "create-trip" | "saving" | "done";

export function QuickCheckIn({ open, onClose }: QuickCheckInProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("detecting");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [geoError, setGeoError] = useState("");
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [newTripName, setNewTripName] = useState("");

  const { data: trips = [] } = useQuery<Trip[]>({
    queryKey: ["/api/trips"],
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      setStep("detecting");
      setCity("");
      setCountry("");
      setLat(null);
      setLon(null);
      setGeoError("");
      setSelectedTripId(null);
      setNewTripName("");
      return;
    }

    if (!navigator.geolocation) {
      setGeoError("Il tuo browser non supporta la geolocalizzazione.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLon(longitude);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { headers: { "Accept-Language": "it" } }
          );
          const data = await res.json();
          const detectedCity =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.county ||
            "Posizione sconosciuta";
          const detectedCountry = data.address?.country || "";
          setCity(detectedCity);
          setCountry(detectedCountry);
          setStep("confirm");
        } catch {
          setGeoError("Impossibile determinare la città. Riprova.");
        }
      },
      (err) => {
        if (err.code === 1) {
          setGeoError("Permesso di localizzazione negato. Abilitalo nelle impostazioni.");
        } else {
          setGeoError("Impossibile rilevare la posizione. Riprova.");
        }
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }, [open]);

  const handleConfirm = () => {
    if (trips.length === 0) {
      setStep("create-trip");
    } else if (trips.length === 1) {
      setSelectedTripId(trips[0].id);
      saveStop(trips[0].id);
    } else {
      setStep("select-trip");
    }
  };

  const saveStop = async (tripId: string) => {
    setStep("saving");
    try {
      const tripStops = (trips.find(t => t.id === tripId)?.stops || []);
      const orderIndex = tripStops.length;

      const res = await fetch(`/api/trips/${tripId}/stops`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city,
          country,
          latitude: lat,
          longitude: lon,
          orderIndex,
          arrivalDate: new Date().toISOString(),
        }),
      });

      if (!res.ok) throw new Error("Errore nel salvataggio");

      await queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      setStep("done");
      setTimeout(() => {
        onClose();
        toast({ title: `📍 ${city} aggiunta al viaggio!` });
      }, 1200);
    } catch {
      toast({ title: "Errore", description: "Non è stato possibile aggiungere la tappa.", variant: "destructive" });
      onClose();
    }
  };

  const handleCreateAndSave = async () => {
    if (!newTripName.trim()) return;
    setStep("saving");
    try {
      const tripRes = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTripName.trim(), isPublic: false }),
      });
      if (!tripRes.ok) throw new Error("Errore creazione viaggio");
      const newTrip = await tripRes.json();
      await saveStop(newTrip.id);
    } catch {
      toast({ title: "Errore", description: "Non è stato possibile creare il viaggio.", variant: "destructive" });
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[1200]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 80, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.97 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed bottom-[88px] inset-x-0 mx-4 bg-card rounded-3xl shadow-2xl border border-border/60 overflow-hidden z-[1210]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-sm">Sono qui</span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                data-testid="checkin-close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              {/* DETECTING */}
              {step === "detecting" && !geoError && (
                <div className="flex flex-col items-center gap-3 py-4">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                  <p className="text-sm text-muted-foreground">Rilevamento posizione…</p>
                </div>
              )}

              {/* GEO ERROR */}
              {geoError && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-destructive">{geoError}</p>
                  <button
                    onClick={onClose}
                    className="w-full py-2.5 rounded-xl bg-muted text-sm font-medium"
                  >
                    Chiudi
                  </button>
                </div>
              )}

              {/* CONFIRM */}
              {step === "confirm" && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 bg-muted/50 rounded-2xl px-4 py-3">
                    <MapPin className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-base">{city}</p>
                      <p className="text-xs text-muted-foreground">{country}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    {trips.length === 0
                      ? "Nessun viaggio attivo. Ne creerai uno nuovo."
                      : trips.length === 1
                      ? `Verrà aggiunta a: ${trips[0].name}`
                      : "Sceglierai a quale viaggio aggiungere la tappa."}
                  </p>
                  <button
                    onClick={handleConfirm}
                    className="w-full py-3 rounded-2xl bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-emerald-600 active:scale-[0.98] transition-all"
                    data-testid="checkin-confirm"
                  >
                    <Check className="w-4 h-4" />
                    Aggiungi {city}
                  </button>
                </div>
              )}

              {/* SELECT TRIP */}
              {step === "select-trip" && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground mb-1">A quale viaggio aggiungi <strong>{city}</strong>?</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {trips.map(trip => (
                      <button
                        key={trip.id}
                        onClick={() => saveStop(trip.id)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-muted/50 hover:bg-muted active:scale-[0.98] transition-all text-left"
                        data-testid={`checkin-trip-${trip.id}`}
                      >
                        <span className="font-medium text-sm">{trip.name}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* CREATE TRIP */}
              {step === "create-trip" && (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-muted-foreground">Non hai ancora un viaggio. Dagli un nome:</p>
                  <input
                    autoFocus
                    type="text"
                    value={newTripName}
                    onChange={e => setNewTripName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleCreateAndSave()}
                    placeholder="Es. Balcani 2025"
                    className="w-full px-4 py-3 rounded-2xl bg-muted border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    data-testid="checkin-trip-name"
                  />
                  <button
                    onClick={handleCreateAndSave}
                    disabled={!newTripName.trim()}
                    className="w-full py-3 rounded-2xl bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-emerald-600 disabled:opacity-40 active:scale-[0.98] transition-all"
                    data-testid="checkin-create-trip"
                  >
                    <Plus className="w-4 h-4" />
                    Crea viaggio e aggiungi {city}
                  </button>
                </div>
              )}

              {/* SAVING */}
              {step === "saving" && (
                <div className="flex flex-col items-center gap-3 py-4">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                  <p className="text-sm text-muted-foreground">Salvataggio in corso…</p>
                </div>
              )}

              {/* DONE */}
              {step === "done" && (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Check className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="font-semibold text-sm">{city} aggiunta!</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
