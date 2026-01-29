import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/lib/auth";

import MapFeed from "@/pages/map-feed";
import Explore from "@/pages/explore";
import Profile from "@/pages/profile";
import UserProfile from "@/pages/user-profile";
import Chat from "@/pages/chat";
import Coworking from "@/pages/coworking";
import Subscription from "@/pages/subscription";
import Auth from "@/pages/auth";
import DesignPreview from "@/pages/design-preview";
import MobilePreview from "@/pages/mobile-preview";
import TravelDiary from "@/pages/travel-diary";
import UnifiedMap from "@/pages/unified-map";
import PostDetail from "@/pages/post-detail";
import TripDetail from "@/pages/trip-detail";
import SearchPage from "@/pages/search";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={Auth} />
      <Route path="/" component={UnifiedMap} />
      <Route path="/feed" component={MapFeed} />
      <Route path="/explore" component={Explore} />
      <Route path="/coworking" component={Coworking} />
      <Route path="/chat" component={Chat} />
      <Route path="/subscription" component={Subscription} />
      <Route path="/profile" component={Profile} />
      <Route path="/user/:id" component={UserProfile} />
      <Route path="/post/:id" component={PostDetail} />
      <Route path="/trip/:id" component={TripDetail} />
      <Route path="/search" component={SearchPage} />
      <Route path="/design-preview" component={DesignPreview} />
      <Route path="/mobile-preview" component={MobilePreview} />
      <Route path="/travel-diary" component={TravelDiary} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
