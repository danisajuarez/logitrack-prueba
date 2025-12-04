// lib/db.ts
import mysql from "mysql2/promise";

// Lazy DB pool to prevent build-time crashes when envs are missing
function readEnv(name: string, fallback?: string) {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  // Trim quotes and whitespace if present (handles .env like KEY= "value")
  return raw.trim().replace(/^"|"$/g, "").replace(/^'|'$/g, "");
}

let pool: mysql.Pool | null = null;

async function getPool(): Promise<mysql.Pool> {
  if (pool) return pool;

  const host = readEnv("DB_HOST");
  const user = readEnv("DB_USER");
  const password = readEnv("DB_PASSWORD", readEnv("DB_PASS", ""));
  const portStr = readEnv("DB_PORT");
  const database = readEnv("DB_NAME", readEnv("DB_DATABASE", "lt"));
  const port = portStr ? parseInt(portStr, 10) : 3307; // default preserved from previous config

  if (!host || !user || !database) {
    throw new Error(
      "Missing DB env vars. Please set DB_HOST, DB_USER, DB_NAME (and optional DB_PASSWORD/DB_PASS, DB_PORT)."
    );
  }

  pool = mysql.createPool({
    host,
    user,
    password,
    port,
    database,
    connectTimeout: 30000, // Connection timeout in ms
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true, // Mantener conexiones vivas
    keepAliveInitialDelay: 10000, // 10 segundos
    charset: 'utf8mb4', // Soporte completo para caracteres especiales (ñ, acentos, emojis, etc.)
  });
  return pool;
}

export const db = {
  // Use loose typings to support mysql2 overloads (1 or 2 args)
  query: async (...args: any[]) => {
    const pool = await getPool();
    const startTime = Date.now();
    try {
      const result = await (pool.query as any)(...args);
      const duration = Date.now() - startTime;
      if (duration > 5000) {
        console.warn(`[DB] Slow query detected: ${duration}ms`);
      }
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(
        `[DB] Query failed after ${duration}ms:`,
        error.code || error.message
      );
      throw error;
    }
  },
  execute: async (...args: any[]) => {
    const pool = await getPool();
    const startTime = Date.now();
    try {
      const result = await (pool.execute as any)(...args);
      const duration = Date.now() - startTime;
      if (duration > 5000) {
        console.warn(`[DB] Slow execute detected: ${duration}ms`);
      }
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(
        `[DB] Execute failed after ${duration}ms:`,
        error.code || error.message
      );
      throw error;
    }
  },
  getConnection: async () => {
    const pool = await getPool();
    const startTime = Date.now();
    try {
      const connection = await pool.getConnection();
      const duration = Date.now() - startTime;
      if (duration > 5000) {
        console.warn(`[DB] Slow connection acquisition: ${duration}ms`);
      }
      return connection;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(
        `[DB] Connection acquisition failed after ${duration}ms:`,
        error.code || error.message
      );
      throw error;
    }
  },
};

export { getPool };
