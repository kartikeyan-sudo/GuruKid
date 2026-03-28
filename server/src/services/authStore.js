import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import { query, pool } from "../db/index.js";

const usersFallback = new Map();
const devicesFallback = new Map();
const JWT_SECRET = process.env.JWT_SECRET || "gurukid-dev-secret";

function keyForDevice(deviceKey, userId) {
  return `${deviceKey}:${userId}`;
}

export function signUserToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyUserToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export async function registerUser({ email, password, nickname, deviceKey }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail || !password || !nickname || !deviceKey) {
    throw new Error("email, password, nickname and deviceKey are required");
  }

  const hash = await bcrypt.hash(password, 10);

  if (pool) {
    const existing = await query("SELECT id FROM users WHERE email = $1", [normalizedEmail]);
    if (existing.rowCount > 0) {
      throw new Error("Email already registered");
    }

    const userId = uuid();
    await query(
      "INSERT INTO users (id, email, password, nickname) VALUES ($1, $2, $3, $4)",
      [userId, normalizedEmail, hash, nickname]
    );

    await bindDevice({ userId, deviceKey });

    return { id: userId, email: normalizedEmail, nickname };
  }

  if ([...usersFallback.values()].some((u) => u.email === normalizedEmail)) {
    throw new Error("Email already registered");
  }

  const user = { id: uuid(), email: normalizedEmail, password: hash, nickname };
  usersFallback.set(user.id, user);
  devicesFallback.set(keyForDevice(deviceKey, user.id), {
    id: uuid(),
    device_key: deviceKey,
    user_id: user.id,
    last_active: new Date().toISOString(),
  });

  return { id: user.id, email: user.email, nickname: user.nickname };
}

export async function loginUser({ email, password, deviceKey }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail || !password || !deviceKey) {
    throw new Error("email, password and deviceKey are required");
  }

  if (pool) {
    const result = await query("SELECT id, email, password, nickname FROM users WHERE email = $1", [normalizedEmail]);
    if (result.rowCount === 0) {
      throw new Error("Invalid credentials");
    }

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      throw new Error("Invalid credentials");
    }

    const existingDevice = await query(
      "SELECT id FROM devices WHERE user_id = $1 AND device_key = $2",
      [user.id, deviceKey]
    );
    if (existingDevice.rowCount === 0) {
      throw new Error("Device key mismatch");
    }

    await query("UPDATE devices SET last_active = NOW() WHERE id = $1", [existingDevice.rows[0].id]);
    return { id: user.id, email: user.email, nickname: user.nickname };
  }

  const user = [...usersFallback.values()].find((u) => u.email === normalizedEmail);
  if (!user) throw new Error("Invalid credentials");

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new Error("Invalid credentials");

  const hasDevice = devicesFallback.has(keyForDevice(deviceKey, user.id));
  if (!hasDevice) throw new Error("Device key mismatch");

  const d = devicesFallback.get(keyForDevice(deviceKey, user.id));
  d.last_active = new Date().toISOString();
  devicesFallback.set(keyForDevice(deviceKey, user.id), d);

  return { id: user.id, email: user.email, nickname: user.nickname };
}

export async function bindDevice({ userId, deviceKey }) {
  if (pool) {
    const existing = await query(
      "SELECT id FROM devices WHERE device_key = $1 AND user_id = $2",
      [deviceKey, userId]
    );

    if (existing.rowCount > 0) {
      await query(
        "UPDATE devices SET last_active = NOW() WHERE id = $1",
        [existing.rows[0].id]
      );
      return;
    }

    await query(
      "INSERT INTO devices (id, device_key, user_id, last_active) VALUES ($1, $2, $3, NOW())",
      [uuid(), deviceKey, userId]
    );
    return;
  }

  devicesFallback.set(keyForDevice(deviceKey, userId), {
    id: uuid(),
    device_key: deviceKey,
    user_id: userId,
    last_active: new Date().toISOString(),
  });
}

export async function validateUserDevice({ userId, deviceKey }) {
  if (!userId || !deviceKey) return false;

  if (pool) {
    const result = await query(
      "SELECT id FROM devices WHERE device_key = $1 AND user_id = $2",
      [deviceKey, userId]
    );
    return result.rowCount > 0;
  }

  return devicesFallback.has(keyForDevice(deviceKey, userId));
}

export async function touchDevice({ userId, deviceKey }) {
  if (!userId || !deviceKey) return;

  if (pool) {
    await query(
      "UPDATE devices SET last_active = NOW() WHERE device_key = $1 AND user_id = $2",
      [deviceKey, userId]
    );
    return;
  }

  const key = keyForDevice(deviceKey, userId);
  if (devicesFallback.has(key)) {
    const d = devicesFallback.get(key);
    d.last_active = new Date().toISOString();
    devicesFallback.set(key, d);
  }
}

export async function listUsers() {
  if (pool) {
    const result = await query(
      `
      SELECT
        u.email,
        u.nickname,
        d.device_key,
        d.last_active
      FROM users u
      LEFT JOIN devices d ON d.user_id = u.id
      ORDER BY d.last_active DESC NULLS LAST, u.created_at DESC
      `
    );
    return result.rows;
  }

  const out = [];
  for (const u of usersFallback.values()) {
    const owned = [...devicesFallback.values()].filter((dvc) => dvc.user_id === u.id);
    if (!owned.length) {
      out.push({ email: u.email, nickname: u.nickname, device_key: null, last_active: null });
      continue;
    }
    for (const dvc of owned) {
      out.push({
        email: u.email,
        nickname: u.nickname,
        device_key: dvc.device_key,
        last_active: dvc.last_active,
      });
    }
  }
  return out;
}

export async function deleteUserById(userId) {
  if (!userId) return false;

  if (pool) {
    const result = await query("DELETE FROM users WHERE id = $1", [userId]);
    return result.rowCount > 0;
  }

  if (!usersFallback.has(userId)) {
    return false;
  }

  usersFallback.delete(userId);
  for (const [k, v] of devicesFallback.entries()) {
    if (v.user_id === userId) {
      devicesFallback.delete(k);
    }
  }

  return true;
}
