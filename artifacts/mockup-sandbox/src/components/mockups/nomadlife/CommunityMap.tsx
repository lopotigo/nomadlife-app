import { useState } from "react";
import { Heart, Calendar, Sparkles, MessageCircle, Plane, Users, Compass, MapPin, SlidersHorizontal, X, Wifi, Coffee, Star, Navigation, Plus } from "lucide-react";

const FILTERS = [
  { key: "posts", label: "Post", icon: Heart, bg: "#ef4444" },
  { key: "events", label: "Eventi", icon: Calendar, bg: "#8b5cf6" },
  { key: "moments", label: "Momenti", icon: Sparkles, bg: "#f97316" },
  { key: "groups", label: "Gruppi", icon: MessageCircle, bg: "#06b6d4" },
  { key: "trips", label: "Viaggi", icon: Plane, bg: "#f59e0b" },
  { key: "following", label: "Seguiti", icon: Users, bg: "#3b82f6" },
  { key: "guides", label: "Guide", icon: Compass, bg: "#7c3aed" },
  { key: "spots", label: "Spot", icon: MapPin, bg: "#10b981" },
];

const MARKERS = [
  { id: 1, x: "30%", y: "42%", type: "posts", label: "Marco R.", sub: "Berlino", color: "#ef4444", Icon: Heart },
  { id: 2, x: "52%", y: "28%", type: "events", label: "Nomad Meetup", sub: "Amsterdam", color: "#8b5cf6", Icon: Calendar },
  { id: 3, x: "22%", y: "60%", type: "spots", label: "Betahaus", sub: "Barcellona", color: "#10b981", Icon: MapPin },
  { id: 4, x: "64%", y: "52%", type: "trips", label: "Sofia M.", sub: "Vienna→Praha", color: "#f59e0b", Icon: Plane },
  { id: 5, x: "44%", y: "70%", type: "moments", label: "Luca T.", sub: "Roma", color: "#f97316", Icon: Sparkles },
];

export function CommunityMap() {
  const [active, setActive] = useState<Record<string, boolean>>({
    posts: true, events: true, moments: false, groups: false,
    trips: true, following: true, guides: false, spots: true,
  });
  const [popup, setPopup] = useState<number | null>(3);

  const toggle = (k: string) => setActive(f => ({ ...f, [k]: !f[k] }));

  return (
    <div style={{ width: "100%", height: "100vh", background: "#09090b", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "system-ui, sans-serif", color: "white" }}>
      {/* Header */}
      <div style={{ padding: "16px 16px 8px", zIndex: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 20 }}>Mappa Comune</div>
            <div style={{ color: "#71717a", fontSize: 12 }}>247 nomadi attivi ora</div>
          </div>
        </div>
        {/* Pill bar */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {FILTERS.map(f => {
            const isOn = active[f.key];
            const Icon = f.icon;
            return (
              <button
                key={f.key}
                onClick={() => toggle(f.key)}
                style={{
                  flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 500,
                  border: "none", cursor: "pointer", transition: "all 0.15s",
                  background: isOn ? f.bg : "#27272a",
                  color: isOn ? "white" : "#a1a1aa",
                  outline: isOn ? `2px solid ${f.bg}40` : "none",
                }}
              >
                <Icon size={12} />
                {f.label}
              </button>
            );
          })}
          <button style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 500, border: "1px solid #3f3f46", cursor: "pointer", background: "#27272a", color: "#a1a1aa" }}>
            <SlidersHorizontal size={12} />
            Avanzato
          </button>
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: "relative", background: "#18181b" }}>
        {/* Grid */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.08 }}>
          <defs><pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0L0 0 0 40" fill="none" stroke="#6366f1" strokeWidth="0.5"/></pattern></defs>
          <rect width="100%" height="100%" fill="url(#g)" />
        </svg>
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.15 }}>
          <line x1="0" y1="42%" x2="100%" y2="38%" stroke="#4f46e5" strokeWidth="2"/>
          <line x1="30%" y1="0" x2="32%" y2="100%" stroke="#4f46e5" strokeWidth="1.5"/>
          <line x1="62%" y1="0" x2="60%" y2="100%" stroke="#4f46e5" strokeWidth="2"/>
        </svg>

        {/* Markers */}
        {MARKERS.filter(m => active[m.type]).map(m => (
          <div key={m.id} style={{ position: "absolute", left: m.x, top: m.y, transform: "translate(-50%, -50%)", zIndex: 10 }}>
            <button
              onClick={() => setPopup(popup === m.id ? null : m.id)}
              style={{ width: 40, height: 40, borderRadius: "50%", background: m.color, border: "2px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: `0 4px 12px ${m.color}60` }}
            >
              <m.Icon size={16} color="white" />
            </button>
          </div>
        ))}

        {/* Popup */}
        {popup !== null && (() => {
          const m = MARKERS.find(x => x.id === popup);
          if (!m || !active[m.type]) return null;
          return (
            <div style={{ position: "absolute", left: "8px", top: "8px", zIndex: 30, background: "#1c1c1e", border: "1px solid #3f3f46", borderRadius: 16, padding: 12, width: 220, boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
              <button onClick={() => setPopup(null)} style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", cursor: "pointer" }}><X size={14} color="#71717a" /></button>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: m.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <m.Icon size={14} color="white" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{m.label}</div>
                  <div style={{ color: "#71717a", fontSize: 12 }}>{m.sub}</div>
                </div>
              </div>
              {m.type === "spots" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#a1a1aa" }}>
                    <Wifi size={12} color="#10b981" /> WiFi 120 Mbps
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#a1a1aa" }}>
                    <Coffee size={12} color="#f59e0b" /> Caffè incluso
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                    {[1,2,3,4,5].map(s => <Star key={s} size={12} color={s <= 4 ? "#f59e0b" : "#3f3f46"} fill={s <= 4 ? "#f59e0b" : "none"} />)}
                    <span style={{ fontSize: 11, color: "#71717a", marginLeft: 4 }}>4.2</span>
                  </div>
                </div>
              )}
              {m.type === "events" && (
                <div>
                  <div style={{ fontSize: 12, color: "#a1a1aa" }}>Venerdì 28 mar · 19:00</div>
                  <div style={{ fontSize: 12, color: "#e4e4e7", marginTop: 2 }}>23 partecipanti</div>
                  <button style={{ marginTop: 8, width: "100%", background: "#8b5cf6", color: "white", border: "none", borderRadius: 8, padding: "6px 0", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Partecipa</button>
                </div>
              )}
              {m.type === "posts" && (
                <div style={{ fontSize: 12, color: "#d4d4d8", fontStyle: "italic" }}>"Berlino in inverno è sottovalutata — coworking vuoti, prezzi bassi 🔥"</div>
              )}
            </div>
          );
        })()}

        {/* Bottom bar */}
        <div style={{ position: "absolute", bottom: 16, left: 16, right: 56, background: "rgba(24,24,27,0.92)", border: "1px solid #27272a", borderRadius: 16, padding: "8px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {FILTERS.filter(f => active[f.key]).slice(0,4).map(f => (
              <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: f.bg }} />
                <span style={{ fontSize: 11, color: "#a1a1aa" }}>{f.label}</span>
              </div>
            ))}
          </div>
          <span style={{ fontSize: 11, color: "#52525b" }}>{MARKERS.filter(m => active[m.type]).length} marker</span>
        </div>
        {/* Controls */}
        <div style={{ position: "absolute", bottom: 16, right: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          <button style={{ width: 36, height: 36, background: "#27272a", border: "1px solid #3f3f46", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Navigation size={16} color="#d4d4d8" /></button>
          <button style={{ width: 36, height: 36, background: "#27272a", border: "1px solid #3f3f46", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Plus size={16} color="#d4d4d8" /></button>
        </div>
      </div>
    </div>
  );
}
