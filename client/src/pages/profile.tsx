import Layout from "@/components/layout";
import { USERS } from "@/lib/mock-data";
import { Settings, MapPin, Calendar, Globe, Award } from "lucide-react";

export default function Profile() {
  const user = USERS[0]; // Me

  return (
    <Layout>
      <header className="relative">
        {/* Cover Image */}
        <div className="h-32 bg-gradient-to-r from-primary to-blue-600 w-full" />
        
        <div className="absolute top-4 right-4">
          <button className="p-2 rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-black/40 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pb-6 -mt-12 flex flex-col items-center">
          <div className="w-24 h-24 rounded-full border-4 border-card bg-muted overflow-hidden shadow-sm">
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          </div>
          
          <div className="text-center mt-3 space-y-1">
            <h1 className="text-2xl font-display font-bold">{user.name}</h1>
            <p className="text-sm text-muted-foreground font-medium">{user.handle}</p>
          </div>

          <div className="flex items-center gap-1.5 mt-3 text-sm text-foreground/80 bg-muted/50 px-3 py-1 rounded-full border border-border/50">
            <MapPin className="w-4 h-4 text-primary" />
            Currently in <strong>{user.location}</strong>
          </div>

          <p className="mt-4 text-center text-sm leading-relaxed text-muted-foreground max-w-xs mx-auto">
            {user.bio}
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 w-full mt-6">
            <StatCard label="Countries" value={user.stats.countries} icon={Globe} />
            <StatCard label="Cities" value={user.stats.cities} icon={MapPin} />
            <StatCard label="Coworking" value={user.stats.coworking} icon={Award} />
          </div>

          <div className="w-full mt-8">
            <h2 className="text-lg font-display font-bold mb-4">Upcoming Trips</h2>
            <div className="space-y-3">
              <TripCard 
                destination="Tokyo, Japan" 
                date="Mar 15 - Apr 20" 
                status="Confirmed"
                image="https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=200&auto=format&fit=crop"
              />
              <TripCard 
                destination="Cape Town, SA" 
                date="May 01 - Jun 15" 
                status="Planning"
                image="https://images.unsplash.com/photo-1580060839134-75a5edca2e99?q=80&w=200&auto=format&fit=crop"
              />
            </div>
          </div>
        </div>
      </header>
    </Layout>
  );
}

function StatCard({ label, value, icon: Icon }: any) {
  return (
    <div className="flex flex-col items-center justify-center p-3 bg-muted/30 border border-border/60 rounded-xl">
      <Icon className="w-5 h-5 text-primary mb-1.5 opacity-80" />
      <span className="text-xl font-bold font-display text-foreground">{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</span>
    </div>
  );
}

function TripCard({ destination, date, status, image }: any) {
  return (
    <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl shadow-sm">
      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
        <img src={image} alt={destination} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-sm">{destination}</h3>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
          <Calendar className="w-3.5 h-3.5" />
          {date}
        </div>
      </div>
      <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
        status === "Confirmed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
      }`}>
        {status}
      </div>
    </div>
  );
}
