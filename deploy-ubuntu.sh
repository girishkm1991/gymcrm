#!/bin/bash
# ==============================================================================
# GYMFLOW CRM - AUTO DEPLOYMENT & PROVISIONING SCRIPT FOR UBUNTU (BARE-METAL)
# Designed for low-memory environments (1GB RAM e.g. AWS EC2 t3.micro/t2.micro)
# ==============================================================================

# Fast fail on errors
set -e

# Visual formatting symbols
INFO='\033[0;36m'
SUCCESS='\033[0;32m'
WARNING='\033[0;33m'
DANGER='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${INFO}======================================================"
echo -e "       GYMFLOW CRM BARE-METAL PROVISIONING ENGINE     "
echo -e "======================================================${NC}"

# Ensure running as root/sudo
if [ "$EUID" -ne 0 ]; then
  echo -e "${DANGER}Error: Please execute this installer as root or using sudo.${NC}"
  exit 1
fi

# 1. Resource Optimization: Check and Setup Swap Space (CRITICAL for 1GB RAM)
echo -e "\n${INFO}[1/6] Optimizing core virtual memory & Swap Allocation...${NC}"
FREE_MEM=$(free -m | awk '/^Mem:/{print $2}')
echo -e "Detected Physical RAM: ${FREE_MEM}MB"

if [ "$FREE_MEM" -lt 1500 ]; then
  echo -e "${WARNING}Low memory environment detected. Creating a 2GB virtual Swap File to prevent compilation crashes during compilation...${NC}"
  
  # Check if swap already exists
  if [ $(swapon --show | wc -l) -gt 0 ]; then
    echo -e "Swap area already registered. Skipping creation."
  else
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo "/swapfile none swap sw 0 0" >> /etc/fstab
    echo -e "${SUCCESS}2GB Swap File successfully provisioned and enabled at boot.${NC}"
  fi
  
  # Fine-tune Linux virtual memory configuration (swappiness & cache pressure)
  sysctl vm.swappiness=10
  sysctl vm.vfs_cache_pressure=50
  echo "vm.swappiness=10" >> /etc/sysctl.conf
  echo "vm.vfs_cache_pressure=50" >> /etc/sysctl.conf
  echo -e "${SUCCESS}Linux virtual memory parameters calibrated for low resource use.${NC}"
else
  echo -e "Sufficient physical RAM found. Skipping proactive swap partition creation."
fi

# 2. Update Operating System & Native Dependencies
echo -e "\n${INFO}[2/6] Refreshing system repositories and installing base utilities...${NC}"
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git build-essential ufw libssl-dev

# 3. Secure Node.js 22 LTS Installation
echo -e "\n${INFO}[3/6] Installing Node.js LTS (Version 22) via NodeSource...${NC}"
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
echo -e "${SUCCESS}Node.js version check: $(node -v)${NC}"
echo -e "${SUCCESS}npm version check: $(npm -v)${NC}"

# 4. Local MySQL Database Server Installation
echo -e "\n${INFO}[4/6] Installing and securing MySQL Server...${NC}"
apt-get install -y mysql-server

# Ensure MySQL is active and running
systemctl start mysql
systemctl enable mysql

# Create custom local database, application user and assign privileges safely
DB_NAME_VAL="gymcrm"
DB_USER_VAL="gymuser"
DB_PASS_VAL="GymSecurePassword2026!"

echo -e "Creating application schema: ${DB_NAME_VAL}"
mysql -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME_VAL} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS '${DB_USER_VAL}'@'localhost' IDENTIFIED BY '${DB_PASS_VAL}';"
mysql -e "GRANT ALL PRIVILEGES ON ${DB_NAME_VAL}.* TO '${DB_USER_VAL}'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"
echo -e "${SUCCESS}MySQL Database initialized. User '${DB_USER_VAL}' ready.${NC}"

# 5. Process Manager (PM2) Installation & Configuration
echo -e "\n${INFO}[5/6] Deploying PM2 Process Manager globally...${NC}"
npm install -g pm2
echo -e "${SUCCESS}PM2 successfully installed globally.${NC}"

# 6. Active Directory Generation & Permissions Setup
echo -e "\n${INFO}[6/6] Establishing production paths and directory flags...${NC}"
mkdir -p ./data/documents
mkdir -p ./uploads
chmod -R 755 ./data ./uploads
echo -e "${SUCCESS}Durable PDF database and uploads directory structures created.${NC}"

echo -e "\n${SUCCESS}======================================================"
echo -e "       PROVISIONING COMPLETE! ACTIONS REQUIRED:       "
echo -e "======================================================${NC}"
echo -e "1. Create your secure configuration file by copying .env.example:"
echo -e "   cp .env.example .env"
echo -e "2. Update the environment variables in .env:"
echo -e "   DB_HOST=127.0.0.1"
echo -e "   DB_USER=gymuser"
echo -e "   DB_PASSWORD=GymSecurePassword2026!"
echo -e "   DB_NAME=gymcrm"
echo -e "3. Install source nodes, compile code, and run under PM2:"
echo -e "   npm install"
echo -e "   npm run build"
echo -e "   pm2 start ecosystem.config.cjs"
echo -e "   pm2 save"
echo -e "   pm2 startup"
echo -e "======================================================\n"
