import { Link, useLocation } from "wouter";
import { Home, Map, Briefcase, User, MessageSquare } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 font-sans">
      <main className="md:pl-64 min-h-screen">
        <div className="max-w-2xl mx-auto min-h-screen border-x border-border/40 bg-card shadow-sm">
          {children}
        </div>
      </main>

      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-64 border-r border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-10 px-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-display font-bold text-xl">
            N
          </div>
          <span className="font-display font-bold text-xl tracking-tight">NomadLife</span>
        </div>
        
        <nav className="flex flex-col gap-2">
          <NavItem href="/" icon={Home} label="Feed" active={location === "/"} />
          <NavItem href="/explore" icon={Map} label="Explore" active={location === "/explore"} />
          <NavItem href="/chat" icon={MessageSquare} label="Messages" active={location === "/chat"} />
          <NavItem href="/coworking" icon={Briefcase} label="Coworking" active={location === "/coworking"} />
          <NavItem href="/profile" icon={User} label="Profile" active={location === "/profile"} />
        </nav>

        <div className="mt-auto p-4 bg-secondary/50 rounded-xl">
          <p className="text-xs font-medium text-secondary-foreground mb-1">Nomad Premium</p>
          <p className="text-xs text-muted-foreground mb-3">Unlock global perks & insurance.</p>
          <Link href="/subscription">
            <button className="w-full py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer">
              Upgrade
            </button>
          </Link>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-card/80 backdrop-blur-lg border-t border-border flex justify-around items-center h-16 px-2 z-50">
        <MobileNavItem href="/" icon={Home} label="Feed" active={location === "/"} />
        <MobileNavItem href="/explore" icon={Map} label="Explore" active={location === "/explore"} />
        <MobileNavItem href="/chat" icon={MessageSquare} label="Chat" active={location === "/chat"} />
        <MobileNavItem href="/coworking" icon={Briefcase} label="Book" active={location === "/coworking"} />
        <MobileNavItem href="/profile" icon={User} label="Profile" active={location === "/profile"} />
      </nav>
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
