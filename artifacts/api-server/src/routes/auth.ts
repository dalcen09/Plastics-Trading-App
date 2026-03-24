import { Router } from "express";
import { randomUUID } from "crypto";

const router = Router();

const validTokens = new Set<string>();

router.post("/auth/login", (req, res) => {
  const { password } = req.body as { password?: string };
  const appPassword = process.env.APP_PASSWORD;

  if (!appPassword) {
    res.status(503).json({ error: "Auth not configured" });
    return;
  }

  if (!password || password !== appPassword) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }

  const token = randomUUID();
  validTokens.add(token);
  res.json({ token });
});

router.get("/auth/verify", (req, res) => {
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!token || !validTokens.has(token)) {
    res.status(401).json({ ok: false });
    return;
  }

  res.json({ ok: true });
});

router.post("/auth/logout", (req, res) => {
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  validTokens.delete(token);
  res.json({ ok: true });
});

export default router;
