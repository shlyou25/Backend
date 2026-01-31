require('dotenv').config()

const http = require('http')
const mongoose = require('mongoose')
const app = require('./app')
const connectDB = require('./config/database')

const PORT = process.env.PORT || 5000

connectDB()


const server = http.createServer(app)

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

const shutdown = async () => {
  console.log('Shutting down server...')

  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close()
      console.log('MongoDB connection closed')
    }
  } catch (err) {
    console.error('Error during DB shutdown:', err)
  } finally {
    server.close(() => {
      console.log('👋 Server closed')
      process.exit(0)
    })
  }
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
