import Layout from "@/components/layout";
import { CheckCircle2, Crown, Zap, Shield, Globe, Users, ArrowRight } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Subscription() {
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
    }, 2000);
  };

  const perks = [
    { icon: Globe, title: "Global Network", desc: "Access to 500+ premium coworking spaces worldwide." },
    { icon: Zap, title: "Priority Booking", desc: "Skip the queue and book the best seats instantly." },
    { icon: Shield, title: "Nomad Insurance", desc: "Digital nomad health and gear insurance included." },
    { icon: Users, title: "Exclusive Events", desc: "Invites to private meetups and masterclasses." }
  ];

  return (
    <Layout>
      <div className="p-6 space-y-8">
        <header className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider">
            <Crown className="w-3 h-3" />
            Premium Membership
          </div>
          <h1 className="text-3xl font-display font-bold">Unlock the Full Experience</h1>
          <p className="text-muted-foreground">Join 10,000+ nomads traveling smarter.</p>
        </header>

        <AnimatePresence mode="wait">
          {!isSuccess ? (
            <motion.div 
              key="pricing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              {/* Main Subscription Card */}
              <div className="relative p-8 bg-card border-2 border-primary rounded-[2.5rem] shadow-xl shadow-primary/10 overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                  <span className="bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase">Best Value</span>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold">Nomad Pro</h3>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-4xl font-display font-bold">$29</span>
                      <span className="text-muted-foreground font-medium">/month</span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-border">
                    {["Unlimited Group Chats", "Zero Booking Fees", "Verified Nomad Badge", "24/7 Concierge Support"].map(item => (
                      <div key={item} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={handleSubscribe}
                    disabled={isLoading}
                    className="w-full py-4 mt-6 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        Start Monthly Subscription
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-center text-muted-foreground">Cancel anytime. Secure checkout powered by NomadPay.</p>
                </div>
              </div>

              {/* Perks Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {perks.map((perk, i) => (
                  <div key={i} className="p-4 bg-muted/30 border border-border rounded-2xl flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <perk.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">{perk.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{perk.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-12 flex flex-col items-center justify-center text-center space-y-6"
            >
              <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center shadow-2xl shadow-primary/40 relative">
                <CheckCircle2 className="w-12 h-12 text-white" />
                <motion.div 
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 rounded-full border-2 border-primary"
                />
              </div>
              <div>
                <h2 className="text-3xl font-display font-bold">Welcome to Pro, Nomad!</h2>
                <p className="text-muted-foreground mt-2 max-w-xs mx-auto">
                  Your monthly subscription is now active. You have full access to all premium features.
                </p>
              </div>
              <button 
                onClick={() => window.location.href = "/"}
                className="px-8 py-3 bg-muted rounded-xl font-bold hover:bg-muted/80 transition-colors"
              >
                Go to Feed
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
