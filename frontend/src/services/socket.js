import { io } from "socket.io-client";

export const socket = io(import.meta.env.VITE_WS_URL || "http://localhost:4000", {
  autoConnect: true,
});

function readToken() {
  return localStorage.getItem("gurukid-admin-token") || "";
}

export function joinAdminRoom() {
  const token = readToken();
  if (!token) return;
  socket.emit("admin:join", { token });
}

socket.on("connect", () => {
  joinAdminRoom();
});
