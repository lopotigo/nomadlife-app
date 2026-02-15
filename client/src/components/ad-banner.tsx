import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";

interface AdBannerProps {
  slot?: string;
  format?: "auto" | "horizontal" | "vertical" | "rectangle";
  className?: string;
  style?: React.CSSProperties;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

const AD_SLOT_FEED = import.meta.env.VITE_ADSENSE_SLOT_FEED || "";
const AD_SLOT_SIDEBAR = import.meta.env.VITE_ADSENSE_SLOT_SIDEBAR || "";
const AD_SLOT_BANNER = import.meta.env.VITE_ADSENSE_SLOT_BANNER || "";

export function AdBanner({ slot, format = "auto", className = "", style }: AdBannerProps) {
  const { user } = useAuth();
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  const adClient = import.meta.env.VITE_ADSENSE_CLIENT || "";
  const adSlot = slot || AD_SLOT_BANNER;

  useEffect(() => {
    if (!adClient || !adSlot || pushed.current) return;
    if (user?.isPremium) return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch (e) {
      console.log("AdSense push error:", e);
    }
  }, [adClient, adSlot, user?.isPremium]);

  if (user?.isPremium) return null;
  if (!adClient || !adSlot) return null;

  return (
    <div className={`ad-banner-container overflow-hidden ${className}`} style={style} data-testid="ad-banner">
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block", textAlign: "center", ...style }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
      <p className="text-[9px] text-center text-gray-400 mt-0.5">Annuncio</p>
    </div>
  );
}

export function InFeedAd({ className = "" }: { className?: string }) {
  return (
    <AdBanner
      slot={AD_SLOT_FEED}
      format="horizontal"
      className={`my-3 rounded-xl bg-muted/30 p-2 ${className}`}
    />
  );
}
