const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const path = require('path');

const { attachUser } = require('./middleware/authMiddleware');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Registers all model associations before anything queries the database
// (e.g. the sync() call in config/database.js's connectDB).
require('./models');

const app = express();

// --- Request flow -----------------------------------------------------
// Incoming Request -> Helmet -> Compression -> CORS -> JSON Parser
//   -> Authentication -> Routes -> Error Handler

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

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// 6. Static files
app.use('/uploads', express.static(path.join(__dirname, process.env.UPLOAD_DIR || 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Health check (public, no auth required)
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Diaspora Legal API is running' });
});

// 7. Authentication - resolves req.user from the token if present, but
// never blocks the request. Individual routers/routes apply `protect`
// (see middleware/authMiddleware.js) where authentication is required.
app.use(attachUser);

// 8. API routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/users'));
app.use('/api/lawyers', require('./routes/lawyers'));
app.use('/api/consultations', require('./routes/consultations'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/notifications', require('./routes/notifications'));

// 9. Global error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
