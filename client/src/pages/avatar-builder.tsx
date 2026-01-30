import { useState, useEffect } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { ArrowLeft, Check, Shuffle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const AVATAR_STYLES = [
  { id: "avataaars", name: "Cartoon", icon: "🧑" },
  { id: "adventurer", name: "Avventuriero", icon: "🗺️" },
  { id: "adventurer-neutral", name: "Minimalista", icon: "😐" },
  { id: "big-ears", name: "Orecchie Grandi", icon: "👂" },
  { id: "big-smile", name: "Sorriso", icon: "😄" },
  { id: "bottts", name: "Robot", icon: "🤖" },
  { id: "fun-emoji", name: "Emoji", icon: "😎" },
  { id: "lorelei", name: "Artistico", icon: "🎨" },
  { id: "micah", name: "Moderno", icon: "✨" },
  { id: "notionists", name: "Notion", icon: "📝" },
  { id: "pixel-art", name: "Pixel", icon: "👾" },
  { id: "thumbs", name: "Pollice", icon: "👍" },
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
];

const HAIR_COLORS = [
  { id: "2c1810", name: "Nero", color: "#2c1810" },
  { id: "4a3728", name: "Castano Scuro", color: "#4a3728" },
  { id: "8b6914", name: "Castano", color: "#8b6914" },
  { id: "c9a52c", name: "Biondo Scuro", color: "#c9a52c" },
  { id: "e8d5a3", name: "Biondo", color: "#e8d5a3" },
  { id: "b55239", name: "Rosso", color: "#b55239" },
  { id: "9ca3af", name: "Grigio", color: "#9ca3af" },
  { id: "ec4899", name: "Rosa", color: "#ec4899" },
  { id: "8b5cf6", name: "Viola", color: "#8b5cf6" },
  { id: "3b82f6", name: "Blu", color: "#3b82f6" },
];

const ACCESSORY_OPTIONS = [
  { id: "none", name: "Nessuno" },
  { id: "glasses", name: "Occhiali" },
  { id: "sunglasses", name: "Occhiali da sole" },
];

export default function AvatarBuilder() {
  const { user, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [style, setStyle] = useState("avataaars");
  const [backgroundColor, setBackgroundColor] = useState("b6e3f4");
  const [hairColor, setHairColor] = useState("4a3728");
  const [seed, setSeed] = useState(() => Math.random().toString(36).substring(7));
  const [accessory, setAccessory] = useState("none");
  const [saving, setSaving] = useState(false);

  const generateAvatarUrl = () => {
    let url = `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;
    
    if (backgroundColor !== "transparent") {
      url += `&backgroundColor=${backgroundColor}`;
    }
    
    if (style === "avataaars") {
      url += `&hairColor=${hairColor}`;
      if (accessory === "glasses") {
        url += "&accessories=prescription01,prescription02,round";
        url += "&accessoriesProbability=100";
      } else if (accessory === "sunglasses") {
        url += "&accessories=sunglasses";
        url += "&accessoriesProbability=100";
      }
    }
    
    return url;
  };

  const handleRandomize = () => {
    setSeed(Math.random().toString(36).substring(7));
    setStyle(AVATAR_STYLES[Math.floor(Math.random() * AVATAR_STYLES.length)].id);
    setBackgroundColor(BACKGROUND_COLORS[Math.floor(Math.random() * BACKGROUND_COLORS.length)].id);
    setHairColor(HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)].id);
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
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setLocation("/profile")}
            className="p-2 rounded-xl hover:bg-muted transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-display font-bold">Crea Avatar</h1>
        </div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center mb-8"
        >
          <div 
            className="w-40 h-40 rounded-3xl border-4 border-primary overflow-hidden shadow-xl"
            style={{ backgroundColor: backgroundColor === "transparent" ? "#e5e7eb" : `#${backgroundColor}` }}
          >
            <img
              src={generateAvatarUrl()}
              alt="Avatar Preview"
              className="w-full h-full object-contain"
              data-testid="img-avatar-preview"
            />
          </div>
          <button
            onClick={handleRandomize}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-muted rounded-xl font-medium hover:bg-muted/80 transition-colors"
            data-testid="button-randomize"
          >
            <Shuffle className="w-4 h-4" />
            Casuale
          </button>
        </motion.div>

        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Stile Avatar
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {AVATAR_STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                    style === s.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                  data-testid={`button-style-${s.id}`}
                >
                  <span className="text-2xl">{s.icon}</span>
                  <span className="text-xs font-medium truncate w-full text-center">{s.name}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Sfondo
            </h3>
            <div className="flex flex-wrap gap-2">
              {BACKGROUND_COLORS.map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => setBackgroundColor(bg.id)}
                  className={`w-10 h-10 rounded-xl border-2 transition-all ${
                    backgroundColor === bg.id ? "border-primary scale-110" : "border-transparent"
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

          {style === "avataaars" && (
            <>
              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Colore Capelli
                </h3>
                <div className="flex flex-wrap gap-2">
                  {HAIR_COLORS.map((hc) => (
                    <button
                      key={hc.id}
                      onClick={() => setHairColor(hc.id)}
                      className={`w-10 h-10 rounded-full border-2 transition-all ${
                        hairColor === hc.id ? "border-primary scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: hc.color }}
                      title={hc.name}
                      data-testid={`button-hair-${hc.id}`}
                    />
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Accessori
                </h3>
                <div className="flex flex-wrap gap-2">
                  {ACCESSORY_OPTIONS.map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() => setAccessory(acc.id)}
                      className={`px-4 py-2 rounded-xl border transition-all ${
                        accessory === acc.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                      data-testid={`button-accessory-${acc.id}`}
                    >
                      {acc.name}
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}

          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Variante
            </h3>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((i) => {
                const variantSeed = `variant${i}`;
                return (
                  <button
                    key={i}
                    onClick={() => setSeed(variantSeed)}
                    className={`w-12 h-12 rounded-xl border overflow-hidden ${
                      seed === variantSeed ? "border-primary border-2" : "border-border"
                    }`}
                    data-testid={`button-variant-${i}`}
                  >
                    <img
                      src={`https://api.dicebear.com/7.x/${style}/svg?seed=${variantSeed}&backgroundColor=${backgroundColor}`}
                      alt={`Variant ${i}`}
                      className="w-full h-full object-contain"
                    />
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className="fixed bottom-20 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-background to-transparent pt-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground rounded-2xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
            data-testid="button-save-avatar"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Check className="w-5 h-5" />
            )}
            {saving ? "Salvataggio..." : "Salva Avatar"}
          </button>
        </div>
      </div>
    </Layout>
  );
}
