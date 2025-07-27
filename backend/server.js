const express = require("express");
const connectDB = require("./config/db");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

// --- DATA USER DALAM ROOM ---
const usersInRoom = {};

// --- KONFIGURASI SOCKET.IO ---
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Sesuaikan dengan frontend kamu
    methods: ["GET", "POST"],
  },
});

// --- KONEKSI DATABASE ---
connectDB();

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json({ extended: false }));

// --- STATIC FILES ---
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- ROUTES ---
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/user"));
app.use("/api/upload", require("./routes/upload"));

// --- SOCKET.IO LOGIC ---
io.on("connection", (socket) => {
  console.log("🔌 Socket terhubung:", socket.id);

  // JOIN ROOM
  socket.on("join-room", ({ roomID, userName }) => {
    socket.join(roomID);

    if (!usersInRoom[roomID]) {
      usersInRoom[roomID] = [];
    }

    // Tolak jika userName sudah digunakan di room
    const nameExists = usersInRoom[roomID].some(
      (user) => user.userName === userName
    );
    if (nameExists) {
      console.log(`⛔ userName '${userName}' sudah ada di room ${roomID}`);
      socket.emit("name-already-exists");
      return;
    }

    // Simpan user baru
    const newUser = { id: socket.id, userName };
    usersInRoom[roomID].push(newUser);
    socket.roomID = roomID;
    socket.userName = userName;

    // Kirim daftar user yang sudah ada ke user baru
    const otherUsers = usersInRoom[roomID].filter(
      (user) => user.id !== socket.id
    );
    socket.emit("all-users", otherUsers);

    // Beri tahu user lama tentang user baru
    otherUsers.forEach((user) => {
      io.to(user.id).emit("user-joined", {
        callerID: socket.id,
        userName,
        signal: null, // biarkan client initiator kirim sinyal
      });
    });

    console.log(
      `🧍 ${userName} (${socket.id}) masuk ke room ${roomID}. Total: ${usersInRoom[roomID].length}`
    );
  });

  // SENDING SIGNAL (WebRTC initiator)
  socket.on(
    "sending-signal",
    ({ userToSignal, callerID, signal, userName }) => {
      io.to(userToSignal).emit("signal-received", {
        signal,
        callerID,
        userName,
      });
    }
  );

  // RETURNING SIGNAL (WebRTC responder)
  socket.on("returning-signal", ({ signal, callerID }) => {
    io.to(callerID).emit("receiving-returned-signal", {
      signal,
      id: socket.id,
    });
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    const roomID = socket.roomID;
    if (roomID && usersInRoom[roomID]) {
      usersInRoom[roomID] = usersInRoom[roomID].filter(
        (user) => user.id !== socket.id
      );

      socket.to(roomID).emit("user-left", socket.id);

      console.log(
        `❌ Socket ${socket.id} keluar dari room ${roomID}. Sisa: ${usersInRoom[roomID].length}`
      );

      // Hapus room jika kosong
      if (usersInRoom[roomID].length === 0) {
        delete usersInRoom[roomID];
        console.log(`🧹 Room ${roomID} dihapus karena kosong`);
      }
    } else {
      console.log(`❌ Socket ${socket.id} disconnect tanpa room`);
    }
  });
});

// --- SERVER START ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`)
);
