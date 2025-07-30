# 🚀 Render Deployment Guide

## Step-by-Step Deployment to Render

### 1. Prepare Your Repository

First, make sure your code is in a Git repository:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit changes
git commit -m "Ready for Render deployment"

# Add remote repository (create one on GitHub first)
git remote add origin https://github.com/yourusername/live-polling-backend.git

# Push to GitHub
git push -u origin main
```

### 2. Deploy to Render

1. **Go to [render.com](https://render.com)**
2. **Sign up/Login** with your GitHub account
3. **Click "New +"** in dashboard
4. **Select "Web Service"**
5. **Connect your GitHub repository**

### 3. Configure Your Service

Fill in these settings:

```
Name: live-polling-backend
Environment: Node
Region: (Choose closest to your users)
Branch: main
Build Command: npm install
Start Command: npm start
Instance Type: Free (or paid for production)
```

### 4. Set Environment Variables

In the Render dashboard, go to **Environment** tab and add:

```bash
NODE_ENV=production
ALLOWED_ORIGINS=https://your-frontend-domain.com
```

**Important**: Replace `https://your-frontend-domain.com` with your actual frontend URL!

### 5. Deploy

- Click **"Create Web Service"**
- Wait for deployment (2-3 minutes)
- Your API will be live at: `https://your-app-name.onrender.com`

### 6. Test Your Deployment

Visit these URLs to verify everything works:

- **API Info**: `https://your-app-name.onrender.com/`
- **Health Check**: `https://your-app-name.onrender.com/health`
- **Server Status**: `https://your-app-name.onrender.com/status`

### 7. Update Your Frontend

In your frontend code, update the backend URL:

```javascript
// Replace localhost with your Render URL
const socket = io("https://your-app-name.onrender.com");
```

## 🔧 Environment Variables Explained

| Variable          | Description                      | Example                                         |
| ----------------- | -------------------------------- | ----------------------------------------------- |
| `NODE_ENV`        | Tells the app it's in production | `production`                                    |
| `ALLOWED_ORIGINS` | Frontend URLs that can connect   | `https://myapp.vercel.app,https://mydomain.com` |

## 🚨 Common Issues & Solutions

### Issue 1: CORS Errors

**Problem**: Frontend can't connect to backend
**Solution**: Add your frontend URL to `ALLOWED_ORIGINS`

```bash
# If your frontend is at https://myapp.vercel.app
ALLOWED_ORIGINS=https://myapp.vercel.app
```

### Issue 2: WebSocket Connection Failed

**Problem**: Real-time features not working
**Solution**: Render supports WebSockets by default, but check your frontend code:

```javascript
const socket = io("https://your-backend.onrender.com", {
  transports: ["websocket", "polling"],
});
```

### Issue 3: App Sleeping (Free Tier)

**Problem**: App goes to sleep after 15 minutes
**Solution**:

- Use a paid plan ($7/month) for 24/7 uptime
- Or implement a ping service to keep it awake

### Issue 4: Build Failures

**Problem**: Deployment fails during build
**Solution**: Check these files exist and are correct:

- `package.json` has `"start": "node server.js"`
- All dependencies are listed in `package.json`
- Node version is compatible (18+)

## 📊 Monitoring Your App

### Render Dashboard

- **Logs**: View real-time server logs
- **Metrics**: Monitor CPU, memory usage
- **Events**: See deployment history

### Health Monitoring

Your app has a health endpoint at `/health` that returns:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600,
  "memory": { "rss": 50000000, "heapTotal": 20000000 },
  "version": "1.0.0"
}
```

## 🔄 Automatic Deployments

Render automatically redeploys when you push to your main branch:

```bash
# Make changes to your code
git add .
git commit -m "Update feature"
git push origin main
# Render will automatically deploy the changes!
```

## 💰 Pricing

- **Free Tier**: 750 hours/month, sleeps after 15min inactivity
- **Starter**: $7/month, always on, custom domains
- **Pro**: $25/month, more resources, priority support

## 🎯 Next Steps

1. **Deploy your frontend** (Vercel, Netlify, etc.)
2. **Update CORS origins** with your frontend URL
3. **Test the full application** end-to-end
4. **Consider upgrading** to paid plan for production use
5. **Add a database** if you need data persistence

## 📞 Your Backend URL

After deployment, your backend will be available at:

```
https://your-app-name.onrender.com
```

Use this URL in your frontend to connect to your backend!

---

**🎉 Congratulations! Your Live Polling Backend is now live on Render!**
