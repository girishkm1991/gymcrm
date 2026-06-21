import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import apiRouter from "./src/server/routes/api";
import { db } from "./src/server/database/database";

async function startServer() {
  // Initialize MySQL connection, load schema and seed tables if active
  await db.initMySQL();

  const app = express();
  const PORT = 3000;

  // Serve post payloads with increased limits for photo base64 uploads
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // Serve static uploaded media files
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Log simple requests in background
  app.use((req, res, next) => {
    console.log(`[HTTP ENGINE] ${req.method} ${req.path}`);
    next();
  });

  // Mount central SaaS API routes first
  app.use("/api", apiRouter);

  // Serve static assets or mount live Vite pipeline
  if (process.env.NODE_ENV !== "production") {
    console.log("Launching Vite DevServer middleware binding on port 3000...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving production build from dist folder...");
    const distPath = path.join(process.cwd(), "dist");
    
    // Serve static compiled assets
    app.use(express.static(distPath));
    
    // Fallback single-page-routing serving index.html
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`GymFlow CRM Engine successfully booted on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("FATAL: Failed to start GymFlow CRM Express Server.", err);
  process.exit(1);
});
