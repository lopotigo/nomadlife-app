import { useEffect, useState } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useI18n, Language } from "@/lib/i18n";

interface Event {
  id: string;
  title: string;
  description?: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  date: string;
  time?: string;
  price?: number;
  currency?: string;
  maxAttendees?: number;
  imageUrl?: string;
  createdAt: string;
  organizer?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface EventRegistration {
  id: string;
  eventId: string;
  userId: string;
  createdAt: string;
  event: Event;
}

const MONTHS: Record<Language, string[]> = {
  it: ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  es: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
};

const DAYS: Record<Language, string[]> = {
  it: ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"],
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  es: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
};

export default function EventsCalendar() {
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useI18n();
  const [, setLocation] = useLocation();
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLocation("/auth");
      return;
    }

    Promise.all([
      fetch("/api/event-registrations", { credentials: "include" }).then(r => r.json()),
      fetch(`/api/events?organizerId=${user.id}`, { credentials: "include" }).then(r => r.json())
    ])
      .then(([regs, events]) => {
        setRegistrations(regs);
        setMyEvents(events);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, authLoading, setLocation]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;

    const days: (Date | null)[] = [];
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    
    const registered = registrations.filter(r => {
      if (!r.event?.date) return false;
      try {
        const eventDate = new Date(r.event.date).toISOString().split("T")[0];
        return eventDate === dateStr;
      } catch { return false; }
    }).map(r => ({ ...r.event, isRegistered: true }));

    const organized = myEvents.filter(e => {
      if (!e.date) return false;
      try {
        const eventDate = new Date(e.date).toISOString().split("T")[0];
        return eventDate === dateStr;
      } catch { return false; }
    }).map(e => ({ ...e, isOrganized: true }));

    const allEvents = [...registered, ...organized];
    const uniqueEvents = allEvents.filter((e, i, arr) => 
      arr.findIndex(x => x.id === e.id) === i
    );
    
    return uniqueEvents;
  };

  const hasEventsOnDate = (date: Date) => {
    return getEventsForDate(date).length > 0;
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return selectedDate?.toDateString() === date.toDateString();
  };

  const days = getDaysInMonth(currentDate);
  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  const monthNames = MONTHS[language];
  const dayNames = DAYS[language];

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            {t("calendar.title")}
          </h1>
          <Button variant="outline" size="sm" onClick={goToToday}>
            {t("calendar.today")}
          </Button>
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between p-4 bg-primary/5">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              data-testid="button-prev-month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              data-testid="button-next-month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-px bg-border">
            {dayNames.map(day => (
              <div key={day} className="bg-muted/50 p-2 text-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px bg-border">
            {days.map((date, i) => (
              <div
                key={i}
                className={`bg-card min-h-[60px] p-1 ${date ? "cursor-pointer hover:bg-muted/50" : ""}`}
                onClick={() => date && setSelectedDate(date)}
              >
                {date && (
                  <div className={`flex flex-col items-center ${isSelected(date) ? "bg-primary text-primary-foreground rounded-lg" : ""}`}>
                    <span className={`text-sm w-7 h-7 flex items-center justify-center rounded-full ${
                      isToday(date) && !isSelected(date) ? "bg-primary/20 text-primary font-bold" : ""
                    }`}>
                      {date.getDate()}
                    </span>
                    {hasEventsOnDate(date) && (
                      <div className="flex gap-0.5 mt-0.5">
                        {getEventsForDate(date).slice(0, 3).map((_, j) => (
                          <div 
                            key={j} 
                            className={`w-1.5 h-1.5 rounded-full ${isSelected(date) ? "bg-primary-foreground" : "bg-primary"}`} 
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {selectedDate && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-6"
            >
              <h3 className="font-semibold mb-3">
                {t("calendar.events_on")} {selectedDate.getDate()} {monthNames[selectedDate.getMonth()]}
              </h3>
              
              {selectedEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground bg-card rounded-xl border border-border">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>{t("calendar.no_events")}</p>
                  <Link href="/">
                    <Button variant="link" className="mt-2">
                      <Plus className="w-4 h-4 mr-1" />
                      {t("calendar.explore_events")}
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedEvents.map((event: any) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-card rounded-xl border border-border p-4 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start gap-3">
                        {event.imageUrl ? (
                          <img 
                            src={event.imageUrl} 
                            alt={event.title}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Calendar className="w-8 h-8 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold truncate">{event.title}</h4>
                            {event.isOrganized && (
                              <span className="text-xs bg-amber-500/20 text-amber-600 px-2 py-0.5 rounded-full">
                                {t("calendar.organizer")}
                              </span>
                            )}
                            {event.isRegistered && !event.isOrganized && (
                              <span className="text-xs bg-green-500/20 text-green-600 px-2 py-0.5 rounded-full">
                                {t("calendar.registered")}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <MapPin className="w-3 h-3" />
                            <span>{event.city}, {event.country}</span>
                          </div>
                          {event.time && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <span>{event.time}</span>
                            </div>
                          )}
                          {event.price !== undefined && event.price > 0 && (
                            <div className="mt-2 text-sm font-medium text-primary">
                              {event.currency || "€"}{event.price}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm font-medium">{t("calendar.registered")}</span>
            </div>
            <p className="text-2xl font-bold">{registrations.length}</p>
            <p className="text-xs text-muted-foreground">{t("calendar.events_attending")}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-sm font-medium">{t("calendar.organized")}</span>
            </div>
            <p className="text-2xl font-bold">{myEvents.length}</p>
            <p className="text-xs text-muted-foreground">{t("calendar.events_created")}</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
