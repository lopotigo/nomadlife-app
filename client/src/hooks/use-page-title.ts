import { useEffect } from "react";

const DEFAULTS = {
  title: "Nomad Life | Digital Nomad Community & Remote Work App",
  description: "Nomad Life is the ultimate social platform for digital nomads. Discover remote work tools, connect with a global nomad community, plan eco-friendly trips, find coworking spaces and coliving, and explore the digital nomad lifestyle.",
  ogDescription: "The social platform for digital nomads. Discover remote work tools, connect with a global nomad community, plan eco-friendly trips, find coworking spaces, and explore the digital nomad lifestyle.",
  twitterDescription: "The social platform for digital nomads. Remote work tools, nomad community, travel planning, coworking spaces, and the digital nomad lifestyle in one app.",
  image: "https://replit.com/public/images/opengraph.png",
  url: "https://nomad-life.app/",
};

function updateMeta(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`) || document.querySelector(`meta[name="${property}"]`);
  if (el) {
    el.setAttribute("content", content);
  }
}

function trackPageView(title: string) {
  try {
    const ga = (window as any).gtag;
    if (typeof ga === "function") {
      ga("event", "page_view", {
        page_title: title,
        page_location: window.location.href,
        page_path: window.location.pathname + window.location.search,
      });
    }
  } catch (_) {}
}

interface SEOOptions {
  description?: string;
  image?: string;
  url?: string;
}

export function usePageTitle(title: string, seo?: SEOOptions) {
  useEffect(() => {
    const fullTitle = title ? `NomadLife - ${title}` : "NomadLife";
    document.title = fullTitle;

    updateMeta("og:title", fullTitle);
    updateMeta("twitter:title", fullTitle);

    if (seo?.description) {
      updateMeta("description", seo.description);
      updateMeta("og:description", seo.description);
      updateMeta("twitter:description", seo.description);
    }

    if (seo?.image) {
      updateMeta("og:image", seo.image);
      updateMeta("twitter:image", seo.image);
    }

    if (seo?.url) {
      updateMeta("og:url", seo.url);
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) canonical.setAttribute("href", seo.url);
    }

    trackPageView(fullTitle);

    return () => {
      document.title = "NomadLife";
      updateMeta("og:title", DEFAULTS.title);
      updateMeta("twitter:title", DEFAULTS.title);
      updateMeta("description", DEFAULTS.description);
      updateMeta("og:description", DEFAULTS.ogDescription);
      updateMeta("twitter:description", DEFAULTS.twitterDescription);
      updateMeta("og:image", DEFAULTS.image);
      updateMeta("twitter:image", DEFAULTS.image);
      updateMeta("og:url", DEFAULTS.url);
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) canonical.setAttribute("href", DEFAULTS.url);
    };
  }, [title, seo?.description, seo?.image, seo?.url]);
}
