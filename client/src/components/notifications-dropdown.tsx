import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Check, Heart, MessageCircle, UserPlus, Plane, MapPin, Navigation, AlertTriangle, Shield, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import type { Notification } from "@shared/schema";

function getNotificationRoute(notification: Notification): string | null {
  switch (notification.type) {
    case "new_follower":
    case "follow":
      return notification.relatedUserId ? `/user/${notification.relatedUserId}` : null;
    case "new_trip":
    case "trip_started":
      return notification.relatedTripId ? `/trip/${notification.relatedTripId}` : null;
    case "new_stop":
      return notification.relatedTripId ? `/trip/${notification.relatedTripId}` : null;
    case "message":
      return "/chat";
    case "like":
    case "comment":
      return notification.relatedUserId ? `/user/${notification.relatedUserId}` : null;
    case "nearby_nomad":
      return notification.relatedUserId ? `/user/${notification.relatedUserId}` : "/matchmaking";
    case "travel_alert":
      return "/search";
    default:
      return notification.relatedTripId
        ? `/trip/${notification.relatedTripId}`
        : notification.relatedUserId
        ? `/user/${notification.relatedUserId}`
        : null;
  }
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "like": return <Heart className="w-4 h-4 text-red-500" />;
    case "comment": return <MessageCircle className="w-4 h-4 text-blue-500" />;
    case "new_follower":
    case "follow": return <UserPlus className="w-4 h-4 text-green-500" />;
    case "new_trip":
    case "trip_started": return <Plane className="w-4 h-4 text-purple-500" />;
    case "new_stop": return <MapPin className="w-4 h-4 text-orange-500" />;
    case "message": return <MessageCircle className="w-4 h-4 text-cyan-500" />;
    case "nearby_nomad": return <Radar className="w-4 h-4 text-emerald-500" />;
    case "travel_alert": return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    default: return <Bell className="w-4 h-4" />;
  }
}

function getActionLabel(notification: Notification): string | null {
  const route = getNotificationRoute(notification);
  if (!route) return null;
  switch (notification.type) {
    case "new_follower":
    case "follow": return "View profile";
    case "new_trip":
    case "trip_started": return "View trip";
    case "new_stop": return "View trip";
    case "message": return "Go to messages";
    case "like":
    case "comment": return "View profile";
    case "nearby_nomad": return "View profile";
    case "travel_alert": return "View details";
    default: return "Open";
  }
}

function timeAgo(dateStr: string | Date): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "adesso";
  if (diffMin < 60) return `${diffMin}min fa`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h fa`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}g fa`;
  return date.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch("/api/notifications/unread-count", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (res.ok) {
        setNotifications(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST", credentials: "include" });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications/read-all", { method: "POST", credentials: "include" });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    const route = getNotificationRoute(notification);
    if (route) {
      setIsOpen(false);
      setLocation(route);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
      if (unreadCount > 0) {
        const timer = setTimeout(() => {
          markAllAsRead();
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen]);

  const updatePanelPosition = useCallback(() => {
    if (!buttonRef.current || !panelRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const panel = panelRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const panelWidth = Math.min(384, vw - 16);
    
    let left = rect.right - panelWidth;
    if (left < 8) left = 8;
    if (left + panelWidth > vw - 8) left = vw - panelWidth - 8;
    
    const top = rect.bottom + 8;
    const maxHeight = vh - top - 16;

    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;
    panel.style.width = `${panelWidth}px`;
    panel.style.maxHeight = `${Math.min(maxHeight, 448)}px`;
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePanelPosition();
      window.addEventListener("resize", updatePanelPosition);
      window.addEventListener("scroll", updatePanelPosition, true);
      return () => {
        window.removeEventListener("resize", updatePanelPosition);
        window.removeEventListener("scroll", updatePanelPosition, true);
      };
    }
  }, [isOpen, updatePanelPosition]);

  return (
    <>
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
        data-testid="button-notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[9990]" onClick={() => setIsOpen(false)} />
          <div
            ref={panelRef}
            className="fixed overflow-y-auto bg-card rounded-xl shadow-xl border border-border z-[9991]"
          >
            <div className="p-3 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10 rounded-t-xl">
              <h3 className="font-semibold text-sm">Notifiche</h3>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7">
                  <Check className="w-3 h-3 mr-1" />
                  Segna tutte lette
                </Button>
              )}
            </div>

            {loading ? (
              <div className="p-8 flex justify-center">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Nessuna notifica
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notification) => {
                  const route = getNotificationRoute(notification);
                  const actionLabel = getActionLabel(notification);
                  return (
                    <div
                      key={notification.id}
                      className={`p-3 flex items-start gap-3 transition-colors ${
                        route ? "cursor-pointer hover:bg-muted/60 active:bg-muted" : ""
                      } ${!notification.isRead ? "bg-primary/5" : ""} ${
                        notification.type === "travel_alert" ? "border-l-3 border-l-amber-500" : ""
                      } ${
                        notification.type === "nearby_nomad" ? "border-l-3 border-l-emerald-500" : ""
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                      data-testid={`notification-${notification.id}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        notification.type === "travel_alert" ? "bg-amber-100 dark:bg-amber-900/30" :
                        notification.type === "nearby_nomad" ? "bg-emerald-100 dark:bg-emerald-900/30" :
                        "bg-muted"
                      }`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${!notification.isRead ? "font-medium" : ""}`}>
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {timeAgo(notification.createdAt)}
                          </span>
                          {route && actionLabel && (
                            <span className="text-xs text-primary font-medium flex items-center gap-0.5">
                              <Navigation className="w-2.5 h-2.5" />
                              {actionLabel}
                            </span>
                          )}
                        </div>
                      </div>
                      {!notification.isRead && (
                        <div className="w-2.5 h-2.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
