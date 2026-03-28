import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
});

function getSession() {
  return window.electronAPI?.getCurrentUser?.() || null;
}

function getDeviceKey() {
  return window.electronAPI?.getDeviceKey?.() || "";
}

api.interceptors.request.use((config) => {
  const session = getSession();
  const token = session?.token;
  const deviceKey = getDeviceKey();
  config.headers = config.headers || {};
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (deviceKey) {
    config.headers["x-device-key"] = deviceKey;
  }
  return config;
});

export async function registerKidUser({ email, password, nickname }) {
  const deviceKey = getDeviceKey();
  const { data } = await api.post("/auth/register", { email, password, nickname, deviceKey });
  return data;
}

export async function loginKidUser({ email, password }) {
  const deviceKey = getDeviceKey();
  const { data } = await api.post("/auth/login", { email, password, deviceKey });
  return data;
}

export async function fetchKidSession() {
  const { data } = await api.get("/auth/me");
  return data;
}
