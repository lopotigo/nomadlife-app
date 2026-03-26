import { useState } from "react";

type SheetState = "peek" | "half" | "full";

const SHEET_HEIGHTS: Record<SheetState, string> = {
  peek: "96px",
  half: "54vh",
  full: "88vh",
};

const MARKERS = [
  { id: 1, x: "28%", y: "38%", type: "post", color: "#6366f1", label: "Marco R.", emoji: "📝" },
  { id: 2, x: "55%", y: "52%", type: "coworking", color: "#10b981", label: "Cowork+", emoji: "💻" },
  { id: 3, x: "68%", y: "30%", type: "event", color: "#f59e0b", label: "Meetup", emoji: "🎉" },
  { id: 4, x: "42%", y: "65%", type: "post", color: "#6366f1", label: "Sara V.", emoji: "📝" },
  { id: 5, x: "20%", y: "58%", type: "coworking", color: "#10b981", label: "Hub", emoji: "🌐" },
  { id: 6, x: "75%", y: "58%", type: "nomad", color: "#ec4899", label: "Alex", emoji: "👤" },
];

const POSTS = [
  {
    id: 1,
    user: "Marco R.",
    avatar: "M",
    avatarBg: "#6366f1",
    location: "Berlino, DE",
    time: "2h fa",
    content: "Il Betahaus è incredibile oggi, connessione perfetta e vista sulla città 🔥",
    likes: 24,
    type: "post",
  },
  {
    id: 2,
    user: "Sara V.",
    avatar: "S",
    avatarBg: "#ec4899",
    location: "Berlino, DE",
    time: "4h fa",
    content: "Consiglio il mercato di Mauerpark domenica mattina — perfetto per lavorare dopo 🎨",
    likes: 18,
    type: "post",
  },
  {
    id: 3,
    user: "Cowork+ Mitte",
    avatar: "C",
    avatarBg: "#10b981",
    location: "Mitte, Berlino",
    time: "Aperto ora",
    content: "Scrivania giornaliera disponibile. WiFi 400Mbps, stampante, caffè incluso ☕",
    likes: 0,
    type: "coworking",
  },
];

const FILTERS = [
  { id: "all", label: "Tutto", active: true },
  { id: "posts", label: "📝 Post", active: false },
  { id: "coworking", label: "💻 Cowork", active: false },
  { id: "events", label: "🎉 Eventi", active: false },
  { id: "nomads", label: "👤 Nomadi", active: false },
];

const NAV_ITEMS = [
  { icon: "🗺️", label: "Mappa" },
  { icon: "📖", label: "Diario" },
  { icon: "✚", label: "", fab: true },
  { icon: "💬", label: "Chat" },
  { icon: "👤", label: "Profilo" },
];

export default function MobileConceptWireframe() {
  const [sheet, setSheet] = useState<SheetState>("half");
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeNav, setActiveNav] = useState(0);
  const [selectedMarker, setSelectedMarker] = useState<number | null>(null);

  const cycleSheet = () => {
    setSheet(s => s === "peek" ? "half" : s === "half" ? "full" : "peek");
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
      <div className="flex gap-12 items-start">

        {/* Phone frame */}
        <div className="flex flex-col items-center gap-3">
          <p className="text-white/60 text-sm font-medium tracking-wide uppercase">Concept Mobile</p>
          <div
            className="relative overflow-hidden shadow-2xl"
            style={{
              width: 390,
              height: 844,
              borderRadius: 48,
              background: "#1a1a2e",
              border: "10px solid #2a2a3e",
              boxShadow: "0 0 0 2px #3a3a5e, 0 30px 80px rgba(0,0,0,0.6)",
            }}
          >
            {/* Status bar */}
            <div className="flex items-center justify-between px-6 pt-3 pb-1 relative z-20">
              <span className="text-white text-xs font-semibold">9:41</span>
              <div style={{ width: 120, height: 28, borderRadius: 14, background: "#1a1a2e" }} />
              <div className="flex items-center gap-1">
                <span className="text-white text-xs">●●●</span>
              </div>
            </div>

            {/* MAP — full screen */}
            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #1a2744 0%, #1e3a5f 30%, #1a2e4a 60%, #162239 100%)" }}>
              {/* Map grid lines */}
              {[...Array(8)].map((_, i) => (
                <div key={`h${i}`} className="absolute w-full" style={{ top: `${i * 14}%`, height: 1, background: "rgba(255,255,255,0.04)" }} />
              ))}
              {[...Array(6)].map((_, i) => (
                <div key={`v${i}`} className="absolute h-full" style={{ left: `${i * 18}%`, width: 1, background: "rgba(255,255,255,0.04)" }} />
              ))}

              {/* Roads simulation */}
              <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 390 844" preserveAspectRatio="none">
                <path d="M0 280 Q180 260 390 300" stroke="white" strokeWidth="2" fill="none" />
                <path d="M80 0 Q120 400 100 844" stroke="white" strokeWidth="1.5" fill="none" />
                <path d="M0 520 Q200 500 390 540" stroke="white" strokeWidth="1.5" fill="none" />
                <path d="M250 0 Q270 400 260 844" stroke="white" strokeWidth="1" fill="none" />
                <path d="M0 380 L390 380" stroke="white" strokeWidth="3" />
                <path d="M160 0 L160 844" stroke="white" strokeWidth="1.5" />
              </svg>

              {/* Map markers */}
              {MARKERS.filter(m => activeFilter === "all" || m.type === activeFilter || (activeFilter === "posts" && m.type === "post") || (activeFilter === "coworking" && m.type === "coworking") || (activeFilter === "events" && m.type === "event") || (activeFilter === "nomads" && m.type === "nomad")).map(marker => (
                <button
                  key={marker.id}
                  onClick={() => setSelectedMarker(selectedMarker === marker.id ? null : marker.id)}
                  className="absolute flex flex-col items-center transition-transform"
                  style={{ left: marker.x, top: marker.y, transform: "translate(-50%, -50%)" }}
                >
                  <div
                    className="flex items-center justify-center rounded-full text-white font-bold shadow-lg transition-transform"
                    style={{
                      width: selectedMarker === marker.id ? 44 : 36,
                      height: selectedMarker === marker.id ? 44 : 36,
                      background: marker.color,
                      fontSize: selectedMarker === marker.id ? 18 : 15,
                      boxShadow: selectedMarker === marker.id ? `0 0 0 4px ${marker.color}40, 0 4px 12px ${marker.color}60` : `0 2px 8px ${marker.color}60`,
                    }}
                  >
                    {marker.emoji}
                  </div>
                  {selectedMarker === marker.id && (
                    <div className="mt-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white" style={{ background: marker.color }}>
                      {marker.label}
                    </div>
                  )}
                </button>
              ))}

              {/* User location */}
              <div className="absolute" style={{ left: "48%", top: "47%", transform: "translate(-50%,-50%)" }}>
                <div className="w-4 h-4 rounded-full bg-blue-400 border-2 border-white shadow-lg" style={{ boxShadow: "0 0 0 8px rgba(96,165,250,0.2)" }} />
              </div>

              {/* "Vedi in questa zona" chip — shown when half */}
              {sheet !== "full" && (
                <button
                  onClick={() => setSheet("half")}
                  className="absolute top-1/3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-semibold text-white shadow-xl"
                  style={{ background: "rgba(99,102,241,0.9)", backdropFilter: "blur(8px)" }}
                >
                  📍 12 post in questa zona
                </button>
              )}
            </div>

            {/* Filter pills — float over map */}
            <div className="absolute top-14 left-0 right-0 z-10 px-4 py-2 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    background: activeFilter === f.id ? "#6366f1" : "rgba(15,15,30,0.8)",
                    color: activeFilter === f.id ? "white" : "rgba(255,255,255,0.7)",
                    backdropFilter: "blur(8px)",
                    border: activeFilter === f.id ? "none" : "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Bottom Sheet */}
            <div
              className="absolute bottom-0 left-0 right-0 z-20 flex flex-col"
              style={{
                height: SHEET_HEIGHTS[sheet],
                borderRadius: "24px 24px 0 0",
                background: sheet === "peek" ? "rgba(15,15,30,0.85)" : "#0f0f1e",
                backdropFilter: "blur(20px)",
                transition: "height 0.4s cubic-bezier(0.34,1.56,0.64,1)",
                borderTop: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {/* Drag handle */}
              <button onClick={cycleSheet} className="flex-shrink-0 flex flex-col items-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }} />
                {sheet === "peek" && (
                  <p className="text-xs mt-1 font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Scorri su per vedere il feed ↑
                  </p>
                )}
              </button>

              {sheet !== "peek" && (
                <>
                  {/* Area label */}
                  <div className="flex items-center justify-between px-4 pb-2 flex-shrink-0">
                    <div>
                      <p className="font-bold text-white text-sm">Berlino, Germania</p>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>12 contenuti nella zona visibile</p>
                    </div>
                    <button className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: "rgba(99,102,241,0.2)", color: "#818cf8" }}>
                      Filtra
                    </button>
                  </div>

                  {/* Posts feed */}
                  <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-4">
                    {POSTS.map(post => (
                      <div
                        key={post.id}
                        className="rounded-2xl p-3"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                            style={{ background: post.avatarBg, fontSize: 13 }}
                          >
                            {post.avatar}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white text-xs truncate">{post.user}</p>
                            <p className="text-[10px] flex items-center gap-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                              📍 {post.location} · {post.time}
                            </p>
                          </div>
                          {post.type === "coworking" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: "rgba(16,185,129,0.2)", color: "#34d399" }}>
                              Aperto
                            </span>
                          )}
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>{post.content}</p>
                        {post.likes > 0 && (
                          <div className="flex items-center gap-3 mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                            <button className="flex items-center gap-1 text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                              ❤️ {post.likes}
                            </button>
                            <button className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>💬 Rispondi</button>
                            <button className="text-[11px] ml-auto" style={{ color: "rgba(255,255,255,0.4)" }}>↗️ Condividi</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Bottom Navigation */}
            <div
              className="absolute bottom-0 left-0 right-0 z-30 flex items-center justify-around px-2 pb-6 pt-3"
              style={{
                background: "rgba(10,10,20,0.95)",
                backdropFilter: "blur(20px)",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                display: sheet === "full" ? "none" : "flex",
              }}
            >
              {NAV_ITEMS.map((item, i) => (
                <button
                  key={i}
                  onClick={() => !item.fab && setActiveNav(i)}
                  className="flex flex-col items-center gap-0.5"
                  style={{ minWidth: 44 }}
                >
                  {item.fab ? (
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg"
                      style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 4px 16px rgba(99,102,241,0.5)" }}
                    >
                      +
                    </div>
                  ) : (
                    <>
                      <span style={{ fontSize: 20, filter: activeNav === i ? "none" : "grayscale(80%) opacity(0.5)" }}>
                        {item.icon}
                      </span>
                      <span
                        className="text-[10px] font-medium"
                        style={{ color: activeNav === i ? "#818cf8" : "rgba(255,255,255,0.35)" }}
                      >
                        {item.label}
                      </span>
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            {(["peek", "half", "full"] as SheetState[]).map(s => (
              <button
                key={s}
                onClick={() => setSheet(s)}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all"
                style={{
                  background: sheet === s ? "#6366f1" : "rgba(255,255,255,0.1)",
                  color: sheet === s ? "white" : "rgba(255,255,255,0.6)",
                }}
              >
                {s === "peek" ? "Peek" : s === "half" ? "Half" : "Full"}
              </button>
            ))}
          </div>
          <p className="text-white/40 text-xs">Tocca i bottoni o trascina il cassetto</p>
        </div>

        {/* Annotations */}
        <div className="flex flex-col gap-6 max-w-xs pt-8">
          <div>
            <h2 className="text-white text-xl font-bold mb-1">NomadLife 2.0</h2>
            <p className="text-white/50 text-sm">Mappa geo-sociale mobile-first</p>
          </div>

          <div className="space-y-4">
            {[
              { color: "#6366f1", title: "Mappa full-screen", desc: "La mappa è il centro dell'esperienza. Si capisce subito cosa fa l'app." },
              { color: "#6366f1", title: "Filter pills flottanti", desc: "Filtra per tipo di contenuto senza uscire dalla mappa." },
              { color: "#6366f1", title: "Bottom sheet draggabile", desc: "Peek → Half → Full. Il feed appare solo quando lo vuoi, filtrato per la zona visibile sulla mappa." },
              { color: "#6366f1", title: "Marker contestuali", desc: "Post, coworking, eventi e nomadi appaiono come pin. Tocca un pin → info inline." },
              { color: "#6366f1", title: "Navigazione semplice", desc: "5 tab in basso: Mappa, Diario, + (pubblica), Chat, Profilo." },
            ].map((item, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-1.5 rounded-full flex-shrink-0 mt-1" style={{ background: item.color, minHeight: 40 }} />
                <div>
                  <p className="text-white font-semibold text-sm">{item.title}</p>
                  <p className="text-white/50 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl p-4" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
            <p className="text-white/80 text-xs leading-relaxed italic">
              "Apri l'app, vedi la mappa. I nomadi ti dicono dove lavorano, cosa trovano, cosa succede — nella città in cui sei o in quella in cui vuoi andare."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
