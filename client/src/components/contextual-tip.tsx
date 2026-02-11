import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lightbulb } from "lucide-react";
import { useOnboarding } from "@/lib/onboarding";

interface ContextualTipProps {
  tipKey: "hasSeenMapTip" | "hasSeenFeedTip" | "hasSeenCreateTip" | "hasSeenProfileTip" | "hasSeenTravelDiaryTip";
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

export function ContextualTip({ 
  tipKey, 
  title, 
  description, 
  position = "bottom",
  delay = 1000 
}: ContextualTipProps) {
  const { state, markAsSeen } = useOnboarding();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!state[tipKey] && state.hasSeenWelcome) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [state, tipKey, delay]);

  const handleDismiss = () => {
    markAsSeen(tipKey);
    setIsVisible(false);
  };

  const positionClasses = {
    top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
    bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
    left: "right-full mr-2 top-1/2 -translate-y-1/2",
    right: "left-full ml-2 top-1/2 -translate-y-1/2",
  };

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-primary",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-primary",
    left: "left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-primary",
    right: "right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-primary",
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={`absolute z-50 ${positionClasses[position]}`}
          data-testid={`tip-${tipKey}`}
        >
          <div className="relative bg-primary text-primary-foreground rounded-xl p-4 shadow-lg max-w-[280px]">
            <div className={`absolute w-0 h-0 border-8 ${arrowClasses[position]}`} />
            
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/20 transition-colors"
              data-testid={`button-dismiss-${tipKey}`}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3 pr-6">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">{title}</h4>
                <p className="text-xs opacity-90">{description}</p>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="w-full mt-3 py-1.5 text-xs font-medium bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              data-testid={`button-got-it-${tipKey}`}
            >
              Ho capito!
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function FloatingTip({ 
  tipKey, 
  title, 
  description,
  delay = 2000
}: Omit<ContextualTipProps, "position">) {
  const { state, markAsSeen } = useOnboarding();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!state[tipKey] && state.hasSeenWelcome) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [state, tipKey, delay]);

  const handleDismiss = () => {
    markAsSeen(tipKey);
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-24 left-4 right-4 z-40 md:left-auto md:right-4 md:max-w-sm"
          data-testid={`floating-tip-${tipKey}`}
        >
          <div className="bg-primary text-primary-foreground rounded-2xl p-4 shadow-2xl">
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3 pr-6">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">{title}</h4>
                <p className="text-sm opacity-90">{description}</p>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="w-full mt-4 py-2 text-sm font-medium bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
            >
              Ho capito!
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
