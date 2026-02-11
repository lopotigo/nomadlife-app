import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import Layout from "@/components/layout";
import { MapPin, ArrowLeft, Share2, Calendar, Plane, DollarSign, Globe, Star, Bed, Route, Leaf, ChevronDown, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareQRModal } from "@/components/share-qr-modal";
import { TripReplay } from "@/components/trip-replay";
import type { Trip, TripStop, User } from "@shared/schema";

type TripWithDetails = Trip & { stops: TripStop[]; user?: User };

function StarsDisplay({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} style={{ width: size, height: size }} className={i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"} />
      ))}
    </div>
  );
}

export default function TripDetail() {
  const [, params] = useRoute("/trip/:id");
  const [trip, setTrip] = useState<TripWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const [showReplay, setShowReplay] = useState(false);
  const [expandedStop, setExpandedStop] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrip = async () => {
      if (!params?.id) return;
      try {
        const res = await fetch(`/api/trips/${params.id}`, { credentials: "include" });
        if (res.ok) {
          setTrip(await res.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrip();
  }, [params?.id]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  if (!trip) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
          <h1 className="text-2xl font-bold mb-2">Viaggio non trovato</h1>
          <p className="text-muted-foreground mb-4">Il viaggio che stai cercando non esiste.</p>
          <Link href="/">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Torna alla mappa
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const sortedStops = [...(trip.stops || [])].sort((a, b) => a.orderIndex - b.orderIndex);
  const totalKm = sortedStops.reduce((sum, s) => sum + (s.distanceKm || 0), 0);
  const totalCo2 = sortedStops.reduce((sum, s) => sum + (s.co2Kg || 0), 0);
  const co2Car = totalKm * 0.171;
  const co2Saved = co2Car - totalCo2;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Indietro
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowReplay(true)} 
              className="border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10"
              data-testid="button-trip-replay"
            >
              <Play className="w-4 h-4 mr-1" />
              Replay
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowShare(true)} data-testid="button-share-trip">
              <Share2 className="w-4 h-4 mr-2" />
              Condividi
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-2xl overflow-hidden shadow-lg mb-6">
          {trip.imageUrl && (
            <div className="relative h-48">
              <img src={trip.imageUrl} className="w-full h-full object-cover" alt={trip.title} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex items-center gap-3">
                  <Plane className="w-8 h-8 text-white" />
                  <h1 className="text-2xl font-bold text-white">{trip.title}</h1>
                </div>
                {trip.description && <p className="text-white/80 mt-1">{trip.description}</p>}
              </div>
            </div>
          )}
          {!trip.imageUrl && (
            <div className="bg-gradient-to-r from-emerald-600 to-teal-500 p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <Plane className="w-8 h-8" />
                <h1 className="text-2xl font-bold">{trip.title}</h1>
              </div>
              {trip.description && <p className="text-white/80">{trip.description}</p>}
            </div>
          )}

          <div className="p-4">
            {trip.user && (
              <Link href={`/user/${trip.user.id}`}>
                <div className="flex items-center gap-2 mb-4 hover:bg-muted rounded-lg p-2 -m-2 transition-colors cursor-pointer">
                  <img 
                    src={trip.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${trip.user.username}`}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-200"
                    alt={trip.user.name || ""}
                  />
                  <div>
                    <p className="font-semibold text-sm">{trip.user.name}</p>
                    <p className="text-xs text-muted-foreground">@{trip.user.username}</p>
                  </div>
                </div>
              </Link>
            )}

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="flex items-center gap-2 text-muted-foreground bg-muted rounded-xl p-3">
                <Calendar className="w-4 h-4 text-emerald-500" />
                <span className="text-sm">
                  {trip.startDate ? new Date(trip.startDate).toLocaleDateString("it-IT") : "N/D"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground bg-muted rounded-xl p-3">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <span className="text-sm">{trip.totalBudget || 0} {trip.currency || "EUR"}</span>
              </div>
              {trip.startLocation && (
                <div className="flex items-center gap-2 text-muted-foreground bg-muted rounded-xl p-3">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm truncate">{trip.startLocation}</span>
                </div>
              )}
              {trip.endLocation && (
                <div className="flex items-center gap-2 text-muted-foreground bg-muted rounded-xl p-3">
                  <Globe className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm truncate">{trip.endLocation}</span>
                </div>
              )}
            </div>

            {totalKm > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-emerald-700">{totalKm}</p>
                  <p className="text-[10px] text-emerald-600">km totali</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-emerald-700">{sortedStops.length}</p>
                  <p className="text-[10px] text-emerald-600">tappe</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-emerald-700">{co2Saved > 0 ? `−${co2Saved.toFixed(0)}` : totalCo2}</p>
                  <p className="text-[10px] text-emerald-600">{co2Saved > 0 ? "kg CO₂ risparmiata" : "kg CO₂"}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 mb-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${trip.isPublic ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                {trip.isPublic ? "Pubblico" : "Privato"}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                trip.status === "completed" ? "bg-emerald-100 text-emerald-700" : 
                trip.status === "in_progress" ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground"
              }`}>
                {trip.status === "completed" ? "Completato" : trip.status === "in_progress" ? "In corso" : "Pianificato"}
              </span>
            </div>
          </div>
        </div>

        {sortedStops.length > 0 && (
          <div className="bg-card rounded-2xl p-4 shadow-lg">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Route className="w-5 h-5 text-emerald-500" />
              Tappe del viaggio
            </h2>
            <div className="space-y-3">
              {sortedStops.map((stop, index) => (
                <div key={stop.id} className="relative pl-10 pb-2">
                  <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-emerald-400 to-emerald-200 ml-4" />
                  <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold shadow-md z-10">
                    {index + 1}
                  </div>
                  
                  <button 
                    onClick={() => setExpandedStop(expandedStop === stop.id ? null : stop.id)}
                    className={`w-full text-left rounded-xl transition-all ${expandedStop === stop.id ? "bg-emerald-50 ring-1 ring-emerald-200" : "hover:bg-muted"}`}
                  >
                    <div className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div>
                            <h3 className="font-bold text-sm">{stop.city}</h3>
                            <p className="text-xs text-muted-foreground">{stop.country}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {stop.rating && <StarsDisplay rating={stop.rating} size={12} />}
                          {stop.imageUrl && (
                            <img src={stop.imageUrl} className="w-10 h-10 rounded-lg object-cover" alt="" />
                          )}
                          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedStop === stop.id ? "rotate-180" : ""}`} />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(stop.arrivalDate).toLocaleDateString("it-IT")}
                          {stop.departureDate && ` → ${new Date(stop.departureDate).toLocaleDateString("it-IT")}`}
                        </span>
                        {stop.transportMode && <span className="capitalize">{stop.transportMode}</span>}
                        {stop.distanceKm && <span>{stop.distanceKm} km</span>}
                      </div>
                    </div>
                  </button>

                  {expandedStop === stop.id && (
                    <div className="mt-1 rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                      {stop.imageUrl && (
                        <img src={stop.imageUrl} className="w-full h-40 object-cover" alt={stop.city} />
                      )}
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold">{stop.city}, {stop.country}</h4>
                          {stop.rating && <StarsDisplay rating={stop.rating} size={16} />}
                        </div>

                        {stop.accommodationName && (
                          <div className="flex items-center gap-3 bg-blue-50 text-blue-700 rounded-xl px-3 py-2.5">
                            <Bed className="w-5 h-5 shrink-0" />
                            <div>
                              <p className="font-semibold text-sm">{stop.accommodationName}</p>
                              {stop.accommodationType && <p className="text-blue-500 text-xs capitalize">{stop.accommodationType}</p>}
                            </div>
                            {stop.rating && (
                              <div className="ml-auto">
                                <StarsDisplay rating={stop.rating} size={14} />
                              </div>
                            )}
                          </div>
                        )}

                        {stop.notes && (
                          <div className="bg-muted rounded-xl p-3">
                            <p className="text-sm text-muted-foreground italic">"{stop.notes}"</p>
                          </div>
                        )}

                        {stop.transportMode && (
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="capitalize flex items-center gap-1">
                              <Route className="w-3.5 h-3.5" /> {stop.transportMode}
                            </span>
                            {stop.distanceKm && <span>{stop.distanceKm} km</span>}
                            {stop.co2Kg ? (
                              <span className="flex items-center gap-1 text-emerald-600">
                                <Leaf className="w-3.5 h-3.5" /> {stop.co2Kg} kg CO₂
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showShare && (
        <ShareQRModal
          open={showShare}
          onClose={() => setShowShare(false)}
          type="trip"
          id={trip.id}
          title={trip.title}
        />
      )}

      {showReplay && (
        <TripReplay
          tripTitle={trip.title}
          stops={sortedStops}
          userAvatar={trip.user?.avatar || undefined}
          userName={trip.user?.name || trip.user?.username}
          onClose={() => setShowReplay(false)}
        />
      )}
    </Layout>
  );
}
