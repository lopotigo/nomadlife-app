import { useQuery } from "@tanstack/react-query";
import { Loader2, Wind, Droplets } from "lucide-react";

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
}

interface WeatherWidgetProps {
  latitude: number;
  longitude: number;
  compact?: boolean;
}

export function WeatherWidget({ latitude, longitude, compact = false }: WeatherWidgetProps) {
  const { data: weather, isLoading } = useQuery<WeatherData>({
    queryKey: ["weather", latitude, longitude],
    queryFn: async () => {
      const res = await fetch(`/api/weather?lat=${latitude}&lon=${longitude}`);
      if (!res.ok) throw new Error("Failed to fetch weather");
      return res.json();
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-1">
        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!weather) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <span>{weather.icon}</span>
        <span className="font-medium">{weather.temperature}°C</span>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg p-2 mt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{weather.icon}</span>
          <div>
            <p className="font-bold text-lg">{weather.temperature}°C</p>
            <p className="text-xs text-muted-foreground">{weather.description}</p>
          </div>
        </div>
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Wind className="w-3 h-3" />
            <span>{weather.windSpeed} km/h</span>
          </div>
          <div className="flex items-center gap-1">
            <Droplets className="w-3 h-3" />
            <span>{weather.humidity}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
