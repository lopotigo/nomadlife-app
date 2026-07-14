import { Switch, Route, Redirect } from "wouter";
import DiaryPage from "@/pages/diary";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import { OnboardingProvider } from "@/lib/onboarding";
import { WelcomeTutorial } from "@/components/welcome-tutorial";
import { AiChatbot } from "@/components/ai-chatbot";
import { AppErrorBoundary } from "@/components/app-error-boundary";

import AiHome from "@/pages/ai-home";
import CityBriefing from "@/pages/city-briefing";
import MapFeed from "@/pages/map-feed";
import Profile from "@/pages/profile";
import UserProfile from "@/pages/user-profile";
import Chat from "@/pages/chat";
import Booking from "@/pages/coworking";
import Subscription from "@/pages/subscription";
import Auth from "@/pages/auth";
import TravelDiary from "@/pages/travel-diary";
import UnifiedMap from "@/pages/unified-map";
import Home from "@/pages/home";
import PostDetail from "@/pages/post-detail";
import TripDetail from "@/pages/trip-detail";
import SearchPage from "@/pages/search";
import AvatarBuilder from "@/pages/avatar-builder";
import EventsCalendar from "@/pages/events-calendar";
import EventDetail from "@/pages/event-detail";
import Marketplace from "@/pages/marketplace";
import Admin from "@/pages/admin";
import SavedPosts from "@/pages/saved-posts";
import Matchmaking from "@/pages/matchmaking";
import Blog from "@/pages/blog";
import BlogArticle from "@/pages/blog-article";
import BlogEditor from "@/pages/blog-editor";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import PrivacyPolicy from "@/pages/privacy-policy";
import Terms from "@/pages/terms";
import { Loader2 } from "lucide-react";

function AuthenticatedChatbot() {
  const { user, loading } = useAuth();
  if (loading || !user) return null;
  return <AiChatbot />;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }
  if (!user) {
    return <Redirect to="/auth" />;
  }
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={Auth} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={Terms} />
      <Route path="/">{() => <ProtectedRoute component={AiHome} />}</Route>
      <Route path="/map">{() => <ProtectedRoute component={UnifiedMap} />}</Route>
      <Route path="/city">{() => <ProtectedRoute component={CityBriefing} />}</Route>
      <Route path="/diary">{() => <ProtectedRoute component={DiaryPage} />}</Route>
      <Route path="/feed">{() => <ProtectedRoute component={Home} />}</Route>
      <Route path="/map-feed">{() => <ProtectedRoute component={MapFeed} />}</Route>
      <Route path="/booking">{() => <ProtectedRoute component={Booking} />}</Route>
      <Route path="/coworking">{() => <ProtectedRoute component={Booking} />}</Route>
      <Route path="/chat">{() => <ProtectedRoute component={Chat} />}</Route>
      <Route path="/subscription">{() => <ProtectedRoute component={Subscription} />}</Route>
      <Route path="/profile">{() => <ProtectedRoute component={Profile} />}</Route>
      <Route path="/user/:id" component={UserProfile} />
      <Route path="/post/:id" component={PostDetail} />
      <Route path="/trip/:id" component={TripDetail} />
      <Route path="/search">{() => <ProtectedRoute component={SearchPage} />}</Route>
      <Route path="/travel-diary">{() => <ProtectedRoute component={TravelDiary} />}</Route>
      <Route path="/avatar-builder">{() => <ProtectedRoute component={AvatarBuilder} />}</Route>
      <Route path="/events-calendar">{() => <ProtectedRoute component={EventsCalendar} />}</Route>
      <Route path="/event/:id" component={EventDetail} />
      <Route path="/marketplace">{() => <ProtectedRoute component={Marketplace} />}</Route>
      <Route path="/saved">{() => <ProtectedRoute component={SavedPosts} />}</Route>
      <Route path="/matchmaking">{() => <ProtectedRoute component={Matchmaking} />}</Route>
      <Route path="/admin">{() => <ProtectedRoute component={Admin} />}</Route>
      <Route path="/blog" component={Blog} />
      <Route path="/blog/editor">{() => <ProtectedRoute component={BlogEditor} />}</Route>
      <Route path="/blog/:slug" component={BlogArticle} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <OnboardingProvider>
              <TooltipProvider>
                <Toaster />
                <WelcomeTutorial />
                <AppErrorBoundary>
                  <Router />
                  <AuthenticatedChatbot />
                </AppErrorBoundary>
              </TooltipProvider>
            </OnboardingProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
