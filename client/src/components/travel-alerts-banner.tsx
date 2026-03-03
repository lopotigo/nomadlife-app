import { useState, useEffect } from "react";
import { AlertTriangle, X, Shield, ChevronRight, ExternalLink } from "lucide-react";
import type { TravelAlert } from "@shared/schema";

export function TravelAlertsBanner() {
  const [alerts, setAlerts] = useState<TravelAlert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/travel-alerts/my", { credentials: "include" })
      .then(res => res.ok ? res.json() : [])
      .then(data => setAlerts(data))
      .catch(() => {});
  }, []);

  const visibleAlerts = alerts.filter(a => !dismissed.has(a.id));

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="space-y-2 mb-4" data-testid="travel-alerts-banner">
      {visibleAlerts.slice(0, 3).map(alert => (
        <div
          key={alert.id}
          className={`relative rounded-xl border p-3 flex items-start gap-3 ${
            alert.severity === "critical"
              ? "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800"
              : alert.severity === "warning"
              ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800"
              : "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800"
          }`}
          data-testid={`travel-alert-${alert.id}`}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            alert.severity === "critical"
              ? "bg-red-100 dark:bg-red-900/50"
              : alert.severity === "warning"
              ? "bg-amber-100 dark:bg-amber-900/50"
              : "bg-blue-100 dark:bg-blue-900/50"
          }`}>
            {alert.severity === "critical" || alert.severity === "warning" ? (
              <AlertTriangle className={`w-4 h-4 ${
                alert.severity === "critical" ? "text-red-600" : "text-amber-600"
              }`} />
            ) : (
              <Shield className="w-4 h-4 text-blue-600" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                alert.severity === "critical"
                  ? "bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200"
                  : alert.severity === "warning"
                  ? "bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200"
                  : "bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200"
              }`}>
                {alert.severity}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {alert.type === "visa" ? "Visa" : alert.type === "safety" ? "Safety" : alert.type === "natural_disaster" ? "Disaster" : "Alert"}
              </span>
            </div>
            <h4 className="text-sm font-semibold leading-snug" data-testid={`alert-title-${alert.id}`}>
              {alert.title}
            </h4>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {alert.summary}
            </p>
            {alert.sourceUrl && (
              <a
                href={alert.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary mt-1 hover:underline"
                onClick={e => e.stopPropagation()}
                data-testid={`alert-source-${alert.id}`}
              >
                {alert.source || "Source"} <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <button
            onClick={() => setDismissed(prev => new Set(prev).add(alert.id))}
            className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 flex-shrink-0"
            data-testid={`dismiss-alert-${alert.id}`}
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      ))}
    </div>
  );
}
