const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require("cors");
const cookieParser = require("cookie-parser");
const app = express();

require('dotenv').config();

// routes
const authRoutes = require('./api/Routes/auth');
const userRoutes = require('./api/Routes/users');
const planRoutes = require('./api/Routes/plan');
const emailRoutes = require('./api/Routes/emailService');



app.use(morgan('dev'));
app.use(cookieParser());

// db connection
mongoose.connect(process.env.ConnectionString, {
    dbName: 'AccessAnanlyser',
})
    .then(() => console.log('Connected to Database'))
    .catch(err => console.log(err));
mongoose.Promise = global.Promise;

app.use(cors({
    //   origin: "https://domzdomain.netlify.app",  // your frontend URL
      origin:"http://localhost:3000",

    credentials: true,                 // allow cookies
}));

// parsing the body
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json());


// setting routes
app.use('/api/auth',authRoutes);
app.use('/api/user',userRoutes);
app.use('/api/plan',planRoutes);
app.use('/api/email',emailRoutes)

//Error Hadling

// if no paths matched
app.use((req, res, next) => {
    const error = new Error('No matching paths')
    error.status = 404;
    next(error);
})

// if methods not matched

app.use((error, req, res, next) => {
    res.status(error.status || 500)[
        res.json({
            error: {
                message: error.message,
            }
        })
    ]
})

module.exports = app;