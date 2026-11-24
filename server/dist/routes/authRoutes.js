"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authControllers_js_1 = require("../controllers/authControllers.js");
const authMiddleware_js_1 = require("../middleware/authMiddleware.js");
const router = (0, express_1.Router)();
router.post("/signup", authControllers_js_1.signup);
router.post("/login", authControllers_js_1.login);
router.get("/me", authMiddleware_js_1.requireAuth, authControllers_js_1.getCurrentUser);
exports.default = router;
//# sourceMappingURL=authRoutes.js.map