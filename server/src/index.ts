import express, { Application, Request, Response } from "express";
import authRoutes from "./routes/authRoutes";
import interviewRoutes from "./routes/interviewRoutes"
import feedbackRoutes from "./routes/feedbackRoutes"
import { errorHandler } from "./middleware/errorHandler";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 8000;

connectDB();

const corsOptions = {
  origin: ["http://localhost:5173", process.env.CLIENT_URL || ""],
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());

//basic Health Check route
app.get("/", (req, res) => {
  res.send("hello from typescript + express");
});

//Expense Routes
app.use("/api/interview", interviewRoutes);

//Auth Routes
app.use("/api/auth", authRoutes);

//Analytics Routes
app.use("/api/feedback", feedbackRoutes);

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

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  console.log(
    `Port loaded from: ${process.env.PORT ? ".env file" : "default(8000)"}`,
  );
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
