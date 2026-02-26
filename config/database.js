const mongoose = require('mongoose')

let isConnected = false
const connectDB = async () => {
  try {
    if (isConnected) return
    console.log(process.env.ConnectionString);
    
    await mongoose.connect(process.env.ConnectionString, {
      dbName: 'AccessAnanlyser',
      autoIndex: false,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })
    isConnected = true
    console.log('MongoDB connected')
    await require('../api/utils/createAdmin').createAdmin()

  } catch (error) {
    console.error('MongoDB connection failed:', error.message)
    console.log('Retrying MongoDB connection in 5 seconds...')
    setTimeout(connectDB, 5000)
  }
}

mongoose.connection.on('error', (err) => {
  console.error('MongoDB runtime error:', err.message)
})

mongoose.connection.on('disconnected', () => {
  isConnected = false
  console.warn('MongoDB disconnected')
  console.log('Attempting reconnection...')
  setTimeout(connectDB, 5000)
})

module.exports = connectDB
