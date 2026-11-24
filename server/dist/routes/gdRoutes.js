"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const gdControllers_js_1 = require("../controllers/gdControllers.js");
const authMiddleware_js_1 = require("../middleware/authMiddleware.js");
const router = (0, express_1.Router)();
router.post("/start", authMiddleware_js_1.requireAuth, gdControllers_js_1.startSession);
router.get("/history", authMiddleware_js_1.requireAuth, gdControllers_js_1.getSessionHistory); // must stay above "/:id"
router.get("/:id", authMiddleware_js_1.requireAuth, gdControllers_js_1.getSessionById);
router.post("/:id/next-turn", authMiddleware_js_1.requireAuth, gdControllers_js_1.nextTurn);
router.post("/:id/message", authMiddleware_js_1.requireAuth, gdControllers_js_1.submitMessage);
router.patch("/:id/end", authMiddleware_js_1.requireAuth, gdControllers_js_1.endSession);
exports.default = router;
//# sourceMappingURL=gdRoutes.js.map