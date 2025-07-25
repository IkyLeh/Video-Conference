const express = require("express");
const connectDB = require("./config/db");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Objek untuk menyimpan data user di setiap room
const usersInRoom = {};

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

connectDB();

app.use(cors());
app.use(express.json({ extended: false }));

app.use('/uploads', express.static('uploads')); 

app.use("/api/auth", require("./routes/auth"));
app.use('/api/users', require('./routes/user'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/upload', require('./routes/upload'));


// Logika Signaling Server
io.on("connection", (socket) => {
  console.log("User terhubung via socket:", socket.id);

  // --- MODIFIKASI: Saat seorang user bergabung ke room ---
  socket.on("join-room", ({ roomID, userName }) => {
    // Jika room belum ada, buat baru
    if (!usersInRoom[roomID]) {
      usersInRoom[roomID] = [];
    }

    // Beri tahu user yang baru bergabung tentang user lain yang sudah ada
    const otherUsers = usersInRoom[roomID];
    socket.emit("all-users", otherUsers);
    
    // Tambahkan user baru ke daftar room
    usersInRoom[roomID].push({ id: socket.id, userName });
    
    // Simpan roomID di socket untuk digunakan saat disconnect
    socket.roomID = roomID; 

    // Beri tahu user LAMA bahwa ada user BARU bergabung
    // Kirim ID dan nama dari user yang baru bergabung
    socket.to(roomID).emit("user-joined", { callerID: socket.id, userName });
  });

  // Meneruskan sinyal WebRTC dari satu user ke user lain
  socket.on("sending-signal", (payload) => {
    io.to(payload.userToSignal).emit("signal-received", {
      signal: payload.signal,
      callerID: payload.callerID,
    });
  });

  // Meneruskan sinyal balasan dari user yang baru bergabung
  socket.on("returning-signal", (payload) => {
    io.to(payload.callerID).emit("receiving-returned-signal", {
      signal: payload.signal,
      id: socket.id,
    });
  });

  // --- TAMBAHAN: Saat user terputus ---
  socket.on("disconnect", () => {
    const roomID = socket.roomID;
    if (usersInRoom[roomID]) {
      // Hapus user yang disconnect dari daftar
      usersInRoom[roomID] = usersInRoom[roomID].filter(user => user.id !== socket.id);
      // Beri tahu sisa user di room bahwa ada yang keluar
      socket.to(roomID).emit("user-left", socket.id);
    }
    console.log("User terputus:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));