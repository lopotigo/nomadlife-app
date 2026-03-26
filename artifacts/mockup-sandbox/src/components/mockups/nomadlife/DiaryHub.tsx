import { useState } from "react";
import { MapPin, Plus, Plane, Mountain, Camera, CalendarDays, Clock, Thermometer, Wind, Building2, Train, Car, Bike, X, ArrowRight, Wifi } from "lucide-react";

const TRIPS = [
  {
    id: 1, name: "Giro d'Europa", color: "#6366f1",
    stops: [
      { id: 1, city: "Berlino", emoji: "🇩🇪", arrival: "12 Mar", transport: "plane", active: false, x: "28%", y: "36%" },
      { id: 2, city: "Praga", emoji: "🇨🇿", arrival: "19 Mar", transport: "train", active: true, x: "46%", y: "43%" },
      { id: 3, city: "Vienna", emoji: "🇦🇹", arrival: "28 Mar", transport: "train", active: false, x: "62%", y: "50%" },
    ]
  },
  {
    id: 2, name: "Asia 2025", color: "#f59e0b",
    stops: [
      { id: 4, city: "Chiang Mai", emoji: "🇹🇭", arrival: "Giu 5", transport: "plane", active: false, x: "35%", y: "55%" },
      { id: 5, city: "Bali", emoji: "🇮🇩", arrival: "Giu 20", transport: "plane", active: false, x: "55%", y: "65%" },
    ]
  }
];

const PANEL_HEIGHTS = ["14%", "52%", "90%"] as const;
const FAB_OPTIONS = [
  { label: "Viaggio", Icon: Plane, color: "#6366f1" },
  { label: "Tappa", Icon: Mountain, color: "#10b981" },
  { label: "Post", Icon: Camera, color: "#f59e0b" },
  { label: "Evento", Icon: CalendarDays, color: "#f43f5e" },
];

export function DiaryHub() {
  const [panelIdx, setPanelIdx] = useState(1);
  const [tripIdx, setTripIdx] = useState(0);
  const [selectedStop, setSelectedStop] = useState<number | null>(2);
  const [fabOpen, setFabOpen] = useState(false);

  const trip = TRIPS[tripIdx];
  const panelH = PANEL_HEIGHTS[panelIdx];
  const activeStop = trip.stops.find(s => s.id === selectedStop);

  const s = {
    root: { width: "100%", height: "100vh", background: "#09090b", position: "relative" as const, overflow: "hidden", fontFamily: "system-ui, sans-serif", color: "white" },
    map: { position: "absolute" as const, inset: 0, background: "#18181b" },
    header: { position: "absolute" as const, top: 0, left: 0, right: 0, zIndex: 30, padding: "16px 16px 0" },
    panel: { position: "absolute" as const, left: 0, right: 0, bottom: 0, zIndex: 20, background: "#09090b", borderTop: "1px solid #27272a", borderRadius: "20px 20px 0 0", transition: "height 0.3s ease", display: "flex", flexDirection: "column" as const },
  };

  return (
    <div style={s.root}>
      {/* Map */}
      <div style={s.map}>
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.08 }}>
          <defs><pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0L0 0 0 40" fill="none" stroke="#6366f1" strokeWidth="0.5"/></pattern></defs>
          <rect width="100%" height="100%" fill="url(#g)" />
        </svg>
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.15 }}>
          <line x1="0" y1="43%" x2="100%" y2="38%" stroke="#4f46e5" strokeWidth="1.5"/>
          <line x1="30%" y1="0" x2="32%" y2="100%" stroke="#4f46e5" strokeWidth="1"/>
        </svg>

        {/* Route line */}
        {trip.id === 1 && (
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
            <line x1="28%" y1="36%" x2="46%" y2="43%" stroke="#6366f1" strokeWidth="2" strokeDasharray="6 4" opacity="0.8"/>
            <line x1="46%" y1="43%" x2="62%" y2="50%" stroke="#6366f1" strokeWidth="2" strokeDasharray="6 4" opacity="0.4"/>
          </svg>
        )}

        {/* Stop markers */}
        {trip.stops.map(stop => (
          <div key={stop.id} style={{ position: "absolute", left: stop.x, top: stop.y, transform: "translate(-50%, -50%)", zIndex: 10 }}>
            <button
              onClick={() => setSelectedStop(selectedStop === stop.id ? null : stop.id)}
              style={{
                width: 40, height: 40, borderRadius: "50%",
                background: stop.active ? trip.color : selectedStop === stop.id ? "#3f3f46" : "#27272a",
                border: `2px solid ${stop.active ? trip.color : selectedStop === stop.id ? "#71717a" : "#3f3f46"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, cursor: "pointer",
                boxShadow: stop.active ? `0 0 0 4px ${trip.color}30` : "none",
              }}
            >
              {stop.emoji}
            </button>
            {stop.active && (
              <div style={{ position: "absolute", top: -2, right: -2, width: 10, height: 10, background: "#10b981", borderRadius: "50%", border: "2px solid #09090b" }} />
            )}
            <div style={{ position: "absolute", top: 44, left: "50%", transform: "translateX(-50%)", fontSize: 11, color: "white", whiteSpace: "nowrap", background: "rgba(0,0,0,0.7)", padding: "2px 6px", borderRadius: 6 }}>{stop.city}</div>
          </div>
        ))}

        {/* Stop popup */}
        {activeStop && (
          <div style={{ position: "absolute", top: 70, left: 8, right: 8, zIndex: 20, background: "rgba(24,24,27,0.97)", border: "1px solid #3f3f46", borderRadius: 16, padding: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
            <button onClick={() => setSelectedStop(null)} style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", cursor: "pointer" }}><X size={14} color="#71717a" /></button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 28 }}>{activeStop.emoji}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{activeStop.city}</div>
                <div style={{ color: "#71717a", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                  <Clock size={11} /> Arrivo {activeStop.arrival}
                  {activeStop.active && <span style={{ marginLeft: 6, background: "#10b98120", color: "#10b981", padding: "1px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600 }}>Sei qui</span>}
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div style={{ background: "#1c1c1e", borderRadius: 12, padding: 10 }}>
                <div style={{ color: "#71717a", fontSize: 11, marginBottom: 6 }}>Meteo</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <Thermometer size={14} color="#f59e0b" />
                  <span style={{ fontWeight: 600 }}>12°C</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#a1a1aa" }}>
                  <Wind size={11} color="#71717a" /> 18 km/h
                </div>
              </div>
              <div style={{ background: "#1c1c1e", borderRadius: 12, padding: 10 }}>
                <div style={{ color: "#71717a", fontSize: 11, marginBottom: 6 }}>Coworking</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <Building2 size={14} color="#6366f1" />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>HUB Praha</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#a1a1aa" }}>
                  <Wifi size={11} color="#10b981" /> 200 Mbps · €12/g
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Header */}
      <div style={s.header}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>Il mio Diario</div>
            <div style={{ color: "#71717a", fontSize: 12 }}>3 viaggi · 8 tappe</div>
          </div>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>M</div>
        </div>
      </div>

      {/* Sliding panel */}
      <div style={{ ...s.panel, height: panelH }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 6px" }}>
          <button
            onClick={() => setPanelIdx(i => (i + 1) % 3)}
            style={{ width: 40, height: 4, background: "#3f3f46", borderRadius: 999, border: "none", cursor: "pointer" }}
          />
        </div>

        {/* Trip tabs */}
        <div style={{ padding: "0 16px 8px", display: "flex", gap: 8, overflowX: "auto" as const }}>
          {TRIPS.map((t, i) => (
            <button
              key={t.id}
              onClick={() => { setTripIdx(i); setSelectedStop(null); }}
              style={{
                flexShrink: 0, display: "flex", alignItems: "center", gap: 8,
                padding: "6px 14px", borderRadius: 12, fontSize: 13, fontWeight: 500,
                border: "none", cursor: "pointer", transition: "all 0.15s",
                background: tripIdx === i ? t.color : "#1c1c1e",
                color: tripIdx === i ? "white" : "#71717a",
              }}
            >
              <Plane size={13} />
              {t.name}
            </button>
          ))}
        </div>

        {/* Stop list (half/full) */}
        {panelIdx > 0 && (
          <div style={{ flex: 1, overflowY: "auto" as const, padding: "0 16px 16px" }}>
            <div style={{ fontSize: 11, color: "#52525b", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" as const, marginBottom: 12 }}>
              Tappe · {trip.stops.length}
            </div>
            {trip.stops.map((stop, i) => {
              const isSelected = selectedStop === stop.id;
              return (
                <div key={stop.id} style={{ marginBottom: 8 }}>
                  <button
                    onClick={() => setSelectedStop(isSelected ? null : stop.id)}
                    style={{
                      width: "100%", textAlign: "left", padding: 12, borderRadius: 16, cursor: "pointer",
                      background: stop.active ? `${trip.color}20` : isSelected ? "#27272a" : "#1c1c1e",
                      border: `1px solid ${stop.active ? trip.color + "60" : isSelected ? "#3f3f46" : "#27272a"}`,
                      display: "flex", alignItems: "center", gap: 12,
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 4 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: stop.active ? trip.color : "#27272a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                        {stop.emoji}
                      </div>
                      {i < trip.stops.length - 1 && <div style={{ width: 1, height: 12, background: "#3f3f46" }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{stop.city}</span>
                        {stop.active && <span style={{ background: "#10b98120", color: "#10b981", padding: "1px 6px", borderRadius: 999, fontSize: 11 }}>ora</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "#71717a", marginTop: 2 }}>{stop.arrival}</div>
                    </div>
                    <ArrowRight size={16} color="#3f3f46" />
                  </button>
                </div>
              );
            })}

            {/* Stats (full only) */}
            {panelIdx === 2 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
                {[["3", "Paesi", trip.color], ["24", "Giorni", trip.color], ["4.2t", "CO₂", "#10b981"]].map(([v, l, c]) => (
                  <div key={l} style={{ background: "#1c1c1e", border: "1px solid #27272a", borderRadius: 12, padding: 12, textAlign: "center" as const }}>
                    <div style={{ color: c as string, fontWeight: 700, fontSize: 18 }}>{v}</div>
                    <div style={{ color: "#71717a", fontSize: 11 }}>{l}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Peek summary */}
        {panelIdx === 0 && (
          <div style={{ padding: "4px 16px 12px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: trip.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Plane size={16} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{trip.name}</div>
              <div style={{ color: "#71717a", fontSize: 12 }}>prossima Vienna il 28 mar</div>
            </div>
          </div>
        )}
      </div>

      {/* FAB */}
      <div style={{ position: "absolute", right: 16, zIndex: 30, bottom: `calc(${panelH} + 12px)` }}>
        {fabOpen && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10, alignItems: "flex-end" }}>
            {FAB_OPTIONS.map(opt => (
              <button key={opt.label} style={{ display: "flex", alignItems: "center", gap: 8, background: opt.color, color: "white", border: "none", padding: "8px 16px", borderRadius: 999, fontSize: 13, fontWeight: 500, cursor: "pointer", boxShadow: `0 4px 12px ${opt.color}60` }}>
                <opt.Icon size={16} />
                {opt.label}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setFabOpen(o => !o)}
          style={{ width: 48, height: 48, borderRadius: "50%", background: fabOpen ? "#3f3f46" : "#6366f1", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 16px rgba(99,102,241,0.5)", transform: fabOpen ? "rotate(45deg)" : "none", transition: "all 0.2s" }}
        >
          <Plus size={24} color="white" />
        </button>
      </div>
    </div>
  );
}
