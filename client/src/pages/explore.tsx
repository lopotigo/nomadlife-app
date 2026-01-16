import Layout from "@/components/layout";
import { PLACES } from "@/lib/mock-data";
import { Search, SlidersHorizontal, Star, MapPin, Wifi } from "lucide-react";
import { motion } from "framer-motion";

export default function Explore() {
  return (
    <Layout>
      <div className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border/40 p-4 space-y-4">
        <h1 className="text-xl font-display font-bold">Explore</h1>
        
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search destinations..." 
              className="w-full bg-muted/50 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <button className="p-2.5 bg-muted/50 border border-border rounded-xl hover:bg-muted transition-colors">
            <SlidersHorizontal className="w-5 h-5 text-foreground" />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {["All", "Coworking", "Coliving", "Cafes", "Gyms"].map((tag, i) => (
            <button 
              key={tag}
              className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                i === 0 
                  ? "bg-primary text-primary-foreground border-primary" 
                  : "bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {PLACES.map((place, i) => (
          <PlaceCard key={place.id} place={place} index={i} />
        ))}
      </div>
    </Layout>
  );
}

function PlaceCard({ place, index }: { place: any, index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
      className="group bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="relative h-48 bg-muted overflow-hidden">
        <img 
          src={place.image} 
          alt={place.name} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 text-xs font-bold shadow-sm">
          <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
          {place.rating}
        </div>
        <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-lg text-white text-[10px] font-medium uppercase tracking-wider">
          {place.type}
        </div>
      </div>

      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-display font-bold text-lg leading-tight">{place.name}</h3>
            <div className="flex items-center gap-1 text-muted-foreground text-xs mt-1">
              <MapPin className="w-3.5 h-3.5" />
              {place.location}
            </div>
          </div>
          <div className="text-right">
            <div className="text-primary font-bold">{place.price}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {place.tags.slice(0, 3).map((tag: string) => (
            <span key={tag} className="px-2 py-1 bg-secondary/50 text-secondary-foreground text-[10px] rounded-md font-medium">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
