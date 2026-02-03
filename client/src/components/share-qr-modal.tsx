import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Copy, Share2, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ShareQRModalProps {
  open: boolean;
  onClose: () => void;
  type: "post" | "profile" | "trip" | "invite" | "event";
  id: string;
  title: string;
}

export function ShareQRModal({ open, onClose, type, id, title }: ShareQRModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const getShareUrl = () => {
    switch (type) {
      case "post": return `${baseUrl}/post/${id}`;
      case "profile": return `${baseUrl}/user/${id}`;
      case "trip": return `${baseUrl}/trip/${id}`;
      case "event": return `${baseUrl}/event/${id}`;
      case "invite": return `${baseUrl}/auth`;
      default: return baseUrl;
    }
  };
  const shareUrl = getShareUrl();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: "Link copiato!" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Errore", description: "Impossibile copiare il link", variant: "destructive" });
    }
  };

  const handleDownloadQR = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 300;
      canvas.height = 300;
      ctx?.fillRect(0, 0, canvas.width, canvas.height);
      ctx!.fillStyle = "#fff";
      ctx?.fillRect(0, 0, canvas.width, canvas.height);
      ctx?.drawImage(img, 0, 0, 300, 300);
      
      const link = document.createElement("a");
      link.download = `nomadlife-${type}-${id}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "QR code scaricato!" });
    };
    
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `NomadLife - ${title}`,
          text: `Dai un'occhiata a questo su NomadLife!`,
          url: shareUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 z-[2000] flex items-center justify-center p-4"
        onClick={onClose}
        data-testid="overlay-share-qr"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-card rounded-2xl max-w-sm w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Condividi</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground" data-testid="button-close-share">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col items-center">
            <div ref={qrRef} className="bg-white p-4 rounded-xl mb-4" data-testid="qr-code-container">
              <QRCodeSVG
                value={shareUrl}
                size={200}
                level="H"
                includeMargin={false}
                fgColor="#000000"
                bgColor="#ffffff"
              />
            </div>

            <p className="text-sm text-muted-foreground mb-2 text-center">
              Scansiona il QR code per aprire
            </p>
            <p className="text-xs text-primary font-medium mb-6 text-center break-all max-w-full px-4">
              {title}
            </p>

            <div className="flex gap-3 w-full">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleDownloadQR}
                data-testid="button-download-qr"
              >
                <Download className="w-4 h-4 mr-2" />
                Scarica
              </Button>
              
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleCopyLink}
                data-testid="button-copy-link"
              >
                {copied ? <Check className="w-4 h-4 mr-2 text-green-500" /> : <Copy className="w-4 h-4 mr-2" />}
                Copia
              </Button>
            </div>

            <Button 
              className="w-full mt-3"
              onClick={handleNativeShare}
              data-testid="button-share"
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
