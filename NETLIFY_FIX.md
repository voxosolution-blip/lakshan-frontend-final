# 🔧 Netlify Build Error Fix

## ❌ Error You're Seeing

```
git clone --filter=blob:none https://github.com/voxosolution-blip/lakshan-backend-final
Base directory does not exist: /opt/build/repo/frontend
```

## 🐛 Root Cause

Netlify is cloning the **WRONG repository**: `lakshan-backend-final` instead of `lakshan-frontend-final`

## ✅ Solution

### Step 1: Verify Correct Repository in Netlify

1. Go to your Netlify dashboard: https://app.netlify.com
2. Click on your site
3. Go to **Site settings** → **Build & deploy** → **Continuous Deployment**
4. Check the **Repository** field

**It should be:** `voxosolution-blip/lakshan-frontend-final`  
**NOT:** `voxosolution-blip/lakshan-backend-final`

### Step 2: Fix the Repository Connection

**Option A: Change Repository (Recommended)**

1. In Netlify, go to **Site settings** → **Build & deploy** → **Continuous Deployment**
2. Click **"Link a different repository"** or **"Change repository"**
3. Search for and select `lakshan-frontend-final` (NOT `lakshan-backend-final`)
4. Click **"Save"**
5. Trigger a new deploy

**Option B: Delete and Recreate Site**

If you can't change the repository:
1. Delete the current site in Netlify
2. Go to **"Add new site"** → **"Import an existing project"**
3. Select **GitHub** as provider
4. **Carefully select** `lakshan-frontend-final` (make sure it's the FRONTEND repo)
5. Configure build settings:
   - Base directory: `frontend`
   - Build command: `npm install && npm run build`
   - Publish directory: `frontend/dist`

### Step 3: Verify Configuration

After fixing the repository, ensure these settings in Netlify:

**Build Settings:**
```
Base directory: frontend
Build command: npm install && npm run build
Publish directory: frontend/dist
```

**Environment Variables:**
```
VITE_API_URL = https://lakshan-backend-final-production.up.railway.app/api
```

### Step 4: Verify Files Are Pushed

Make sure you've pushed the latest code to GitHub:

```powershell
git status
git push origin main
```

The `netlify.toml` file should now be at the **root** of your repository (not in the frontend folder).

## ✅ Verification Checklist

- [ ] Netlify is connected to `lakshan-frontend-final` (not `lakshan-backend-final`)
- [ ] `netlify.toml` exists at the root of the repository
- [ ] Base directory is set to `frontend` in Netlify
- [ ] Environment variable `VITE_API_URL` is set correctly
- [ ] All code is pushed to GitHub main branch

## 🚀 After Fixing

1. Trigger a new deploy in Netlify (or push a new commit)
2. Check the build logs - they should now clone `lakshan-frontend-final`
3. Build should complete successfully

---

**Remember:** The frontend code is in `lakshan-frontend-final`, not `lakshan-backend-final`!








