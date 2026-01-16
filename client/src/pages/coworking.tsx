import Layout from "@/components/layout";
import { PLACES } from "@/lib/mock-data";
import { Calendar, Users, CreditCard, ChevronRight, CheckCircle2, MapPin } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Coworking() {
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [step, setStep] = useState(1);

  const handleBook = () => {
    setStep(2);
    setTimeout(() => setStep(3), 2000);
  };

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
          {PLACES.map((place) => (
            <button 
              key={place.id} 
              onClick={() => { setSelectedPlace(place); setStep(1); }}
              className="w-full text-left group"
            >
              <div className="bg-card border border-border rounded-3xl overflow-hidden hover:shadow-lg transition-all duration-300">
                <div className="h-40 relative">
                  <img src={place.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg uppercase">
                    {place.type}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">{place.name}</h3>
                      <div className="flex items-center gap-1 text-muted-foreground text-xs mt-1">
                        <MapPin className="w-3 h-3" />
                        {place.location}
                      </div>
                    </div>
                    <span className="text-primary font-bold">{place.price}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
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
                            May 24, 2026
                          </div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-2xl border border-border">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Guests</label>
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Users className="w-4 h-4 text-primary" />
                            1 Person
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
                        className="w-full py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                      >
                        Confirm Booking
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="py-12 flex flex-col items-center justify-center space-y-4">
                      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="font-bold">Processing payment...</p>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="py-8 flex flex-col items-center justify-center space-y-6 text-center">
                      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-display font-bold">Booking Confirmed!</h2>
                        <p className="text-sm text-muted-foreground mt-2">We've sent the details to your email and the group chat.</p>
                      </div>
                      <button 
                        onClick={() => setSelectedPlace(null)}
                        className="w-full py-4 bg-muted rounded-2xl font-bold hover:bg-muted/80 transition-colors"
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
