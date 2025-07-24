// lib/db.ts
// import mysql from "mysql2/promise";

// export const db = mysql.createPool({
//   host: "190.188.150.107",
//   user: "denisa",
//   password: "denisa2025",
//   port: 3307,
//   database: "lt",
// });
import { createPool } from "mysql2/promise";

export const db = createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: Number(process.env.MYSQLPORT ?? 3306),
  waitForConnections: true,
  connectionLimit: 10,
});
