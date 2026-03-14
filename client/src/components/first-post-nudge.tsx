import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Sparkles, X, PenSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/lib/onboarding";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";

interface FirstPostNudgeProps {
  onCreatePost: () => void;
}

export function FirstPostNudge({ onCreatePost }: FirstPostNudgeProps) {
  const { user } = useAuth();
  const { state, markAsSeen } = useOnboarding();
  const [visible, setVisible] = useState(false);

  const { data: userPosts } = useQuery({
    queryKey: ["/api/posts/user", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/posts/user/${user?.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.id && state.hasSeenWelcome && !state.hasSeenFirstPostNudge,
  });

  useEffect(() => {
    if (
      user &&
      state.hasSeenWelcome &&
      !state.hasSeenFirstPostNudge &&
      userPosts &&
      userPosts.length === 0
    ) {
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [user, state.hasSeenWelcome, state.hasSeenFirstPostNudge, userPosts]);

  const handleDismiss = () => {
    setVisible(false);
    markAsSeen("hasSeenFirstPostNudge");
  };

  const handleCreatePost = () => {
    setVisible(false);
    markAsSeen("hasSeenFirstPostNudge");
    onCreatePost();
  };

  if (!visible) return null;

  const cityName = user?.location?.split(",")[0]?.trim() || "your city";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed bottom-24 left-4 right-4 z-[60] mx-auto max-w-sm"
          data-testid="first-post-nudge"
        >
          <div className="relative bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-2 left-6 text-white text-6xl">🌍</div>
              <div className="absolute bottom-2 right-6 text-white text-4xl">✈️</div>
            </div>

            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
              data-testid="button-dismiss-nudge"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-yellow-300" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg leading-tight">
                    Hey {user?.name?.split(" ")[0] || user?.username}! 👋
                  </h3>
                  <p className="text-white/85 text-sm mt-1">
                    Where are you working from today? Share your first post from <span className="font-semibold text-yellow-200">{cityName}</span> and let the community know you're here!
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleCreatePost}
                  className="flex-1 bg-white text-violet-700 hover:bg-white/90 font-semibold shadow-lg"
                  data-testid="button-create-first-post"
                >
                  <PenSquare className="w-4 h-4 mr-2" />
                  Share now
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleDismiss}
                  className="text-white/70 hover:text-white hover:bg-white/10"
                  data-testid="button-later-nudge"
                >
                  Later
                </Button>
              </div>

              <div className="flex items-center gap-1.5 mt-3 justify-center">
                <MapPin className="w-3 h-3 text-white/50" />
                <span className="text-white/50 text-xs">Tap anywhere on the map to post from a specific spot</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
