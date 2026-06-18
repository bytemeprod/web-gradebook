import { Router, Response } from "express";
import bcrypt from "bcrypt";
import db from "../db/db.ts";
import { generateToken } from "../utils/jwt.ts";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth.ts";

const router = Router();

// POST /api/auth/login
router.post("/login", async (req, res): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required." });
      return;
    }

    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;

    if (!user) {
      res.status(401).json({ error: "Invalid username or password." });
      return;
    }

    if (user.is_expelled === 1) {
      res.status(403).json({ error: "Your account is deactivated (expelled)." });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ error: "Invalid username or password." });
      return;
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        is_new: user.is_new === 1,
        is_expelled: user.is_expelled === 1,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res): void => {
  res.clearCookie("token");
  res.json({ message: "Logout successful" });
});

// GET /api/auth/me
router.get("/me", authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user?.id;
    const user = db.prepare("SELECT id, username, name, role, is_new, is_expelled FROM users WHERE id = ?").get(userId) as any;

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        is_new: user.is_new === 1,
        is_expelled: user.is_expelled === 1,
      },
    });
  } catch (error) {
    console.error("Me check error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
