import { useEffect, useState } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Calendar, Users, ChevronRight, CheckCircle2, MapPin, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import type { Place } from "@shared/schema";

export default function Coworking() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [step, setStep] = useState(1);
  const [guestName, setGuestName] = useState("");

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setLocation("/auth");
      return;
    }

    setGuestName(user.name);

    fetch("/api/places?type=coworking")
      .then((res) => res.json())
      .then((data) => setPlaces(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, authLoading, setLocation]);

  const handleBook = async () => {
    if (!selectedPlace || !user) return;

    setStep(2);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: selectedPlace.id,
          checkInDate: new Date().toISOString(),
          guestName,
        }),
      });

      if (res.ok) {
        setTimeout(() => setStep(3), 1500);
      } else {
        throw new Error("Booking failed");
      }
    } catch (error) {
      toast({ title: "Booking failed", description: "Please try again", variant: "destructive" });
      setStep(1);
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 space-y-6">
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-display font-bold">Book Space</h1>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 bg-muted rounded-xl text-xs font-bold">Filters</button>
          </div>
        </header>

        <div className="space-y-4">
          {places.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No coworking spaces available yet.</p>
            </div>
          ) : (
            places.map((place) => (
              <button 
                key={place.id} 
                onClick={() => { setSelectedPlace(place); setStep(1); }}
                className="w-full text-left group"
                data-testid={`button-place-${place.id}`}
              >
                <div className="bg-card border border-border rounded-3xl overflow-hidden hover:shadow-lg transition-all duration-300">
                  <div className="h-40 relative">
                    {place.imageUrl ? (
                      <img src={place.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-muted" />
                    )}
                    <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg uppercase">
                      {place.type}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg" data-testid={`text-place-name-${place.id}`}>{place.name}</h3>
                        <div className="flex items-center gap-1 text-muted-foreground text-xs mt-1">
                          <MapPin className="w-3 h-3" />
                          {place.location}
                        </div>
                      </div>
                      <span className="text-primary font-bold" data-testid={`text-place-price-${place.id}`}>{place.price}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <AnimatePresence>
          {selectedPlace && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
              onClick={() => setSelectedPlace(null)}
            >
              <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                className="bg-card w-full max-w-lg rounded-t-[2.5rem] md:rounded-[2.5rem] overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                <div className="p-6">
                  {step === 1 && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h2 className="text-2xl font-display font-bold">{selectedPlace.name}</h2>
                          <p className="text-sm text-muted-foreground mt-1">{selectedPlace.location}</p>
                        </div>
                        <button onClick={() => setSelectedPlace(null)} className="text-2xl opacity-50">&times;</button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-muted/50 rounded-2xl border border-border">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Check-in</label>
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Calendar className="w-4 h-4 text-primary" />
                            {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-2xl border border-border">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Guest Name</label>
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Users className="w-4 h-4 text-primary" />
                            <input
                              type="text"
                              value={guestName}
                              onChange={(e) => setGuestName(e.target.value)}
                              className="bg-transparent border-none outline-none w-full"
                              data-testid="input-guest-name"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-sm font-bold">Price Summary</h4>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Daily Rate</span>
                          <span>{selectedPlace.price}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold pt-2 border-t border-border">
                          <span>Total</span>
                          <span>{selectedPlace.price}</span>
                        </div>
                      </div>

                      <button 
                        onClick={handleBook}
                        disabled={!guestName.trim()}
                        className="w-full py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        data-testid="button-confirm-booking"
                      >
                        Confirm Booking
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="py-12 flex flex-col items-center justify-center space-y-4">
                      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="font-bold">Processing booking...</p>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="py-8 flex flex-col items-center justify-center space-y-6 text-center">
                      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-display font-bold" data-testid="text-booking-confirmed">Booking Confirmed!</h2>
                        <p className="text-sm text-muted-foreground mt-2">We've saved your booking details.</p>
                      </div>
                      <button 
                        onClick={() => setSelectedPlace(null)}
                        className="w-full py-4 bg-muted rounded-2xl font-bold hover:bg-muted/80 transition-colors"
                        data-testid="button-done"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
