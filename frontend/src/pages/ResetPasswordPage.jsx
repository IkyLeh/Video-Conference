import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, TextField, Typography, Container, Box } from '@mui/material';
import api from '../api/axios';

const ResetPasswordPage = () => {
  const { token } = useParams(); // Ambil token dari URL
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return alert('Password tidak cocok.');
    }
    try {
      const res = await api.post(`/auth/reset-password/${token}`, { password });
      alert(res.data.msg);
      navigate('/login');
    } catch (err) {
      alert('Error: ' + (err.response?.data?.msg || 'Gagal mereset password'));
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5">Buat Password Baru</Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          <TextField margin="normal" required fullWidth name="password" label="Password Baru" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <TextField margin="normal" required fullWidth name="confirmPassword" label="Konfirmasi Password Baru" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>Reset Password</Button>
        </Box>
      </Box>
    </Container>
  );
};

export default ResetPasswordPage;