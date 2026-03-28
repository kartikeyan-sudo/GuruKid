import express from "express";
import cors from "cors";
import http from "http";
import morgan from "morgan";
import { Server } from "socket.io";
import deviceRoutes from "./routes/devices.js";
import commandRoutes from "./routes/commands.js";
import adminRoutes from "./routes/admin.js";
import authRoutes from "./routes/auth.js";
import { initSocket } from "./websocket/socket.js";
import { initDb } from "./db/index.js";

const PORT = process.env.PORT || 4000;
const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/commands", commandRoutes);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
initSocket(io);

initDb()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`server listening on ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("failed to initialize database", err);
    process.exit(1);
  });
