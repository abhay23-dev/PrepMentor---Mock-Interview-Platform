"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_js_1 = require("../middleware/authMiddleware.js");
const feedbackControllers_js_1 = require("../controllers/feedbackControllers.js");
const router = (0, express_1.Router)();
router.get("/:interviewId", authMiddleware_js_1.requireAuth, feedbackControllers_js_1.getInterviewFeedback);
exports.default = router;
//# sourceMappingURL=feedbackRoutes.js.map