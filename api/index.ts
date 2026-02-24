import express from "express";
import path from "path";
import { fileURLToPath } from "url";

// Compatibility for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// API routes
app.get("/api/config", (req, res) => {
  res.json({
    gsheetUrl: process.env.GSHEET_URL || "https://script.google.com/macros/s/AKfycbzG87SP4QaameeFB-8VrMG8JtKWoE6LjnYXgxj1O211EPEMN1pmwzDR2Qsz0-AgDjcl/exec"
  });
});

// Server setup logic
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  // Development mode with Vite middleware
  const startDev = async () => {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    const PORT = 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  };
  startDev();
} else if (process.env.NODE_ENV === "production" && !process.env.VERCEL) {
  // Local production preview
  const distPath = path.join(__dirname, "..", "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
  
  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
