# NFT Tracker - Deployment Guide

## 📁 Project Structure
```
nft-tracker/
├── backend/
│   ├── server.js      # Express API server
│   └── package.json
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       └── App.jsx
└── README.md
```

---

## 🚀 STEP-BY-STEP DEPLOYMENT

### Step 1: Create GitHub Account (if you don't have one)
1. Go to https://github.com
2. Click "Sign Up"
3. Create account

### Step 2: Upload Code to GitHub
1. Go to https://github.com/new
2. Name it `nft-tracker`
3. Click "Create repository"
4. Upload all the files (drag & drop or use git)

**Using Git (Terminal/Command Line):**
```bash
cd nft-tracker
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/nft-tracker.git
git push -u origin main
```

---

### Step 3: Deploy Backend to Railway

1. **Go to Railway**: https://railway.app
2. **Sign up** with your GitHub account
3. **Click** "New Project"
4. **Select** "Deploy from GitHub repo"
5. **Choose** your `nft-tracker` repo
6. **Important**: Click on the service, go to Settings
7. **Set Root Directory** to: `backend`
8. **Wait** for deployment (2-3 minutes)

#### Add Environment Variables:
1. Click on your service in Railway
2. Go to "Variables" tab
3. Add these:
```
OPENSEA_API_KEY=0d4d5542c15e4ee9b38418d47f711ef2
ALCHEMY_API_KEY=FkzSXZO5qT_R9gh0oJzMG
ETHERSCAN_API_KEY=9EQPW2MJG7KHVQWK8YR9V6SMPWB7YV5SS3
```

#### Get Your Backend URL:
1. Go to Settings → Networking
2. Click "Generate Domain"
3. Copy the URL (like `https://nft-tracker-xxx.up.railway.app`)

---

### Step 4: Deploy Frontend to Vercel

1. **Go to Vercel**: https://vercel.com
2. **Sign up** with GitHub
3. **Click** "Add New Project"
4. **Import** your `nft-tracker` repo
5. **Configure**:
   - Framework: Vite
   - Root Directory: `frontend`
6. **Add Environment Variable**:
   - Name: `VITE_API_URL`
   - Value: Your Railway URL from Step 3 (e.g., `https://nft-tracker-xxx.up.railway.app`)
7. **Click** "Deploy"
8. **Wait** 1-2 minutes

---

### Step 5: Done! 🎉

Your app is now live at the Vercel URL (like `https://nft-tracker.vercel.app`)

---

## 💻 LOCAL DEVELOPMENT

### Run Backend:
```bash
cd backend
npm install
npm start
# Runs on http://localhost:3001
```

### Run Frontend:
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

---

## 💰 COSTS

| Service | Free Tier | Paid |
|---------|-----------|------|
| Railway | $5 credit/month | ~$5/month |
| Vercel | Unlimited for hobby | Free |
| **Total** | **Free to start** | **~$5/month** |

---

## 🔧 API KEYS USED

| API | Purpose | Rate Limits |
|-----|---------|-------------|
| Alchemy | NFT sales, metadata, floor prices | 300 req/sec |
| OpenSea | Collection stats | 4 req/sec |
| Etherscan | Wallet analysis (flipper detection) | 5 req/sec |

---

## ❓ TROUBLESHOOTING

### "Failed to load data" error
- Check if backend is running (visit your Railway URL)
- Make sure `VITE_API_URL` is set correctly in Vercel

### Backend not deploying
- Check Railway logs for errors
- Make sure Root Directory is set to `backend`

### Images not loading
- Some collections have IPFS images that load slowly
- The app falls back to collection image if NFT image fails

### Flipper detection slow
- Etherscan has rate limits
- Analysis is cached after first check

---

## 📞 NEED HELP?

1. Railway docs: https://docs.railway.app
2. Vercel docs: https://vercel.com/docs
3. Create an issue on your GitHub repo

---

## ✨ FEATURES

- ✅ Real-time NFT sales from Alchemy
- ✅ Floor prices from multiple marketplaces  
- ✅ Flipper detection algorithm via Etherscan
- ✅ Flag suspicious wallets
- ✅ Date filtering (day/week/month)
- ✅ Sort by price, time, flipper score
- ✅ Direct marketplace links (click image)
- ✅ Add collections manually or bulk
- ✅ Collapsible sidebar
- ✅ Grid/List view
- ✅ Red price highlighting for sales
- ✅ Dormant wallet detection
