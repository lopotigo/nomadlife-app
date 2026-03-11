import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Users, ShoppingBag, Compass, MapPin, Sparkles, RefreshCw,
  Search, Globe, Calendar, Wifi, Shield, DollarSign, Star, ChevronRight,
  User, ArrowRight, Loader2, CheckCircle, Clock, Plane, Tag,
  Home, Map, MessageSquare, Bell, Heart, ExternalLink, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/layout";
import type { Product } from "@shared/schema";
import { usePageTitle } from "@/hooks/use-page-title";

type UserInterest = {
  id: string;
  userId: string;
  category: string;
  tag: string;
  confidence: number;
  source: string;
};

type NomadCheckin = {
  id: string;
  username: string;
  name: string;
  avatar: string | null;
  bio: string | null;
  status: string;
  city: string;
  country: string;
  arrivalDate: string | null;
  departureDate: string | null;
  note: string | null;
};

type TravelSuggestion = {
  city: string;
  country: string;
  reason: string;
  dailyBudget: number;
  bestTime: string;
  nomadScore: { wifi: number; community: number; cost: number; safety: number };
  insiderTip: string;
};

type SuggestedConnection = {
  user: { id: string; username: string; name: string; avatar: string | null; bio: string | null };
  checkin: { city: string; country: string; status: string };
  reason: string;
  commonInterests: string[];
  matchScore: number;
};

type SmartProduct = Product & { aiReason?: string; matchScore?: number };

const TABS = [
  { id: "profile", label: "Profilo AI", icon: Brain },
  { id: "discover", label: "Scopri Nomadi", icon: Users },
  { id: "products", label: "Per Te", icon: ShoppingBag },
  { id: "travel", label: "Viaggi AI", icon: Compass },
];

const INTEREST_COLORS: Record<string, string> = {
  food: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  lifestyle: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  transport: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  accommodation: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  activity: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  budget: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  climate: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  tech: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  social: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
};

export default function AiSocialHub() {
  usePageTitle("AI Social Hub");
  const { user } = useAuth();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState("profile");

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 text-center max-w-sm">
          <Brain className="w-12 h-12 mx-auto mb-4 text-emerald-500" />
          <h2 className="text-xl font-bold mb-2">AI Social Hub</h2>
          <p className="text-muted-foreground mb-4">Accedi per scoprire le funzionalità AI personalizzate</p>
          <Link href="/auth">
            <Button className="bg-emerald-500 hover:bg-emerald-600">Accedi</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <Layout>
      <div data-testid="ai-social-hub-page">
        <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border/40 p-4 flex items-center gap-3">
          <Brain className="w-6 h-6 text-emerald-500" />
          <div>
            <h1 className="text-xl font-display font-bold" data-testid="text-page-title">AI Social Hub</h1>
            <p className="text-xs text-muted-foreground">Il tuo assistente intelligente</p>
          </div>
        </header>

        <div className="p-4">
          <div className="flex gap-1 mb-6 bg-muted/50 rounded-xl p-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "profile" && <ProfileTab key="profile" />}
            {activeTab === "discover" && <DiscoverTab key="discover" />}
            {activeTab === "products" && <ProductsTab key="products" />}
            {activeTab === "travel" && <TravelTab key="travel" />}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
}

function ProfileTab() {
  const { data: profile, isLoading } = useQuery<{ interests: UserInterest[] }>({
    queryKey: ["/api/ai/my-profile"],
    queryFn: () => apiRequest("GET", "/api/ai/my-profile").then(r => r.json()),
  });

  const analyzeMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/ai/analyze-profile").then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/ai/my-profile"] }),
  });

  const connectionsMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/ai/suggest-connections").then(r => r.json()),
  });

  const interests = profile?.interests || [];
  const grouped = interests.reduce((acc: Record<string, UserInterest[]>, i) => {
    if (!acc[i.category]) acc[i.category] = [];
    acc[i.category].push(i);
    return acc;
  }, {});

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Il tuo profilo AI</h3>
                <p className="text-[11px] text-muted-foreground">L'AI analizza le tue attività per conoscerti</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs px-3"
              data-testid="button-analyze-profile"
            >
              {analyzeMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              <span className="ml-1">{analyzeMutation.isPending ? "Analizzo..." : "Analizza"}</span>
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
          ) : interests.length === 0 ? (
            <div className="text-center py-8">
              <Sparkles className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground mb-1">Nessun profilo AI ancora</p>
              <p className="text-xs text-muted-foreground/70">Premi "Analizza" per far analizzare le tue attività all'AI</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(grouped).map(([category, tags]) => (
                <div key={category}>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1.5 tracking-wider">{category}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map(tag => (
                      <div
                        key={tag.id}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${INTEREST_COLORS[category] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}
                        data-testid={`interest-tag-${tag.tag}`}
                      >
                        <Tag className="w-2.5 h-2.5" />
                        {tag.tag.replace(/_/g, " ")}
                        <span className="text-[9px] opacity-60">{Math.round(tag.confidence * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Nomadi affini</h3>
                <p className="text-[11px] text-muted-foreground">L'AI trova nomadi con interessi simili ai tuoi</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => connectionsMutation.mutate()}
              disabled={connectionsMutation.isPending}
              variant="outline"
              className="rounded-full text-xs px-3"
              data-testid="button-suggest-connections"
            >
              {connectionsMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
              <span className="ml-1">Trova</span>
            </Button>
          </div>

          {connectionsMutation.data?.connections?.length > 0 ? (
            <div className="space-y-3">
              {connectionsMutation.data.connections.map((conn: SuggestedConnection) => (
                <Link key={conn.user.id} href={`/user/${conn.user.id}`}>
                  <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
                    {conn.user.avatar ? (
                      <img src={conn.user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                        {conn.user.name?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-sm truncate">{conn.user.username}</p>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">{Math.round(conn.matchScore * 100)}%</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{conn.reason}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="w-2.5 h-2.5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{conn.checkin.city}, {conn.checkin.country}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          ) : connectionsMutation.data ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nessun nomade trovato. Fai check-in per trovare connessioni!</p>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">Premi "Trova" per scoprire nomadi affini a te</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function DiscoverTab() {
  const [searchCity, setSearchCity] = useState("");
  const [searchCountry, setSearchCountry] = useState("");
  const [checkinCity, setCheckinCity] = useState("");
  const [checkinCountry, setCheckinCountry] = useState("");
  const [checkinStatus, setCheckinStatus] = useState("here_now");
  const [showCheckin, setShowCheckin] = useState(false);

  const { data: myCheckins } = useQuery({
    queryKey: ["/api/ai/checkins"],
    queryFn: () => apiRequest("GET", "/api/ai/checkins").then(r => r.json()),
  });

  const { data: popular } = useQuery({
    queryKey: ["/api/ai/popular-destinations"],
    queryFn: () => apiRequest("GET", "/api/ai/popular-destinations").then(r => r.json()),
  });

  const searchMutation = useMutation({
    mutationFn: () => {
      const params = new URLSearchParams();
      if (searchCity) params.set("city", searchCity);
      if (searchCountry) params.set("country", searchCountry);
      return apiRequest("GET", `/api/ai/discover-nomads?${params}`).then(r => r.json());
    },
  });

  const checkinMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/ai/checkin", {
      city: checkinCity,
      country: checkinCountry,
      status: checkinStatus,
    }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/checkins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/popular-destinations"] });
      setShowCheckin(false);
      setCheckinCity("");
      setCheckinCountry("");
    },
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Il tuo check-in</h3>
              <p className="text-[11px] text-muted-foreground">Fai sapere dove sei o dove stai andando</p>
            </div>
          </div>

          {myCheckins && myCheckins.length > 0 ? (
            <div className="mb-3">
              {myCheckins.map((c: any) => (
                <div key={c.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                  <div className={`w-2.5 h-2.5 rounded-full ${c.status === "here_now" ? "bg-green-500" : c.status === "arriving_soon" ? "bg-yellow-500" : "bg-blue-500"}`} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{c.city}, {c.country}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {c.status === "here_now" ? "Sono qui adesso" : c.status === "arriving_soon" ? "Sto arrivando" : "Sto pianificando"}
                    </p>
                  </div>
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                </div>
              ))}
            </div>
          ) : null}

          {!showCheckin ? (
            <Button
              onClick={() => setShowCheckin(true)}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
              data-testid="button-new-checkin"
            >
              <MapPin className="w-4 h-4 mr-2" />
              {myCheckins?.length > 0 ? "Aggiorna posizione" : "Fai check-in"}
            </Button>
          ) : (
            <div className="space-y-3 p-3 rounded-xl bg-muted/50">
              <input
                value={checkinCity}
                onChange={e => setCheckinCity(e.target.value)}
                placeholder="Città (es. Bangkok)"
                className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm"
                data-testid="input-checkin-city"
              />
              <input
                value={checkinCountry}
                onChange={e => setCheckinCountry(e.target.value)}
                placeholder="Paese (es. Thailandia)"
                className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm"
                data-testid="input-checkin-country"
              />
              <div className="flex gap-2">
                {[
                  { value: "here_now", label: "Sono qui", icon: CheckCircle, color: "bg-green-500" },
                  { value: "arriving_soon", label: "In arrivo", icon: Clock, color: "bg-yellow-500" },
                  { value: "planning", label: "Pianifico", icon: Calendar, color: "bg-blue-500" },
                ].map(s => (
                  <button
                    key={s.value}
                    onClick={() => setCheckinStatus(s.value)}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all ${
                      checkinStatus === s.value
                        ? `${s.color} text-white`
                        : "bg-background border text-muted-foreground"
                    }`}
                    data-testid={`button-status-${s.value}`}
                  >
                    <s.icon className="w-3 h-3" />
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowCheckin(false)}
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-lg"
                >
                  Annulla
                </Button>
                <Button
                  onClick={() => checkinMutation.mutate()}
                  disabled={!checkinCity || !checkinCountry || checkinMutation.isPending}
                  size="sm"
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg"
                  data-testid="button-submit-checkin"
                >
                  {checkinMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Check-in"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center">
              <Search className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Cerca nomadi</h3>
              <p className="text-[11px] text-muted-foreground">Trova chi è nella tua prossima destinazione</p>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <input
              value={searchCity}
              onChange={e => setSearchCity(e.target.value)}
              placeholder="Città..."
              className="flex-1 px-3 py-2.5 rounded-lg border bg-background text-sm"
              data-testid="input-search-city"
            />
            <input
              value={searchCountry}
              onChange={e => setSearchCountry(e.target.value)}
              placeholder="Paese..."
              className="flex-1 px-3 py-2.5 rounded-lg border bg-background text-sm"
              data-testid="input-search-country"
            />
            <Button
              onClick={() => searchMutation.mutate()}
              disabled={(!searchCity && !searchCountry) || searchMutation.isPending}
              size="sm"
              className="bg-violet-500 hover:bg-violet-600 text-white rounded-lg px-4"
              data-testid="button-search-nomads"
            >
              {searchMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>

          {searchMutation.data ? (
            searchMutation.data.nomads?.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-2">
                  {searchMutation.data.count} nomadi trovati {searchMutation.data.city && `a ${searchMutation.data.city}`}
                </p>
                {searchMutation.data.nomads.map((nomad: NomadCheckin) => (
                  <Link key={nomad.id} href={`/user/${nomad.id}`}>
                    <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer" data-testid={`nomad-card-${nomad.id}`}>
                      {nomad.avatar ? (
                        <img src={nomad.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                          {nomad.name?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{nomad.username}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{nomad.bio || nomad.name}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${nomad.status === "here_now" ? "bg-green-500" : nomad.status === "arriving_soon" ? "bg-yellow-500" : "bg-blue-500"}`} />
                        <span className="text-[10px] text-muted-foreground">
                          {nomad.status === "here_now" ? "Qui ora" : nomad.status === "arriving_soon" ? "In arrivo" : "Pianifica"}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Globe className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Nessun nomade trovato in questa zona</p>
                <p className="text-xs text-muted-foreground/70">Sii il primo a fare check-in!</p>
              </div>
            )
          ) : null}
        </CardContent>
      </Card>

      {popular?.destinations?.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-500" />
              Destinazioni popolari
            </h3>
            <div className="space-y-2">
              {popular.destinations.map((d: any, i: number) => (
                <button
                  key={i}
                  onClick={() => { setSearchCity(d.city); setSearchCountry(d.country); searchMutation.mutate(); }}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <span className="text-lg font-bold text-muted-foreground/40 w-6">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{d.city}, {d.country}</p>
                    <p className="text-[10px] text-muted-foreground">{d.nomad_count} nomadi ({d.here_now_count} qui ora)</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

function ProductsTab() {
  const { data, isLoading } = useQuery<{ recommendations: SmartProduct[]; reason: string; profileComplete: boolean }>({
    queryKey: ["/api/ai/smart-products"],
    queryFn: () => apiRequest("GET", "/api/ai/smart-products").then(r => r.json()),
  });

  const products = data?.recommendations || [];

  const formatPrice = (price: number | null, currency: string | null) => {
    if (!price) return "Gratis";
    return new Intl.NumberFormat("it-IT", { style: "currency", currency: currency || "EUR" }).format(price);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
          <ShoppingBag className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-sm">Prodotti per te</h3>
          <p className="text-[11px] text-muted-foreground">
            {data?.reason === "personalized"
              ? "Selezionati dall'AI in base al tuo profilo"
              : "Analizza il tuo profilo per raccomandazioni personalizzate"}
          </p>
        </div>
      </div>

      {!data?.profileComplete && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>Vai su "Profilo AI" e premi "Analizza" per ottenere raccomandazioni personalizzate!</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingBag className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Nessun prodotto disponibile</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden" data-testid={`product-card-${product.id}`}>
              <CardContent className="p-0">
                <div className="flex gap-3 p-3">
                  {product.imageUrl && (
                    <img src={product.imageUrl} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm truncate">{product.name}</p>
                        <Badge variant="outline" className="text-[9px] mt-0.5">{product.category}</Badge>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm text-emerald-600">{formatPrice(product.price, product.currency)}</p>
                        {product.originalPrice && product.originalPrice > (product.price || 0) && (
                          <p className="text-[10px] text-muted-foreground line-through">{formatPrice(product.originalPrice, product.currency)}</p>
                        )}
                      </div>
                    </div>
                    {product.description && (
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
                    )}
                    {product.aiReason && (
                      <div className="flex items-center gap-1 mt-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/20 rounded-md">
                        <Sparkles className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400">{product.aiReason}</span>
                      </div>
                    )}
                  </div>
                </div>
                {product.affiliateUrl && (
                  <a
                    href={product.affiliateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2 border-t text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors"
                    data-testid={`button-buy-${product.id}`}
                  >
                    <ExternalLink className="w-3 h-3" />
                    Scopri di più
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function TravelTab() {
  const [currentCity, setCurrentCity] = useState("");
  const [budget, setBudget] = useState("");
  const [duration, setDuration] = useState("");
  const [preferences, setPreferences] = useState("");

  const suggestionsMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/ai/travel-suggestions", {
      currentCity: currentCity || undefined,
      budget: budget || undefined,
      duration: duration || undefined,
      preferences: preferences || undefined,
    }).then(r => r.json()),
  });

  const suggestions: TravelSuggestion[] = suggestionsMutation.data?.suggestions || [];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <Plane className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Suggerimenti AI</h3>
              <p className="text-[11px] text-muted-foreground">Destinazioni personalizzate in base al tuo profilo</p>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <input
              value={currentCity}
              onChange={e => setCurrentCity(e.target.value)}
              placeholder="Dove sei ora? (opzionale)"
              className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm"
              data-testid="input-travel-city"
            />
            <div className="flex gap-2">
              <input
                value={budget}
                onChange={e => setBudget(e.target.value)}
                placeholder="Budget (es. 50$/giorno)"
                className="flex-1 px-3 py-2.5 rounded-lg border bg-background text-sm"
                data-testid="input-travel-budget"
              />
              <input
                value={duration}
                onChange={e => setDuration(e.target.value)}
                placeholder="Durata (es. 2 settimane)"
                className="flex-1 px-3 py-2.5 rounded-lg border bg-background text-sm"
                data-testid="input-travel-duration"
              />
            </div>
            <input
              value={preferences}
              onChange={e => setPreferences(e.target.value)}
              placeholder="Preferenze (es. spiaggia, surf, cibo locale...)"
              className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm"
              data-testid="input-travel-preferences"
            />
          </div>

          <Button
            onClick={() => suggestionsMutation.mutate()}
            disabled={suggestionsMutation.isPending}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-xl"
            data-testid="button-get-suggestions"
          >
            {suggestionsMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" />L'AI sta pensando...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" />Genera suggerimenti</>
            )}
          </Button>
        </CardContent>
      </Card>

      {suggestions.length > 0 && (
        <div className="space-y-3">
          {suggestions.map((s, i) => (
            <Card key={i} data-testid={`suggestion-card-${i}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-bold">{s.city}</h4>
                    <p className="text-xs text-muted-foreground">{s.country}</p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">
                    ~${s.dailyBudget}/giorno
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground mb-3">{s.reason}</p>

                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[
                    { label: "WiFi", value: s.nomadScore.wifi, icon: Wifi },
                    { label: "Community", value: s.nomadScore.community, icon: Users },
                    { label: "Costo", value: s.nomadScore.cost, icon: DollarSign },
                    { label: "Sicurezza", value: s.nomadScore.safety, icon: Shield },
                  ].map(score => (
                    <div key={score.label} className="text-center p-2 rounded-lg bg-muted/50">
                      <score.icon className="w-3.5 h-3.5 mx-auto mb-0.5 text-muted-foreground" />
                      <p className="text-xs font-bold">{score.value}/10</p>
                      <p className="text-[9px] text-muted-foreground">{score.label}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Periodo migliore: {s.bestTime}</span>
                </div>

                <div className="mt-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
                    <Star className="w-3 h-3 shrink-0" />
                    <span className="font-medium">Insider tip:</span> {s.insiderTip}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}
