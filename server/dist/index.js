"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const interviewRoutes_1 = __importDefault(require("./routes/interviewRoutes"));
const feedbackRoutes_1 = __importDefault(require("./routes/feedbackRoutes"));
const analyticsRoutes_1 = __importDefault(require("./routes/analyticsRoutes"));
const gdRoutes_1 = __importDefault(require("./routes/gdRoutes"));
const errorHandler_1 = require("./middleware/errorHandler");
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const db_1 = __importDefault(require("./config/db"));
const dns_1 = __importDefault(require("dns"));
dns_1.default.setDefaultResultOrder("ipv4first");
dotenv_1.default.config();
console.log("ENV CHECK:", process.env.GROQ_API_KEY);
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8000;
(0, db_1.default)();
const corsOptions = {
    origin: ["http://localhost:5173", process.env.CLIENT_URL || ""],
    credentials: true,
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
//basic Health Check route
app.get("/", (req, res) => {
    res.send("hello from typescript + express");
});
//Expense Routes
app.use("/api/interview", interviewRoutes_1.default);
//Auth Routes
app.use("/api/auth", authRoutes_1.default);
//Feedback Routes
app.use("/api/feedback", feedbackRoutes_1.default);
//Analytics Routes
app.use("/api/analytics", analyticsRoutes_1.default);
//Gd Routes
app.use("/api/gd", gdRoutes_1.default);
app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Backend is running",
    });
});
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        error: `Cannot find ${req.method} ${req.originalUrl}`,
    });
});
app.use(errorHandler_1.errorHandler);
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log(`Port loaded from: ${process.env.PORT ? ".env file" : "default(8000)"}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
//# sourceMappingURL=index.js.map