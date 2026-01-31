import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share2, Calendar, MapPin, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";

interface EventPosterModalProps {
  open: boolean;
  onClose: () => void;
  event: {
    id: string;
    title: string;
    description?: string;
    city: string;
    country?: string;
    location?: string;
    startDate: string;
    endDate?: string;
    price?: number;
    capacity?: number;
    attendees?: number;
    imageUrl?: string;
  };
}

export function EventPosterModal({ open, onClose, event }: EventPosterModalProps) {
  const { toast } = useToast();
  const posterRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const eventUrl = `${baseUrl}/events/${event.id}`;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("it-IT", { 
      weekday: "long",
      day: "numeric", 
      month: "long",
      year: "numeric"
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  };

  const handleDownload = async () => {
    if (!posterRef.current) return;
    setDownloading(true);

    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(posterRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      
      const link = document.createElement("a");
      link.download = `${event.title.replace(/\s+/g, "-")}-manifesto.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      toast({ title: "Manifesto scaricato!" });
    } catch (error) {
      toast({ title: "Errore", description: "Impossibile scaricare il manifesto", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: `${event.title} - ${formatDate(event.startDate)} a ${event.city}`,
          url: eventUrl,
        });
      } catch {}
    } else {
      await navigator.clipboard.writeText(eventUrl);
      toast({ title: "Link copiato!" });
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 z-[2000] flex items-center justify-center p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="max-w-lg w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Manifesto Evento</h2>
            <button onClick={onClose} className="text-white/70 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div 
            ref={posterRef}
            className="rounded-3xl overflow-hidden shadow-2xl"
            style={{
              background: event.imageUrl 
                ? `linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.8) 100%), url(${event.imageUrl}) center/cover`
                : "linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f97316 100%)"
            }}
          >
            <div className="p-8 text-white min-h-[500px] flex flex-col">
              <div className="text-center mb-6">
                <span className="inline-block px-4 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium mb-4">
                  NomadLife Events
                </span>
                <h1 className="text-3xl font-bold mb-2 drop-shadow-lg">{event.title}</h1>
                {event.description && (
                  <p className="text-white/80 text-sm max-w-xs mx-auto line-clamp-2">
                    {event.description}
                  </p>
                )}
              </div>

              <div className="flex-1 flex flex-col justify-center space-y-4">
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold">{formatDate(event.startDate)}</p>
                    <p className="text-white/70 text-sm">Ore {formatTime(event.startDate)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold">{event.city}{event.country ? `, ${event.country}` : ""}</p>
                    {event.location && <p className="text-white/70 text-sm">{event.location}</p>}
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1 flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                    <Users className="w-5 h-5" />
                    <div>
                      <p className="font-semibold text-sm">
                        {event.capacity ? `${event.attendees || 0}/${event.capacity}` : "Illimitati"}
                      </p>
                      <p className="text-white/70 text-xs">Posti</p>
                    </div>
                  </div>
                  <div className="flex-1 flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                    <span className="text-xl font-bold">
                      {event.price && event.price > 0 ? `€${event.price}` : "Gratis"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between bg-white rounded-2xl p-4">
                <div className="flex-1">
                  <p className="text-gray-800 font-semibold text-sm">Scansiona per partecipare</p>
                  <p className="text-gray-500 text-xs">nomadlife.app</p>
                </div>
                <div className="w-16 h-16 bg-white p-1 rounded-lg">
                  <QRCodeSVG value={eventUrl} size={56} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <Button 
              onClick={handleDownload} 
              disabled={downloading}
              className="flex-1 bg-white text-gray-900 hover:bg-gray-100"
            >
              <Download className="w-4 h-4 mr-2" />
              {downloading ? "Scaricando..." : "Scarica"}
            </Button>
            <Button 
              onClick={handleShare}
              className="flex-1 bg-purple-500 hover:bg-purple-600"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Condividi
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
