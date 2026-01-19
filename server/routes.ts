import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import { insertUserSchema, insertPostSchema, insertPlaceSchema, insertBookingSchema, insertChatGroupSchema, insertMessageSchema, insertSubscriptionSchema, insertEventSchema, insertEventRegistrationSchema } from "@shared/schema";
import type { User } from "@shared/schema";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { createRepository, pushFile, getGitHubUser } from "./github";

// Configure Passport Local Strategy
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return done(null, false, { message: "Invalid credentials" });
      }
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return done(null, false, { message: "Invalid credentials" });
      }
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  })
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export function requireAuth(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).send({ error: "Unauthorized" });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Register Object Storage routes for file uploads (with authentication)
  registerObjectStorageRoutes(app, requireAuth);
  
  // ========== AUTH ROUTES ==========
  app.post("/api/auth/signup", async (req, res, next) => {
    try {
      const data = insertUserSchema.parse(req.body);
      
      // Check if user exists
      const existingUser = await storage.getUserByUsername(data.username);
      if (existingUser) {
        return res.status(400).send({ error: "Username already exists" });
      }
      
      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) {
        return res.status(400).send({ error: "Email already exists" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);
      const user = await storage.createUser({ ...data, password: hashedPassword });
      
      // Auto login after signup
      req.login(user, (err) => {
        if (err) return next(err);
        const { password, ...userWithoutPassword } = user;
        res.status(201).send(userWithoutPassword);
      });
    } catch (error: any) {
      res.status(400).send({ error: error.message });
    }
  });

  app.post("/api/auth/login", passport.authenticate("local"), (req, res) => {
    const { password, ...userWithoutPassword } = req.user as User;
    res.send(userWithoutPassword);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.send({ success: true });
    });
  });

  app.get("/api/auth/me", requireAuth, (req, res) => {
    const { password, ...userWithoutPassword } = req.user as User;
    res.send(userWithoutPassword);
  });

  // ========== USER ROUTES ==========
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).send({ error: "User not found" });
      }
      const { password, ...userWithoutPassword } = user;
      res.send(userWithoutPassword);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.patch("/api/users/:id", requireAuth, async (req, res) => {
    try {
      if (req.params.id !== (req.user as User).id) {
        return res.status(403).send({ error: "Forbidden" });
      }
      
      const updates = req.body;
      delete updates.password; // Don't allow password changes through this endpoint
      
      const user = await storage.updateUser(req.params.id, updates);
      if (!user) {
        return res.status(404).send({ error: "User not found" });
      }
      const { password, ...userWithoutPassword } = user;
      res.send(userWithoutPassword);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== POST ROUTES ==========
  app.get("/api/posts", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const posts = await storage.getPosts(limit);
      res.send(posts);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/posts/user/:userId", async (req, res) => {
    try {
      const posts = await storage.getPostsByUser(req.params.userId);
      res.send(posts);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/posts", requireAuth, async (req, res) => {
    try {
      const data = insertPostSchema.parse({
        ...req.body,
        userId: (req.user as User).id,
      });
      const post = await storage.createPost(data);
      res.status(201).send(post);
    } catch (error: any) {
      res.status(400).send({ error: error.message });
    }
  });

  app.post("/api/posts/:id/like", requireAuth, async (req, res) => {
    try {
      const post = await storage.likePost(req.params.id);
      if (!post) {
        return res.status(404).send({ error: "Post not found" });
      }
      res.send(post);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== PLACE ROUTES ==========
  app.get("/api/places", async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.city) filters.city = req.query.city as string;
      if (req.query.type) filters.type = req.query.type as string;
      
      const places = await storage.getPlaces(filters);
      res.send(places);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/places/search", async (req, res) => {
    try {
      const filters = {
        query: req.query.query as string | undefined,
        city: req.query.city as string | undefined,
        type: req.query.type as string | undefined,
        priceMin: req.query.priceMin ? parseInt(req.query.priceMin as string) : undefined,
        priceMax: req.query.priceMax ? parseInt(req.query.priceMax as string) : undefined,
        amenities: req.query.amenities ? (req.query.amenities as string).split(",") : undefined,
      };
      const places = await storage.searchPlaces(filters);
      res.send(places);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/places/:id", async (req, res) => {
    try {
      const place = await storage.getPlace(req.params.id);
      if (!place) {
        return res.status(404).send({ error: "Place not found" });
      }
      res.send(place);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/places", requireAuth, async (req, res) => {
    try {
      const data = insertPlaceSchema.parse(req.body);
      const place = await storage.createPlace(data);
      res.status(201).send(place);
    } catch (error: any) {
      res.status(400).send({ error: error.message });
    }
  });

  // ========== BOOKING ROUTES ==========
  app.get("/api/bookings", requireAuth, async (req, res) => {
    try {
      const bookings = await storage.getBookings((req.user as User).id);
      res.send(bookings);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/bookings", requireAuth, async (req, res) => {
    try {
      const data = insertBookingSchema.parse({
        ...req.body,
        userId: (req.user as User).id,
        checkInDate: new Date(req.body.checkInDate),
      });
      const booking = await storage.createBooking(data);
      res.status(201).send(booking);
    } catch (error: any) {
      res.status(400).send({ error: error.message });
    }
  });

  app.delete("/api/bookings/:id", requireAuth, async (req, res) => {
    try {
      const booking = await storage.cancelBooking(req.params.id);
      if (!booking) {
        return res.status(404).send({ error: "Booking not found" });
      }
      res.send(booking);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== CHAT GROUP ROUTES ==========
  app.get("/api/chat-groups", async (req, res) => {
    try {
      const groups = await storage.getChatGroups();
      res.send(groups);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/chat-groups/:id", async (req, res) => {
    try {
      const group = await storage.getChatGroup(req.params.id);
      if (!group) {
        return res.status(404).send({ error: "Chat group not found" });
      }
      res.send(group);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/chat-groups", requireAuth, async (req, res) => {
    try {
      const data = insertChatGroupSchema.parse(req.body);
      const group = await storage.createChatGroup(data);
      res.status(201).send(group);
    } catch (error: any) {
      res.status(400).send({ error: error.message });
    }
  });

  // ========== MESSAGE ROUTES ==========
  app.get("/api/messages/group/:groupId", requireAuth, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const messages = await storage.getGroupMessages(req.params.groupId, limit);
      res.send(messages);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/messages/private/:userId", requireAuth, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const messages = await storage.getPrivateMessages((req.user as User).id, req.params.userId, limit);
      res.send(messages);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/messages", requireAuth, async (req, res) => {
    try {
      const data = insertMessageSchema.parse({
        ...req.body,
        senderId: (req.user as User).id,
      });
      const message = await storage.createMessage(data);
      res.status(201).send(message);
    } catch (error: any) {
      res.status(400).send({ error: error.message });
    }
  });

  // ========== SUBSCRIPTION ROUTES ==========
  app.get("/api/subscription", requireAuth, async (req, res) => {
    try {
      const subscription = await storage.getUserSubscription((req.user as User).id);
      res.send(subscription || null);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/subscription", requireAuth, async (req, res) => {
    try {
      const data = insertSubscriptionSchema.parse({
        ...req.body,
        userId: (req.user as User).id,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      });
      
      // Mark user as premium
      await storage.updateUser((req.user as User).id, { isPremium: true });
      
      const subscription = await storage.createSubscription(data);
      res.status(201).send(subscription);
    } catch (error: any) {
      res.status(400).send({ error: error.message });
    }
  });

  app.patch("/api/subscription/:id", requireAuth, async (req, res) => {
    try {
      const subscription = await storage.updateSubscription(req.params.id, req.body);
      if (!subscription) {
        return res.status(404).send({ error: "Subscription not found" });
      }
      
      // If cancelled, update user premium status
      if (req.body.status === "cancelled") {
        await storage.updateUser((req.user as User).id, { isPremium: false });
      }
      
      res.send(subscription);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== EVENT ROUTES ==========
  app.get("/api/events", async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.city) filters.city = req.query.city as string;
      if (req.query.type) filters.type = req.query.type as string;
      const events = await storage.getEvents(filters);
      res.send(events);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/events/:id", async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).send({ error: "Event not found" });
      }
      res.send(event);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/events", requireAuth, async (req, res) => {
    try {
      const data = insertEventSchema.parse({
        ...req.body,
        hostId: (req.user as User).id,
        startDate: new Date(req.body.startDate),
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      });
      const event = await storage.createEvent(data);
      res.status(201).send(event);
    } catch (error: any) {
      res.status(400).send({ error: error.message });
    }
  });

  app.post("/api/events/:id/register", requireAuth, async (req, res) => {
    try {
      const data = insertEventRegistrationSchema.parse({
        eventId: req.params.id,
        userId: (req.user as User).id,
      });
      const registration = await storage.registerForEvent(data);
      res.status(201).send(registration);
    } catch (error: any) {
      res.status(400).send({ error: error.message });
    }
  });

  app.delete("/api/events/:id/register", requireAuth, async (req, res) => {
    try {
      const registration = await storage.cancelEventRegistration(req.params.id, (req.user as User).id);
      if (!registration) {
        return res.status(404).send({ error: "Registration not found" });
      }
      res.send(registration);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/event-registrations", requireAuth, async (req, res) => {
    try {
      const registrations = await storage.getUserEventRegistrations((req.user as User).id);
      res.send(registrations);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== ANALYTICS ROUTES ==========
  app.get("/api/analytics", requireAuth, async (req, res) => {
    try {
      const analytics = await storage.getAnalytics();
      res.send(analytics);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== GITHUB ROUTES ==========
  app.post("/api/github/create-analytics-dashboard", requireAuth, async (req, res) => {
    try {
      const githubUser = await getGitHubUser();
      const repoName = "nomadlife-analytics-dashboard";
      const repoDescription = "Animated Analytics Dashboard for NomadLife - React + Recharts + Framer Motion";
      
      const repo = await createRepository(repoName, repoDescription, false);
      
      const analyticsCode = [
        '// NomadLife Analytics Dashboard',
        '// React component with animated charts using Recharts and Framer Motion',
        '',
        'import { useEffect, useState } from "react";',
        'import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";',
        'import { motion } from "framer-motion";',
        'import { Users, FileText, Calendar, CreditCard, TrendingUp } from "lucide-react";',
        '',
        'interface Analytics {',
        '  totalUsers: number;',
        '  premiumUsers: number;',
        '  totalPosts: number;',
        '  totalBookings: number;',
        '  totalMessages: number;',
        '  recentActivity: { date: string; users: number; posts: number; bookings: number }[];',
        '  postsByCity: { city: string; count: number }[];',
        '}',
        '',
        'function AnimatedCounter({ value }: { value: number }) {',
        '  const [count, setCount] = useState(0);',
        '  useEffect(() => {',
        '    let start = 0;',
        '    const timer = setInterval(() => { start += 1; setCount(start); if (start >= value) clearInterval(timer); }, 20);',
        '    return () => clearInterval(timer);',
        '  }, [value]);',
        '  return <span>{count}</span>;',
        '}',
        '',
        'export default function AnalyticsDashboard({ analytics }: { analytics: Analytics }) {',
        '  const mrr = analytics.premiumUsers * 29;',
        '  return (',
        '    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">',
        '      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">',
        '        <h1 className="text-3xl font-black text-white">Analytics Dashboard</h1>',
        '      </motion.div>',
        '      <div className="grid grid-cols-4 gap-4 mb-8">',
        '        <KPICard title="Users" value={analytics.totalUsers} icon={Users} />',
        '        <KPICard title="Premium" value={analytics.premiumUsers} icon={CreditCard} />',
        '        <KPICard title="Posts" value={analytics.totalPosts} icon={FileText} />',
        '        <KPICard title="Bookings" value={analytics.totalBookings} icon={Calendar} />',
        '      </div>',
        '      <div className="bg-green-500 rounded-2xl p-6 text-white mb-8">',
        '        <p>Monthly Revenue: $<AnimatedCounter value={mrr} /></p>',
        '      </div>',
        '    </div>',
        '  );',
        '}',
        '',
        'function KPICard({ title, value, icon: Icon }: any) {',
        '  return (',
        '    <div className="bg-slate-800 rounded-2xl p-4">',
        '      <Icon className="w-5 h-5 text-white" />',
        '      <p className="text-2xl font-black text-white"><AnimatedCounter value={value} /></p>',
        '      <p className="text-xs text-slate-400">{title}</p>',
        '    </div>',
        '  );',
        '}',
      ].join('\n');

      const readmeContent = [
        '# NomadLife Analytics Dashboard',
        '',
        'An animated analytics dashboard built with React, Recharts, and Framer Motion.',
        '',
        '## Features',
        '- Animated KPI Cards with counting animations',
        '- Interactive Charts (Area, Bar, Pie)',
        '- Glassmorphism dark theme design',
        '- Real-time data from API',
        '',
        '## Tech Stack',
        '- React 18',
        '- Recharts',
        '- Framer Motion',
        '- Tailwind CSS',
        '- Lucide React Icons',
        '',
        '## License',
        'MIT',
      ].join('\n');

      await pushFile(githubUser.login, repoName, "src/AnalyticsDashboard.tsx", analyticsCode, "Add Analytics Dashboard component");
      await pushFile(githubUser.login, repoName, "README.md", readmeContent, "Add README");
      
      res.send({ 
        success: true, 
        repository: repo.html_url,
        message: "Repository created at " + repo.html_url
      });
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  return httpServer;
}
