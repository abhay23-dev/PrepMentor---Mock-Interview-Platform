import { Router } from "express";
import {
  endInterview,
  getInterviewById,
  getInterviewHistory,
  startInterview,
  submitAnswer,
} from "../controllers/interviewControllers.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/", requireAuth, startInterview);
router.post("/:id/answer", requireAuth, submitAnswer);
router.get("/history", requireAuth, getInterviewHistory);
router.get("/:id", requireAuth, getInterviewById);
router.patch("/:id/end", requireAuth, endInterview);

export default router;
