import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

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
    gsheetUrl: "https://script.google.com/macros/s/AKfycbzG87SP4QaameeFB-8VrMG8JtKWoE6LjnYXgxj1O211EPEMN1pmwzDR2Qsz0-AgDjcl/exec"
  });
});

async function setupServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    // Note: On Vercel, static files are served by Vercel itself, 
    // but this keeps local production previews working.
    const distPath = path.join(__dirname, "..", "dist");
    app.use(express.static(distPath));
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupServer();

export default app;
