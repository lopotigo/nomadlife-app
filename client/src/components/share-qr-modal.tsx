import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Copy, Share2, Check, QrCode, ChevronDown, ChevronUp } from "lucide-react";
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

function getShareUrl(type: string, id: string) {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  switch (type) {
    case "post": return `${baseUrl}/post/${id}`;
    case "profile": return `${baseUrl}/user/${id}`;
    case "trip": return `${baseUrl}/trip/${id}`;
    case "event": return `${baseUrl}/event/${id}`;
    case "invite": return `${baseUrl}/auth`;
    default: return baseUrl;
  }
}

export async function handleShare(
  type: "post" | "profile" | "trip" | "invite" | "event",
  id: string,
  title: string,
  openModal: () => void
) {
  const shareUrl = getShareUrl(type, id);

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: `NomadLife - ${title || ""}`,
        text: `Dai un'occhiata a questo su NomadLife!`,
        url: shareUrl,
      });
      return;
    } catch {
      // user cancelled or share failed - fall through to modal
    }
  }

  openModal();
}

export function ShareQRModal({ open, onClose, type, id, title }: ShareQRModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const shareUrl = getShareUrl(type, id);

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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Condividi</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground" data-testid="button-close-share">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-muted/50 rounded-xl p-3 mb-4">
            <p className="text-sm font-medium truncate">{title}</p>
            <p className="text-xs text-muted-foreground truncate mt-1">{shareUrl}</p>
          </div>

          <div className="flex flex-col gap-3">
            <Button 
              className="w-full h-12 text-base"
              onClick={handleCopyLink}
              data-testid="button-copy-link"
            >
              {copied ? <Check className="w-5 h-5 mr-2 text-green-300" /> : <Copy className="w-5 h-5 mr-2" />}
              {copied ? "Copiato!" : "Copia link"}
            </Button>

            {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
              <Button 
                variant="outline"
                className="w-full h-12 text-base"
                onClick={handleNativeShare}
                data-testid="button-share"
              >
                <Share2 className="w-5 h-5 mr-2" />
                Condividi
              </Button>
            )}

            <button
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground py-2 transition-colors"
              onClick={() => setShowQR(!showQR)}
              data-testid="button-toggle-qr"
            >
              <QrCode className="w-4 h-4" />
              QR Code
              {showQR ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <AnimatePresence>
              {showQR && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col items-center pt-2">
                    <div ref={qrRef} className="bg-white p-4 rounded-xl mb-3" data-testid="qr-code-container">
                      <QRCodeSVG
                        value={shareUrl}
                        size={160}
                        level="H"
                        includeMargin={false}
                        fgColor="#000000"
                        bgColor="#ffffff"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">Scansiona per aprire</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleDownloadQR}
                      data-testid="button-download-qr"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Scarica QR
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
