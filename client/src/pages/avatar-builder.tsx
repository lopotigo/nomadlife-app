import { useState } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { ArrowLeft, Check, Shuffle, Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const AVATAR_STYLES = [
  { id: "lorelei", name: "Artistico", icon: "🎨", hasBody: true },
  { id: "notionists", name: "Notion", icon: "📝", hasBody: true },
  { id: "personas", name: "Persona", icon: "🧍", hasBody: true },
  { id: "avataaars", name: "Cartoon", icon: "🧑", hasBody: false },
  { id: "adventurer", name: "Avventuriero", icon: "🗺️", hasBody: false },
  { id: "big-ears", name: "Orecchie", icon: "👂", hasBody: false },
  { id: "big-smile", name: "Sorriso", icon: "😄", hasBody: false },
  { id: "bottts", name: "Robot", icon: "🤖", hasBody: false },
  { id: "fun-emoji", name: "Emoji", icon: "😎", hasBody: false },
  { id: "micah", name: "Moderno", icon: "✨", hasBody: false },
  { id: "pixel-art", name: "Pixel", icon: "👾", hasBody: false },
  { id: "thumbs", name: "Pollice", icon: "👍", hasBody: false },
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
  { id: "f43f5e", name: "Rosa Acceso", color: "#f43f5e" },
];

const SKIN_COLORS = [
  { id: "f8d5c7", name: "Chiaro", color: "#f8d5c7" },
  { id: "edb98a", name: "Medio Chiaro", color: "#edb98a" },
  { id: "d08b5b", name: "Medio", color: "#d08b5b" },
  { id: "ae5d29", name: "Medio Scuro", color: "#ae5d29" },
  { id: "614335", name: "Scuro", color: "#614335" },
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
  { id: "10b981", name: "Verde", color: "#10b981" },
];

const CLOTHING_COLORS = [
  { id: "3b82f6", name: "Blu", color: "#3b82f6" },
  { id: "ef4444", name: "Rosso", color: "#ef4444" },
  { id: "22c55e", name: "Verde", color: "#22c55e" },
  { id: "f59e0b", name: "Arancione", color: "#f59e0b" },
  { id: "8b5cf6", name: "Viola", color: "#8b5cf6" },
  { id: "ec4899", name: "Rosa", color: "#ec4899" },
  { id: "1e293b", name: "Nero", color: "#1e293b" },
  { id: "f8fafc", name: "Bianco", color: "#f8fafc" },
  { id: "78716c", name: "Grigio", color: "#78716c" },
];

const ACCESSORY_OPTIONS = [
  { id: "none", name: "Nessuno", icon: "❌" },
  { id: "glasses", name: "Occhiali", icon: "👓" },
  { id: "sunglasses", name: "Da Sole", icon: "🕶️" },
];

const FACIAL_HAIR_OPTIONS = [
  { id: "none", name: "Nessuna", icon: "😶" },
  { id: "beard", name: "Barba", icon: "🧔" },
  { id: "mustache", name: "Baffi", icon: "👨" },
];

export default function AvatarBuilder() {
  const { user, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [style, setStyle] = useState("lorelei");
  const [backgroundColor, setBackgroundColor] = useState("b6e3f4");
  const [skinColor, setSkinColor] = useState("edb98a");
  const [hairColor, setHairColor] = useState("4a3728");
  const [clothingColor, setClothingColor] = useState("3b82f6");
  const [seed, setSeed] = useState(() => Math.random().toString(36).substring(7));
  const [accessory, setAccessory] = useState("none");
  const [facialHair, setFacialHair] = useState("none");
  const [saving, setSaving] = useState(false);

  const currentStyle = AVATAR_STYLES.find(s => s.id === style);
  const hasBody = currentStyle?.hasBody || false;

  const generateAvatarUrl = () => {
    let url = `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;
    
    if (backgroundColor !== "transparent") {
      url += `&backgroundColor=${backgroundColor}`;
    }

    if (style === "lorelei" || style === "notionists") {
      url += `&skinColor=${skinColor}`;
      url += `&hair=${hairColor}`;
    }

    if (style === "personas") {
      url += `&skinColor=${skinColor}`;
      url += `&clothingColor=${clothingColor}`;
    }
    
    if (style === "avataaars") {
      url += `&hairColor=${hairColor}`;
      url += `&skinColor=${skinColor}`;
      if (accessory === "glasses") {
        url += "&accessories=prescription01,prescription02,round";
        url += "&accessoriesProbability=100";
      } else if (accessory === "sunglasses") {
        url += "&accessories=sunglasses";
        url += "&accessoriesProbability=100";
      }
      if (facialHair === "beard") {
        url += "&facialHair=beardLight,beardMedium,beardMajestic";
        url += "&facialHairProbability=100";
      } else if (facialHair === "mustache") {
        url += "&facialHair=moustacheFancy,moustacheMagnum";
        url += "&facialHairProbability=100";
      }
    }
    
    return url;
  };

  const handleRandomize = () => {
    setSeed(Math.random().toString(36).substring(7));
    setStyle(AVATAR_STYLES[Math.floor(Math.random() * AVATAR_STYLES.length)].id);
    setBackgroundColor(BACKGROUND_COLORS[Math.floor(Math.random() * BACKGROUND_COLORS.length)].id);
    setSkinColor(SKIN_COLORS[Math.floor(Math.random() * SKIN_COLORS.length)].id);
    setHairColor(HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)].id);
    setClothingColor(CLOTHING_COLORS[Math.floor(Math.random() * CLOTHING_COLORS.length)].id);
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
      <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
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
            className={`${hasBody ? 'w-48 h-64' : 'w-40 h-40'} rounded-3xl border-4 border-primary overflow-hidden shadow-xl transition-all duration-300`}
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
              Casuale
            </button>
            {hasBody && (
              <span className="px-3 py-1 bg-primary/20 text-primary text-xs font-bold rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Corpo intero
              </span>
            )}
          </div>
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
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all relative ${
                    style === s.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                  data-testid={`button-style-${s.id}`}
                >
                  {s.hasBody && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center text-[8px]">
                      🧍
                    </span>
                  )}
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

          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
              🎨 Carnagione
            </h3>
            <div className="flex flex-wrap gap-2">
              {SKIN_COLORS.map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => setSkinColor(sc.id)}
                  className={`w-10 h-10 rounded-full border-2 transition-all ${
                    skinColor === sc.id ? "border-primary scale-110 ring-2 ring-primary/30" : "border-white/50"
                  }`}
                  style={{ backgroundColor: sc.color }}
                  title={sc.name}
                  data-testid={`button-skin-${sc.id}`}
                />
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
              💇 Colore Capelli
            </h3>
            <div className="flex flex-wrap gap-2">
              {HAIR_COLORS.map((hc) => (
                <button
                  key={hc.id}
                  onClick={() => setHairColor(hc.id)}
                  className={`w-10 h-10 rounded-full border-2 transition-all ${
                    hairColor === hc.id ? "border-primary scale-110 ring-2 ring-primary/30" : "border-transparent"
                  }`}
                  style={{ backgroundColor: hc.color }}
                  title={hc.name}
                  data-testid={`button-hair-${hc.id}`}
                />
              ))}
            </div>
          </section>

          {(style === "personas" || hasBody) && (
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
                👕 Colore Vestiti
              </h3>
              <div className="flex flex-wrap gap-2">
                {CLOTHING_COLORS.map((cc) => (
                  <button
                    key={cc.id}
                    onClick={() => setClothingColor(cc.id)}
                    className={`w-10 h-10 rounded-xl border-2 transition-all ${
                      clothingColor === cc.id ? "border-primary scale-110 ring-2 ring-primary/30" : "border-transparent"
                    }`}
                    style={{ backgroundColor: cc.color }}
                    title={cc.name}
                    data-testid={`button-clothing-${cc.id}`}
                  />
                ))}
              </div>
            </section>
          )}

          {style === "avataaars" && (
            <>
              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  👓 Accessori Viso
                </h3>
                <div className="flex flex-wrap gap-2">
                  {ACCESSORY_OPTIONS.map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() => setAccessory(acc.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                        accessory === acc.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                      data-testid={`button-accessory-${acc.id}`}
                    >
                      <span>{acc.icon}</span>
                      <span className="text-sm font-medium">{acc.name}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  🧔 Barba / Baffi
                </h3>
                <div className="flex flex-wrap gap-2">
                  {FACIAL_HAIR_OPTIONS.map((fh) => (
                    <button
                      key={fh.id}
                      onClick={() => setFacialHair(fh.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                        facialHair === fh.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                      data-testid={`button-facial-${fh.id}`}
                    >
                      <span>{fh.icon}</span>
                      <span className="text-sm font-medium">{fh.name}</span>
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}

          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
              🎲 Varianti
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
                const variantSeed = `variant${i}`;
                return (
                  <button
                    key={i}
                    onClick={() => setSeed(variantSeed)}
                    className={`flex-shrink-0 ${hasBody ? 'w-16 h-20' : 'w-14 h-14'} rounded-xl border-2 overflow-hidden transition-all ${
                      seed === variantSeed ? "border-primary scale-105" : "border-border hover:border-primary/50"
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

          <div className="pt-4">
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
          </div>
        </div>
      </div>
    </Layout>
  );
}
