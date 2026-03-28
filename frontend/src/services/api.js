import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
});

const TOKEN_KEY = "gurukid-admin-token";

export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setAdminToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

api.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function adminLogin({ username, password }) {
  const { data } = await api.post("/admin/login", { username, password });
  if (data?.token) setAdminToken(data.token);
  return data;
}

export async function fetchAdminSession() {
  const { data } = await api.get("/admin/session");
  return data;
}

export async function fetchAdminUsers() {
  const { data } = await api.get("/admin/users");
  return data.users || [];
}

export async function fetchDevices() {
  const { data } = await api.get("/devices");
  return data.devices || [];
}

export async function sendCommand({ deviceId, type, payload }) {
  const { data } = await api.post("/commands", { deviceId, type, payload });
  return data.command;
}

export async function blockDevice(deviceId) {
  const { data } = await api.patch(`/devices/${deviceId}/block`);
  return data.device;
}

export async function unblockDevice(deviceId) {
  const { data } = await api.patch(`/devices/${deviceId}/unblock`);
  return data.device;
}

export async function deleteDevice(deviceId) {
  const { data } = await api.delete(`/devices/${deviceId}`);
  return data;
}

export async function clearDeviceHistory(deviceId, scope = "all") {
  const { data } = await api.post(`/devices/${deviceId}/history/clear`, { scope });
  return data.device;
}

export async function deleteUserWithWipe({ userId, deviceId }) {
  const { data } = await api.delete(`/admin/users/${userId}`, { data: { deviceId } });
  return data;
}
