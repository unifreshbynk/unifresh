import { app, ensureServerReady } from "../server.js";

export default async function handler(req, res) {
  try {
    ensureServerReady();
    return app(req, res);
  } catch (err) {
    console.error("[API]", err);
    res.status(503).json({
      error:
        err instanceof Error
          ? err.message
          : "Service temporairement indisponible. Vérifiez la configuration sur Vercel.",
    });
  }
}
