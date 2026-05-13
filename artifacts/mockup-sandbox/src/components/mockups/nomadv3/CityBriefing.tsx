import { useState } from "react";

export function CityBriefing() {
  const [mapOpen, setMapOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0f1117] text-white flex flex-col font-sans" style={{ width: 390, maxWidth: 390 }}>
      {/* Status bar */}
      <div className="flex justify-between items-center px-6 pt-4 pb-2 text-xs text-gray-400">
        <span>9:41</span>
        <span>●●●</span>
      </div>

      {/* Header */}
      <div className="px-5 pt-1 pb-3 flex items-center gap-3">
        <button className="w-8 h-8 flex items-center justify-center text-gray-400 text-lg">←</button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center text-xs font-bold">N</div>
          <span className="text-gray-300 text-sm font-medium">NomadBot</span>
        </div>
        <div className="ml-auto w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24 flex flex-col gap-3">

        {/* AI message */}
        <div className="bg-[#1c1f2a] rounded-2xl rounded-tl-sm px-4 py-3">
          <p className="text-white text-sm leading-relaxed">
            Ottima scelta 🌊 <span className="font-semibold">Lisbona</span> è una delle destinazioni nomadi più amate d'Europa. Ecco tutto quello che ti serve.
          </p>
        </div>

        {/* City hero */}
        <div className="relative rounded-2xl overflow-hidden h-32 bg-gradient-to-br from-orange-400 via-pink-500 to-violet-600 flex items-end p-4">
          <div className="absolute inset-0 bg-black/25" />
          <div className="relative z-10 flex justify-between items-end w-full">
            <div>
              <p className="text-white text-xl font-bold">🇵🇹 Lisbona</p>
              <p className="text-white/75 text-xs">Portogallo · GMT+1 · ☀️ 24°C a Giugno</p>
            </div>
            <div className="bg-teal-500 rounded-full px-3 py-1 text-xs font-semibold text-white">
              ⭐ Top nomad city
            </div>
          </div>
        </div>

        {/* Cost of life */}
        <div className="bg-[#1c1f2a] border border-[#2e3347] rounded-2xl px-4 py-3">
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-3">Costo della vita / mese</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Alloggio", value: "~€900", icon: "🏠" },
              { label: "Cibo", value: "~€300", icon: "🍽️" },
              { label: "Coworking", value: "~€150", icon: "💻" },
              { label: "Totale", value: "~€1.4k", icon: "💰" },
            ].map((item, i) => (
              <div key={i} className={`flex flex-col items-center gap-1 ${i === 3 ? "bg-teal-500/10 rounded-xl py-1" : ""}`}>
                <span className="text-base">{item.icon}</span>
                <span className={`font-bold text-xs ${i === 3 ? "text-teal-400" : "text-white"}`}>{item.value}</span>
                <span className="text-gray-500 text-xs text-center leading-tight">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Nomads going there */}
        <div className="bg-[#1c1f2a] border border-[#2e3347] rounded-2xl px-4 py-3">
          <div className="flex justify-between items-center mb-3">
            <div>
              <p className="text-white text-sm font-semibold">Nomadi a Lisbona a Giugno</p>
              <p className="text-gray-500 text-xs">8 confermati · 3 forse</p>
            </div>
            <span className="text-teal-400 text-xs font-medium">Tutti →</span>
          </div>
          <div className="flex flex-col gap-2.5">
            {[
              { name: "Sara K.", flag: "🇩🇪", skill: "Designer UX", match: 95, avatar: "SK", dates: "1–14 Giu" },
              { name: "Luca M.", flag: "🇮🇹", skill: "Dev React", match: 88, avatar: "LM", dates: "5–20 Giu" },
              { name: "Ana R.", flag: "🇧🇷", skill: "Marketing", match: 82, avatar: "AR", dates: "10–30 Giu" },
            ].map((n, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {n.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-white text-sm font-medium">{n.name}</p>
                    <span className="text-xs">{n.flag}</span>
                  </div>
                  <p className="text-gray-400 text-xs">{n.skill} · {n.dates}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-teal-400 text-xs font-bold">{n.match}%</p>
                    <p className="text-gray-600 text-xs">match</p>
                  </div>
                  <button className="text-xs bg-[#252836] text-gray-300 rounded-xl px-2.5 py-1.5">Scrivi</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coworking + Map toggle */}
        <div className="bg-[#1c1f2a] border border-[#2e3347] rounded-2xl px-4 py-3">
          <div className="flex justify-between items-center mb-3">
            <p className="text-white text-sm font-semibold">Coworking consigliati</p>
            <button
              onClick={() => setMapOpen(!mapOpen)}
              className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors ${mapOpen ? "bg-teal-500 text-white" : "bg-[#252836] text-teal-400"}`}
            >
              {mapOpen ? "🗺️ Nascondi mappa" : "🗺️ Vedi sulla mappa"}
            </button>
          </div>

          {/* Inline map */}
          {mapOpen && (
            <div className="mb-3 rounded-xl overflow-hidden bg-[#252836] h-36 flex items-center justify-center border border-[#2e3347]">
              <div className="relative w-full h-full bg-gradient-to-br from-[#1a2035] to-[#252836] flex items-center justify-center">
                {/* Fake map with pins */}
                <div className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: "linear-gradient(#2e3347 1px, transparent 1px), linear-gradient(90deg, #2e3347 1px, transparent 1px)",
                    backgroundSize: "20px 20px"
                  }}
                />
                {[
                  { top: "30%", left: "40%", label: "Second Home" },
                  { top: "55%", left: "60%", label: "Heden" },
                  { top: "45%", left: "25%", label: "Cowork Central" },
                ].map((pin, i) => (
                  <div key={i} className="absolute" style={{ top: pin.top, left: pin.left }}>
                    <div className="relative">
                      <div className="w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center text-xs font-bold text-white shadow-lg border-2 border-white/20">💻</div>
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#0f1117] text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap">{pin.label}</div>
                    </div>
                  </div>
                ))}
                <div className="absolute bottom-2 right-2 text-xs text-gray-500">© OpenStreetMap</div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {[
              { name: "Second Home Lisboa", price: "€18/g", wifi: "1Gbps", rating: "4.9", open: true },
              { name: "Heden", price: "€12/g", wifi: "500Mbps", rating: "4.7", open: true },
              { name: "Cowork Central", price: "€10/g", wifi: "300Mbps", rating: "4.5", open: false },
            ].map((c, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[#252836] last:border-0">
                <div>
                  <p className="text-white text-sm font-medium">{c.name}</p>
                  <p className="text-gray-400 text-xs">⚡ {c.wifi} · ⭐ {c.rating}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-300 text-sm font-medium">{c.price}</span>
                  <button className={`text-xs rounded-xl px-3 py-1.5 font-medium ${c.open ? "bg-teal-500 text-white" : "bg-[#252836] text-gray-400"}`}>
                    {c.open ? "Prenota" : "Esaurito"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Events */}
        <div className="bg-[#1c1f2a] border border-[#2e3347] rounded-2xl px-4 py-3">
          <p className="text-white text-sm font-semibold mb-3">eventi a Giugno 📅</p>
          <div className="flex flex-col gap-2">
            {[
              { title: "Nomad Coffee Meetup", date: "3 Giu", tag: "🤝 Community", going: 14 },
              { title: "Web Summit Side Events", date: "10 Giu", tag: "💻 Tech", going: 42 },
              { title: "Fado & Nomads Night", date: "18 Giu", tag: "🎵 Cultura", going: 9 },
            ].map((e, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-[#252836] last:border-0">
                <div>
                  <p className="text-white text-sm">{e.title}</p>
                  <p className="text-gray-400 text-xs">{e.date} · {e.going} partecipanti</p>
                </div>
                <span className="text-xs bg-[#252836] text-gray-400 rounded-full px-2 py-0.5 whitespace-nowrap">{e.tag}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 rounded-2xl py-4 text-white font-semibold text-base shadow-lg shadow-teal-900/30 active:scale-[0.98] transition-transform">
          🗓️ Pianifica il viaggio a Lisbona
        </button>

      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[#1c1f2a] bg-[#0f1117]/95 backdrop-blur px-8 py-3 flex justify-around items-center" style={{ maxWidth: 390 }}>
        {[
          { icon: "🤖", label: "AI", active: false },
          { icon: "🗺️", label: "Mappa", active: false },
          { icon: "👥", label: "Community", active: false },
          { icon: "👤", label: "Profilo", active: false },
        ].map((item, i) => (
          <button key={i} className="flex flex-col items-center gap-0.5">
            <span className="text-lg">{item.icon}</span>
            <span className={`text-xs font-medium ${item.active ? "text-teal-400" : "text-gray-500"}`}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
