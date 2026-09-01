import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import mongoose from "mongoose";
import { Todo } from "./models/Todo.js";
import todoRouter from "./routes/todos.js";

dotenv.config({
  path: path.join(path.dirname(fileURLToPath(import.meta.url)), ".env"),
  override: true,
});

const app = express();
app.disable("etag");
const port = 5000;

function readMongoUri() {
  const raw = process.env.MONGO_URI ?? process.env.MONGODB_URI ?? "";
  return raw.replace(/^["']|["']$/g, "").trim();
}

const mongoUri = readMongoUri();

if (!mongoUri) {
  throw new Error(
    "MONGO_URI 환경변수가 없습니다. todo-backend/.env 파일을 확인하세요.",
  );
}

const allowedOrigins = [
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
];

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  res.setHeader(
    "Access-Control-Allow-Origin",
    allowedOrigins.includes(origin) ? origin : "*",
  );
  res.setHeader("Vary", "Origin");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE, OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Private-Network", "true");
}

function requireDb(_req, res, next) {
  if (mongoose.connection.readyState === 1) {
    return next();
  }

  return res.status(503).json({
    message:
      "MongoDB에 연결되어 있지 않습니다. todo-backend 폴더에서 npm start로 서버를 실행했는지 확인하세요.",
  });
}

function getMongoErrorMessage(error) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("ECONNREFUSED") && mongoUri.includes("127.0.0.1")) {
    return "로컬 MongoDB가 실행 중이 아닙니다. MongoDB 서비스를 시작하세요.";
  }

  if (message.includes("bad auth") || message.includes("Authentication failed")) {
    return "MongoDB 인증에 실패했습니다. .env의 MONGO_URI 사용자 이름/비밀번호를 확인하세요.";
  }

  if (
    message.includes("whitelist") ||
    message.includes("IP") ||
    message.includes("Server selection timed out")
  ) {
    return "MongoDB Atlas 네트워크 접근이 차단되었을 수 있습니다. Atlas → Network Access에서 현재 IP를 허용하세요.";
  }

  return message;
}

app.use((req, res, next) => {
  setCorsHeaders(req, res);
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});
app.use(express.json());

app.get("/health", (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus =
    dbState === 1 ? "connected" : dbState === 2 ? "connecting" : "disconnected";

  return res.status(dbState === 1 ? 200 : 503).json({
    status: dbState === 1 ? "ok" : "error",
    db: dbStatus,
  });
});

app.use("/todos", requireDb, todoRouter);

mongoose
  .connect(mongoUri, {
    serverSelectionTimeoutMS: 10000,
  })
  .then(async () => {
    const mongoHost = new URL(mongoUri).host;
    const dbName = mongoose.connection.name;
    console.log(`MongoDB 연결 성공 (${mongoHost}, database: ${dbName})`);
    await Todo.createCollection().catch((error) => {
      if (error.code !== 48) throw error;
    });
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
      console.log("프론트엔드는 todo-react 폴더에서 npm run dev 로 실행하세요.");
    });
  })
  .catch((error) => {
    console.error("MongoDB 연결 실패:", getMongoErrorMessage(error));
    process.exit(1);
  });
