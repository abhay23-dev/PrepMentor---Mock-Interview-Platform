import { Router } from "express";
import {
  endSession,
  getSessionById,
  getSessionHistory,
  nextTurn,
  startSession,
  submitMessage,
} from "../controllers/gdControllers.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/start", requireAuth, startSession);
router.get("/history", requireAuth, getSessionHistory); // must stay above "/:id"
router.get("/:id", requireAuth, getSessionById);
router.post("/:id/next-turn", requireAuth, nextTurn);
router.post("/:id/message", requireAuth, submitMessage);
router.patch("/:id/end", requireAuth, endSession);

export default router;
