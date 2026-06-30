import { Router, Request, Response } from "express";
import { LoginAdminBody } from "@workspace/api-zod";
import { ADMIN_EMAIL, ADMIN_PASSWORD, createAdminToken, parseAdminToken } from "../lib/auth";

const router = Router();

// POST /admin/login
router.post("/admin/login", async (req: Request, res: Response) => {
  try {
    const body = LoginAdminBody.parse(req.body);

    if (body.email !== ADMIN_EMAIL || body.password !== ADMIN_PASSWORD) {
      res.status(401).json({ error: "Invalid admin credentials" });
      return;
    }

    const token = createAdminToken(body.email, "admin");
    res.json({ role: "admin", email: body.email, token });
  } catch (err) {
    req.log.error({ err }, "Admin login failed");
    res.status(400).json({ error: "Login failed" });
  }
});

// GET /admin/me
router.get("/admin/me", async (req: Request, res: Response) => {
  try {
    const admin = parseAdminToken(req);
    if (!admin) { res.status(401).json({ error: "Not authenticated" }); return; }
    res.json({ role: admin.role, email: admin.email });
  } catch (err) {
    req.log.error({ err }, "Failed to get admin session");
    res.status(500).json({ error: "Failed to get session" });
  }
});

// POST /admin/logout
router.post("/admin/logout", (_req: Request, res: Response) => {
  res.json({ success: true, message: "Logged out" });
});

export default router;
