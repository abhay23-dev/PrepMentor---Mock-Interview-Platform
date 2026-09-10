import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  getDashboardAnalytics,
  getDifficultyAnalytics,
  getOverviewAnalytics,
  getProgressAnalytics,
  getStrengthsWeaknessesAnalytics,
  getTopicAnalytics,
} from "../controllers/analyticsControllers.js";

const router = Router();

// One-call endpoint for the analytics dashboard page (overview + topics +
// difficulty + progress + strengths/weaknesses in a single response).
router.get("/dashboard", requireAuth, getDashboardAnalytics);

router.get("/overview", requireAuth, getOverviewAnalytics);
router.get("/topics", requireAuth, getTopicAnalytics);
router.get("/difficulty", requireAuth, getDifficultyAnalytics);
router.get("/progress", requireAuth, getProgressAnalytics);
router.get("/strengths-weaknesses", requireAuth, getStrengthsWeaknessesAnalytics);

export default router;
