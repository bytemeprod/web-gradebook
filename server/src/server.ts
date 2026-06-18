import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import authRouter from "./routers/auth.ts";
import { errorHandler } from "./middleware/error.ts";

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

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
