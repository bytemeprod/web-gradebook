import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import authRouter from "./routers/auth.ts";
import teacherRouter from "./routers/teacher.ts";
import studentRouter from "./routers/student.ts";
import { errorHandler } from "./middleware/error.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(morgan("dev"));
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

// Routes
app.use("/api/auth", authRouter);
app.use("/api/teacher", teacherRouter);
app.use("/api/student", studentRouter);

const UPLOADS_PATH = process.env.UPLOADS_PATH || path.resolve(__dirname, "../../uploads");
// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_PATH)) {
  fs.mkdirSync(UPLOADS_PATH, { recursive: true });
}
app.use("/uploads", express.static(UPLOADS_PATH));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// Serve client static assets in production
const clientDistPath = path.resolve(__dirname, "../../client/dist");
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get("/*splat", (req, res, next) => {
    // Exclude API and upload requests from falling back to frontend index.html
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
}

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
