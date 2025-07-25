// src/pages/LobbyPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, TextField, Typography, Box } from "@mui/material";

const LobbyPage = ({ setToken }) => {
  const [roomID, setRoomID] = useState("");
  const navigate = useNavigate();

  const handleJoinRoom = () => {
    if (roomID.trim() !== "") {
      navigate(`/room/${roomID}`);
    } else {
      alert("Silakan masukkan ID Ruangan");
    }
  };

  const handleCreateRoom = () => {
    // Membuat ID unik sederhana
    const newRoomID = Date.now().toString();
    navigate(`/room/${newRoomID}`);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    navigate("/login");
  };

  return (
  <Box
    sx={{
      height: "100%",
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 2,
    }}
  >
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        maxWidth: "300px",
        width: "100%", // agar responsif
        gap: 2,
        textAlign: 'center',
      }}
    >
      <Typography variant="h4" gutterBottom sx={{ color: "white" }}>
        Selamat Datang di Halaman Lobby
      </Typography>
      <Typography variant="body1" sx={{ color: "white", mb: 2 }}>
        Buat ruangan baru atau gabung dengan ruangan yang sudah ada.
      </Typography>
      <TextField
        label="Masukkan ID Ruangan"
        variant="outlined"
        value={roomID}
        onChange={(e) => setRoomID(e.target.value)}
      />
      <Button variant="contained" onClick={handleJoinRoom}>
        Gabung Ruangan
      </Button>
      <Button variant="outlined" onClick={handleCreateRoom}>
        Buat Ruangan Baru
      </Button>
      <Button
        variant="contained"
        color="secondary"
        onClick={handleLogout}
        sx={{ mt: 2 }}
      >
        Logout
      </Button>
    </Box>
  </Box>
);

};

export default LobbyPage;
