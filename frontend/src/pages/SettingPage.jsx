import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Avatar, List, ListItem, ListItemText, Divider, Button, IconButton, TextField, CircularProgress } from '@mui/material';
import api from '../api/axios';

const SettingsPage = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // State untuk edit nama
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  
  // State untuk edit telepon
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  
  // State dan Ref untuk upload avatar
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error("Token tidak ditemukan");
        
        const res = await api.get('/users/me', {
          headers: { 'x-auth-token': token },
        });
        setUserData(res.data);
        setEditName(res.data.name || '');
        setEditPhone(res.data.phone || '');
      } catch (err) {
        console.error("Gagal mengambil data user", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUserProfile();
  }, []);

  const handleUpdateName = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.put('/users/me', { name: editName }, { headers: { 'x-auth-token': token } });
      setUserData(res.data);
      setIsEditingName(false);
      alert('Nama berhasil diperbarui!');
    } catch (err) {
      alert('Gagal memperbarui nama.');
    }
  };
  
 const handleUpdatePhone = async () => {
  const phonePattern = /^[0-9]{10,14}$/;
  if (!phonePattern.test(editPhone)) {
    alert("Nomor telepon tidak valid. Harus 10–15 digit");
    return;
  }
  try {
    const token = localStorage.getItem('token');
    const res = await api.put('/users/me', { phone: editPhone }, {
      headers: { 'x-auth-token': token }
    });
    setUserData(res.data);
    setIsEditingPhone(false);
    alert('Nomor telepon berhasil diperbarui!');
  } catch (err) {
    alert('Gagal memperbarui nomor telepon.');
  }
};


  const handleAvatarClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setAvatarPreview(URL.createObjectURL(file));
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const token = localStorage.getItem('token');
      const res = await api.post('/users/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-auth-token': token
        },
      });
      setUserData(res.data);
      setAvatarPreview(null);
      alert('Gambar profil berhasil diperbarui!');
    } catch (err) {
      alert("Gagal mengunggah gambar.");
      setAvatarPreview(null);
    }
  };
  
  const handleEditClick = (fieldName) => {
    alert(`Fungsi untuk mengedit "${fieldName}" akan dibuat di sini.`);
  };

  if (loading) return <CircularProgress />;
  if (!userData) return <Typography color="error">Gagal memuat data pengguna.</Typography>;

  const avatarUrl = userData.avatar ? `http://localhost:5000${userData.avatar}` : null;

  return (
    <Box sx={{ width: '100%', maxWidth: 800, bgcolor: 'rgba(0, 0, 0, 0.4)', borderRadius: 2, color: 'white', p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Profil Pribadi</Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept="image/*"/>
        <IconButton onClick={handleAvatarClick}>
          <Avatar 
            sx={{ width: 80, height: 80, mr: 2 }}
            src={avatarPreview || avatarUrl}
          >
            {!avatarUrl && !avatarPreview && (userData.name ? userData.name.charAt(0).toUpperCase() : userData.username.charAt(0).toUpperCase())}
          </Avatar>
        </IconButton>
        <Box>
          {isEditingName ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField variant="standard" value={editName} onChange={(e) => setEditName(e.target.value)} sx={{ input: { color: 'white' } }}/>
              <Button onClick={handleUpdateName}>Simpan</Button>
              <Button onClick={() => setIsEditingName(false)}>Batal</Button>
            </Box>
          ) : (
            <>
              <Typography variant="h5">{userData.name || 'Nama Belum Diatur'}</Typography>
              <Typography variant="body2" sx={{ color: 'grey.400' }}>{userData.username.toUpperCase()}</Typography>
              <Button size="small" onClick={() => { setEditName(userData.name || ''); setIsEditingName(true); }}>Edit Nama</Button>
            </>
          )}
        </Box>
      </Box>
      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }}/>
      <List>
        <ListItem>
          {isEditingPhone ? (
            <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1 }}>
              <ListItemText primary="Telepon" primaryTypographyProps={{style:{color:'white'}}} />
              <TextField variant="standard" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} sx={{ input: { color: 'white' }, flexGrow: 1, mx: 2 }}/>
              <Button onClick={handleUpdatePhone}>Simpan</Button>
              <Button onClick={() => setIsEditingPhone(false)}>Batal</Button>
            </Box>
          ) : (
            <>
              <ListItemText 
                primary="Telepon" 
                secondary={userData.phone || 'Belum diatur'} 
                primaryTypographyProps={{style:{color:'white'}}} 
                secondaryTypographyProps={{style:{color:'grey.400'}}} 
              />
              <Button onClick={() => { setEditPhone(userData.phone || ''); setIsEditingPhone(true); }}>Edit</Button>
            </>
          )}
        </ListItem>
        <ListItem><ListItemText primary="Bahasa" secondary="English" primaryTypographyProps={{style:{color:'white'}}} secondaryTypographyProps={{style:{color:'grey.400'}}} /><Button onClick={() => handleEditClick('Bahasa')}>Edit</Button></ListItem>
        <ListItem><ListItemText primary="Zona Waktu" secondary="(GMT+07:00) Jakarta" primaryTypographyProps={{style:{color:'white'}}} secondaryTypographyProps={{style:{color:'grey.400'}}} /><Button onClick={() => handleEditClick('Zona Waktu')}>Edit</Button></ListItem>
      </List>
    </Box>
  );
};

export default SettingsPage;