import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import settingsRoutes from './routes/settings.js';
import customLinksRoutes from './routes/customLinks.js';
import scenariosRoutes from './routes/scenarios.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initDatabase } from './database/db.js';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'DB_PATH',
  'ALLOWED_ORIGINS'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ CRITICAL ERROR: Missing required environment variables:');
  missingEnvVars.forEach(envVar => {
    console.error(`   - ${envVar}`);
  });
  console.error('\n📝 Please check your .env file and ensure all required variables are set.');
  console.error('💡 See .env.example for reference.');
  process.exit(1);
}

// Validate JWT_SECRET strength
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('❌ CRITICAL SECURITY ERROR: JWT_SECRET must be at least 32 characters long!');
  console.error('💡 Generate a strong secret with: openssl rand -base64 32');
  console.error('📝 Add it to your .env file as: JWT_SECRET=<generated_secret>');
  process.exit(1);
}

console.log('✅ Environment variables validated successfully');

const app = express();
const PORT = process.env.PORT || 9081;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
// Default frontend origin is localhost:9080 to match Vite dev server
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || ['http://localhost:9080'];

// Allowed IPs for additional access control
const allowedIPs = process.env.ALLOWED_IPS?.split(',').map(ip => ip.trim()) || ['127.0.0.1'];

// Helper to check if IP matches (supports simple CIDR notation like 192.168.1.0/24)
function isIPAllowed(clientIP) {
  if (!clientIP) return false;

  // Normalize IPv6 localhost to IPv4
  const normalizedIP = clientIP === '::1' ? '127.0.0.1' : clientIP.replace(/^::ffff:/, '');

  // Allow all if 0.0.0.0 is in the list
  if (allowedIPs.includes('0.0.0.0')) return true;

  for (const allowed of allowedIPs) {
    if (allowed.includes('/')) {
      // CIDR notation
      const [subnet, bits] = allowed.split('/');
      const mask = ~(Math.pow(2, 32 - parseInt(bits)) - 1);
      const subnetNum = ipToNum(subnet);
      const clientNum = ipToNum(normalizedIP);
      if ((subnetNum & mask) === (clientNum & mask)) return true;
    } else if (allowed === normalizedIP) {
      return true;
    }
  }
  return false;
}

// Convert IP to number for CIDR comparison
function ipToNum(ip) {
  const parts = ip.split('.').map(Number);
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// IP-based access control middleware (optional - only if ALLOWED_IPS is restrictive)
app.use((req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;

  // Skip IP check if allowing all (0.0.0.0)
  if (allowedIPs.includes('0.0.0.0')) {
    return next();
  }

  if (isIPAllowed(clientIP)) {
    next();
  } else {
    console.warn(`⚠️ Blocked request from IP: ${clientIP}`);
    res.status(403).json({
      error: 'Access denied',
      message: 'Your IP address is not allowed to access this API'
    });
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiting for authentication endpoints
const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts
  message: {
    error: 'Too many login attempts',
    message: 'Too many login attempts from this IP, please try again after 15 minutes.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

const authRegisterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registration attempts per hour
  message: {
    error: 'Too many registration attempts',
    message: 'Too many registration attempts from this IP, please try again after 1 hour.',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authPasswordChangeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 password change attempts per hour
  message: {
    error: 'Too many password change attempts',
    message: 'Too many password change attempts, please try again later.',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth/login', authLoginLimiter);
app.use('/api/auth/register', authRegisterLimiter);
app.use('/api/auth/change-password', authPasswordChangeLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/custom-links', customLinksRoutes);
app.use('/api/scenarios', scenariosRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize database and start server
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 OSPF Visualizer API Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔒 CORS enabled for: ${allowedOrigins.join(', ')}`);
    });
  })
  .catch((error) => {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

export default app;
