# 🚀 Deployment Guide - GitHub & Netlify

This guide will walk you through pushing your frontend to GitHub and deploying it to Netlify.

## 📋 Prerequisites

- Git installed on your system
- GitHub account (with access to `voxosolution-blip/lakshan-frontend-final`)
- Netlify account (free tier works fine)
- Node.js and npm installed (for local testing)

---

## 📤 Part 1: Push to GitHub

### Step 1: Initialize Git Repository

If you haven't initialized git yet, run these commands:

```powershell
# Navigate to project root
cd C:\Users\ASUSa\OneDrive\Documents\lakshan-frontend-final

# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Lakshan Frontend ERP System"
```

### Step 2: Add GitHub Remote

```powershell
# Add the GitHub repository as remote
git remote add origin https://github.com/voxosolution-blip/lakshan-frontend-final.git

# Verify remote was added
git remote -v
```

### Step 3: Push to GitHub

```powershell
# Push to GitHub (first time)
git branch -M main
git push -u origin main
```

**Note:** If you encounter authentication issues:
- You may need to use a Personal Access Token instead of password
- Or set up SSH keys for GitHub
- GitHub Desktop or Git Credential Manager can help with authentication

---

## 🌐 Part 2: Deploy to Netlify

### Option A: Deploy via Netlify Dashboard (Recommended for First Time)

#### Step 1: Sign in to Netlify
1. Go to [https://app.netlify.com](https://app.netlify.com)
2. Sign in with your GitHub account (easiest option)

#### Step 2: Import Your Site from GitHub
1. Click **"Add new site"** → **"Import an existing project"**
2. Choose **"GitHub"** as your Git provider
3. Authorize Netlify to access your GitHub repositories if prompted
4. Search for and select `lakshan-frontend-final` repository
5. Click **"Configure the Netlify app on GitHub"** if prompted

#### Step 3: Configure Build Settings

**Important:** Use these settings:

```
Base directory: frontend
Build command: npm install && npm run build
Publish directory: frontend/dist
```

#### Step 4: Set Environment Variables

Before deploying, click **"Show advanced"** → **"New variable"** and add:

```
Variable name: VITE_API_URL
Value: https://lakshan-backend-final-production.up.railway.app/api
```

✅ **Your Railway Backend URL is configured:** `lakshan-backend-final-production.up.railway.app`

⚠️ **Important:** Make sure your Railway backend has CORS configured to allow requests from your Netlify domain.

#### Step 5: Deploy

1. Click **"Deploy site"**
2. Wait for the build to complete (usually 1-3 minutes)
3. Once deployed, you'll get a URL like: `https://random-name-123456.netlify.app`

#### Step 6: Configure Custom Domain (Optional)

If you want a custom domain:
1. Go to **Site settings** → **Domain management**
2. Click **"Add custom domain"**
3. Follow the DNS configuration instructions

---

### Option B: Deploy via Netlify CLI

#### Step 1: Install Netlify CLI

```powershell
npm install -g netlify-cli
```

#### Step 2: Login to Netlify

```powershell
netlify login
```

#### Step 3: Navigate to Frontend Directory

```powershell
cd frontend
```

#### Step 4: Deploy

```powershell
# Build the project first
npm run build

# Deploy to Netlify
netlify deploy --prod --dir=dist
```

---

## 🔧 Important Configuration Notes

### 1. API URL Configuration

The frontend uses `VITE_API_URL` environment variable to connect to your backend API.

**For Netlify:**
- Set this as an environment variable in Netlify dashboard
- Go to: Site settings → Build & deploy → Environment variables
- Add: `VITE_API_URL` = `https://lakshan-backend-final-production.up.railway.app/api`

**Your Railway Backend:**
- Domain: `lakshan-backend-final-production.up.railway.app`
- Full API URL: `https://lakshan-backend-final-production.up.railway.app/api`

### 2. Single Page Application (SPA) Routing

The `public/_redirects` file ensures React Router works correctly on Netlify by redirecting all routes to `index.html`.

### 3. Build Settings Summary

- **Base directory:** `frontend`
- **Build command:** `npm install && npm run build`
- **Publish directory:** `frontend/dist`

---

## ✅ Post-Deployment Checklist

- [ ] Verify the site loads correctly
- [ ] Test authentication/login functionality
- [ ] Verify API connections work (check browser console)
- [ ] Test navigation between pages
- [ ] Check responsive design on mobile devices
- [ ] Set up custom domain (if needed)

---

## 🔄 Updating Your Deployment

### After Making Changes:

1. **Commit and push to GitHub:**
   ```powershell
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```

2. **Netlify will automatically rebuild** (if connected via GitHub)
   - Go to Netlify dashboard → Deploys tab to see status
   - Or set up notifications for deploy status

### Manual Deploy (if needed):

```powershell
cd frontend
npm run build
netlify deploy --prod --dir=dist
```

---

## 🐛 Troubleshooting

### Build Fails on Netlify

1. Check build logs in Netlify dashboard
2. Verify Node.js version (Netlify uses Node 18 by default)
3. Ensure all dependencies are in `package.json`
4. Check for TypeScript errors locally: `npm run build`

### API Not Connecting

1. Verify `VITE_API_URL` environment variable is set in Netlify
2. Check CORS settings on your backend API
3. Verify the API URL is accessible from the internet
4. Check browser console for errors

### Routing Issues (404 on refresh)

- Ensure `public/_redirects` file exists with: `/* /index.html 200`
- Verify `netlify.toml` redirects are configured correctly

### Build Takes Too Long

- Exclude unnecessary files in `.gitignore`
- Consider using Netlify build cache
- Check for large dependencies in `node_modules`

---

## 📚 Additional Resources

- [Netlify Documentation](https://docs.netlify.com/)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html#netlify)
- [React Router Deployment](https://reactrouter.com/en/main/start/overview)

---

## 🎉 Success!

Once deployed, your frontend will be live at your Netlify URL!

**Next Steps:**
1. Share the Netlify URL with your team
2. **IMPORTANT:** Update your Railway backend CORS settings to allow requests from your Netlify domain
   - Add your Netlify URL (e.g., `https://your-site.netlify.app`) to your backend's allowed origins
   - This is required for the frontend to communicate with the Railway backend
3. Monitor the site for any errors or issues
4. Set up continuous deployment (automatic deploys on git push)

**Backend CORS Configuration:**
Your Railway backend at `lakshan-backend-final-production.up.railway.app` needs to allow your Netlify frontend domain in its CORS configuration. Common CORS settings:
- `Access-Control-Allow-Origin: https://your-netlify-site.netlify.app`
- Or use `*` for development (not recommended for production)

---

**Need Help?** Check the Netlify build logs or contact your development team.

