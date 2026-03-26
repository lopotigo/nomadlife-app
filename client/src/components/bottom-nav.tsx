import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass, BookOpen, Plus, MessageCircle, User2,
  Briefcase, ShoppingBag, BookMarked, Calendar,
  Users, Bookmark, ShieldCheck, X, MoreHorizontal,
  Map, Star
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";

interface BottomNavProps {
  onFabClick: () => void;
  activePage?: "mappa" | "diary" | "chat";
}

export function BottomNav({ onFabClick, activePage }: BottomNavProps) {
  const { user } = useAuth();
  const [location] = useLocation();
  const [showMore, setShowMore] = useState(false);

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

  return (
    <>
      {/* More overlay backdrop */}
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
                <span className="font-bold text-sm">Menu</span>
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
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                        data-testid={`bottomnav-more-${item.href.replace("/", "").replace("/", "-")}`}
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

        <button
          onClick={onFabClick}
          className="flex flex-col items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/80 text-white shadow-xl -mt-5 border-4 border-background"
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
          onClick={() => setShowMore(v => !v)}
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
