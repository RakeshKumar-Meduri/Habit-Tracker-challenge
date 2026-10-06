# PULSE Frontend Migration Runbook: Vercel → Hostinger Static Hosting

This document details the exact, zero-downtime procedure for deploying the **PULSE** React/Vite frontend to Hostinger static hosting while maintaining the existing Render backend (`api.pulse.avixstudio.com`), Supabase database/storage, and Razorpay integrations.

---

## Architecture Overview

```
                      USERS
                        │
                        ▼
               pulse.avixstudio.com
                        │
                        ▼
                    HOSTINGER
             React/Vite Static Bundle
                 (dist/ contents)
            ┌───────────┴───────────┐
            │                       │
            ▼                       ▼
      RENDER BACKEND             SUPABASE
  api.pulse.avixstudio.com     PostgreSQL &
   Express REST (HTTPS)       Media Storage
   WebSocket WSS (/ws)
            │
            ▼
        RAZORPAY
      Payment SDK
```

---

## 1. Safety & Rollback Guarantees
- **Branch**: All migration changes are isolated on `migration/hostinger-frontend`.
- **Backend untouched**: Render backend, Express routes, WebSockets, Supabase schema, Prisma migrations, and Razorpay backend logic remain 100% unaltered.
- **Rollback ready**: The Vercel deployment remains active until Hostinger is completely tested and DNS has propagated stably.

---

## 2. Prepared Files & Configuration

### A. Environment Configuration (`.env.production`)
The production build statically compiles the following frontend endpoints into the JavaScript bundle:
```env
VITE_API_URL=https://api.pulse.avixstudio.com
VITE_SUPABASE_URL=https://wepxpchvcplnztxrnasq.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable__RX1gjIvNkerB5LXReu3-g_QCgvykll
```
> **Security Notice**: Backend secrets (`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DIRECT_URL`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`) remain exclusively on Render and are **never** present in the frontend.

### B. SPA Routing Fallback (`public/.htaccess` → `dist/.htaccess`)
Because PULSE uses direct URL routing (such as `/join/:token`), Hostinger's Apache server requires rewrite rules so page reloads do not return 404:
```apache
RewriteEngine On
RewriteBase /
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
```

### C. Build Artifacts
- **Directory**: `dist/`
  - `dist/index.html`
  - `dist/.htaccess`
  - `dist/favicon.svg`
  - `dist/icons.svg`
  - `dist/assets/index-*.js`
  - `dist/assets/index-*.css`
- **One-Click Upload Zip**: `pulse-dist.zip` (already generated in project root).

---

## 3. Step-by-Step Hostinger Deployment Guide

### Step 1: Create Subdomain on Hostinger
1. Log in to **Hostinger hPanel**.
2. Go to **Websites** (or **Domains** → **Subdomains**).
3. Under **Create a Subdomain**:
   - Subdomain: `pulse`
   - Domain: `avixstudio.com`
   - Check **Custom folder for subdomain** (e.g., `public_html/pulse`).
   - Click **Create**.
> **CRITICAL**: Do **NOT** modify or delete `avixstudio.com`. Only create the `pulse` subdomain.

### Step 2: Upload Files to Hostinger Document Root
1. In hPanel, open **File Manager** for your domain.
2. Navigate to the subdomain folder created in Step 1 (e.g. `public_html/pulse`).
3. Delete any default placeholder files (like `default.php`).
4. Upload `pulse-dist.zip` to that directory.
5. Right-click `pulse-dist.zip` → **Extract** directly into the current directory.
6. Verify the directory structure:
   ```
   public_html/pulse/
   ├── index.html
   ├── .htaccess
   ├── favicon.svg
   ├── icons.svg
   └── assets/
       ├── index-BK0oZMNP.css
       └── index-D327Hdxd.js
   ```
   *(Ensure "Show hidden files" is enabled in File Manager settings to confirm `.htaccess` is present).*

---

## 4. Verification & Testing Before DNS Cutover

Before changing any DNS records, test using Hostinger's preview mechanism or your local `hosts` file:

### Testing via `hosts` file (Recommended)
1. Find your Hostinger server IP in hPanel dashboard (under **Hosting Details**).
2. Open `C:\Windows\System32\drivers\etc\hosts` as Administrator.
3. Add:
   ```
   <HOSTINGER_SERVER_IP> pulse.avixstudio.com
   ```
4. Open your browser in Incognito mode and navigate to:
   ```
   https://pulse.avixstudio.com
   ```

### Verification Checklist:
- [ ] **Homepage & Assets**: CSS styling, SVG icons, fonts load properly.
- [ ] **Console Inspection (F12)**:
  - Zero CORS errors.
  - Zero 404 errors.
  - No calls to `localhost`.
  - All API calls go to `https://api.pulse.avixstudio.com`.
- [ ] **Network WS Tab**:
  - WebSocket connects successfully to `wss://api.pulse.avixstudio.com/ws`.
  - Real-time client count updates.
- [ ] **Authentication**:
  - Login / Register / Logout.
  - Refresh the page while logged in (verifies session persistence and `.htaccess` rewrite).
- [ ] **Features**:
  - Habit checklist logging.
  - Workout logging & deletion.
  - Weight tracking and charts.
  - Group creation and invite token generation.
- [ ] **Invite Link Deep Route**:
  - Open `https://pulse.avixstudio.com/join/<token>` in a new tab. Verify it loads the join modal and doesn't 404.

---

## 5. DNS Cutover & SSL Activation

Once verification passes:
1. If your domain uses Hostinger Nameservers, creating the subdomain has already configured the DNS record.
2. If DNS is hosted externally (e.g. Cloudflare / Namecheap):
   - Add/update an **A record**:
     - Name: `pulse`
     - Type: `A`
     - Value: `<HOSTINGER_SERVER_IP>`
     - TTL: Auto / 300
   - **DO NOT TOUCH** `@` (avixstudio.com) or `api` (api.pulse.avixstudio.com).
3. **Enable SSL**:
   - In Hostinger hPanel → **Security** → **SSL**.
   - Issue/Install Let's Encrypt SSL for `pulse.avixstudio.com`.
   - Enable **Force HTTPS**.
4. Remove the temporary testing line from your `C:\Windows\System32\drivers\etc\hosts` file.

---

## 6. Post-Cutover & Rollback Protocol

### Rollback Plan (If Needed)
If any critical issue arises on Hostinger:
1. In DNS, point `pulse.avixstudio.com` back to Vercel (CNAME to `cname.vercel-dns.com` or Vercel's IP).
2. Pulse will instantly resume serving from Vercel within minutes.

### Decommissioning Vercel
- Keep the Vercel deployment active for **48 to 72 hours**.
- Once stability on Hostinger is verified, disconnect the custom domain from Vercel and archive/delete the Vercel project.
