# Authentication System Setup Guide

This guide explains how to set up and use the authentication system for OSPF Visualizer Pro.

## 🔐 Security Features

### Backend Security
- ✅ **Password Hashing**: bcrypt with configurable salt rounds
- ✅ **JWT Authentication**: Secure token-based authentication
- ✅ **Rate Limiting**: Protection against brute force attacks
- ✅ **CORS Protection**: Configurable allowed origins
- ✅ **Helmet Security Headers**: XSS, clickjacking, and other attack protections
- ✅ **SQL Injection Protection**: Parameterized queries
- ✅ **Input Validation**: Email, username, and password validation
- ✅ **Audit Logging**: Track user actions and login attempts

### Frontend Security
- ✅ **Secure Token Storage**: LocalStorage with automatic cleanup
- ✅ **Protected Routes**: Authentication required for main app
- ✅ **Token Verification**: Automatic token validation on load
- ✅ **Password Strength Indicator**: Visual feedback for secure passwords
- ✅ **XSS Protection**: React's built-in protection

### Database Security
- ✅ **SQLite with Foreign Keys**: Data integrity
- ✅ **Indexed Lookups**: Fast and secure queries
- ✅ **User Role Management**: Extensible permission system
- ✅ **Session Tracking**: Optional token blacklisting support

## 📦 Installation

1. **Install Dependencies**:
```bash
npm install
```

This will install all required packages:
- `express` - Web server framework
- `cors` - Cross-origin resource sharing
- `helmet` - Security headers
- `express-rate-limit` - Rate limiting
- `dotenv` - Environment variables
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT token generation
- `sqlite3` & `sqlite` - Database

2. **Configure Environment Variables**:

The `.env` file is already created with development defaults. For production, update these values:

```env
# IMPORTANT: Change these in production!
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
SESSION_SECRET=your-session-secret-change-this

# Generate a secure secret:
# openssl rand -base64 32
```

3. **Create .env.production** (for production deployment):
```bash
cp .env.example .env.production
# Edit .env.production with production values
```

## 🚀 Running the Application

### Development Mode

**Option 1: Run Both Servers Concurrently**:
```bash
npm run start:all
```

This starts both:
- Frontend dev server: `http://localhost:9080`
- Backend API server: `http://localhost:9081`

**Option 2: Run Separately**:

Terminal 1 (Frontend):
```bash
npm run dev
```

Terminal 2 (Backend):
```bash
npm run server:dev
```

### Production Mode

1. **Build Frontend**:
```bash
npm run build
```

2. **Start Backend Server**:
```bash
NODE_ENV=production npm run server
```

3. **Serve Frontend**:
```bash
npm run preview
```

## 🗄️ Database

The SQLite database is automatically created at `./data/ospf-visualizer.db` on first run.

### Database Schema

**Users Table**:
```sql
- id: INTEGER PRIMARY KEY
- username: TEXT UNIQUE
- email: TEXT UNIQUE
- password_hash: TEXT
- full_name: TEXT
- role: TEXT (default: 'user')
- is_active: INTEGER (default: 1)
- created_at: DATETIME
- updated_at: DATETIME
- last_login: DATETIME
```

**Audit Log Table**:
```sql
- id: INTEGER PRIMARY KEY
- user_id: INTEGER
- action: TEXT
- ip_address: TEXT
- user_agent: TEXT
- details: TEXT
- created_at: DATETIME
```

## 🔑 API Endpoints

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "fullName": "John Doe" // optional
}

Response: 201 Created
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "fullName": "John Doe"
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}

Response: 200 OK
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "fullName": "John Doe",
    "role": "user"
  }
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>

Response: 200 OK
{
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "fullName": "John Doe",
    "role": "user",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastLogin": "2024-01-01T12:00:00.000Z"
  }
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "Logout successful"
}
```

#### Change Password
```http
POST /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "OldPass123!",
  "newPassword": "NewSecurePass123!"
}

Response: 200 OK
{
  "message": "Password changed successfully"
}
```

### Health Check
```http
GET /api/health

Response: 200 OK
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 🔒 Password Requirements

- Minimum 8 characters
- Maximum 128 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (!@#$%^&*(),.?":{}|<>)

## 🛡️ Security Best Practices

### For Development:
1. Keep `.env` file secret (already in `.gitignore`)
2. Use different secrets for different environments
3. Never commit secrets to version control

### For Production:
1. **Change all secrets** in `.env.production`
2. Use strong, randomly generated secrets:
   ```bash
   openssl rand -base64 32
   ```
3. Enable HTTPS
4. Use environment variables instead of `.env` files
5. Set `NODE_ENV=production`
6. Configure proper CORS origins
7. Set up proper rate limiting
8. Regular security audits
9. Keep dependencies updated
10. Monitor audit logs

## 📝 Configuration Options

Edit `.env` to customize:

```env
# Server
PORT=3001                    # API server port
NODE_ENV=development         # development | production

# JWT
JWT_SECRET=<secret>          # Secret for signing tokens
JWT_EXPIRES_IN=7d            # Token expiration (7 days)

# Database
DB_PATH=./data/ospf.db       # SQLite database path

# CORS
ALLOWED_ORIGINS=http://localhost:9080,http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100  # Max requests per window

# Security
BCRYPT_ROUNDS=12             # Password hashing rounds (10-12 recommended)
```

## 🧪 Testing Authentication

1. **Start the servers**:
```bash
npm run start:all
```

2. **Open browser**: Navigate to `http://localhost:9080`

3. **Register a new account**:
   - Click "Create one now"
   - Fill in the registration form
   - Password must meet requirements

4. **Login**:
   - Use your registered email and password
   - Token is automatically stored

5. **Access the app**:
   - You'll be redirected to the main OSPF Visualizer
   - User info displayed in top-right corner

6. **Logout**:
   - Click the logout button
   - Token is cleared, redirected to login

## 🔧 Troubleshooting

### Backend won't start:
- Check if port 9081 is already in use
- Verify `.env` file exists
- Check database permissions in `./data/` folder

### Frontend can't connect to backend:
- Verify backend is running on port 9081
- Check CORS settings in `.env`
- Check browser console for errors

### Database errors:
- Delete `./data/ospf-visualizer.db` to reset
- Check file permissions
- Ensure `data/` directory exists

### Authentication failures:
- Clear localStorage in browser DevTools
- Check JWT_SECRET matches between requests
- Verify token hasn't expired (7 days default)

## 📚 Additional Resources

- [JWT Documentation](https://jwt.io/)
- [bcrypt Documentation](https://www.npmjs.com/package/bcrypt)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [OWASP Security Guidelines](https://owasp.org/)

## 🤝 Support

For issues or questions:
1. Check troubleshooting section
2. Review audit logs in database
3. Check backend server console logs
4. Review browser console for frontend errors
