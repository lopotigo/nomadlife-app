import { useState } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { ArrowLeft, Check, Shuffle, Loader2, Sparkles, User } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const AVATAR_STYLES = [
  { id: "personas", name: "Persona", icon: "🧍", hasBody: true, hasSkin: false },
  { id: "lorelei", name: "Artistico", icon: "🎨", hasBody: true, hasSkin: false },
  { id: "notionists", name: "Notion", icon: "📝", hasBody: true, hasSkin: false },
  { id: "avataaars", name: "Cartoon", icon: "🧑", hasBody: false, hasSkin: true },
  { id: "adventurer", name: "Avventuriero", icon: "🗺️", hasBody: false, hasSkin: true },
  { id: "big-ears", name: "Orecchie", icon: "👂", hasBody: false, hasSkin: true },
  { id: "bottts", name: "Robot", icon: "🤖", hasBody: false, hasSkin: false },
  { id: "fun-emoji", name: "Emoji", icon: "😎", hasBody: false, hasSkin: false },
  { id: "micah", name: "Moderno", icon: "✨", hasBody: false, hasSkin: false },
  { id: "pixel-art", name: "Pixel", icon: "👾", hasBody: false, hasSkin: false },
  { id: "open-peeps", name: "Peeps", icon: "🙋", hasBody: true, hasSkin: true },
  { id: "big-smile", name: "Sorriso", icon: "😄", hasBody: false, hasSkin: true },
];

const BACKGROUND_COLORS = [
  { id: "transparent", name: "Trasparente", color: "transparent" },
  { id: "b6e3f4", name: "Azzurro", color: "#b6e3f4" },
  { id: "c0aede", name: "Lavanda", color: "#c0aede" },
  { id: "d1d4f9", name: "Pervinca", color: "#d1d4f9" },
  { id: "ffd5dc", name: "Rosa", color: "#ffd5dc" },
  { id: "ffdfbf", name: "Pesca", color: "#ffdfbf" },
  { id: "a3e635", name: "Lime", color: "#a3e635" },
  { id: "fbbf24", name: "Giallo", color: "#fbbf24" },
  { id: "1e293b", name: "Scuro", color: "#1e293b" },
  { id: "6366f1", name: "Indigo", color: "#6366f1" },
  { id: "f43f5e", name: "Corallo", color: "#f43f5e" },
  { id: "14b8a6", name: "Teal", color: "#14b8a6" },
];

const SKIN_COLORS = [
  { id: "f8d5c7", name: "Chiaro 1", color: "#f8d5c7" },
  { id: "edb98a", name: "Chiaro 2", color: "#edb98a" },
  { id: "ffdbb4", name: "Chiaro 3", color: "#ffdbb4" },
  { id: "d08b5b", name: "Medio 1", color: "#d08b5b" },
  { id: "c68642", name: "Medio 2", color: "#c68642" },
  { id: "ae5d29", name: "Medio Scuro", color: "#ae5d29" },
  { id: "8d5524", name: "Scuro 1", color: "#8d5524" },
  { id: "614335", name: "Scuro 2", color: "#614335" },
];

export default function AvatarBuilder() {
  const { user, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [style, setStyle] = useState("avataaars");
  const [backgroundColor, setBackgroundColor] = useState("b6e3f4");
  const [skinColor, setSkinColor] = useState("edb98a");
  const [seed, setSeed] = useState(() => Math.random().toString(36).substring(7));
  const [saving, setSaving] = useState(false);

  const currentStyle = AVATAR_STYLES.find(s => s.id === style);
  const hasBody = currentStyle?.hasBody || false;
  const hasSkin = currentStyle?.hasSkin || false;

  const generateAvatarUrl = () => {
    let url = `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;
    
    if (backgroundColor !== "transparent") {
      url += `&backgroundColor=${backgroundColor}`;
    }

    if (hasSkin) {
      url += `&skinColor=${skinColor}`;
    }
    
    return url;
  };

  const handleRandomize = () => {
    setSeed(Math.random().toString(36).substring(7));
  };

  const handleRandomizeAll = () => {
    setSeed(Math.random().toString(36).substring(7));
    setStyle(AVATAR_STYLES[Math.floor(Math.random() * AVATAR_STYLES.length)].id);
    setBackgroundColor(BACKGROUND_COLORS[Math.floor(Math.random() * BACKGROUND_COLORS.length)].id);
    setSkinColor(SKIN_COLORS[Math.floor(Math.random() * SKIN_COLORS.length)].id);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const avatarUrl = generateAvatarUrl();
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ avatar: avatarUrl }),
      });

      if (!res.ok) throw new Error("Errore salvataggio");

      if (refreshUser) await refreshUser();
      toast({ title: "Avatar salvato!", description: "Il tuo nuovo avatar è stato impostato." });
      setLocation("/profile");
    } catch (error) {
      toast({ title: "Errore", description: "Impossibile salvare l'avatar.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-40">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setLocation("/profile")}
            className="p-2 rounded-xl hover:bg-muted transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-display font-bold">Crea Avatar</h1>
            <p className="text-sm text-muted-foreground">Personalizza il tuo personaggio</p>
          </div>
        </div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center mb-8"
        >
          <div 
            className={`${hasBody ? 'w-52 h-72' : 'w-44 h-44'} rounded-3xl border-4 border-primary overflow-hidden shadow-2xl transition-all duration-300`}
            style={{ backgroundColor: backgroundColor === "transparent" ? "#e5e7eb" : `#${backgroundColor}` }}
          >
            <img
              src={generateAvatarUrl()}
              alt="Avatar Preview"
              className="w-full h-full object-contain"
              data-testid="img-avatar-preview"
            />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={handleRandomize}
              className="flex items-center gap-2 px-4 py-2 bg-muted rounded-xl font-medium hover:bg-muted/80 transition-colors"
              data-testid="button-randomize"
            >
              <Shuffle className="w-4 h-4" />
              Nuovo Viso
            </button>
            <button
              onClick={handleRandomizeAll}
              className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary rounded-xl font-medium hover:bg-primary/30 transition-colors"
              data-testid="button-randomize-all"
            >
              <Sparkles className="w-4 h-4" />
              Tutto Casuale
            </button>
          </div>
          {hasBody && (
            <span className="mt-2 px-3 py-1 bg-green-500/20 text-green-600 dark:text-green-400 text-xs font-bold rounded-full flex items-center gap-1">
              <User className="w-3 h-3" />
              Corpo intero!
            </span>
          )}
        </motion.div>

        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
              🎭 Stile Avatar
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {AVATAR_STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all relative ${
                    style === s.id
                      ? "border-primary bg-primary/10 shadow-lg"
                      : "border-border hover:border-primary/50"
                  }`}
                  data-testid={`button-style-${s.id}`}
                >
                  {s.hasBody && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-green-500 text-white rounded-full text-[8px] font-bold">
                      BODY
                    </span>
                  )}
                  <span className="text-2xl">{s.icon}</span>
                  <span className="text-xs font-medium">{s.name}</span>
                </button>
              ))}
            </div>
          </section>

          {hasSkin && (
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
                🎨 Colore Pelle
              </h3>
              <div className="flex flex-wrap gap-2">
                {SKIN_COLORS.map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() => setSkinColor(sc.id)}
                    className={`w-12 h-12 rounded-full border-3 transition-all ${
                      skinColor === sc.id ? "border-primary scale-110 ring-2 ring-primary/30" : "border-white/30 hover:scale-105"
                    }`}
                    style={{ backgroundColor: sc.color }}
                    title={sc.name}
                    data-testid={`button-skin-${sc.id}`}
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
              🖼️ Sfondo
            </h3>
            <div className="flex flex-wrap gap-2">
              {BACKGROUND_COLORS.map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => setBackgroundColor(bg.id)}
                  className={`w-12 h-12 rounded-xl border-3 transition-all ${
                    backgroundColor === bg.id ? "border-primary scale-110 ring-2 ring-primary/30" : "border-transparent hover:scale-105"
                  }`}
                  style={{
                    backgroundColor: bg.color === "transparent" ? "#e5e7eb" : bg.color,
                    backgroundImage: bg.color === "transparent" ? "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)" : "none",
                    backgroundSize: "10px 10px",
                    backgroundPosition: "0 0, 0 5px, 5px -5px, -5px 0px",
                  }}
                  title={bg.name}
                  data-testid={`button-bg-${bg.id}`}
                />
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
              🎲 Varianti (clicca per scegliere)
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((i) => {
                const variantSeed = `variant${i}${style}`;
                return (
                  <button
                    key={i}
                    onClick={() => setSeed(variantSeed)}
                    className={`${hasBody ? 'aspect-[3/4]' : 'aspect-square'} rounded-xl border-2 overflow-hidden transition-all ${
                      seed === variantSeed ? "border-primary scale-105 shadow-lg" : "border-border hover:border-primary/50 hover:scale-102"
                    }`}
                    data-testid={`button-variant-${i}`}
                  >
                    <img
                      src={`https://api.dicebear.com/7.x/${style}/svg?seed=${variantSeed}&backgroundColor=${backgroundColor}${hasSkin ? `&skinColor=${skinColor}` : ''}`}
                      alt={`Variant ${i}`}
                      className="w-full h-full object-contain"
                    />
                  </button>
                );
              })}
            </div>
          </section>

          <div className="pt-6 space-y-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-primary to-violet-600 text-primary-foreground rounded-2xl font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-lg"
              data-testid="button-save-avatar"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Check className="w-5 h-5" />
              )}
              {saving ? "Salvataggio..." : "Salva Avatar"}
            </button>
            
            <p className="text-center text-xs text-muted-foreground">
              Preferisci una foto vera? Torna al profilo e clicca sull'avatar per caricarla
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
