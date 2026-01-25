# 🔧 CORS Error Fix Guide - 401 Unauthorized

## ❌ Problem

You're seeing `401 (Unauthorized)` errors when trying to login from your Netlify frontend:
```
POST https://lakshan-backend-final-production.up.railway.app/api/auth/login 401 (Unauthorized)
```

## 🔍 Root Cause

This is likely a **CORS (Cross-Origin Resource Sharing)** issue. Your Railway backend needs to be configured to accept requests from your Netlify domain.

## ✅ Solution: Update Backend CORS Settings

### Step 1: Get Your Netlify URL

Your frontend is deployed at: **`https://lakshanproducts01.netlify.app`**

(Or check your actual Netlify URL in the Netlify dashboard)

### Step 2: Update Backend CORS Configuration

You need to update your Railway backend to allow requests from your Netlify domain.

**In your backend code, find the CORS configuration** (usually in your main server file, like `server.js`, `app.js`, or `index.js`):

#### Example CORS Configuration (Express.js):

```javascript
const cors = require('cors');

const allowedOrigins = [
  'http://localhost:5173', // Local development
  'https://lakshanproducts01.netlify.app', // Your Netlify domain
  // Add any other domains you need
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // If you're using cookies/auth tokens
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

#### Or simpler version (allow all origins - for development/testing):

```javascript
app.use(cors({
  origin: '*', // Allow all origins (NOT recommended for production with sensitive data)
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### Step 3: Redeploy Backend

After updating CORS:
1. Commit the changes to your backend repository
2. Redeploy on Railway (should auto-deploy if connected to Git)
3. Or manually redeploy from Railway dashboard

### Step 4: Verify CORS is Working

1. Open browser DevTools (F12)
2. Go to Network tab
3. Try to login again
4. Check the login request - you should see CORS headers in the response:
   - `Access-Control-Allow-Origin: https://lakshanproducts01.netlify.app`
   - `Access-Control-Allow-Credentials: true`
   - `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`

---

## 🔍 Alternative: Check if it's Actually Invalid Credentials

The error says "Invalid credentials". Try:

1. **Verify your login credentials are correct**
   - Default might be: `admin` / `admin123` (if you have seed data)
   - Or check your database for actual user credentials

2. **Test backend directly** using curl or Postman:
   ```bash
   curl -X POST https://lakshan-backend-final-production.up.railway.app/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"admin123"}'
   ```

3. **Check backend logs** in Railway dashboard for more details

---

## 🐛 Common CORS Issues

### Issue 1: Preflight OPTIONS Request Failing
- Backend must handle `OPTIONS` requests
- Return proper CORS headers on OPTIONS requests

### Issue 2: Credentials Not Working
- If using cookies/sessions, ensure `credentials: true` in CORS config
- Frontend must send `credentials: 'include'` in fetch/axios

### Issue 3: Authorization Header Not Allowed
- Ensure `Authorization` is in `allowedHeaders`
- Your frontend uses Bearer tokens in Authorization header

---

## 📝 Quick Checklist

- [ ] Netlify domain added to backend CORS allowed origins
- [ ] Backend redeployed after CORS changes
- [ ] CORS middleware configured correctly
- [ ] Login credentials are correct
- [ ] Backend is accepting requests (check Railway logs)

---

## 🆘 Still Not Working?

1. **Check Railway Backend Logs** - Look for CORS errors or authentication errors
2. **Check Network Tab** - See the full request/response headers
3. **Test Backend Directly** - Use Postman/curl to verify backend works
4. **Verify Environment Variable** - Ensure `VITE_API_URL` is set correctly in Netlify

---

**The frontend is deployed correctly! The issue is backend CORS configuration.**










