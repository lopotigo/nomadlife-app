import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface OnboardingState {
  hasSeenWelcome: boolean;
  hasSeenMapTip: boolean;
  hasSeenFeedTip: boolean;
  hasSeenCreateTip: boolean;
  hasSeenProfileTip: boolean;
  hasSeenTravelDiaryTip: boolean;
}

interface OnboardingContextType {
  state: OnboardingState;
  markAsSeen: (key: keyof OnboardingState) => void;
  resetOnboarding: () => void;
  isNewUser: boolean;
}

const defaultState: OnboardingState = {
  hasSeenWelcome: false,
  hasSeenMapTip: false,
  hasSeenFeedTip: false,
  hasSeenCreateTip: false,
  hasSeenProfileTip: false,
  hasSeenTravelDiaryTip: false,
};

const OnboardingContext = createContext<OnboardingContextType | null>(null);

const STORAGE_KEY = "nomadlife_onboarding";

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(() => {
    if (typeof window === "undefined") return defaultState;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return { ...defaultState, ...JSON.parse(saved) };
      } catch {
        return defaultState;
      }
    }
    return defaultState;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const markAsSeen = (key: keyof OnboardingState) => {
    setState((prev) => ({ ...prev, [key]: true }));
  };

  const resetOnboarding = () => {
    setState(defaultState);
    localStorage.removeItem(STORAGE_KEY);
  };

  const isNewUser = !state.hasSeenWelcome;

  return (
    <OnboardingContext.Provider value={{ state, markAsSeen, resetOnboarding, isNewUser }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}
