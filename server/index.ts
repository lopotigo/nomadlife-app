import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import session from "express-session";
import passport from "passport";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err.message);
});
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// Session configuration with PostgreSQL store
const PgSession = connectPgSimple(session);
const pgPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

app.set("trust proxy", 1);

const isProduction = process.env.NODE_ENV === "production";

app.use(
  session({
    store: new PgSession({
      pool: pgPool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "nomadlife-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    rolling: true, // Refresh session on each request
    cookie: {
      secure: isProduction,
      httpOnly: true,
      sameSite: isProduction ? "none" as const : "lax" as const,
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    },
  })
);

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  const { ensureTablesExist } = await import("./db");
  await ensureTablesExist();

  await registerRoutes(httpServer, app);

  const { autoSeed } = await import("./seed");
  await autoSeed();

  const { startWeeklyUpdateJob } = await import("./weekly-update");
  startWeeklyUpdateJob();

  const { checkTravelAlerts } = await import("./travel-alerts");
  if (process.env.NODE_ENV !== "development") {
    setTimeout(() => {
      checkTravelAlerts().catch(err => console.error("[Travel Alerts] Initial check error:", err));
    }, 60000);
    setInterval(() => {
      checkTravelAlerts().catch(err => console.error("[Travel Alerts] Periodic check error:", err));
    }, 24 * 60 * 60 * 1000);
    console.log("[Travel Alerts] Scheduled: runs daily in production.");
  } else {
    console.log("[Travel Alerts] Skipped in development mode.");
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Express error:", message);
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
