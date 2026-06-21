import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Load local environment configurations if any
dotenv.config();

const DB_HOST = process.env.DB_HOST;
const DB_PORT = parseInt(process.env.DB_PORT || "3306");
const DB_NAME = process.env.DB_NAME || "gymcrm";
const DB_USER = process.env.DB_USER || "gymuser";
const DB_PASSWORD = process.env.DB_PASSWORD || "gympass";

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runDatabaseInitialization(isSilent = false, maxRetries = 2) {
  if (!DB_HOST) {
    if (!isSilent) {
      console.log("[DB INIT] DB_HOST not specified in env variables. Skipping MySQL initialization.");
    }
    return false;
  }

  const log = (msg: string) => {
    if (!isSilent) console.log(`[DB INIT] ${msg}`);
  };

  log(`Connecting to MySQL database at ${DB_HOST}:${DB_PORT}...`);

  // Retry logic for DB connection to wait for MySQL ready
  let connection: mysql.Connection | null = null;
  let retries = maxRetries;
  while (retries > 0) {
    try {
      connection = await mysql.createConnection({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
      });
      break;
    } catch (err: any) {
      retries--;
      log(`Database server not ready yet (${err.message}). Retrying in 1 second... (${retries} attempts left)`);
      if (retries > 0) {
        await delay(1000);
      }
    }
  }

  if (!connection) {
    throw new Error(`[DB INIT] Could not connect to MySQL database at ${DB_HOST}. Connection timeout.`);
  }

  log("Successfully established database server connection!");

  // Ensure DB exists
  log(`Ensuring database '${DB_NAME}' exists...`);
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
  await connection.query(`USE \`${DB_NAME}\`;`);

  // DDL definitions for all tables
  const tables = [
    {
      name: "roles",
      ddl: `
        CREATE TABLE IF NOT EXISTS roles (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT
        );
      `
    },
    {
      name: "permissions",
      ddl: `
        CREATE TABLE IF NOT EXISTS permissions (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT
        );
      `
    },
    {
      name: "gyms",
      ddl: `
        CREATE TABLE IF NOT EXISTS gyms (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(255) NOT NULL,
          address VARCHAR(255),
          phone VARCHAR(255),
          email VARCHAR(255),
          status VARCHAR(100),
          subscriptionPlan VARCHAR(100),
          subscriptionExpiry VARCHAR(100),
          createdAt VARCHAR(100)
        );
      `
    },
    {
      name: "users",
      ddl: `
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          gymId VARCHAR(255) NULL,
          roleId VARCHAR(255) NOT NULL,
          role VARCHAR(100) NOT NULL,
          fullName VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          passwordHash VARCHAR(255) NOT NULL,
          passwordSalt VARCHAR(255) NOT NULL,
          phone VARCHAR(255),
          status VARCHAR(100) NOT NULL,
          refreshToken VARCHAR(255) NULL,
          createdAt VARCHAR(100)
        );
      `
    },
    {
      name: "members",
      ddl: `
        CREATE TABLE IF NOT EXISTS members (
          id VARCHAR(255) PRIMARY KEY,
          memberId VARCHAR(255) NOT NULL,
          gender VARCHAR(50) NOT NULL,
          dob VARCHAR(100) NOT NULL,
          height INT DEFAULT 0,
          weight INT DEFAULT 0,
          bmi DOUBLE DEFAULT 0.0,
          bloodGroup VARCHAR(50),
          address VARCHAR(255),
          emergencyContactName VARCHAR(255),
          emergencyContactPhone VARCHAR(255),
          joiningDate VARCHAR(100) NOT NULL,
          trainerId VARCHAR(255) NULL,
          activePlanId VARCHAR(255) NULL,
          status VARCHAR(100) NOT NULL,
          photo TEXT
        );
      `
    },
    {
      name: "membership_plans",
      ddl: `
        CREATE TABLE IF NOT EXISTS membership_plans (
          id VARCHAR(255) PRIMARY KEY,
          gymId VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          duration VARCHAR(100) NOT NULL,
          price DOUBLE DEFAULT 0.0,
          description TEXT,
          createdAt VARCHAR(100)
        );
      `
    },
    {
      name: "member_memberships",
      ddl: `
        CREATE TABLE IF NOT EXISTS member_memberships (
          id VARCHAR(255) PRIMARY KEY,
          gymId VARCHAR(255) NOT NULL,
          memberId VARCHAR(255) NOT NULL,
          planId VARCHAR(255) NOT NULL,
          startDate VARCHAR(100) NOT NULL,
          endDate VARCHAR(100) NOT NULL,
          status VARCHAR(100) NOT NULL,
          pricePaid DOUBLE DEFAULT 0.0,
          freezeDate VARCHAR(100) NULL,
          cancelDate VARCHAR(100) NULL,
          createdAt VARCHAR(100),
          updatedAt VARCHAR(100)
        );
      `
    },
    {
      name: "payments",
      ddl: `
        CREATE TABLE IF NOT EXISTS payments (
          id VARCHAR(255) PRIMARY KEY,
          gymId VARCHAR(255) NOT NULL,
          memberId VARCHAR(255) NOT NULL,
          amount DOUBLE DEFAULT 0.0,
          type VARCHAR(255) NOT NULL,
          paymentMode VARCHAR(100) NOT NULL,
          status VARCHAR(100) NOT NULL,
          dueDate VARCHAR(100) NULL,
          paymentDate VARCHAR(100) NULL,
          createdAt VARCHAR(100)
        );
      `
    },
    {
      name: "invoices",
      ddl: `
        CREATE TABLE IF NOT EXISTS invoices (
          id VARCHAR(255) PRIMARY KEY,
          invoiceNo VARCHAR(255) NOT NULL,
          paymentId VARCHAR(255) NOT NULL,
          gymId VARCHAR(255) NOT NULL,
          memberId VARCHAR(255) NOT NULL,
          memberName VARCHAR(255) NOT NULL,
          memberEmail VARCHAR(255) NOT NULL,
          amount DOUBLE DEFAULT 0.0,
          taxAmount DOUBLE DEFAULT 0.0,
          totalAmount DOUBLE DEFAULT 0.0,
          issuedAt VARCHAR(100) NOT NULL
        );
      `
    },
    {
      name: "attendance",
      ddl: `
        CREATE TABLE IF NOT EXISTS attendance (
          id VARCHAR(255) PRIMARY KEY,
          gymId VARCHAR(255) NOT NULL,
          memberId VARCHAR(255) NOT NULL,
          date VARCHAR(100) NOT NULL,
          timeIn VARCHAR(100) NOT NULL,
          timeOut VARCHAR(100) NULL,
          remarks TEXT,
          markedBy VARCHAR(255) NOT NULL
        );
      `
    },
    {
      name: "workout_plans",
      ddl: `
        CREATE TABLE IF NOT EXISTS workout_plans (
          id VARCHAR(255) PRIMARY KEY,
          gymId VARCHAR(255) NOT NULL,
          memberId VARCHAR(255) NOT NULL,
          trainerId VARCHAR(255) NOT NULL,
          assignedDate VARCHAR(100) NOT NULL,
          exercises TEXT,
          notes TEXT,
          history TEXT
        );
      `
    },
    {
      name: "diet_plans",
      ddl: `
        CREATE TABLE IF NOT EXISTS diet_plans (
          id VARCHAR(255) PRIMARY KEY,
          gymId VARCHAR(255) NOT NULL,
          memberId VARCHAR(255) NOT NULL,
          trainerId VARCHAR(255) NOT NULL,
          assignedDate VARCHAR(100) NOT NULL,
          meals TEXT,
          targets TEXT,
          notes TEXT
        );
      `
    },
    {
      name: "notifications",
      ddl: `
        CREATE TABLE IF NOT EXISTS notifications (
          id VARCHAR(255) PRIMARY KEY,
          gymId VARCHAR(255) NULL,
          type VARCHAR(255) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          userId VARCHAR(255) NULL,
          isReadBy TEXT,
          scheduledFor VARCHAR(100) NOT NULL,
          createdAt VARCHAR(100) NOT NULL
        );
      `
    },
    {
      name: "expenses",
      ddl: `
        CREATE TABLE IF NOT EXISTS expenses (
          id VARCHAR(255) PRIMARY KEY,
          gymId VARCHAR(255) NOT NULL,
          category VARCHAR(255) NOT NULL,
          amount DOUBLE DEFAULT 0.0,
          date VARCHAR(100) NOT NULL,
          description TEXT,
          createdAt VARCHAR(100) NOT NULL
        );
      `
    },
    {
      name: "settings",
      ddl: `
        CREATE TABLE IF NOT EXISTS settings (
          id VARCHAR(255) PRIMARY KEY,
          gymId VARCHAR(255) NOT NULL,
          gymName VARCHAR(255) NOT NULL,
          logo TEXT,
          address VARCHAR(255),
          phone VARCHAR(255),
          email VARCHAR(255),
          gstNumber VARCHAR(255),
          currency VARCHAR(100) NOT NULL,
          workingHours VARCHAR(255),
          receiptFooter TEXT,
          paymentQr TEXT,
          taxPercentage DOUBLE DEFAULT 0.0,
          createdAt VARCHAR(100),
          updatedAt VARCHAR(100)
        );
      `
    },
    {
      name: "audit_logs",
      ddl: `
        CREATE TABLE IF NOT EXISTS audit_logs (
          id VARCHAR(255) PRIMARY KEY,
          gymId VARCHAR(255) NULL,
          userId VARCHAR(255) NOT NULL,
          userName VARCHAR(255) NOT NULL,
          userRole VARCHAR(255) NOT NULL,
          action VARCHAR(255) NOT NULL,
          details TEXT,
          ipAddress VARCHAR(100),
          createdAt VARCHAR(100) NOT NULL
        );
      `
    },
    {
      name: "future_camera_attendance",
      ddl: `
        CREATE TABLE IF NOT EXISTS future_camera_attendance (
          id VARCHAR(255) PRIMARY KEY,
          gymId VARCHAR(255) NOT NULL,
          placeholderText VARCHAR(255) NOT NULL,
          notes TEXT,
          deviceStatus VARCHAR(100) NOT NULL
        );
      `
    }
  ];

  // Run creations
  for (const t of tables) {
    log(`Creating table '${t.name}' (if not exists)...`);
    await connection.query(t.ddl);
  }

  log("All database tables are initialized and verified!");
  await connection.end();
  return true;
}

// Execute immediately if run directly as module script
if (import.meta.url.startsWith("file:") && process.argv[1]?.endsWith("init-db.ts")) {
  runDatabaseInitialization()
    .then(() => {
      console.log("[DB INIT] Database initialization completed successfully.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("[DB INIT] Fatal error during schema initialization:", err);
      process.exit(1);
    });
}
