// lib/db.ts
import mysql from "mysql2/promise";

export const db = mysql.createPool({
  host: "190.188.150.107",
  user: "denisa",
  password: "denisa2025",
  port: 3307,
  database: "lt",
});
