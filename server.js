require('dotenv').config()

const http = require('http')
const mongoose = require('mongoose')
const app = require('./app')
const connectDB = require('./config/database')

const port = process.env.PORT || 5000

// Start DB connection (non-blocking, retry-safe)
connectDB()

const server = http.createServer(app)

server.listen(port, () => {
  console.log(`Server running on port ${port}`)
})

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down server...')
  try {
    await mongoose.connection.close()
    console.log('MongoDB connection closed')
  } catch (err) {
    console.error('Error during DB shutdown:', err)
  } finally {
    server.close(() => process.exit(0))
  }
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
