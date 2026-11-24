"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const errorHandler_1 = require("./errorHandler");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const requireAuth = (req, res, next) => {
    //Bearer sdfdsgjdsjslf.dsdg.s/fsddfgfgk
    //Bearer --> it means that he who holds the string after Bearer word can be allowed to do the task
    //A token contain three different parts header, payload and cryptographic signature
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        throw new errorHandler_1.AppError("No token provided. Please login.", 401);
    }
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
        throw new errorHandler_1.AppError("Invalid token format. Use: Bearer <token>", 401);
    }
    const token = parts[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not defined in environment variables");
    }
    //{userId: "1234345", iat: 12314355, exp: 13435454656}
    const decoded = jsonwebtoken_1.default.verify(token, secret);
    req.userId = decoded.userId;
    next();
};
exports.requireAuth = requireAuth;
//# sourceMappingURL=authMiddleware.js.map