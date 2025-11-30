# 🚀 Quick Start Guide

Get OSPF Visualizer Pro with authentication running in 3 minutes!

## ⚡ Quick Setup

```bash
# 1. Install dependencies (if not already done)
npm install

# 2. Start both frontend and backend servers
npm run start:all
```

That's it! The app will open at `http://localhost:9080`

## 🔐 First Time Login

1. **Register a new account**:
   - Click "Create one now" on the login page
   - Fill in your details:
     - Username: `admin` (or your choice)
     - Email: `admin@example.com`
     - Password: Must include uppercase, lowercase, number, and special character
     - Example: `Admin123!`

2. **Login and explore**:
   - Your account is automatically logged in after registration
   - Start visualizing OSPF networks immediately!

## 📋 What's Running?

- **Frontend**: http://localhost:9080 (Vite dev server)
- **Backend API**: http://localhost:9081 (Express server)
- **Database**: `./data/ospf-visualizer.db` (SQLite, auto-created)

## 🛠️ Useful Commands

```bash
# Run both servers together
npm run start:all

# Run frontend only
npm run dev

# Run backend only  
npm run server:dev

# Build for production
npm run build

# Run tests
npm test
```

## 🔑 Default Test Account

Want to skip registration? Create a test account manually:

1. Register with these credentials:
   - Email: `test@example.com`
   - Username: `testuser`
   - Password: `Test123!@#`

## 🎯 What's New?

### Security Features:
- ✅ Secure login/registration
- ✅ JWT token authentication
- ✅ Password hashing with bcrypt
- ✅ Rate limiting (100 requests/15min)
- ✅ CORS protection
- ✅ Security headers (XSS, clickjacking protection)
- ✅ Input validation
- ✅ Audit logging

### UI Features:
- ✅ Beautiful login/register pages
- ✅ Password strength indicator
- ✅ Show/hide password toggle
- ✅ User profile in header
- ✅ One-click logout
- ✅ Dark mode support

## 🔧 Troubleshooting

### "Port 3001 already in use"
```bash
# Find and kill the process using port 9081
lsof -ti:9081 | xargs kill -9

# Or change the port in .env:
PORT=3002
```

### "Cannot connect to backend"
- Make sure both servers are running: `npm run start:all`
- Check that backend is on port 9081
- Clear browser cache and localStorage

### "Database error"
```bash
# Reset database
rm -rf data/
# Restart servers
npm run start:all
```

### "Login not working"
- Check browser console for errors
- Verify password meets requirements (8+ chars, uppercase, lowercase, number, special char)
- Try clearing localStorage in DevTools

## 📖 More Information

- **Full Setup Guide**: See `AUTH_SETUP.md`
- **API Documentation**: See `AUTH_SETUP.md#api-endpoints`
- **Security Guide**: See `AUTH_SETUP.md#security-best-practices`

## 🎨 Features to Try

1. **Create an account** and login
2. **Import a network topology** (Upload JSON)
3. **Analyze shortest paths** (Dijkstra algorithm)
4. **Simulate link failures** (Impact analysis)
5. **Export your work** (Download JSON)
6. **Switch to dark mode** (Toggle in header)
7. **View network health** (Analysis tools)

## 💡 Pro Tips

1. **Token expires after 7 days** - You'll need to login again
2. **All data is local** - Database is on your machine
3. **Logout clears everything** - Including unsaved work
4. **Use strong passwords** - Follow the strength indicator
5. **Multiple accounts** - You can create as many as needed

## 🚀 Next Steps

1. ✅ Login to your account
2. ✅ Import or create a network topology
3. ✅ Run path analysis
4. ✅ Export and share your work
5. ✅ Invite team members (create accounts for them)

## 📞 Need Help?

Check the full documentation in `AUTH_SETUP.md` or review the troubleshooting section above.

Happy visualizing! 🎉
