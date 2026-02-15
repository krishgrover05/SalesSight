require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const { connectDB } = require('./config/db');
const { logRequest } = require('./middleware/analytics');

const productRoutes = require('./routes/products');
const trendsRoutes = require('./routes/google-trends');
const datasetsRoutes = require('./routes/datasets');
const authRoutes = require('./routes/auth');
const recommendProductsRoutes = require('./routes/recommend-products');

const app = express();
const PORT = 8000; // Force port 8000

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SalesSight API',
      version: '1.0.0',
      description: 'Market trends, forecasts, analytics'
    },
    servers: [{ url: `http://localhost:${PORT}` }]
  },
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

/* -------------------- MIDDLEWARE -------------------- */

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use(helmet());
app.use(cors({ origin: true, credentials: true })); // Allow all origins for local dev
app.use(express.json({ limit: '10mb' }));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true
}));

// Analytics logging (if middleware exists)
app.use(logRequest);

/* -------------------- HEALTH CHECK -------------------- */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

/* -------------------- ROUTES -------------------- */

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/google-trends', trendsRoutes);
app.use('/api/datasets', datasetsRoutes);
app.use('/api/recommend-products', recommendProductsRoutes);

/* -------------------- SERVER START -------------------- */

// START SERVER EVEN IF DB FAILS
app.listen(PORT, () => {
  console.log(`✅ SalesSight API running on http://127.0.0.1:${PORT}`);
});

// Try DB connection AFTER server is up
connectDB()
  .then(() => console.log('✅ Database connected'))
  .catch(err => console.error('⚠️ DB connection failed:', err.message));

module.exports = app;
