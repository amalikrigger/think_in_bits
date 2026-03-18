# Mines Game - Online Version

This converts your game from localStorage (local only) to a full backend with accounts that work from anywhere.

## 📦 Installation

1. **Install Node.js dependencies:**
```bash
cd /Users/techmonkey/Desktop/minesjsm
npm install
```

2. **Start the server:**
```bash
npm start
```

3. **Open your browser:**
```
http://localhost:3000
```

## 🚀 What Changed

### Before (localStorage):
- ❌ Accounts only worked on the same computer/browser
- ❌ Data stored locally in browser
- ❌ No way to access from other devices

### After (Database + Backend):
- ✅ Accounts work from any device
- ✅ Data stored in server database
- ✅ Login from anywhere
- ✅ Real user authentication
- ✅ Secure password hashing
- ✅ Session management

## 🔧 Features

- **User Registration & Login** - Create account, login from anywhere
- **Persistent Balance** - Your balance is saved on the server
- **Stats Tracking** - Wins, losses, profits tracked in database
- **Admin Panel** - Full admin controls (ban, balance, notifications)
- **Notifications** - Server-side notification system
- **Security** - Bcrypt password hashing, session authentication

## 📊 Database

The server uses SQLite (`mines.db`) with tables for:
- `users` - User accounts and balances
- `stats` - Win/loss statistics
- `notifications` - User notifications
- `admin_log` - Admin action history

## 🌐 Deploying Online

To make this accessible from the internet:

### Option 1: Free Hosting (Render, Railway, Fly.io)
1. Push code to GitHub
2. Connect to hosting platform
3. They'll auto-deploy your Node.js app

### Option 2: VPS (DigitalOcean, Linode)
1. Get a server ($5-10/month)
2. Upload your code
3. Run `npm start`
4. Point domain to your server

### Option 3: Heroku
```bash
# Install Heroku CLI, then:
heroku create mines-game
git push heroku main
```

## ⚙️ Configuration

Edit `.env` file:
```
PORT=3000
SESSION_SECRET=your-super-secret-key-change-this-in-production
NODE_ENV=production
```

**Important:** Change `SESSION_SECRET` to a random string in production!

## 🔒 Security Notes

- Passwords are hashed with bcrypt
- Sessions use secure cookies (httpOnly)
- SQL injection protected (prepared statements)
- XSS protection (input sanitization)

## 📝 Next Steps

1. Run `npm install`
2. Run `npm start`
3. I'll help you update the frontend JavaScript to use the API

The backend is ready! Now we need to update your `script.js` to use the API endpoints instead of localStorage.

Ready to continue?
