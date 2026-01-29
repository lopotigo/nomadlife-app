import { useState } from "react";
import Layout from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, User as UserIcon, Plane, MapPin, Calendar } from "lucide-react";
import { Link } from "wouter";
import type { User, Trip, TripStop } from "@shared/schema";

type TripWithUser = Trip & { user: User; stops: TripStop[] };

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [trips, setTrips] = useState<TripWithUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("trips");

  const handleSearch = async () => {
    if (query.length < 2) return;
    setLoading(true);
    try {
      const [usersRes, tripsRes] = await Promise.all([
        fetch(`/api/users/search?q=${encodeURIComponent(query)}`),
        fetch(`/api/trips/search?q=${encodeURIComponent(query)}`)
      ]);
      if (usersRes.ok) setUsers(await usersRes.json());
      if (tripsRes.ok) setTrips(await tripsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Cerca</h1>

        <div className="flex gap-2 mb-6">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Cerca nomadi, città, paesi..."
            className="flex-1"
            data-testid="input-search"
          />
          <Button onClick={handleSearch} disabled={loading || query.length < 2} data-testid="button-search">
            <Search className="w-4 h-4" />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="trips" className="flex-1">
              <Plane className="w-4 h-4 mr-2" />
              Viaggi ({trips.length})
            </TabsTrigger>
            <TabsTrigger value="users" className="flex-1">
              <UserIcon className="w-4 h-4 mr-2" />
              Nomadi ({users.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trips">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : trips.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {query.length >= 2 ? "Nessun viaggio trovato" : "Cerca viaggi per destinazione (es. 'Malesia', 'Bali', 'Thailandia')"}
              </div>
            ) : (
              <div className="space-y-4">
                {trips.map((trip) => (
                  <Link key={trip.id} href={`/trip/${trip.id}`}>
                    <div className="bg-card rounded-xl p-4 hover:shadow-lg transition-shadow cursor-pointer" data-testid={`trip-${trip.id}`}>
                      <div className="flex items-start gap-3">
                        <img
                          src={trip.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${trip.user.username}`}
                          className="w-10 h-10 rounded-full"
                          alt={trip.user.name}
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{trip.title}</h3>
                          <p className="text-sm text-muted-foreground">di {trip.user.name}</p>
                          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span>{trip.startLocation} → {trip.endLocation}</span>
                          </div>
                          {trip.stops.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {trip.stops.slice(0, 5).map((stop) => (
                                <span key={stop.id} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                                  {stop.city}
                                </span>
                              ))}
                              {trip.stops.length > 5 && (
                                <span className="text-xs text-muted-foreground">+{trip.stops.length - 5} altre</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="users">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {query.length >= 2 ? "Nessun nomade trovato" : "Cerca nomadi per nome o posizione"}
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <Link key={user.id} href={`/user/${user.id}`}>
                    <div className="bg-card rounded-xl p-4 hover:shadow-lg transition-shadow cursor-pointer flex items-center gap-4" data-testid={`user-${user.id}`}>
                      <img
                        src={(user as any).avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                        className="w-12 h-12 rounded-full"
                        alt={user.name}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{user.name}</h3>
                        <p className="text-sm text-muted-foreground">@{user.username}</p>
                        {(user as any).location && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            {(user as any).location}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <div>{(user as any).countriesVisited || 0} paesi</div>
                        <div>{(user as any).citiesVisited || 0} città</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
