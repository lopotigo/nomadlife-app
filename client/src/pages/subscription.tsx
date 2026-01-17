import { useEffect, useState } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { CheckCircle2, Crown, Zap, Shield, Globe, Users, ArrowRight, Loader2, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import type { Subscription } from "@shared/schema";

export default function SubscriptionPage() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setLocation("/auth");
      return;
    }

    fetch("/api/subscription")
      .then((res) => res.json())
      .then((data) => setSubscription(data))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [user, authLoading, setLocation]);

  const handleSubscribe = async () => {
    if (!user) return;

    setIsProcessing(true);
    try {
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      const res = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: "pro",
          status: "active",
          endDate: endDate.toISOString(),
        }),
      });

      if (res.ok) {
        const newSub = await res.json();
        setSubscription(newSub);
        toast({ title: "Success!", description: "Welcome to Nomad Pro!" });
      } else {
        throw new Error("Subscription failed");
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to process subscription", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!subscription) return;

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/subscription/${subscription.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });

      if (res.ok) {
        setSubscription(null);
        toast({ title: "Subscription cancelled", description: "You can resubscribe anytime." });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to cancel subscription", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const perks = [
    { icon: Globe, title: "Global Network", desc: "Access to 500+ premium coworking spaces worldwide." },
    { icon: Zap, title: "Priority Booking", desc: "Skip the queue and book the best seats instantly." },
    { icon: Shield, title: "Nomad Insurance", desc: "Digital nomad health and gear insurance included." },
    { icon: Users, title: "Exclusive Events", desc: "Invites to private meetups and masterclasses." }
  ];

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-8">
        <header className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider">
            <Crown className="w-3 h-3" />
            Premium Membership
          </div>
          <h1 className="text-3xl font-display font-bold">
            {subscription ? "Manage Subscription" : "Unlock the Full Experience"}
          </h1>
          <p className="text-muted-foreground">
            {subscription ? "You are a Nomad Pro member" : "Join 10,000+ nomads traveling smarter."}
          </p>
        </header>

        <AnimatePresence mode="wait">
          {subscription && subscription.status === "active" ? (
            <motion.div 
              key="active"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center shadow-2xl shadow-primary/40 relative">
                  <Crown className="w-12 h-12 text-white" />
                  <motion.div 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 rounded-full border-2 border-primary"
                  />
                </div>
                <div>
                  <h2 className="text-3xl font-display font-bold">You're a Pro Nomad!</h2>
                  <p className="text-muted-foreground mt-2 max-w-xs mx-auto">
                    Your monthly subscription is active. You have full access to all premium features.
                  </p>
                  <p className="text-sm text-primary font-medium mt-4">
                    Next billing: {new Date(subscription.endDate || "").toLocaleDateString()}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
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

                <button 
                  onClick={handleCancel}
                  disabled={isProcessing}
                  className="px-8 py-3 bg-muted text-muted-foreground rounded-xl font-bold hover:bg-muted/80 transition-colors disabled:opacity-50"
                  data-testid="button-cancel-subscription"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 inline-block animate-spin mr-2" /> : null}
                  Cancel Subscription
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="pricing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
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
                    disabled={isProcessing}
                    className="w-full py-4 mt-6 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70"
                    data-testid="button-subscribe"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
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
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
