import {Router} from "express";
import { login, signup } from "../controllers/authControllers.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", requireAuth, getCurrentUser);

export default router;
