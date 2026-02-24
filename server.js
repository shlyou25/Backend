require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");

const app = require("./app");
const connectDB = require("./config/database");

const PORT = process.env.PORT || 8080;

connectDB();

/** ✅ create HTTP server */
const server = http.createServer(app);

/** ✅ attach socket.io */
const io = new Server(server, {
  cors: {
    origin: "*",
    credentials: true
  }
});

/** ✅ VERY IMPORTANT — makes io available in controllers */
app.set("io", io);

/** ✅ socket handlers */
io.on("connection", (socket) => {
  console.log("🔌 socket connected:", socket.id);

  socket.on("join_conversation", (conversationId) => {
    console.log("📩 joined room:", conversationId);
    socket.join(conversationId);
  });

  socket.on("disconnect", () => {
    console.log("❌ socket disconnected:", socket.id);
  });
});

/** ✅ start server */
server.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});