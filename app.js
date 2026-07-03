const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const { attachUser } = require('./middleware/authMiddleware');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Registers all model associations before anything queries the database
// (e.g. the sync() call in config/database.js's connectDB).
require('./models');

const app = express();

// --- Global request flow -----------------------------------------------
// Incoming Request -> Helmet -> Compression -> CORS -> JSON Parser
//   -> Cookie Parser -> Request Logging -> Static Files
//   -> Authentication (decode token) -> Routes -> Error Handling
//
// --- Per-route flow (see routes/*.js) -----------------------------------
// Route -> protect (JWT authentication) -> authorize (role authorization)
//   -> validate*/uploadMiddleware (input validation / file uploads) -> Controller

// 1. Security middleware
app.use(helmet());

// 2. Compression
app.use(compression());

// 3. CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true,
  })
);

// 4. JSON & urlencoded body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 5. Cookie parsing (needed for reading auth tokens from cookies)
app.use(cookieParser(process.env.COOKIE_SECRET));

// Request logging - always write an audit trail to logs/access.log, plus a
// human-readable stream to the console outside of production/test.
if (process.env.NODE_ENV !== 'test') {
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  const accessLogStream = fs.createWriteStream(path.join(logsDir, 'access.log'), { flags: 'a' });
  app.use(morgan('combined', { stream: accessLogStream }));

  if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
  }
}

// 6. Static files
app.use('/uploads', express.static(path.join(__dirname, process.env.UPLOAD_DIR || 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Health check (public, no auth required)
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Diaspora Legal API is running' });
});

// 7. Authentication - decodes the token into req.tokenPayload if present,
// but never blocks the request. Individual routers/routes apply `protect`
// (see middleware/authMiddleware.js), which validates the session against
// the database and sets req.user, where authentication is required.
app.use(attachUser);

// 8. API routes - see routes/index.js for the full feature-route registry
app.use('/api', require('./routes'));

// 9. Global error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
