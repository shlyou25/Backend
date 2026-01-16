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

// middlewares
app.use(morgan('dev'));
app.use(cookieParser());

app.use(cors({
  origin: process.env.NODE_ENV === "production"
    ? "https://domzdomain.netlify.app"
    : "http://localhost:3000",
  credentials: true
}));

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
