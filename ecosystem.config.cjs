/**
 * ==============================================================================
 * GYMFLOW CRM - PM2 PRODUCTION ECOSYSTEM CONFIGURATION
 * Optimized for low-memory footprints (1GB RAM e.g. AWS EC2, DigitalOcean)
 * ==============================================================================
 */

module.exports = {
  apps: [
    {
      name: "gymflow-crm",
      script: "./dist/server.cjs",
      instances: 1, // Single instance to minimize RAM usage in low-end hardware
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "450M", // Proactively reboot app if RAM surpasses 450MB
      node_args: [
        "--max-old-space-size=512" // Impose hard memory limit on Node V8 engine
      ],
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        DB_HOST: "127.0.0.1",
        DB_PORT: 3306,
        DB_NAME: "gymcrm",
        DB_USER: "gymuser",
        DB_PASSWORD: "GymSecurePassword2026!"
      }
    }
  ]
};
