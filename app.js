require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();

// routes
const authRoutes = require('./api/Routes/auth');
const userRoutes = require('./api/Routes/users');
const planRoutes = require('./api/Routes/plan');
const emailRoutes = require('./api/Routes/emailService');
const domainRoutes = require('./api/Routes/domain');
const paymentRouter=require('./api/Routes/payment');
const communicationRouter=require('./api/Routes/communication')
const faqRoutes=require('./api/Routes/Faq');
const planRequestRoutes=require('./api/Routes/PlanRequest')
const subscribeRoutes=require('./api/Routes/subscribe')

app.set("trust proxy", 1);

// ✅ Define allowed origins
const allowedOrigins = [
  "http://localhost:3000",
  "http://domz.com/",
  "https://domzdomain.netlify.app",
  "https://www.domzdomain.netlify.app"
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("CORS not allowed"));
  },
  credentials: true
};

app.use(cors(corsOptions));

// middlewares
app.use(morgan('dev'));
app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/plan', planRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/domain', domainRoutes);
app.use('/api/payment',paymentRouter);
app.use('/api/communication',communicationRouter);
app.use('/api/faq',faqRoutes)
app.use('/api/planrequest',planRequestRoutes)
app.use('/api/subscribe',subscribeRoutes)

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found"
  });
});

// error handler
app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status || 500).json({
    message: error.message || "Internal server error"
  });
});

module.exports = app;
