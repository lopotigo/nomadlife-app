import { useState } from "react";

type SheetState = "peek" | "half" | "full";

const SHEET_HEIGHTS: Record<SheetState, string> = {
  peek: "80px",
  half: "50vh",
  full: "85vh",
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
    id: 1, user: "Marco R.", avatar: "M", avatarBg: "#6366f1", location: "Berlino, DE", time: "2h fa",
    content: "Il Betahaus è incredibile oggi, connessione perfetta e vista sulla città 🔥",
    likes: 24, type: "post",
  },
  {
    id: 2, user: "Sara V.", avatar: "S", avatarBg: "#ec4899", location: "Berlino, DE", time: "4h fa",
    content: "Consiglio il mercato di Mauerpark domenica mattina — perfetto per lavorare dopo 🎨",
    likes: 18, type: "post",
  },
  {
    id: 3, user: "Cowork+ Mitte", avatar: "C", avatarBg: "#10b981", location: "Mitte, Berlino", time: "Aperto ora",
    content: "Scrivania giornaliera disponibile. WiFi 400Mbps, stampante, caffè incluso ☕",
    likes: 0, type: "coworking",
  },
];

const FILTERS = ["Tutto", "📝 Post", "💻 Cowork", "🎉 Eventi", "👤 Nomadi"];

export default function MobileConceptWireframe() {
  const [sheet, setSheet] = useState<SheetState>("peek");
  const [activeFilter, setActiveFilter] = useState(0);
  const [activeNav, setActiveNav] = useState(0);
  const [selectedMarker, setSelectedMarker] = useState<number | null>(null);

  const nextSheet = () => {
    setSheet(s => s === "peek" ? "half" : s === "half" ? "full" : "peek");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#111827", display: "flex", alignItems: "center", justifyContent: "center", padding: 32, gap: 48, fontFamily: "system-ui, sans-serif" }}>

      {/* Left: Phone */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>

        {/* Phone frame */}
        <div style={{
          position: "relative", width: 390, height: 844, borderRadius: 48,
          background: "#0f0f1e", border: "10px solid #1e1e3e",
          boxShadow: "0 0 0 2px #3a3a6e, 0 40px 100px rgba(0,0,0,0.7)",
          overflow: "hidden",
        }}>

          {/* Status bar */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 50, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px 0", pointerEvents: "none" }}>
            <span style={{ color: "white", fontSize: 12, fontWeight: 700 }}>9:41</span>
            <div style={{ width: 110, height: 24, borderRadius: 12, background: "#0f0f1e" }} />
            <span style={{ color: "white", fontSize: 10 }}>▲▲▲ ⬛</span>
          </div>

          {/* MAP — full screen background */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(150deg, #1a2744 0%, #1e3a5f 35%, #1a2e4a 70%, #162239 100%)" }}>

            {/* Grid lines */}
            {[...Array(7)].map((_, i) => (
              <div key={`h${i}`} style={{ position: "absolute", left: 0, right: 0, top: `${i * 15}%`, height: 1, background: "rgba(255,255,255,0.04)" }} />
            ))}
            {[...Array(6)].map((_, i) => (
              <div key={`v${i}`} style={{ position: "absolute", top: 0, bottom: 0, left: `${i * 20}%`, width: 1, background: "rgba(255,255,255,0.04)" }} />
            ))}

            {/* Roads SVG */}
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.18 }} viewBox="0 0 390 844" preserveAspectRatio="none">
              <path d="M0 280 Q200 260 390 300" stroke="white" strokeWidth="2.5" fill="none" />
              <path d="M80 0 Q110 400 100 844" stroke="white" strokeWidth="1.5" fill="none" />
              <path d="M0 520 Q200 490 390 540" stroke="white" strokeWidth="1.5" fill="none" />
              <path d="M240 0 Q260 400 250 844" stroke="white" strokeWidth="1" fill="none" />
              <path d="M0 400 L390 400" stroke="white" strokeWidth="3" />
              <path d="M150 0 L150 844" stroke="white" strokeWidth="1.5" />
            </svg>

            {/* Map markers */}
            {MARKERS
              .filter(m => activeFilter === 0 || (activeFilter === 1 && m.type === "post") || (activeFilter === 2 && m.type === "coworking") || (activeFilter === 3 && m.type === "event") || (activeFilter === 4 && m.type === "nomad"))
              .map(marker => (
                <button key={marker.id}
                  onClick={() => setSelectedMarker(selectedMarker === marker.id ? null : marker.id)}
                  style={{
                    position: "absolute", left: marker.x, top: marker.y,
                    transform: "translate(-50%, -50%)",
                    background: "none", border: "none", cursor: "pointer",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  }}
                >
                  <div style={{
                    width: selectedMarker === marker.id ? 48 : 38,
                    height: selectedMarker === marker.id ? 48 : 38,
                    borderRadius: "50%", background: marker.color, color: "white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: selectedMarker === marker.id ? 20 : 16, fontWeight: 700,
                    boxShadow: selectedMarker === marker.id
                      ? `0 0 0 5px ${marker.color}40, 0 6px 20px ${marker.color}80`
                      : `0 2px 10px ${marker.color}60`,
                    transition: "all 0.2s",
                  }}>
                    {marker.emoji}
                  </div>
                  {selectedMarker === marker.id && (
                    <div style={{ background: marker.color, color: "white", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>
                      {marker.label}
                    </div>
                  )}
                </button>
              ))}

            {/* User dot */}
            <div style={{
              position: "absolute", left: "48%", top: "47%", transform: "translate(-50%,-50%)",
              width: 16, height: 16, borderRadius: "50%", background: "#60a5fa",
              border: "3px solid white", boxShadow: "0 0 0 8px rgba(96,165,250,0.25)",
            }} />

            {/* Chip "vedi in zona" — visible when map is mostly visible */}
            {sheet === "peek" && (
              <button
                onClick={nextSheet}
                style={{
                  position: "absolute", bottom: "16%", left: "50%", transform: "translateX(-50%)",
                  background: "rgba(99,102,241,0.92)", backdropFilter: "blur(12px)",
                  color: "white", border: "none", borderRadius: 24, padding: "10px 20px",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(99,102,241,0.5)",
                  display: "flex", alignItems: "center", gap: 8,
                  animation: "pulse 2s infinite",
                }}
              >
                📍 12 post in questa zona  ↑
              </button>
            )}
          </div>

          {/* Filter pills (above the sheet) */}
          <div style={{
            position: "absolute", top: 44, left: 0, right: 0, zIndex: 20,
            display: "flex", gap: 8, padding: "8px 16px",
            overflowX: "auto", scrollbarWidth: "none",
          }}>
            {FILTERS.map((f, i) => (
              <button key={i} onClick={() => setActiveFilter(i)} style={{
                flexShrink: 0, padding: "6px 14px", borderRadius: 20, border: "none",
                background: activeFilter === i ? "#6366f1" : "rgba(15,15,30,0.82)",
                color: activeFilter === i ? "white" : "rgba(255,255,255,0.65)",
                fontSize: 11, fontWeight: 600, cursor: "pointer",
                backdropFilter: "blur(10px)",
                outline: activeFilter === i ? "none" : "1px solid rgba(255,255,255,0.1)",
              }}>
                {f}
              </button>
            ))}
          </div>

          {/* Bottom Sheet */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 30,
            height: SHEET_HEIGHTS[sheet],
            borderRadius: "22px 22px 0 0",
            background: sheet === "peek" ? "rgba(10,10,20,0.88)" : "#0f0f1e",
            backdropFilter: "blur(24px)",
            borderTop: "1px solid rgba(255,255,255,0.09)",
            transition: "height 0.45s cubic-bezier(0.34,1.56,0.64,1)",
            display: "flex", flexDirection: "column",
          }}>

            {/* Handle — big, clearly tappable */}
            <button
              onClick={nextSheet}
              style={{
                flexShrink: 0, background: "none", border: "none", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                padding: "10px 0 6px",
              }}
            >
              <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.25)" }} />
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>
                {sheet === "peek" ? "↑ tocca per il feed" : sheet === "half" ? "↑ full  ·  ↓ chiudi" : "↓ torna alla mappa"}
              </span>
            </button>

            {/* Sheet content */}
            {sheet !== "peek" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {/* Area header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 10px", flexShrink: 0 }}>
                  <div>
                    <p style={{ color: "white", fontWeight: 700, fontSize: 14, margin: 0 }}>Berlino, Germania</p>
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, margin: 0 }}>12 contenuti nella zona</p>
                  </div>
                  <button style={{ background: "rgba(99,102,241,0.18)", color: "#818cf8", border: "none", borderRadius: 20, padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                    Filtra
                  </button>
                </div>

                {/* Feed */}
                <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {POSTS.map(post => (
                    <div key={post.id} style={{
                      background: "rgba(255,255,255,0.05)", borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.07)", padding: 12,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: "50%",
                          background: post.avatarBg, color: "white",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 13, fontWeight: 700, flexShrink: 0,
                        }}>
                          {post.avatar}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: "white", fontWeight: 700, fontSize: 12, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.user}</p>
                          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, margin: 0 }}>📍 {post.location} · {post.time}</p>
                        </div>
                        {post.type === "coworking" && (
                          <span style={{ background: "rgba(16,185,129,0.18)", color: "#34d399", padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700 }}>Aperto</span>
                        )}
                      </div>
                      <p style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, lineHeight: 1.5, margin: 0 }}>{post.content}</p>
                      {post.likes > 0 && (
                        <div style={{ display: "flex", gap: 14, marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                          <button style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer" }}>❤️ {post.likes}</button>
                          <button style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer" }}>💬 Rispondi</button>
                          <button style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer", marginLeft: "auto" }}>↗ Share</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Navigation — hidden when full */}
          {sheet !== "full" && (
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 40,
              background: "rgba(8,8,18,0.96)", backdropFilter: "blur(24px)",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", justifyContent: "space-around",
              padding: "8px 8px 20px",
            }}>
              {[
                { icon: "🗺️", label: "Mappa" },
                { icon: "📖", label: "Diario" },
                { fab: true },
                { icon: "💬", label: "Chat" },
                { icon: "👤", label: "Profilo" },
              ].map((item, i) => (
                <button key={i} onClick={() => !item.fab && setActiveNav(i)}
                  style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 44, padding: 0 }}
                >
                  {item.fab ? (
                    <div style={{
                      width: 46, height: 46, borderRadius: "50%", cursor: "pointer",
                      background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "white", fontSize: 22, fontWeight: 700,
                      boxShadow: "0 4px 18px rgba(99,102,241,0.55)",
                    }}>+</div>
                  ) : (
                    <>
                      <span style={{ fontSize: 20, filter: activeNav === i ? "none" : "grayscale(80%) opacity(0.45)" }}>{item.icon}</span>
                      <span style={{ fontSize: 9, fontWeight: 600, color: activeNav === i ? "#818cf8" : "rgba(255,255,255,0.3)" }}>{item.label}</span>
                    </>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* State indicator */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>Stato:</span>
          {(["peek", "half", "full"] as SheetState[]).map(s => (
            <button key={s} onClick={() => setSheet(s)} style={{
              padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
              background: sheet === s ? "#6366f1" : "rgba(255,255,255,0.08)",
              color: sheet === s ? "white" : "rgba(255,255,255,0.5)",
              fontSize: 12, fontWeight: 600, transition: "all 0.2s",
            }}>
              {s === "peek" ? "🗺 Mappa" : s === "half" ? "📋 Half" : "📄 Full"}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Annotations */}
      <div style={{ maxWidth: 280, display: "flex", flexDirection: "column", gap: 24, paddingTop: 16 }}>
        <div>
          <h2 style={{ color: "white", fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>NomadLife 2.0</h2>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: 0 }}>Concept mobile-first · mappa geo-sociale</p>
        </div>

        {[
          { color: "#6366f1", title: "Mappa full-screen", desc: "L'app si capisce in 2 secondi: è una mappa dove i nomadi condividono cosa trovano." },
          { color: "#10b981", title: "Markers contestuali", desc: "Ogni pin è un post, coworking, evento o nomad. Tocca → info inline." },
          { color: "#f59e0b", title: "Filter pills flottanti", desc: "Filtra senza uscire dalla mappa. Veloce, immediato." },
          { color: "#818cf8", title: "Bottom sheet geo-contestuale", desc: "Il feed mostra solo i contenuti della zona visibile. Sposti la mappa → il feed cambia." },
          { color: "#ec4899", title: "Navigazione 5 tab", desc: "Mappa · Diario · Pubblica · Chat · Profilo. Niente di più." },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 12 }}>
            <div style={{ width: 3, borderRadius: 2, flexShrink: 0, background: item.color, minHeight: 44 }} />
            <div>
              <p style={{ color: "white", fontWeight: 700, fontSize: 13, margin: "0 0 2px" }}>{item.title}</p>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, margin: 0, lineHeight: 1.5 }}>{item.desc}</p>
            </div>
          </div>
        ))}

        <div style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 16, padding: 16 }}>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>
            "Apri l'app, vedi la mappa. I nomadi ti dicono dove lavorano, cosa trovano, cosa succede — nella città in cui sei o in quella in cui vuoi andare."
          </p>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.75; } }
      `}</style>
    </div>
  );
}
