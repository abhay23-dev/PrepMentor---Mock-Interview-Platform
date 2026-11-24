"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentUser = exports.login = exports.signup = void 0;
const responseHelpers_js_1 = require("../utils/responseHelpers.js");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
const User_js_1 = __importDefault(require("../models/User.js"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const tokenHelpers_js_1 = require("../utils/tokenHelpers.js");
exports.signup = (0, responseHelpers_js_1.asyncHandler)(async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        //400 --> bad request or clients fault
        throw new errorHandler_js_1.AppError("Please provide name, email and password!", 400);
    }
    if (name && name.trim().length < 2) {
        throw new errorHandler_js_1.AppError("Name must be at least 2 characters.", 400);
    }
    if (name && name.trim().length > 50) {
        throw new errorHandler_js_1.AppError("Name cannot exceed 50 characters.", 400);
    }
    if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new errorHandler_js_1.AppError("Invalid email format", 400);
        }
    }
    if (password) {
        if (password.length < 8) {
            throw new errorHandler_js_1.AppError("Password must be at least 8 characters", 400);
        }
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/;
        if (!passwordRegex.test(password)) {
            throw new errorHandler_js_1.AppError("Password must contain uppercase, lowercase, number, and special character (@$!%?&)", 400);
        }
    }
    const existingUser = await User_js_1.default.findOne({ email: email });
    if (existingUser) {
        throw new errorHandler_js_1.AppError("Email already registered!", 400);
    }
    const hashedPassword = await bcryptjs_1.default.hash(password, 10);
    const newUser = new User_js_1.default({
        name,
        email,
        password: hashedPassword,
    });
    const savedUser = await newUser.save();
    const userObject = savedUser.toObject();
    const { password: _, ...userWithoutPassword } = userObject;
    const authResponse = {
        user: { ...userWithoutPassword, _id: savedUser._id.toString() },
    };
    (0, responseHelpers_js_1.sendSuccess)(res, authResponse, "Account created successfully", 201);
});
exports.login = (0, responseHelpers_js_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new errorHandler_js_1.AppError("Please provide email and password", 400);
    }
    const user = await User_js_1.default.findOne({ email: email });
    if (!user) {
        throw new errorHandler_js_1.AppError("Incorrect Credentials!", 401);
    }
    const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
    if (!isPasswordValid) {
        throw new errorHandler_js_1.AppError("Incorrect email or password", 401);
    }
    const userObject = user.toObject();
    const { password: _, ...userWithoutPassword } = userObject;
    const token = (0, tokenHelpers_js_1.generateToken)(user._id.toString());
    const authResponse = {
        user: { ...userWithoutPassword, _id: userObject._id.toString() },
        token,
    };
    (0, responseHelpers_js_1.sendSuccess)(res, authResponse, "Login Successful!", 201);
});
exports.getCurrentUser = (0, responseHelpers_js_1.asyncHandler)(async (req, res, next) => {
    const userId = req.userId;
    const user = await User_js_1.default.findOne({ _id: userId });
    if (!user) {
        throw new errorHandler_js_1.AppError("User not found", 404);
    }
    const userObject = user.toObject();
    const { password: _, ...userWithoutPassword } = userObject;
    (0, responseHelpers_js_1.sendSuccess)(res, userWithoutPassword, "Profile retrieved successfully");
});
//# sourceMappingURL=authControllers.js.map