"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const interviewControllers_js_1 = require("../controllers/interviewControllers.js");
const authMiddleware_js_1 = require("../middleware/authMiddleware.js");
const router = (0, express_1.Router)();
router.post("/", authMiddleware_js_1.requireAuth, interviewControllers_js_1.startInterview);
router.post("/:id/answer", authMiddleware_js_1.requireAuth, interviewControllers_js_1.submitAnswer);
router.get("/history", authMiddleware_js_1.requireAuth, interviewControllers_js_1.getInterviewHistory);
router.get("/:id", authMiddleware_js_1.requireAuth, interviewControllers_js_1.getInterviewById);
router.patch("/:id/end", authMiddleware_js_1.requireAuth, interviewControllers_js_1.endInterview);
exports.default = router;
//# sourceMappingURL=interviewRoutes.js.map