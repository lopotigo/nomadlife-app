import { useState, useEffect } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  Users, Handshake, Navigation, Loader2, MessageSquare, User as UserIcon, MapPin, X, Plus
} from "lucide-react";

interface NomadResult {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  profession: string | null;
  skills: string[] | null;
  lookingFor: string | null;
  distance: number;
}

const skillColors = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
];

export default function Matchmaking() {
  const { user } = useAuth();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"loading" | "ok" | "error">("loading");
  const [radius, setRadius] = useState(5);
  const [skillsFilter, setSkillsFilter] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus("error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus("ok");
      },
      () => setGpsStatus("error"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const { data: nomads = [], isLoading } = useQuery<NomadResult[]>({
    queryKey: ["/api/matchmaking/nearby", coords?.lat, coords?.lng, radius, skillsFilter.join(",")],
    queryFn: () => {
      const params = new URLSearchParams({
        lat: String(coords!.lat),
        lng: String(coords!.lng),
        radius: String(radius),
      });
      if (skillsFilter.length > 0) params.set("skills", skillsFilter.join(","));
      return apiRequest("GET", `/api/matchmaking/nearby?${params}`).then(r => r.json());
    },
    enabled: !!coords && !!user,
  });

  const addSkill = () => {
    const s = skillInput.trim().toLowerCase();
    if (s && !skillsFilter.includes(s)) {
      setSkillsFilter([...skillsFilter, s]);
    }
    setSkillInput("");
  };

  const removeSkill = (skill: string) => {
    setSkillsFilter(skillsFilter.filter(s => s !== skill));
  };

  const getInitials = (name: string) =>
    name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Handshake className="w-7 h-7 text-primary" />
            Matchmaking Professionale
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Trova collaboratori vicino a te</p>
        </motion.div>

        {gpsStatus === "loading" && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm p-4 bg-secondary/50 rounded-xl">
            <Loader2 className="w-4 h-4 animate-spin" />
            Rilevamento posizione GPS...
          </div>
        )}

        {gpsStatus === "error" && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-xl text-sm" data-testid="text-gps-error">
            <Navigation className="w-4 h-4 inline mr-2" />
            GPS non disponibile. Abilita la geolocalizzazione per usare il matchmaking.
          </div>
        )}

        {gpsStatus === "ok" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 bg-secondary/30 rounded-2xl p-4"
          >
            <div>
              <label className="text-sm font-medium flex items-center justify-between">
                <span>Raggio di ricerca</span>
                <span className="text-primary font-bold">{radius} km</span>
              </label>
              <input
                data-testid="input-radius"
                type="range"
                min={1}
                max={10}
                value={radius}
                onChange={e => setRadius(Number(e.target.value))}
                className="w-full mt-2 accent-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Filtra per competenze</label>
              <div className="flex gap-2">
                <input
                  data-testid="input-skill"
                  type="text"
                  value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addSkill()}
                  placeholder="Aggiungi skill..."
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  data-testid="button-add-skill"
                  onClick={addSkill}
                  className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {skillsFilter.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {skillsFilter.map(skill => (
                    <span
                      key={skill}
                      className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium"
                    >
                      {skill}
                      <button onClick={() => removeSkill(skill)} data-testid={`button-remove-skill-${skill}`}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : nomads.length === 0 && gpsStatus === "ok" ? (
          <div className="text-center py-16" data-testid="text-empty-state">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">Nessun nomade trovato</p>
            <p className="text-muted-foreground/70 text-sm mt-1">Prova ad aumentare il raggio o cambia i filtri</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {nomads.map((nomad, i) => (
              <motion.div
                key={nomad.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-shadow"
                data-testid={`card-nomad-${nomad.id}`}
              >
                <div className="flex items-start gap-3">
                  {nomad.avatar ? (
                    <img
                      src={nomad.avatar}
                      alt={nomad.name}
                      className="w-12 h-12 rounded-full object-cover"
                      data-testid={`img-avatar-${nomad.id}`}
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm"
                      data-testid={`img-avatar-${nomad.id}`}
                    >
                      {getInitials(nomad.name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm" data-testid={`text-name-${nomad.id}`}>{nomad.name}</h3>
                    <p className="text-muted-foreground text-xs">@{nomad.username}</p>
                  </div>
                  <span
                    className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-full font-medium"
                    data-testid={`badge-distance-${nomad.id}`}
                  >
                    <MapPin className="w-3 h-3" />
                    {nomad.distance < 1 ? `${Math.round(nomad.distance * 1000)} m` : `${nomad.distance.toFixed(1)} km`}
                  </span>
                </div>

                {nomad.profession && (
                  <span
                    className="inline-block mt-3 px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium"
                    data-testid={`badge-profession-${nomad.id}`}
                  >
                    {nomad.profession}
                  </span>
                )}

                {nomad.skills && nomad.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {nomad.skills.map((skill, idx) => (
                      <span
                        key={skill}
                        className={`px-2 py-0.5 text-xs rounded-md font-medium ${skillColors[idx % skillColors.length]}`}
                        data-testid={`tag-skill-${nomad.id}-${skill}`}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                {nomad.lookingFor && (
                  <p className="text-xs text-muted-foreground mt-3" data-testid={`text-looking-for-${nomad.id}`}>
                    <span className="font-medium">Cerca:</span> {nomad.lookingFor}
                  </p>
                )}

                <div className="flex gap-2 mt-4">
                  <Link href="/chat" className="flex-1">
                    <button
                      data-testid={`button-message-${nomad.id}`}
                      className="w-full flex items-center justify-center gap-1.5 py-2 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Messaggio
                    </button>
                  </Link>
                  <Link href={`/user/${nomad.id}`} className="flex-1">
                    <button
                      data-testid={`button-profile-${nomad.id}`}
                      className="w-full flex items-center justify-center gap-1.5 py-2 bg-secondary text-secondary-foreground text-xs font-medium rounded-lg hover:bg-secondary/80 transition-colors"
                    >
                      <UserIcon className="w-3.5 h-3.5" />
                      Profilo
                    </button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
