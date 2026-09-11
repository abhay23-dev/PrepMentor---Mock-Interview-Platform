import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { getUserAnalytics } from "../controllers/analyticsControllers.js";

const router = Router();

router.get("/", requireAuth, getUserAnalytics);

export default router;