import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { getInterviewFeedback } from "../controllers/feedbackControllers.js";

const router = Router();

router.get("/:interviewId", requireAuth, getInterviewFeedback);

export default router;
