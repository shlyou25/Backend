const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const mongoose=require('mongoose');
const app = express();

require('dotenv').config();

// routes
const authRoutes=require('./api/Routes/auth')
app.use(morgan('dev'));

// db connection
mongoose.connect(process.env.ConnectionString, {
  dbName: 'AccessAnanlyser',
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to Database'))
.catch(err => console.log(err));

mongoose.Promise = global.Promise;

// CORS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins (replace with specific domains in production)
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE'); // Specify allowed methods
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization'); // Specify allowed headers
    next();
});

// parsing the body
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json());


// setting routes
app.use('/api/auth',authRoutes);

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