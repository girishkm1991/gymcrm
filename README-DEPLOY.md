# GymFlow CRM — Production Bare-Metal Deployment Guide (Ubuntu Standard)
This production guide provides step-by-step instructions for deploying **GymFlow CRM** directly onto a standard, bare-metal or virtual clean **Ubuntu Server** (e.g., AWS EC2 `t3.micro`/`t2.micro`, DigitalOcean, Linode) without using Docker.

It is structured and prepackaged to run reliably with **under 1GB RAM**, leveraging proactive virtual memory optimizations and performance guards.

---

## ⚡ Key Resource Adjustments (1GB RAM Architecture)
Low-spec cloud VMs are highly sensitive to RAM spikes, particularly during front-end compiling tasks (e.g., Vite/V8 engine execution). To guarantee stability, we apply a series of production configurations:
1. **Compiling Swap Guard**: Generates a 2GB Virtual Swap File on the disk to back the physical RAM.
2. **Hard V8 Memory Limit**: Uses Node's `--max-old-space-size=512` flag inside PM2 to command V8's garbage collector to release memory gracefully before saturation.
3. **Optimized Multi-stage Compilation Execution**: The server's Express endpoints and SPA assets are built in sequentially controlled processes.

---

## 📂 Creating a Separate Git Repository For This Deployment
To manage this non-Docker version in its own independent repository, follow these precise step-by-step commands on your local machine or workspace:

### 1. Initialize Git Working Dir
If your working folder has no active git tree, or if you want to fork it:
```bash
# Verify status or force initialize a fresh sandbox
git init
```

### 2. Configure Local Exclusions (.gitignore)
Ensure your `.gitignore` is correctly configured to avoid checking in large build assets, logs, secrets, or dependency trees:
```plaintext
# .gitignore
node_modules/
dist/
.env
data/
uploads/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.DS_Store
```

### 3. Stage and Commit Your App Code base
```bash
# Stage all project resources
git add .

# Save snapshot to main branch
git commit -m "feat: configure optimized non-Docker bare-metal deployment engine"
```

### 4. Wire up the New Remote Repository & Push to Github
Create a brand new empty public or private repository on GitHub (e.g., `gymflow-crm-ubuntu`), then run:
```bash
# Rename branch to main
git branch -M main

# Link to your new independent GitHub Repository
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/gymflow-crm-ubuntu.git

# Force push active staging code to remote
git push -u origin main
```

---

## 🚀 Complete Ubuntu Provisoning & Step-by-Step Installation

### Step 1: Automated Server Provisioning
We have provided an automated deployment and provisioning script (`deploy-ubuntu.sh`) designed to handle all low-level sysops configurations. 

This script will automatically:
* Provision a **2GB virtual swap file** (with tuned swapping priority) to prevent OOM errors.
* Install node development essentials.
* Set up **Node.js 22 LTS (LTS)** & global **npm** packages.
* Install **MySQL 8 Server**, start the service, and active startup behaviors.
* Self-generate a dedicated MySQL database schema (`gymcrm`) and assign a secure, dedicated database user (`gymuser`).
* Load process controller **PM2** globally.

**Run the provisioning script on your Ubuntu instance:**
```bash
# Assign executive permission details
chmod +x deploy-ubuntu.sh

# Run with root privileges
sudo ./deploy-ubuntu.sh
```

---

### Step 2: Configure Environment Variables
Copy the structure file to create your active `.env` configuration template:
```bash
cp .env.example .env
```

Open `.env` using your preferred editor (e.g., `nano` or `vim`):
```bash
nano .env
```

And update with your local production credentials established during Step 1:
```env
PORT=3000
NODE_ENV=production

# MySQL Production Credentials (Adjust to match your custom security parameters)
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=gymcrm
DB_USER=gymuser
DB_PASSWORD=GymSecurePassword2026!

# Enterprise APIs
GEMINI_API_KEY=your_gemini_api_key_here
APP_URL=http://your-server-ip-or-domain.com

# Non-Docker Persistent File Engines (Mapped to standard workspace dirs)
DOCUMENTS_DIR=./data/documents
UPLOADS_DIR=./uploads
```

---

### Step 3: Fast Compile & App Assembly
After assigning configuration parameters, install vendor libraries and trigger the compilation script. This leverages the compiled swap memory automatically so compiling will finish successfully even on 1GB RAM.
```bash
# Install exact platform packages
npm install

# Compile React SPA assets & bundle Express middleware to dist/server.cjs
npm run build
```

---

### Step 4: Daemonize Process Execution in PM2
Now that compiling has placed high-fidelity files into the output folder, initiate PM2! PM2 keeps the Node.js server responsive, balances load, and automatically restarts the process if it encounters an unhandled exception or extreme crash scenario.

We execute the process via `ecosystem.config.cjs`, which limits active memory to 512MB:
```bash
# Boot process with low-memory parameters
pm2 start ecosystem.config.cjs

# Make sure PM2 automatically spawns on OS system reboots
pm2 startup

# (Copy-paste the exact output command printed on screen by PM2 to complete setup)

# Freeze active process list for auto-boot
pm2 save
```

---

## 🛠️ Management and Verification Utilities

### Monitor Server Status
To verify the application is active, running, and inspect its current CPU/RAM utilization:
```bash
pm2 status
```

### Inspect Live Production Logs
Check console operations, standard outputs, or error traces from GymFlow live:
```bash
pm2 logs gymflow-crm
```

### Restart, Stop, or Reload the Server
```bash
# Perform graceful zero-downtime hot reload
pm2 reload gymflow-crm

# Stop service
pm2 stop gymflow-crm
```

### Verify Local MySQL Server Health
```bash
# Verify mysql is running as a background service
sudo systemctl status mysql

# Access command-line CLI directly
mysql -u gymuser -p -D gymcrm
```

### Setup SSL & Nginx Reverse Proxy (Optional, Recommended for Production)
To route standard port `80`/`443` HTTPS traffic into your application container listening on port `3000`:
```bash
# Install web server
sudo apt install nginx -y

# Edit configuration file
sudo nano /etc/nginx/sites-available/default
```

Update the default root server block to forward requests:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 20M;
    }
}
```

Restart and check Nginx status:
```bash
sudo systemctl restart nginx
sudo systemctl status nginx
```
Your elegant non-Docker environment is fully armed and running securely!
