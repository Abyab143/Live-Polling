# Live Polling Backend 🚀

A real-time polling system backend built with Express.js and Socket.IO, featuring live results, student management, and chat functionality.

## 🌟 Features

- **Real-time Polling**: Create and manage polls with instant result updates
- **Role-based System**: Separate interfaces for teachers and students
- **Live Results**: See poll results update in real-time as students vote
- **Student Management**: View connected students, kick users if needed
- **Poll History**: Access past polls and their results
- **Chat System**: Real-time chat functionality with moderation
- **Auto-timeout**: Polls automatically end after specified duration
- **WebSocket Support**: Full duplex communication using Socket.IO

## 🚀 Quick Deploy to Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

### One-Click Deployment Steps:

1. **Fork/Clone this repository**
2. **Push to GitHub** (if not already there)
3. **Go to [Render.com](https://render.com)**
4. **Create New Web Service**
5. **Connect your GitHub repository**
6. **Configure deployment settings**:

   - **Name**: `live-polling-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free` (or paid for production)

7. **Set Environment Variables**:

   ```
   NODE_ENV=production
   ALLOWED_ORIGINS=https://your-frontend-domain.com
   ```

8. **Deploy** and get your API URL: `https://your-app.onrender.com`

## 🛠️ Local Development

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/live-polling-backend.git
cd live-polling-backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

The server will run on `http://localhost:5000`

### Available Scripts

```bash
npm start       # Start production server
npm run dev     # Start development server with nodemon
npm test        # Run tests (placeholder)
```

## 📡 API Endpoints

### REST Endpoints

- `GET /` - API information and available endpoints
- `GET /status` - Current server status and statistics
- `GET /polls` - Historical poll data

### Socket.IO Events

#### 👨‍🏫 Teacher Events

- `teacher_start_poll` - Create a new poll
- `teacher_end_poll` - Manually end current poll
- `get_current_results` - Get live poll results
- `kick_student` - Remove a student from session
- `get_students` - List all connected students
- `get_past_polls` - Retrieve poll history

#### 🎓 Student Events

- `join_student` - Join polling session with name
- `submit_answer` - Submit answer to active poll

#### 💬 Chat Events

- `join-chat` - Join chat room
- `send-message` - Send message to chat
- `leave-chat` - Leave chat room
- `kick-user` - Remove user from chat (admin)

#### 📊 General Events

- `get_status` - Get server statistics
- `disconnect` - Handle client disconnection

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Required
NODE_ENV=production
PORT=5000
ALLOWED_ORIGINS=https://your-frontend.com,https://your-app.vercel.app

# Optional
DATABASE_URL=mongodb://localhost:27017/polling
REDIS_URL=redis://localhost:6379
```

### CORS Configuration

Update `ALLOWED_ORIGINS` with your frontend URLs:

- Development: `http://localhost:3000,http://localhost:5173`
- Production: `https://your-app.vercel.app,https://your-domain.com`

## 📊 Usage Examples

### Frontend Integration

```javascript
// Connect to backend
const socket = io("https://your-backend.onrender.com");

// Teacher creates poll
socket.emit("teacher_start_poll", {
  question: "What's your favorite programming language?",
  options: ["JavaScript", "Python", "Java", "C++"],
  duration: 60,
});

// Student joins and answers
socket.emit("join_student", "John Doe");
socket.emit("submit_answer", "JavaScript");

// Listen for results
socket.on("live_results", (data) => {
  console.log("Live results:", data.results);
});
```

### REST API Usage

```bash
# Check server status
curl https://your-backend.onrender.com/status

# Get poll history
curl https://your-backend.onrender.com/polls

# Health check
curl https://your-backend.onrender.com/health
```

## 🏗️ Architecture

```
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── .env.example          # Environment variables template
├── .gitignore           # Git ignore rules
└── README.md           # This file
```

### Data Storage

- **In-Memory**: Current implementation uses memory storage
- **Scalable**: Can be extended with Redis/MongoDB for persistence
- **Real-time**: Socket.IO handles live connections

## 🔒 Security Features

- **CORS Protection**: Configured origins for cross-origin requests
- **Input Validation**: Server-side validation for all inputs
- **Rate Limiting**: Can be added for production use
- **Environment Variables**: Sensitive data in environment files

## 🚀 Deployment Options

### Render (Recommended - Free Tier)

- Free 750 hours/month
- Automatic HTTPS
- Git-based deployment
- WebSocket support

### Railway ($5/month)

- Simple deployment
- No sleep time
- Custom domains

### Heroku (Free tier deprecated)

- Git-based deployment
- Add-ons ecosystem
- Dyno sleep on free tier

### Vercel (Limited WebSocket)

- Serverless functions
- Limited WebSocket support
- Great for REST APIs

## 📈 Scaling Considerations

### Performance Optimization

- Add Redis for session storage
- Implement database for persistence
- Use clustering for multiple CPU cores
- Add rate limiting and caching

### Production Enhancements

```bash
# Add database
npm install mongodb mongoose

# Add session storage
npm install redis connect-redis

# Add security
npm install helmet express-rate-limit

# Add logging
npm install winston morgan
```

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**

   - Update `ALLOWED_ORIGINS` in environment variables
   - Check frontend URL matches exactly

2. **WebSocket Connection Failed**

   - Ensure hosting platform supports WebSockets
   - Check firewall settings

3. **Port Issues**

   - Use `process.env.PORT` (auto-set by hosting platforms)
   - Default fallback to 5000

4. **Memory Limitations**
   - Consider database for large scale
   - Implement cleanup for old data

### Debug Mode

```javascript
// Enable Socket.IO debugging
localStorage.debug = "socket.io-client:socket";

// Check connection status
socket.on("connect", () => console.log("Connected!"));
socket.on("disconnect", () => console.log("Disconnected!"));
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Frontend Repository**: [Link to your frontend repo]
- **Live Demo**: [https://your-demo.vercel.app]
- **API Documentation**: [https://your-backend.onrender.com]

## 👨‍💻 Author

**Your Name**

- GitHub: [@yourusername]
- LinkedIn: [Your LinkedIn]
- Email: your.email@example.com

---

## 🎯 Getting Started Checklist

- [ ] Clone repository
- [ ] Install dependencies (`npm install`)
- [ ] Copy `.env.example` to `.env`
- [ ] Update environment variables
- [ ] Start development server (`npm run dev`)
- [ ] Test local functionality
- [ ] Push to GitHub
- [ ] Deploy to Render
- [ ] Update CORS origins
- [ ] Test production deployment

**Your live polling backend will be ready in minutes!** 🎉
