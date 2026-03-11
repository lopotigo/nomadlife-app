import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, PenSquare, Plane, Users, ChevronRight, ChevronLeft, X, Bot, BookOpen, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/lib/onboarding";
import { useAuth } from "@/lib/auth";

const slides = [
  {
    icon: MapPin,
    color: "from-blue-500 to-cyan-400",
    title: "Explore the Map",
    description: "Discover posts, events, and trips from digital nomads around the world. Tap on markers to see details and find coworking spaces, cafes, and meetups near you!",
    tip: "Use filters to show only what interests you",
  },
  {
    icon: PenSquare,
    color: "from-purple-500 to-pink-400",
    title: "Share Your Experiences",
    description: "Tap anywhere on the map to create a post or event at that location. Add photos, videos, and descriptions to share with the community!",
    tip: "Press the + button at the bottom to create content",
  },
  {
    icon: Plane,
    color: "from-green-500 to-emerald-400",
    title: "Plan Your Trips",
    description: "Create your travel diary with stops, expenses, and CO2 stats. Share your itineraries with the community and track your environmental impact!",
    tip: "Go to 'Trips' to manage your travels",
  },
  {
    icon: Users,
    color: "from-orange-500 to-amber-400",
    title: "Connect with Nomads",
    description: "Find nomads in your city, join events, and chat with the community. You're never alone — there's always someone nearby!",
    tip: "Use Search to find other users and places",
  },
  {
    icon: Bot,
    color: "from-violet-500 to-purple-400",
    title: "Ask NomadBot Anything",
    description: "Your AI travel assistant lives in the purple bubble at the bottom right. Ask for itineraries, flight deals, visa info, cost comparisons — or send a photo to analyze!",
    tip: "Try voice input or upload a photo for instant help",
  },
  {
    icon: BookOpen,
    color: "from-teal-500 to-cyan-400",
    title: "Blog, Guides & Marketplace",
    description: "Read travel guides, sustainability tips, and city reviews written by and for nomads. Browse the local marketplace to buy and sell gear, services, and more!",
    tip: "Check the Blog for destination guides and nomad tips",
  },
  {
    icon: MessageCircle,
    color: "from-rose-500 to-pink-400",
    title: "Community Channels",
    description: "Join themed channels like 'Work & Freelance', 'Cities & Destinations', 'Visas & Bureaucracy' and more. Chat privately or create your own groups!",
    tip: "Go to Chat and explore the Community tab",
  },
];

export function WelcomeTutorial() {
  const { user } = useAuth();
  const { markAsSeen, state } = useOnboarding();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState(!state.hasSeenWelcome);

  if (!user || !isVisible) return null;

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
                  {slide.tip}
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
                    Back
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  className={`flex-1 ${isFirst ? "w-full" : ""}`}
                  data-testid="button-next-slide"
                >
                  {isLast ? (
                    "Let's Go!"
                  ) : (
                    <>
                      Next
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
                  Skip tutorial
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
