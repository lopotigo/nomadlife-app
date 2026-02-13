import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Map, Briefcase, User, MessageSquare, Plane, Search, Calendar, ShoppingBag, MoreHorizontal, ShieldCheck } from "lucide-react";
import { NotificationsDropdown } from "./notifications-dropdown";
import { useI18n } from "@/lib/i18n";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

interface LayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
}

export default function Layout({ children, fullWidth = false }: LayoutProps) {
  const [location] = useLocation();
  const { t } = useI18n();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  
  const { data: adminCheck } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/check"],
  });

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

      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-64 border-r border-border bg-card p-6">
        <div className="flex items-center justify-between mb-10 px-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-display font-bold text-xl">
              N
            </div>
            <span className="font-display font-bold text-xl tracking-tight">NomadLife</span>
          </div>
          <NotificationsDropdown />
        </div>
        
        <nav className="flex flex-col gap-2">
          <NavItem href="/" icon={Map} label={t("nav.map")} active={location === "/"} />
          <NavItem href="/search" icon={Search} label={t("nav.search")} active={location === "/search"} />
          <NavItem href="/travel-diary" icon={Plane} label={t("nav.travel_diary")} active={location === "/travel-diary"} />
          <NavItem href="/events-calendar" icon={Calendar} label={t("nav.events_calendar")} active={location === "/events-calendar"} />
          <NavItem href="/chat" icon={MessageSquare} label={t("nav.messages")} active={location === "/chat"} />
          <NavItem href="/booking" icon={Briefcase} label={t("nav.booking")} active={location === "/booking"} />
          <NavItem href="/marketplace" icon={ShoppingBag} label={t("nav.marketplace")} active={location === "/marketplace"} />
          <NavItem href="/profile" icon={User} label={t("nav.profile")} active={location === "/profile"} />
          {adminCheck?.isAdmin && (
            <NavItem href="/admin" icon={ShieldCheck} label="Admin" active={location === "/admin"} />
          )}
        </nav>

        <div className="mt-auto p-4 bg-secondary/50 rounded-xl">
          <p className="text-xs font-medium text-secondary-foreground mb-1">{t("premium.title")}</p>
          <p className="text-xs text-muted-foreground mb-3">{t("premium.subtitle")}</p>
          <Link href="/subscription">
            <button className="w-full py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer">
              {t("premium.upgrade")}
            </button>
          </Link>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-card/80 backdrop-blur-lg border-t border-border flex justify-around items-center h-16 px-1 z-50">
        <MobileNavItem href="/" icon={Map} label={t("nav.map")} active={location === "/"} />
        <MobileNavItem href="/travel-diary" icon={Plane} label={t("nav.trips")} active={location === "/travel-diary"} />
        <MobileNavItem href="/booking" icon={Briefcase} label={t("nav.booking")} active={location === "/booking"} />
        <MobileNavItem href="/chat" icon={MessageSquare} label={t("nav.chat")} active={location === "/chat"} />
        <button 
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          className={`flex flex-col items-center justify-center gap-0.5 min-w-[50px] py-2 ${showMoreMenu ? "text-primary" : "text-muted-foreground"}`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px]">{t("nav.more")}</span>
        </button>
      </nav>

      {/* More Menu Overlay */}
      <AnimatePresence>
        {showMoreMenu && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="md:hidden fixed bottom-16 inset-x-0 bg-card border-t border-border p-4 z-40"
          >
            <div className={`grid ${adminCheck?.isAdmin ? "grid-cols-5" : "grid-cols-4"} gap-4`}>
              <Link href="/search" onClick={() => setShowMoreMenu(false)}>
                <div className={`flex flex-col items-center gap-1 p-2 rounded-xl ${location === "/search" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                  <Search className="w-6 h-6" />
                  <span className="text-xs">{t("nav.search")}</span>
                </div>
              </Link>
              <Link href="/events-calendar" onClick={() => setShowMoreMenu(false)}>
                <div className={`flex flex-col items-center gap-1 p-2 rounded-xl ${location === "/events-calendar" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                  <Calendar className="w-6 h-6" />
                  <span className="text-xs">{t("nav.events_calendar")}</span>
                </div>
              </Link>
              <Link href="/marketplace" onClick={() => setShowMoreMenu(false)}>
                <div className={`flex flex-col items-center gap-1 p-2 rounded-xl ${location === "/marketplace" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                  <ShoppingBag className="w-6 h-6" />
                  <span className="text-xs">{t("nav.marketplace")}</span>
                </div>
              </Link>
              <Link href="/profile" onClick={() => setShowMoreMenu(false)}>
                <div className={`flex flex-col items-center gap-1 p-2 rounded-xl ${location === "/profile" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                  <User className="w-6 h-6" />
                  <span className="text-xs">{t("nav.profile")}</span>
                </div>
              </Link>
              {adminCheck?.isAdmin && (
                <Link href="/admin" onClick={() => setShowMoreMenu(false)}>
                  <div className={`flex flex-col items-center gap-1 p-2 rounded-xl ${location === "/admin" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                    <ShieldCheck className="w-6 h-6" />
                    <span className="text-xs">Admin</span>
                  </div>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ href, icon: Icon, label, active }: any) {
  return (
    <Link href={href} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
      active 
        ? "bg-primary/10 text-primary font-medium" 
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`}>
      <Icon className={`w-5 h-5 ${active ? "stroke-[2.5px]" : "stroke-2"}`} />
      <span>{label}</span>
    </Link>
  );
}

function MobileNavItem({ href, icon: Icon, label, active }: any) {
  return (
    <Link href={href} className={`flex flex-col items-center justify-center w-full h-full gap-1 ${
      active ? "text-primary" : "text-muted-foreground"
    }`}>
      <div className={`p-1.5 rounded-full transition-all ${active ? "bg-primary/10" : ""}`}>
        <Icon className={`w-5 h-5 ${active ? "stroke-[2.5px]" : "stroke-2"}`} />
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}
