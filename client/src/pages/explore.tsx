import Layout from "@/components/layout";
import { Search, SlidersHorizontal, MapPin, Compass, Users, Map as MapIcon } from "lucide-react";
import { motion } from "framer-motion";
import { PLACES } from "@/lib/mock-data";

export default function Explore() {
  return (
    <Layout>
      <div className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border/40 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold tracking-tight">Nomad Map</h1>
          <div className="flex gap-2">
             <button className="p-2 bg-primary/10 text-primary rounded-xl"><MapIcon className="w-5 h-5" /></button>
             <button className="p-2 bg-muted rounded-xl"><Users className="w-5 h-5 text-muted-foreground" /></button>
          </div>
        </div>
        
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Where to next?" 
            className="w-full bg-muted/30 border-2 border-transparent focus:border-primary/20 bg-muted/50 rounded-2xl pl-11 pr-4 py-3 text-sm transition-all outline-none"
          />
        </div>
      </div>

      <div className="p-4 space-y-8">
        {/* Interactive Map Placeholder */}
        <div className="relative h-64 rounded-3xl overflow-hidden border-2 border-border shadow-inner bg-muted">
           <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/light-v10/static/0,0,1,0,0/600x400?access_token=pk.eyJ1IjoiZGVzaWduZXIiLCJhIjoiY2p3Z3R4eXowMGZ6NDRkbXljZ3I0b3pueSJ9.98u_7f7mS-G1x6U_Y7z7-A')] bg-cover bg-center opacity-80" />
           <div className="absolute inset-0 flex items-center justify-center bg-black/5 backdrop-blur-[1px]">
             <motion.div 
               animate={{ y: [0, -10, 0] }}
               transition={{ repeat: Infinity, duration: 2 }}
               className="bg-primary text-white p-3 rounded-full shadow-lg"
             >
               <MapPin className="w-6 h-6" />
             </motion.div>
           </div>
           <div className="absolute bottom-4 right-4 flex flex-col gap-2">
             <button className="w-10 h-10 bg-card rounded-xl shadow-lg flex items-center justify-center font-bold text-xl">+</button>
             <button className="w-10 h-10 bg-card rounded-xl shadow-lg flex items-center justify-center font-bold text-xl">-</button>
           </div>
        </div>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-display font-bold">Recommended for you</h2>
            <SlidersHorizontal className="w-5 h-5 text-muted-foreground cursor-pointer" />
          </div>
          <div className="space-y-4">
            {PLACES.map((place, i) => (
              <motion.div
                key={place.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-4 p-3 bg-card border border-border rounded-3xl hover:border-primary/30 transition-all cursor-pointer group"
              >
                <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
                  <img src={place.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg leading-tight">{place.name}</h3>
                    <span className="text-primary font-bold text-sm">{place.price}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground text-xs mt-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {place.location}
                  </div>
                  <div className="flex gap-2 mt-2">
                    {place.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="text-[10px] font-bold bg-secondary/50 px-2 py-0.5 rounded-lg text-secondary-foreground">{tag}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}
