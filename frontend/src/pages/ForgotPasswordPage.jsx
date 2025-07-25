import React, { useState } from 'react';
import { Button, TextField, Typography, Container, Box } from '@mui/material';
import api from '../api/axios';

const ForgotPasswordPage = () => {
  const [username, setUsername] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/forgot-password', { username });
      alert(res.data.msg);
    } catch (err) {
      alert('Error: ' + (err.response?.data?.msg || 'Gagal mengirim email'));
    }
  };

  return (
  <Container component="main" maxWidth="xs">
  <Box 
    sx={{ 
      marginTop: 8, 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      // Tambahkan ini agar kontras dengan teks putih
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      padding: '2rem',
      borderRadius: '1rem'
    }}
  >
    {/* Tambahkan sx prop untuk warna putih */}
    <Typography component="h1" variant="h5" sx={{ color: 'white' }}>
      Lupa Kata Sandi
    </Typography>
    
    {/* Tambahkan 'color' ke dalam sx prop yang sudah ada */}
    <Typography variant="body2" sx={{ mt: 1, mb: 2, color: 'white', textAlign: 'center' }}>
      Masukkan email Anda untuk menerima link reset password.
    </Typography>
    
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
      <TextField 
        margin="normal" 
        required 
        fullWidth 
        id="email" 
        label="Alamat Email" 
        name="email" 
        autoComplete="email" 
        autoFocus 
        value={username} 
        onChange={(e) => setUsername(e.target.value)}
        // Prop untuk mengubah warna label dan input
        InputLabelProps={{ style: { color: 'grey' } }}
        sx={{ 
          input: { color: 'white' },
          '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: 'grey.500' },
            '&:hover fieldset': { borderColor: 'white' },
            '&.Mui-focused fieldset': { borderColor: 'primary.main' },
          },
        }}
      />
      <Button 
        type="submit" 
        fullWidth 
        variant="contained" 
        sx={{ mt: 3, mb: 2 }}
      >
        Kirim Email
      </Button>
    </Box>
  </Box>
</Container>
  );
};

export default ForgotPasswordPage;