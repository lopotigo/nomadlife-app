import { Link } from "wouter";
import { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";

interface FeatureDiscoveryCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  color?: string;
}

export function FeatureDiscoveryCard({ icon: Icon, title, description, href, color = "from-primary/10 to-primary/5" }: FeatureDiscoveryCardProps) {
  return (
    <Link href={href}>
      <div
        className={`group flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r ${color} border border-border/50 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer`}
        data-testid={`discovery-card-${href.replace(/\//g, '-').slice(1)}`}
      >
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
      </div>
    </Link>
  );
}

interface FeatureDiscoveryRowProps {
  cards: FeatureDiscoveryCardProps[];
}

export function FeatureDiscoveryRow({ cards }: FeatureDiscoveryRowProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 mb-4 px-1" data-testid="feature-discovery-row">
      {cards.map((card, i) => (
        <FeatureDiscoveryCard key={i} {...card} />
      ))}
    </div>
  );
}
