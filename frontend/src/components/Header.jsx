import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Button, Box, IconButton, Avatar, Menu, MenuItem } from '@mui/material';

// 1. Header sekarang menerima prop baru: currentUser
const Header = ({ token, setToken, currentUser }) => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    localStorage.removeItem('token');
    setToken(null);
    navigate('/login');
  };

  // 2. Membuat URL lengkap untuk avatar dari data currentUser
  const avatarUrl = currentUser?.avatar ? `http://localhost:5000${currentUser.avatar}` : null;
  
  // Menentukan inisial sebagai fallback jika tidak ada gambar
  const userInitial = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : (currentUser?.username ? currentUser.username.charAt(0).toUpperCase() : 'U');

  return (
    <AppBar position="static" color="transparent" elevation={0}>
      <Toolbar>
        <Box sx={{ flexGrow: 1 }} />
        {token && currentUser ? (
          <div>
            <IconButton onClick={handleMenu} size="small">
              {/* 3. Gunakan avatarUrl di 'src' dan inisial sebagai fallback */}
              <Avatar sx={{ width: 32, height: 32 }} src={avatarUrl}>
                {!avatarUrl && userInitial}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={open}
              onClose={handleClose}
            >
              <MenuItem component={Link} to="/settings" onClick={handleClose}>Pengaturan</MenuItem>
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
          </div>
        ) : (
          <>
            <Button color="inherit" component={Link} to="/login" sx={{ color: 'white' }}>Login</Button>
            <Button color="inherit" component={Link} to="/register" sx={{ color: 'white' }}>Register</Button>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header;