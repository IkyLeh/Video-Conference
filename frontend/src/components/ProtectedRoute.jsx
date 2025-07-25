// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");

  if (!token) {
    // Jika tidak ada token, "usir" pengguna ke halaman login
    return <Navigate to="/login" />;
  }

  // Jika ada token, izinkan akses ke halaman yang dituju
  return children;
};

export default ProtectedRoute;
