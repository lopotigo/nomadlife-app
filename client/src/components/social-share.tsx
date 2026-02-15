import { Share2, Copy, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SocialShareProps {
  url: string;
  title: string;
  text?: string;
  className?: string;
  variant?: "icon" | "button";
}

export function SocialShare({ url, title, text, className = "", variant = "icon" }: SocialShareProps) {
  const { toast } = useToast();
  const fullUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`;
  const shareText = text || title;

  const copyLink = () => {
    navigator.clipboard.writeText(fullUrl);
    toast({ title: "Link copiato!" });
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${fullUrl}`)}`, "_blank");
  };

  const shareTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(fullUrl)}`, "_blank");
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: shareText, url: fullUrl });
      } catch (e) {}
    } else {
      copyLink();
    }
  };

  if (variant === "button") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={className} data-testid="button-social-share">
            <Share2 className="w-4 h-4 mr-2" />
            Condividi
          </Button>
        </DropdownMenuTrigger>
        <ShareMenuContent
          onWhatsApp={shareWhatsApp}
          onTelegram={shareTelegram}
          onTwitter={shareTwitter}
          onCopy={copyLink}
          onNative={shareNative}
        />
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={`text-gray-500 hover:text-primary transition-colors ${className}`} data-testid="button-social-share">
          <Share2 className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <ShareMenuContent
        onWhatsApp={shareWhatsApp}
        onTelegram={shareTelegram}
        onTwitter={shareTwitter}
        onCopy={copyLink}
        onNative={shareNative}
      />
    </DropdownMenu>
  );
}

function ShareMenuContent({
  onWhatsApp,
  onTelegram,
  onTwitter,
  onCopy,
  onNative,
}: {
  onWhatsApp: () => void;
  onTelegram: () => void;
  onTwitter: () => void;
  onCopy: () => void;
  onNative: () => void;
}) {
  return (
    <DropdownMenuContent align="end" className="w-48">
      <DropdownMenuItem onClick={onWhatsApp} data-testid="share-whatsapp">
        <MessageCircle className="w-4 h-4 mr-2 text-green-500" />
        WhatsApp
      </DropdownMenuItem>
      <DropdownMenuItem onClick={onTelegram} data-testid="share-telegram">
        <Send className="w-4 h-4 mr-2 text-blue-400" />
        Telegram
      </DropdownMenuItem>
      <DropdownMenuItem onClick={onTwitter} data-testid="share-twitter">
        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        X (Twitter)
      </DropdownMenuItem>
      <DropdownMenuItem onClick={onCopy} data-testid="share-copy-link">
        <Copy className="w-4 h-4 mr-2" />
        Copia link
      </DropdownMenuItem>
      {typeof navigator.share === "function" && (
        <DropdownMenuItem onClick={onNative} data-testid="share-native">
          <Share2 className="w-4 h-4 mr-2" />
          Altro...
        </DropdownMenuItem>
      )}
    </DropdownMenuContent>
  );
}
