import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Map, Briefcase, User, MessageSquare, Plane, Search,
  Calendar, ShoppingBag, MoreHorizontal, ShieldCheck,
  Bookmark, Users, BookOpen, Compass, Star, X, Sparkles
} from "lucide-react";
import { NotificationsDropdown } from "./notifications-dropdown";
import { useI18n } from "@/lib/i18n";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useGpsTracking } from "@/hooks/use-gps-tracking";

interface LayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
}

export default function Layout({ children, fullWidth = false }: LayoutProps) {
  const [location] = useLocation();
  const { t } = useI18n();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  useGpsTracking();

  const { data: adminCheck } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/check"],
  });

  const isDiary = location === "/diary";

  return (
    <div className="h-screen bg-background pb-20 md:pb-0 font-sans overflow-hidden">
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 inset-x-0 bg-card/95 backdrop-blur-lg border-b border-border flex justify-between items-center h-14 px-4 z-50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-display font-bold text-lg">
            N
          </div>
          <span className="font-display font-bold text-lg tracking-tight">NomadLife</span>
        </div>
        <NotificationsDropdown />
      </header>

      <main className="md:pl-64 h-full overflow-y-auto pt-14 md:pt-0">
        <div className={fullWidth
          ? "h-full bg-card overflow-hidden"
          : "max-w-2xl mx-auto min-h-full border-x border-border/40 bg-card shadow-sm"
        }>
          {children}
        </div>
      </main>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-64 border-r border-border bg-card p-6">
        <div className="flex items-center justify-between mb-8 px-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-display font-bold text-xl">
              N
            </div>
            <span className="font-display font-bold text-xl tracking-tight">NomadLife</span>
          </div>
          <NotificationsDropdown />
        </div>

        <nav className="flex flex-col gap-0.5 overflow-y-auto flex-1 min-h-0 pr-1">
          {/* Primary navigation */}
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 mb-2">Esplora</p>
          <NavItem href="/" icon={Map} label="Mappa Comune" active={location === "/"} />
          <NavItem href="/diary" icon={Compass} label="Il mio Diary" active={location === "/diary"} highlight />

          <div className="my-3 border-t border-border/50" />

          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 mb-2">Community</p>
          <NavItem href="/chat" icon={MessageSquare} label={t("nav.messages")} active={location === "/chat"} />
          <NavItem href="/search" icon={Search} label={t("nav.search")} active={location === "/search"} />

          <div className="my-3 border-t border-border/50" />

          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 mb-2">Servizi</p>
          <NavItem href="/booking" icon={Briefcase} label={t("nav.booking")} active={location === "/booking"} />
          <NavItem href="/marketplace" icon={ShoppingBag} label={t("nav.marketplace")} active={location === "/marketplace"} />
          <NavItem href="/blog" icon={BookOpen} label="Blog" active={location === "/blog" || location.startsWith("/blog/")} />

          {adminCheck?.isAdmin && (
            <>
              <div className="my-3 border-t border-border/50" />
              <NavItem href="/admin" icon={ShieldCheck} label="Admin" active={location === "/admin"} />
            </>
          )}
        </nav>

        {/* Premium upsell */}
        <div className="flex-shrink-0 mt-4 p-4 bg-gradient-to-br from-primary/10 to-violet-500/10 border border-primary/20 rounded-2xl">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-3.5 h-3.5 text-primary" />
            <p className="text-xs font-semibold text-foreground">{t("premium.title")}</p>
          </div>
          <p className="text-xs text-muted-foreground mb-3">{t("premium.subtitle")}</p>
          <Link href="/subscription">
            <button className="w-full py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors cursor-pointer">
              {t("premium.upgrade")}
            </button>
          </Link>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-card/95 backdrop-blur-lg border-t border-border flex justify-around items-center h-16 px-2 z-50">
        <MobileNavItem href="/" icon={Map} label="Mappa" active={location === "/"} />
        <MobileNavItem href="/diary" icon={Compass} label="Diary" active={location === "/diary"} highlight />
        <MobileNavItem href="/chat" icon={MessageSquare} label="Chat" active={location === "/chat"} />
        <MobileNavItem href="/search" icon={Search} label="Cerca" active={location === "/search"} />
        <button
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          className={`flex flex-col items-center justify-center gap-0.5 min-w-[52px] py-1.5 rounded-xl transition-colors ${showMoreMenu ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
          data-testid="nav-more-button"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] font-medium">Altro</span>
        </button>
      </nav>

      {/* More Menu Overlay */}
      <AnimatePresence>
        {showMoreMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/40 z-40"
              onClick={() => setShowMoreMenu(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 80 }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              className="md:hidden fixed bottom-16 inset-x-0 bg-card border-t border-border rounded-t-3xl p-5 z-50 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold text-sm">Altro</span>
                <button
                  onClick={() => setShowMoreMenu(false)}
                  className="p-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                  data-testid="nav-more-close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { href: "/booking", icon: Briefcase, label: t("nav.booking") },
                  { href: "/marketplace", icon: ShoppingBag, label: "Market" },
                  { href: "/blog", icon: BookOpen, label: "Blog" },
                  { href: "/events-calendar", icon: Calendar, label: "Eventi" },
                  { href: "/travel-diary", icon: Plane, label: "Viaggi" },
                  { href: "/matchmaking", icon: Users, label: "Match" },
                  { href: "/saved", icon: Bookmark, label: "Salvati" },
                  { href: "/profile", icon: User, label: "Profilo" },
                  ...(adminCheck?.isAdmin ? [{ href: "/admin", icon: ShieldCheck, label: "Admin" }] : []),
                ].map(item => {
                  const Icon = item.icon;
                  const isActive = location === item.href || (item.href === "/blog" && location.startsWith("/blog/"));
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setShowMoreMenu(false)}>
                      <div className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-colors ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`} data-testid={`nav-more-${item.href.replace("/", "")}`}>
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
    </div>
  );
}

function NavItem({ href, icon: Icon, label, active, highlight }: { href: string; icon: any; label: string; active: boolean; highlight?: boolean }) {
  return (
    <Link href={href} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${
      active
        ? highlight
          ? "bg-gradient-to-r from-primary/15 to-violet-500/15 text-primary font-semibold border border-primary/20"
          : "bg-primary/10 text-primary font-medium"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`}>
      <Icon className={`w-5 h-5 flex-shrink-0 ${active ? "stroke-[2.5px]" : "stroke-2"}`} />
      <span className="text-sm">{label}</span>
      {highlight && !active && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary/60" />
      )}
    </Link>
  );
}

function MobileNavItem({ href, icon: Icon, label, active, highlight }: { href: string; icon: any; label: string; active: boolean; highlight?: boolean }) {
  return (
    <Link href={href} className={`flex flex-col items-center justify-center gap-0.5 min-w-[52px] py-1.5 rounded-xl transition-colors ${
      active ? "text-primary" : "text-muted-foreground"
    }`}>
      <div className={`p-1.5 rounded-full transition-all ${
        active
          ? highlight
            ? "bg-gradient-to-br from-primary/20 to-violet-500/20"
            : "bg-primary/10"
          : ""
      }`}>
        <Icon className={`w-5 h-5 ${active ? "stroke-[2.5px]" : "stroke-2"}`} />
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}
