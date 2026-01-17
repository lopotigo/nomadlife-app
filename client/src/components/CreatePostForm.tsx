import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Image, MapPin, Send, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUpload } from "@/hooks/use-upload";

interface CreatePostFormProps {
  onPostCreated: () => void;
}

export function CreatePostForm({ onPostCreated }: CreatePostFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (response) => {
      setImageUrl(response.objectPath);
      toast({ title: "Photo uploaded!", description: "Your photo is ready to share." });
    },
    onError: (error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content: content.trim(),
          imageUrl: imageUrl || null,
          location: location.trim() || null,
        }),
      });

      if (res.ok) {
        setContent("");
        setLocation("");
        setImageUrl("");
        setIsExpanded(false);
        toast({ title: "Post shared!", description: "Your post is now visible to everyone." });
        onPostCreated();
      } else {
        throw new Error("Failed to create post");
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to share post. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            );
            const data = await response.json();
            const city = data.address?.city || data.address?.town || data.address?.village || "";
            const country = data.address?.country || "";
            setLocation(city && country ? `${city}, ${country}` : data.display_name?.split(",").slice(0, 2).join(",") || "");
          } catch {
            setLocation(`${position.coords.latitude.toFixed(2)}, ${position.coords.longitude.toFixed(2)}`);
          }
        },
        () => {
          toast({ title: "Location access denied", description: "Please enable location access or enter manually.", variant: "destructive" });
        }
      );
    }
  };

  return (
    <div className="bg-card border border-border rounded-3xl p-4 mb-6">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-primary font-bold">{user?.name?.charAt(0) || "?"}</span>
          )}
        </div>
        <div className="flex-1">
          <div 
            onClick={() => setIsExpanded(true)}
            className={`${!isExpanded ? "cursor-pointer" : ""}`}
          >
            <Textarea
              placeholder="Share your nomad experience..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setIsExpanded(true)}
              className="min-h-[50px] border-none bg-transparent resize-none p-0 text-sm focus-visible:ring-0"
              data-testid="input-post-content"
            />
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 mt-3"
              >
                {imageUrl && (
                  <div className="relative rounded-xl overflow-hidden">
                    <img 
                      src={imageUrl.startsWith("/objects/") ? imageUrl : imageUrl} 
                      alt="Upload preview" 
                      className="w-full h-40 object-cover"
                    />
                    <button
                      onClick={() => setImageUrl("")}
                      className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {isUploading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading... {progress}%</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Add location..."
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="flex-1 h-8 text-xs border-none bg-muted/50"
                    data-testid="input-post-location"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleGetLocation}
                    className="text-xs h-8"
                  >
                    Auto
                  </Button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex gap-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={isUploading}
                      />
                      <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 transition-colors">
                        <Image className="w-4 h-4 text-primary" />
                        <span className="text-xs font-medium">Photo</span>
                      </div>
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsExpanded(false);
                        setContent("");
                        setLocation("");
                        setImageUrl("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={!content.trim() || isSubmitting || isUploading}
                      size="sm"
                      className="gap-1"
                      data-testid="button-share-post"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Share
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
