# 🌐 Netlify Environment Variable Setup

## Quick Reference for Railway Backend

**Backend Domain:** `lakshan-backend-final-production.up.railway.app`

**Environment Variable to Set in Netlify:**

```
Variable name: VITE_API_URL
Variable value: https://lakshan-backend-final-production.up.railway.app/api
```

## How to Set in Netlify Dashboard

1. Go to your Netlify site dashboard
2. Navigate to: **Site settings** → **Build & deploy** → **Environment variables**
3. Click **"Add a variable"**
4. Enter:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://lakshan-backend-final-production.up.railway.app/api`
5. Click **"Save"**
6. **Redeploy** your site for the changes to take effect

## During Initial Setup

When importing your site from GitHub in Netlify:

1. After configuring build settings, click **"Show advanced"**
2. Click **"New variable"**
3. Add the environment variable as shown above
4. Then click **"Deploy site"**

## Important: CORS Configuration

After deploying to Netlify, you'll get a URL like `https://your-site-123456.netlify.app`.

**You must update your Railway backend CORS settings to allow this Netlify domain.**

Example CORS configuration for your backend:
```javascript
// Allow your Netlify frontend
origin: 'https://your-site-123456.netlify.app'

// Or allow all origins (less secure, for development only)
origin: '*'
```

Without proper CORS configuration, your frontend will not be able to make API requests to the Railway backend.








