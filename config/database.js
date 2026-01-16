const mongoose = require('mongoose')

const connectDB = async () => {
  try {
    mongoose.connection.on('connected', () => {
      console.log('MongoDB connected')
    })

    mongoose.connection.on('error', err => {
      console.error('MongoDB connection error:', err)
    })

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected')
    })

    await mongoose.connect(process.env.ConnectionString, {
      dbName: 'AccessAnanlyser',
      autoIndex: false,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    })

    // Run post-connection tasks
    await require('../api/utils/createAdmin').createAdmin()

  } catch (error) {
    console.error('Initial MongoDB connection failed:', error.message)

    // Retry instead of crashing
    setTimeout(connectDB, 5000)
  }
}

module.exports = connectDB
