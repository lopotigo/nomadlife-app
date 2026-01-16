import Layout from "@/components/layout";
import { USERS, POSTS } from "@/lib/mock-data";
import { MapPin, Globe, Award, MessageSquare, Instagram, Twitter, Mail } from "lucide-react";
import { motion } from "framer-motion";

export default function Profile() {
  const user = USERS[0];

  return (
    <Layout>
      <header className="relative">
        <div className="h-40 bg-gradient-to-br from-primary/80 to-primary w-full relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/topography.png')]" />
        </div>
        
        <div className="px-6 pb-6 -mt-16 flex flex-col items-center relative z-10">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-32 h-32 rounded-3xl border-4 border-card bg-muted overflow-hidden shadow-xl rotate-3 hover:rotate-0 transition-transform duration-300"
          >
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          </motion.div>
          
          <div className="text-center mt-4 space-y-1">
            <h1 className="text-3xl font-display font-bold tracking-tight">{user.name}</h1>
            <p className="text-primary font-medium">{user.handle}</p>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <div className="flex items-center gap-1.5 text-sm font-medium bg-secondary/50 text-secondary-foreground px-4 py-2 rounded-2xl border border-secondary">
              <MapPin className="w-4 h-4" />
              {user.location}
            </div>
            <button className="p-2 rounded-2xl border border-border hover:bg-muted transition-colors">
              <Mail className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <p className="mt-6 text-center text-sm leading-relaxed text-muted-foreground max-w-sm">
            {user.bio}
          </p>

          <div className="grid grid-cols-3 gap-4 w-full mt-8">
            <StatCard label="Countries" value={user.stats.countries} icon={Globe} />
            <StatCard label="Cities" value={user.stats.cities} icon={MapPin} />
            <StatCard label="Coworking" value={user.stats.coworking} icon={Award} />
          </div>

          <div className="w-full mt-10 space-y-8">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-display font-bold">My Journey</h2>
                <button className="text-xs font-bold text-primary uppercase tracking-wider">View Map</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {POSTS.map((post) => (
                  <div key={post.id} className="aspect-square rounded-2xl overflow-hidden border border-border group relative">
                    <img src={post.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </header>
    </Layout>
  );
}

function StatCard({ label, value, icon: Icon }: any) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="flex flex-col items-center justify-center p-4 bg-card border border-border rounded-2xl shadow-sm hover:shadow-md transition-all"
    >
      <Icon className="w-5 h-5 text-primary mb-2" />
      <span className="text-2xl font-bold font-display">{value}</span>
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{label}</span>
    </motion.div>
  );
}
