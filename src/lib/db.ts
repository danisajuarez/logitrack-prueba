// lib/db.ts
import mysql from "mysql2/promise";

export const db = mysql.createPool({
  host: "remoto.retec.com.ar",
  user: "danisa",
  password: "danisa2025",
  port: 3307,
  database: "lt",
  connectTimeout: 120000,
});
