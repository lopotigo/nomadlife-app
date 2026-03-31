import { Link, useLocation } from "wouter";
import { NotificationsDropdown } from "./notifications-dropdown";
import { useGpsTracking } from "@/hooks/use-gps-tracking";
import { BottomNav } from "./bottom-nav";

interface LayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
  activePage?: "mappa" | "diary" | "chat";
  onCreatePost?: () => void;
  onCreateMoment?: () => void;
  onCreateEvent?: () => void;
  onCreateTrip?: () => void;
}

export default function Layout({
  children,
  fullWidth = false,
  activePage,
  onCreatePost,
  onCreateMoment,
  onCreateEvent,
  onCreateTrip,
}: LayoutProps) {
  useGpsTracking();

  return (
    <div className="flex flex-col h-screen bg-background font-sans overflow-hidden">
      {/* Top header */}
      <header className="fixed top-0 inset-x-0 bg-card/95 backdrop-blur-lg border-b border-border flex justify-between items-center h-14 px-4 z-50 flex-shrink-0">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-display font-bold text-lg">
              N
            </div>
            <span className="font-display font-bold text-lg tracking-tight">NomadLife</span>
          </div>
        </Link>
        <NotificationsDropdown />
      </header>

      {/* Scrollable content — between header and bottom nav */}
      <main className="flex-1 overflow-y-auto pt-14 pb-[72px]">
        <div className={fullWidth
          ? "min-h-full bg-card"
          : "max-w-2xl mx-auto min-h-full border-x border-border/40 bg-card shadow-sm"
        }>
          {children}
        </div>
      </main>

      {/* Unified bottom navigation */}
      <div className="relative h-[72px] flex-shrink-0">
        <BottomNav
          activePage={activePage}
          onCreatePost={onCreatePost}
          onCreateMoment={onCreateMoment}
          onCreateEvent={onCreateEvent}
          onCreateTrip={onCreateTrip}
        />
      </div>
    </div>
  );
}
