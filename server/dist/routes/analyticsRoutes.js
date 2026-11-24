"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_js_1 = require("../middleware/authMiddleware.js");
const analyticsControllers_js_1 = require("../controllers/analyticsControllers.js");
const router = (0, express_1.Router)();
router.get("/", authMiddleware_js_1.requireAuth, analyticsControllers_js_1.getUserAnalytics);
exports.default = router;
//# sourceMappingURL=analyticsRoutes.js.map