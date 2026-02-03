import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, PenSquare, Plane, Users, ChevronRight, ChevronLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/lib/onboarding";

const slides = [
  {
    icon: MapPin,
    color: "from-blue-500 to-cyan-400",
    title: "Esplora la Mappa",
    description: "Scopri post, eventi e viaggi di altri nomadi digitali in tutto il mondo. Clicca sui marker per vedere i dettagli!",
    tip: "Usa i filtri per mostrare solo quello che ti interessa",
  },
  {
    icon: PenSquare,
    color: "from-purple-500 to-pink-400",
    title: "Condividi le tue Esperienze",
    description: "Clicca sulla mappa per creare un post o un evento nella posizione che preferisci. Aggiungi foto, video e descrizioni!",
    tip: "Premi il bottone + in basso per creare contenuti",
  },
  {
    icon: Plane,
    color: "from-green-500 to-emerald-400",
    title: "Pianifica i tuoi Viaggi",
    description: "Crea il tuo diario di viaggio con tappe, spese e statistiche CO2. Condividi i tuoi itinerari con la community!",
    tip: "Vai su 'Diario' per gestire i tuoi viaggi",
  },
  {
    icon: Users,
    color: "from-orange-500 to-amber-400",
    title: "Connettiti con altri Nomadi",
    description: "Trova nomadi nelle tue stesse città, partecipa agli eventi e chatta con la community. Non sei mai solo!",
    tip: "Cerca altri utenti nella pagina Cerca",
  },
];

export function WelcomeTutorial() {
  const { markAsSeen, state } = useOnboarding();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState(!state.hasSeenWelcome);

  if (!isVisible) return null;

  const slide = slides[currentSlide];
  const isLast = currentSlide === slides.length - 1;
  const isFirst = currentSlide === 0;

  const handleNext = () => {
    if (isLast) {
      handleClose();
    } else {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const handleClose = () => {
    markAsSeen("hasSeenWelcome");
    setIsVisible(false);
  };

  const handleSkip = () => {
    handleClose();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          data-testid="welcome-tutorial"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-md bg-card rounded-3xl overflow-hidden shadow-2xl"
          >
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors"
              data-testid="button-skip-tutorial"
            >
              <X className="w-5 h-5" />
            </button>

            <div className={`bg-gradient-to-br ${slide.color} p-8 pt-12`}>
              <motion.div
                key={currentSlide}
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center text-white text-center"
              >
                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-6">
                  <slide.icon className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold mb-3">{slide.title}</h2>
                <p className="text-white/90 mb-4">{slide.description}</p>
                <div className="bg-white/20 rounded-xl px-4 py-2 text-sm">
                  💡 {slide.tip}
                </div>
              </motion.div>
            </div>

            <div className="p-6">
              <div className="flex justify-center gap-2 mb-6">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      index === currentSlide
                        ? "bg-primary w-6"
                        : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    }`}
                    data-testid={`dot-slide-${index}`}
                  />
                ))}
              </div>

              <div className="flex gap-3">
                {!isFirst && (
                  <Button
                    variant="outline"
                    onClick={handlePrev}
                    className="flex-1"
                    data-testid="button-prev-slide"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Indietro
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  className={`flex-1 ${isFirst ? "w-full" : ""}`}
                  data-testid="button-next-slide"
                >
                  {isLast ? (
                    "Inizia!"
                  ) : (
                    <>
                      Avanti
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>

              {!isLast && (
                <button
                  onClick={handleSkip}
                  className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-skip-all"
                >
                  Salta il tutorial
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
