import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import Layout from "@/components/layout";
import { MapPin, ArrowLeft, Share2, Calendar, Plane, DollarSign, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareQRModal } from "@/components/share-qr-modal";
import type { Trip, TripStop, User } from "@shared/schema";

type TripWithDetails = Trip & { stops: TripStop[]; user?: User };

export default function TripDetail() {
  const [, params] = useRoute("/trip/:id");
  const [trip, setTrip] = useState<TripWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);

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
          <Button variant="outline" size="sm" onClick={() => setShowShare(true)} data-testid="button-share-trip">
            <Share2 className="w-4 h-4 mr-2" />
            Condividi
          </Button>
        </div>

        <div className="bg-card rounded-2xl overflow-hidden shadow-lg mb-6">
          <div className="bg-gradient-to-r from-primary to-primary/70 p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <Plane className="w-8 h-8" />
              <h1 className="text-2xl font-bold">{trip.title}</h1>
            </div>
            {trip.description && (
              <p className="text-white/80">{trip.description}</p>
            )}
          </div>

          <div className="p-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">
                  {trip.startDate ? new Date(trip.startDate).toLocaleDateString("it-IT") : "Data non definita"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm">
                  Budget: {trip.totalBudget || 0} {trip.currency || "EUR"}
                </span>
              </div>
              {trip.startLocation && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">Da: {trip.startLocation}</span>
                </div>
              )}
              {trip.endLocation && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="w-4 h-4" />
                  <span className="text-sm">A: {trip.endLocation}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className={`px-2 py-1 rounded-full text-xs ${trip.isPublic ? "bg-green-500/20 text-green-500" : "bg-yellow-500/20 text-yellow-500"}`}>
                {trip.isPublic ? "Pubblico" : "Privato"}
              </span>
              <span className="text-xs text-muted-foreground">
                {sortedStops.length} tapp{sortedStops.length === 1 ? "a" : "e"}
              </span>
            </div>
          </div>
        </div>

        {sortedStops.length > 0 && (
          <div className="bg-card rounded-2xl p-4 shadow-lg">
            <h2 className="font-bold text-lg mb-4">Tappe del viaggio</h2>
            <div className="space-y-4">
              {sortedStops.map((stop, index) => (
                <div key={stop.id} className="relative pl-8 pb-4 border-l-2 border-primary/30 last:border-transparent">
                  <div className="absolute left-0 top-0 -translate-x-1/2 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-bold">{stop.city}</h3>
                    <p className="text-sm text-muted-foreground">{stop.country}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(stop.arrivalDate).toLocaleDateString("it-IT")}
                        {stop.departureDate && ` - ${new Date(stop.departureDate).toLocaleDateString("it-IT")}`}
                      </span>
                    </div>
                    {stop.notes && (
                      <p className="text-sm text-muted-foreground mt-2 italic">{stop.notes}</p>
                    )}
                  </div>
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
    </Layout>
  );
}
