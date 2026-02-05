import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "it" | "en" | "es";

interface Translations {
  [key: string]: string;
}

const translations: Record<Language, Translations> = {
  it: {
    "nav.map": "Mappa",
    "nav.search": "Cerca",
    "nav.travel_diary": "Diario di Viaggio",
    "nav.events_calendar": "Calendario Eventi",
    "nav.messages": "Messaggi",
    "nav.booking": "Booking",
    "nav.marketplace": "Marketplace",
    "nav.profile": "Profilo",
    "nav.trips": "Viaggi",
    "nav.chat": "Chat",
    
    "profile.my_travel_stats": "Le Mie Statistiche di Viaggio",
    "profile.my_journey": "Il Mio Viaggio",
    "profile.posts": "Post",
    "profile.create_avatar": "Crea Avatar",
    "profile.invite_friends": "Invita Amici",
    "profile.followers": "Followers",
    "profile.following": "Following",
    "profile.countries": "Paesi",
    "profile.cities": "Città",
    "profile.logout": "Esci",
    "profile.light": "Chiaro",
    "profile.dark": "Scuro",
    "profile.notifications_on": "Notifiche ON",
    "profile.notifications_off": "Notifiche OFF",
    "profile.language": "Lingua",
    
    "stats.km_traveled": "km percorsi",
    "stats.countries_visited": "paesi visitati",
    "stats.cities_visited": "città visitate",
    "stats.trips_completed": "viaggi completati",
    "stats.environmental_impact": "Impatto Ambientale",
    "stats.vs_car": "Confronto con viaggio in auto",
    "stats.co2_emitted": "kg CO₂ emessi",
    "stats.co2_saved": "kg CO₂ risparmiati",
    "stats.eco_transport": "trasporti eco",
    "stats.planned": "Pianificati",
    "stats.in_progress": "In corso",
    "stats.completed": "Completati",
    "stats.co2_saved_message": "kg di CO₂ risparmiati!",
    
    "calendar.title": "Calendario Eventi",
    "calendar.today": "Oggi",
    "calendar.events_on": "Eventi del",
    "calendar.no_events": "Nessun evento in questa data",
    "calendar.explore_events": "Esplora eventi sulla mappa",
    "calendar.registered": "Iscritto",
    "calendar.organized": "Organizzati",
    "calendar.events_attending": "eventi a cui partecipi",
    "calendar.events_created": "eventi che hai creato",
    "calendar.organizer": "Organizzatore",
    
    "search.title": "Cerca",
    "search.placeholder": "Cerca città, nomadi, viaggi...",
    "search.cities": "Città",
    "search.trips": "Viaggi",
    "search.nomads": "Nomadi",
    "search.no_city": "Nessuna città trovata",
    "search.no_trip": "Nessun viaggio trovato",
    "search.no_nomad": "Nessun nomade trovato",
    "search.by": "di",
    "search.view": "Visualizza",
    "search.follow": "Segui",
    "search.following": "Seguito",
    
    "diary.my_trips": "I Miei Viaggi",
    "diary.explore": "Esplora",
    "diary.your_stats": "Le tue statistiche",
    "diary.new_trip": "Nuovo Viaggio",
    "diary.add_stop": "Aggiungi Tappa",
    "diary.add_expense": "Aggiungi Spesa",
    
    "common.save": "Salva",
    "common.cancel": "Annulla",
    "common.delete": "Elimina",
    "common.edit": "Modifica",
    "common.close": "Chiudi",
    "common.loading": "Caricamento...",
    "common.error": "Errore",
    "common.success": "Successo",
    "common.nomads": "nomadi",
    "common.per_day": "/giorno",
    "common.daily_total": "TOTALE GIORNALIERO",
    
    "premium.title": "Nomad Premium",
    "premium.subtitle": "Sblocca vantaggi globali e assicurazione.",
    "premium.upgrade": "Upgrade",
  },
  
  en: {
    "nav.map": "Map",
    "nav.search": "Search",
    "nav.travel_diary": "Travel Diary",
    "nav.events_calendar": "Events Calendar",
    "nav.messages": "Messages",
    "nav.booking": "Booking",
    "nav.marketplace": "Marketplace",
    "nav.profile": "Profile",
    "nav.trips": "Trips",
    "nav.chat": "Chat",
    
    "profile.my_travel_stats": "My Travel Statistics",
    "profile.my_journey": "My Journey",
    "profile.posts": "Posts",
    "profile.create_avatar": "Create Avatar",
    "profile.invite_friends": "Invite Friends",
    "profile.followers": "Followers",
    "profile.following": "Following",
    "profile.countries": "Countries",
    "profile.cities": "Cities",
    "profile.logout": "Logout",
    "profile.light": "Light",
    "profile.dark": "Dark",
    "profile.notifications_on": "Notifications ON",
    "profile.notifications_off": "Notifications OFF",
    "profile.language": "Language",
    
    "stats.km_traveled": "km traveled",
    "stats.countries_visited": "countries visited",
    "stats.cities_visited": "cities visited",
    "stats.trips_completed": "trips completed",
    "stats.environmental_impact": "Environmental Impact",
    "stats.vs_car": "Compared to car travel",
    "stats.co2_emitted": "kg CO₂ emitted",
    "stats.co2_saved": "kg CO₂ saved",
    "stats.eco_transport": "eco transport",
    "stats.planned": "Planned",
    "stats.in_progress": "In Progress",
    "stats.completed": "Completed",
    "stats.co2_saved_message": "kg CO₂ saved!",
    
    "calendar.title": "Events Calendar",
    "calendar.today": "Today",
    "calendar.events_on": "Events on",
    "calendar.no_events": "No events on this date",
    "calendar.explore_events": "Explore events on the map",
    "calendar.registered": "Registered",
    "calendar.organized": "Organized",
    "calendar.events_attending": "events you're attending",
    "calendar.events_created": "events you created",
    "calendar.organizer": "Organizer",
    
    "search.title": "Search",
    "search.placeholder": "Search cities, nomads, trips...",
    "search.cities": "Cities",
    "search.trips": "Trips",
    "search.nomads": "Nomads",
    "search.no_city": "No city found",
    "search.no_trip": "No trip found",
    "search.no_nomad": "No nomad found",
    "search.by": "by",
    "search.view": "View",
    "search.follow": "Follow",
    "search.following": "Following",
    
    "diary.my_trips": "My Trips",
    "diary.explore": "Explore",
    "diary.your_stats": "Your statistics",
    "diary.new_trip": "New Trip",
    "diary.add_stop": "Add Stop",
    "diary.add_expense": "Add Expense",
    
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.close": "Close",
    "common.loading": "Loading...",
    "common.error": "Error",
    "common.success": "Success",
    "common.nomads": "nomads",
    "common.per_day": "/day",
    "common.daily_total": "DAILY TOTAL",
    
    "premium.title": "Nomad Premium",
    "premium.subtitle": "Unlock global perks & insurance.",
    "premium.upgrade": "Upgrade",
  },
  
  es: {
    "nav.map": "Mapa",
    "nav.search": "Buscar",
    "nav.travel_diary": "Diario de Viaje",
    "nav.events_calendar": "Calendario de Eventos",
    "nav.messages": "Mensajes",
    "nav.booking": "Booking",
    "nav.marketplace": "Marketplace",
    "nav.profile": "Perfil",
    "nav.trips": "Viajes",
    "nav.chat": "Chat",
    
    "profile.my_travel_stats": "Mis Estadísticas de Viaje",
    "profile.my_journey": "Mi Viaje",
    "profile.posts": "Publicaciones",
    "profile.create_avatar": "Crear Avatar",
    "profile.invite_friends": "Invitar Amigos",
    "profile.followers": "Seguidores",
    "profile.following": "Siguiendo",
    "profile.countries": "Países",
    "profile.cities": "Ciudades",
    "profile.logout": "Cerrar sesión",
    "profile.light": "Claro",
    "profile.dark": "Oscuro",
    "profile.notifications_on": "Notificaciones ON",
    "profile.notifications_off": "Notificaciones OFF",
    "profile.language": "Idioma",
    
    "stats.km_traveled": "km recorridos",
    "stats.countries_visited": "países visitados",
    "stats.cities_visited": "ciudades visitadas",
    "stats.trips_completed": "viajes completados",
    "stats.environmental_impact": "Impacto Ambiental",
    "stats.vs_car": "Comparado con viaje en coche",
    "stats.co2_emitted": "kg CO₂ emitidos",
    "stats.co2_saved": "kg CO₂ ahorrados",
    "stats.eco_transport": "transporte eco",
    "stats.planned": "Planificados",
    "stats.in_progress": "En curso",
    "stats.completed": "Completados",
    "stats.co2_saved_message": "kg de CO₂ ahorrados!",
    
    "calendar.title": "Calendario de Eventos",
    "calendar.today": "Hoy",
    "calendar.events_on": "Eventos del",
    "calendar.no_events": "Sin eventos en esta fecha",
    "calendar.explore_events": "Explorar eventos en el mapa",
    "calendar.registered": "Inscrito",
    "calendar.organized": "Organizados",
    "calendar.events_attending": "eventos en los que participas",
    "calendar.events_created": "eventos que creaste",
    "calendar.organizer": "Organizador",
    
    "search.title": "Buscar",
    "search.placeholder": "Buscar ciudades, nómadas, viajes...",
    "search.cities": "Ciudades",
    "search.trips": "Viajes",
    "search.nomads": "Nómadas",
    "search.no_city": "Ninguna ciudad encontrada",
    "search.no_trip": "Ningún viaje encontrado",
    "search.no_nomad": "Ningún nómada encontrado",
    "search.by": "por",
    "search.view": "Ver",
    "search.follow": "Seguir",
    "search.following": "Siguiendo",
    
    "diary.my_trips": "Mis Viajes",
    "diary.explore": "Explorar",
    "diary.your_stats": "Tus estadísticas",
    "diary.new_trip": "Nuevo Viaje",
    "diary.add_stop": "Añadir Parada",
    "diary.add_expense": "Añadir Gasto",
    
    "common.save": "Guardar",
    "common.cancel": "Cancelar",
    "common.delete": "Eliminar",
    "common.edit": "Editar",
    "common.close": "Cerrar",
    "common.loading": "Cargando...",
    "common.error": "Error",
    "common.success": "Éxito",
    "common.nomads": "nómadas",
    "common.per_day": "/día",
    "common.daily_total": "TOTAL DIARIO",
    
    "premium.title": "Nomad Premium",
    "premium.subtitle": "Desbloquea beneficios globales y seguro.",
    "premium.upgrade": "Mejorar",
  }
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("nomadlife-language");
      if (saved && (saved === "it" || saved === "en" || saved === "es")) {
        return saved as Language;
      }
    }
    return "it";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("nomadlife-language", lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}

export const languageNames: Record<Language, string> = {
  it: "Italiano",
  en: "English",
  es: "Español"
};

export const languageFlags: Record<Language, string> = {
  it: "🇮🇹",
  en: "🇬🇧",
  es: "🇪🇸"
};
