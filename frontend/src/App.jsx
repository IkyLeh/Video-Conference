import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import LobbyPage from "./pages/LobbyPage.jsx";
import RoomPage from "./pages/RoomPage.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Header from "./components/Header.jsx";
import Box from "@mui/material/Box";
import SettingPage from './pages/SettingPage.jsx';
import api from './api/axios.js'; // 1. Impor 'api'
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';

function AppLayout() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [currentUser, setCurrentUser] = useState(null); // 2. State baru untuk data user
  const location = useLocation();
  const isRoomPage = location.pathname.startsWith("/room");

  // 3. useEffect ini sekarang juga mengambil data user
  useEffect(() => {
    const fetchAndSetUser = async () => {
      const currentToken = localStorage.getItem("token");
      setToken(currentToken);
      if (currentToken) {
        try {
          const res = await api.get('/users/me', { headers: { 'x-auth-token': currentToken } });
          setCurrentUser(res.data);
        } catch (err) {
          console.error("Gagal mengambil data user:", err);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
    };

    fetchAndSetUser(); // Panggil saat komponen dimuat
    
    // Listener untuk perubahan di tab lain (opsional tapi bagus)
    window.addEventListener("storage", fetchAndSetUser);
    return () => {
      window.removeEventListener("storage", fetchAndSetUser);
    };
  }, [token]); // Jalankan ulang jika token berubah (saat login/logout)

  return (
    <Box sx={{
      backgroundImage: isRoomPage ? 'none' : `url('/background.jpg')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      display: "flex",
      flexDirection: "column",
      minHeight: "100vh"
    }}>
      {/* 4. Kirim 'currentUser' sebagai prop ke Header */}
      {!isRoomPage && <Header token={token} setToken={setToken} currentUser={currentUser} />}
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: isRoomPage ? 0 : 3,
          display: "flex",
          flexDirection: "column",
          alignItems: isRoomPage ? "stretch" : "center",
          justifyContent: isRoomPage ? "flex-start" : "center",
        }}
      >
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <LobbyPage setToken={setToken} />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<LoginPage setToken={setToken} />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/room/:roomID"
            element={
              <ProtectedRoute>
                <RoomPage />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <SettingPage />
              </ProtectedRoute>
            } 
          />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        </Routes>
      </Box>
    </Box>
  );
}

export default function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}