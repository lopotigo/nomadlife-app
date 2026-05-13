export function CityBriefing() {
  return (
    <div className="min-h-screen bg-[#0f1117] text-white flex flex-col font-sans" style={{ width: 390, maxWidth: 390 }}>
      {/* Status bar */}
      <div className="flex justify-between items-center px-6 pt-4 pb-2 text-xs text-gray-400">
        <span>9:41</span>
        <span>●●●</span>
      </div>

      {/* Header */}
      <div className="px-6 pt-2 pb-4 flex items-center gap-3">
        <button className="w-8 h-8 flex items-center justify-center text-gray-400">←</button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center text-xs font-bold">N</div>
          <span className="text-gray-300 text-sm">NomadBot</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 flex flex-col gap-4">
        {/* AI message */}
        <div className="bg-[#1c1f2a] rounded-2xl rounded-tl-sm px-4 py-3">
          <p className="text-white text-sm leading-relaxed">
            Ottima scelta 🌊 <span className="font-semibold">Lisbona</span> è perfetta per i nomadi. Ecco tutto quello che ti serve sapere.
          </p>
        </div>

        {/* City hero card */}
        <div className="relative rounded-2xl overflow-hidden h-36 bg-gradient-to-br from-orange-400 via-pink-500 to-violet-600 flex items-end p-4">
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative z-10">
            <p className="text-white text-2xl font-bold">🇵🇹 Lisbona</p>
            <p className="text-white/80 text-sm">Portogallo · GMT+1 · Ottimale tutto l'anno</p>
          </div>
        </div>

        {/* Cost of life */}
        <div className="bg-[#1c1f2a] border border-[#2e3347] rounded-2xl px-4 py-4">
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-3">Costo della vita / mese</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Alloggio", value: "~€900", icon: "🏠" },
              { label: "Cibo", value: "~€300", icon: "🍽️" },
              { label: "Coworking", value: "~€150", icon: "💻" },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-xl">{item.icon}</span>
                <span className="text-white font-semibold text-sm">{item.value}</span>
                <span className="text-gray-500 text-xs">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Nomads there */}
        <div className="bg-[#1c1f2a] border border-[#2e3347] rounded-2xl px-4 py-4">
          <div className="flex justify-between items-center mb-3">
            <p className="text-gray-400 text-xs uppercase tracking-widest">Nomadi lì a Giugno</p>
            <span className="text-teal-400 text-xs font-medium">Vedi tutti →</span>
          </div>
          <div className="flex flex-col gap-3">
            {[
              { name: "Sara K.", flag: "🇩🇪", skill: "Designer UX", match: "95%" },
              { name: "Luca M.", flag: "🇮🇹", skill: "Dev React", match: "88%" },
              { name: "Ana R.", flag: "🇧🇷", skill: "Marketing", match: "82%" },
            ].map((n, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#252836] flex items-center justify-center text-sm">{n.flag}</div>
                  <div>
                    <p className="text-white text-sm font-medium">{n.name}</p>
                    <p className="text-gray-400 text-xs">{n.skill}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-teal-400 text-xs font-semibold">{n.match}</span>
                  <button className="text-xs bg-[#252836] text-gray-300 rounded-lg px-3 py-1">Connetti</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coworking */}
        <div className="bg-[#1c1f2a] border border-[#2e3347] rounded-2xl px-4 py-4">
          <div className="flex justify-between items-center mb-3">
            <p className="text-gray-400 text-xs uppercase tracking-widest">Coworking consigliati</p>
            <span className="text-teal-400 text-xs font-medium">Tutti →</span>
          </div>
          <div className="flex flex-col gap-2">
            {[
              { name: "Second Home Lisboa", price: "€18/giorno", wifi: "⚡ 1Gbps", rating: "4.9" },
              { name: "Heden", price: "€12/giorno", wifi: "⚡ 500Mbps", rating: "4.7" },
            ].map((c, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[#252836] last:border-0">
                <div>
                  <p className="text-white text-sm font-medium">{c.name}</p>
                  <p className="text-gray-400 text-xs">{c.wifi} · ⭐ {c.rating}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-300 text-sm">{c.price}</span>
                  <button className="text-xs bg-teal-500 text-white rounded-lg px-3 py-1 font-medium">Prenota</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Events */}
        <div className="bg-[#1c1f2a] border border-[#2e3347] rounded-2xl px-4 py-4">
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-3">Eventi a Giugno</p>
          <div className="flex flex-col gap-2">
            {[
              { title: "Nomad Coffee Meetup", date: "3 Giu", tag: "Community" },
              { title: "Web Summit Side Events", date: "10 Giu", tag: "Tech" },
            ].map((e, i) => (
              <div key={i} className="flex items-center justify-between py-1">
                <div>
                  <p className="text-white text-sm">{e.title}</p>
                  <p className="text-gray-400 text-xs">{e.date}</p>
                </div>
                <span className="text-xs bg-[#252836] text-gray-400 rounded-full px-2 py-0.5">{e.tag}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 rounded-2xl py-4 text-white font-semibold text-base shadow-lg">
          🗓️ Pianifica il viaggio
        </button>
      </div>
    </div>
  );
}
