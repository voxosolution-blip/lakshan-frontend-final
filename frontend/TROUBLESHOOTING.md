# Frontend Troubleshooting Guide

## Issue: Vite Cache Errors on OneDrive

If you're seeing errors like "Failed to write to output file" when running `npm run dev`, this is likely because the project is in a OneDrive folder and OneDrive is interfering with file operations in `node_modules`.

## Solutions (try in order):

### Solution 1: Clear Vite Cache (Recommended First)
```bash
cd frontend
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
npm run dev -- --force
```

### Solution 2: Exclude node_modules from OneDrive Sync
1. Right-click on the `frontend` folder in OneDrive
2. Go to OneDrive settings
3. Add `node_modules` to the exclusion list

### Solution 3: Move Project Outside OneDrive (Best Solution)
Move the entire project to a local directory:
```
From: C:\Users\ASUSa\OneDrive\Documents\Lakshan_Yogurt_ERP
To:   C:\Projects\Lakshan_Yogurt_ERP
```

Then update any paths and reinstall:
```bash
cd C:\Projects\Lakshan_Yogurt_ERP\frontend
npm install
npm run dev
```

### Solution 4: Use WSL (Windows Subsystem for Linux)
If you have WSL installed, run the project from there:
```bash
wsl
cd /mnt/c/Users/ASUSa/OneDrive/Documents/Lakshan_Yogurt_ERP/frontend
npm run dev
```

## Quick Fix Command

If Solution 1 doesn't work, try this comprehensive cache clear:

```powershell
cd frontend
# Stop any running dev server (Ctrl+C)
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
npm run dev
```

## Alternative: Use Different Port

If the server starts but you have issues, try a different port:
```bash
npm run dev -- --port 3000
```


