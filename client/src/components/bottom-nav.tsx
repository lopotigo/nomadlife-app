import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass, BookOpen, Plus, MessageCircle,
  Briefcase, ShoppingBag, BookMarked, Calendar,
  Users, Bookmark, ShieldCheck, X, MoreHorizontal,
  Star, User2, PenLine, Camera, Plane, MapPin
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";

export interface BottomNavActions {
  onCreatePost?: () => void;
  onCreateMoment?: () => void;
  onCreateEvent?: () => void;
  onCreateTrip?: () => void;
  onCheckIn?: () => void;
}

interface BottomNavProps extends BottomNavActions {
  activePage?: "mappa" | "diary" | "chat";
}

const FAB_ACTIONS = [
  {
    key: "checkin",
    label: "Sono qui",
    sublabel: "Aggiungi questa tappa al viaggio",
    icon: MapPin,
    color: "bg-emerald-500",
    shadow: "shadow-emerald-500/30",
  },
  {
    key: "post",
    label: "Scrivi post",
    sublabel: "Condividi un pensiero o luogo",
    icon: PenLine,
    color: "bg-blue-500",
    shadow: "shadow-blue-500/30",
  },
  {
    key: "moment",
    label: "Crea Momento",
    sublabel: "Storia di 24 ore sulla mappa",
    icon: Camera,
    color: "bg-orange-500",
    shadow: "shadow-orange-500/30",
  },
  {
    key: "event",
    label: "Aggiungi evento",
    sublabel: "Meetup, workshop, nomad event",
    icon: Calendar,
    color: "bg-violet-500",
    shadow: "shadow-violet-500/30",
  },
  {
    key: "trip",
    label: "Nuovo viaggio",
    sublabel: "Crea un itinerario con tappe",
    icon: Plane,
    color: "bg-sky-500",
    shadow: "shadow-sky-500/30",
  },
] as const;

export function BottomNav({
  activePage,
  onCreatePost,
  onCreateMoment,
  onCreateEvent,
  onCreateTrip,
  onCheckIn,
}: BottomNavProps) {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const [showMore, setShowMore] = useState(false);
  const [showFab, setShowFab] = useState(false);

  const { data: adminCheck } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/check"],
  });

  const current = activePage || (
    location === "/" ? "mappa" :
    location === "/diary" ? "diary" :
    location === "/chat" ? "chat" : undefined
  );

  const moreItems = [
    { href: `/user/${user?.id || ""}`, icon: User2, label: "Profilo" },
    { href: "/booking", icon: Briefcase, label: "Booking" },
    { href: "/marketplace", icon: ShoppingBag, label: "Mercato" },
    { href: "/blog", icon: BookMarked, label: "Blog" },
    { href: "/events-calendar", icon: Calendar, label: "Eventi" },
    { href: "/matchmaking", icon: Users, label: "Match" },
    { href: "/saved", icon: Bookmark, label: "Salvati" },
    { href: "/subscription", icon: Star, label: "Premium" },
    ...(adminCheck?.isAdmin ? [{ href: "/admin", icon: ShieldCheck, label: "Admin" }] : []),
  ];

  const handleFabAction = (key: typeof FAB_ACTIONS[number]["key"]) => {
    setShowFab(false);
    switch (key) {
      case "checkin":
        onCheckIn ? onCheckIn() : navigate("/diary");
        break;
      case "post":
        onCreatePost ? onCreatePost() : navigate("/feed");
        break;
      case "moment":
        onCreateMoment ? onCreateMoment() : navigate("/diary");
        break;
      case "event":
        onCreateEvent ? onCreateEvent() : navigate("/events-calendar");
        break;
      case "trip":
        onCreateTrip ? onCreateTrip() : navigate("/diary");
        break;
    }
  };

  return (
    <>
      {/* FAB menu */}
      <AnimatePresence>
        {showFab && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[1090]"
              onClick={() => setShowFab(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="fixed bottom-[80px] inset-x-0 mx-4 bg-card rounded-3xl shadow-2xl border border-border/60 overflow-hidden z-[1095]"
            >
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <span className="font-bold text-sm text-foreground">Crea</span>
                <button
                  onClick={() => setShowFab(false)}
                  className="p-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                  data-testid="fab-close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-3 space-y-1.5 pb-4">
                {FAB_ACTIONS.map((action, i) => {
                  const Icon = action.icon;
                  return (
                    <motion.button
                      key={action.key}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => handleFabAction(action.key)}
                      className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-muted/60 active:scale-[0.98] transition-all text-left"
                      data-testid={`fab-action-${action.key}`}
                    >
                      <div className={`w-10 h-10 rounded-2xl ${action.color} ${action.shadow} shadow-lg flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground">{action.label}</p>
                        <p className="text-[11px] text-muted-foreground">{action.sublabel}</p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* More overlay */}
      <AnimatePresence>
        {showMore && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[1090]"
              onClick={() => setShowMore(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 80 }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              className="fixed bottom-[72px] inset-x-0 bg-card border-t border-border rounded-t-3xl p-5 z-[1095] shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold text-sm">Altro</span>
                <button
                  onClick={() => setShowMore(false)}
                  className="p-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                  data-testid="bottomnav-more-close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {moreItems.map(item => {
                  const Icon = item.icon;
                  const isActive = location === item.href || location.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setShowMore(false)}
                    >
                      <div
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-colors cursor-pointer ${
                          isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                        }`}
                        data-testid={`bottomnav-more-${item.label.toLowerCase()}`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-[10px] font-medium text-center leading-tight">{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 z-[1100] h-[72px] bg-card/95 backdrop-blur-md border-t border-border/50 flex items-center justify-around px-2">
        <Link
          href="/"
          className={`flex flex-col items-center gap-0.5 px-3 py-2 transition-colors ${current === "mappa" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          data-testid="nav-mappa"
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px] font-medium">Mappa</span>
        </Link>

        <Link
          href="/diary"
          className={`flex flex-col items-center gap-0.5 px-3 py-2 transition-colors ${current === "diary" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          data-testid="nav-diary"
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] font-medium">Diario</span>
        </Link>

        {/* Central FAB */}
        <button
          onClick={() => { setShowMore(false); setShowFab(v => !v); }}
          className={`flex flex-col items-center justify-center w-14 h-14 rounded-full text-white shadow-xl -mt-5 border-4 border-background transition-all ${
            showFab
              ? "bg-destructive rotate-45"
              : "bg-gradient-to-br from-primary to-primary/80"
          }`}
          data-testid="nav-create"
        >
          <Plus className="w-6 h-6" />
        </button>

        <Link
          href="/chat"
          className={`flex flex-col items-center gap-0.5 px-3 py-2 transition-colors ${current === "chat" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          data-testid="nav-chat"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-[10px] font-medium">Chat</span>
        </Link>

        <button
          onClick={() => { setShowFab(false); setShowMore(v => !v); }}
          className={`flex flex-col items-center gap-0.5 px-3 py-2 transition-colors ${showMore ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          data-testid="nav-altro"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] font-medium">Altro</span>
        </button>
      </div>
    </>
  );
}
