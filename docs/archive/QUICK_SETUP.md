# FireFetch Dashboard - Quick Setup Guide

Complete all 3 integrations in about 10 minutes.

## Prerequisites

All services should already be running:
- Dashboard: https://dashboard.firefetch.org
- Uptime Kuma: https://status.firefetch.org
- Appwrite: https://backend.firefetch.org
- Beszel: https://beszel.firefetch.org

---

## 1. Uptime Kuma Setup (~3 min)

### Step 1: Get Your Credentials
If you haven't set up Uptime Kuma yet:
1. Go to https://status.firefetch.org
2. Create an admin account (first visit)
3. Note your username and password

### Step 2: Run Automated Setup
```bash
cd /home/ubuntu/ai/dashboard

# Set your credentials
export UPTIME_KUMA_USERNAME=admin
export UPTIME_KUMA_PASSWORD=your_password_here

# Run setup
npm run setup:uptime-kuma
```

This will:
- Create HTTP monitors for all 5 services
- Create a public status page at `/status/firefetch`
- Configure 60-second check intervals

### Step 3: Verify
- Status Page: https://status.firefetch.org/status/firefetch
- API: `curl http://localhost:3001/api/status-page/firefetch`

---

## 2. Appwrite Setup (~5 min)

### Step 1: Create Project in Console
1. Go to http://localhost:8090 (or https://backend.firefetch.org)
2. Create admin account (first visit)
3. Click "Create Project"
4. Name: `FireFetch Dashboard`
5. Copy the **Project ID**

### Step 2: Run Automated Setup
```bash
cd /home/ubuntu/ai/dashboard

# Run setup (will prompt for Project ID)
npm run setup:appwrite
```

This will:
- Create `dashboard` database
- Create all 4 collections (settings, metrics_history, incidents, alerts)
- Set up attributes and indexes
- Configure permissions

### Step 3: Enable Authentication
In Appwrite Console:
1. Go to **Auth** > **Settings**
2. Enable **Anonymous** authentication
3. Go to **Settings** > **Platforms**
4. Add Web App: `http://localhost:3002`

---

## 3. Beszel Setup (~2 min)

### Step 1: Create Admin Account
1. Go to https://beszel.firefetch.org
2. Create admin account (first visit)

### Step 2: Add System
1. Click **"Add System"** or **"+"**
2. Configure:
   - Name: `Primary Server`
   - Host: `localhost`
   - Port: `45876`
3. Click Add
4. **Copy the public key** shown

### Step 3: Start Agent
```bash
cd /home/ubuntu/ai/beszel

# Set the public key
echo "AGENT_KEY=paste_your_public_key_here" > .env

# Start the agent
docker compose up -d beszel-agent

# Verify
docker logs beszel-agent
```

### Step 4: Verify
Return to https://beszel.firefetch.org - system should show green status.

---

## Final Steps

### Rebuild Dashboard
After all integrations:
```bash
cd /home/ubuntu/ai/dashboard
npm run build
sudo systemctl restart dashboard
```

### Verify Everything
1. **Dashboard**: https://dashboard.firefetch.org
   - Health Score widget should show real data
   - Uptime Status should show monitors
   - Process Monitor should show processes

2. **Uptime Kuma**: https://status.firefetch.org/status/firefetch
   - All 5 services should be monitored

3. **Appwrite**: http://localhost:8090
   - Database with 4 collections should exist

4. **Beszel**: https://beszel.firefetch.org
   - Primary Server should show metrics

---

## Troubleshooting

### Uptime Kuma script fails
- Check credentials are correct
- Ensure you created an account first
- Try: `curl http://localhost:3001` to verify it's running

### Appwrite script fails
- Create project manually first in console
- Check Project ID is correct
- Ensure Appwrite is running: `docker ps | grep appwrite`

### Beszel agent not connecting
- Verify AGENT_KEY is set in .env
- Restart agent: `docker compose restart beszel-agent`
- Check logs: `docker logs beszel-agent`

---

## Quick Commands Reference

```bash
# Uptime Kuma setup
cd /home/ubuntu/ai/dashboard && npm run setup:uptime-kuma

# Appwrite setup
cd /home/ubuntu/ai/dashboard && npm run setup:appwrite

# Beszel agent
cd /home/ubuntu/ai/beszel && docker compose up -d beszel-agent

# Rebuild dashboard
cd /home/ubuntu/ai/dashboard && npm run build && sudo systemctl restart dashboard
```
