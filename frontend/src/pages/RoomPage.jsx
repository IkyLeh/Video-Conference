import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import styled from 'styled-components';
import { Typography, Button, Box, Avatar } from '@mui/material';
import api from '../api/axios';

// --- STYLING COMPONENTS ---
const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background-color: #1c1c1c;
  color: white;
  overflow: hidden;
`;
const Content = styled.div`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
  position: relative;
`;
const VideoGrid = styled.div`
  flex: 1;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
`;
const VideoContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 0;
  overflow: hidden;
  background-color: black;
`;
const Video = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;
const UserInfo = styled.div`
  position: absolute;
  bottom: 80px;
  left: 20px;
  font-size: 18px;
  color: white;
  background-color: rgba(0, 0, 0, 0.4);
  padding: 4px 10px;
  border-radius: 6px;
`;
const ControlBar = styled(Box)`
  position: absolute;
  bottom: 0;
  width: 100%;
  padding: 1rem;
  display: flex;
  justify-content: center;
  gap: 1rem;
  background-color: rgba(17,17,17,0.7);
`;

// --- PEER VIDEO COMPONENT ---
const PeerVideo = ({ peer, name }) => {
  const ref = useRef();
  useEffect(() => {
    peer.on("stream", (stream) => {
      if (ref.current) {
        ref.current.srcObject = stream;
      }
    });
  }, [peer]);
  return (
    <VideoContainer>
      <Video autoPlay playsInline ref={ref} />
      <UserInfo>{name}</UserInfo>
    </VideoContainer>
  );
};

const RoomPage = () => {
  const { roomID } = useParams();
  const navigate = useNavigate(); 
  const [peers, setPeers] = useState([]);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [userName, setUserName] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [userData, setUserData] = useState(null);

  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const socketRef = useRef();
  const userVideoRef = useRef();
  const peersRef = useRef([]);
  const localStreamRef = useRef();

  useEffect(() => {
    const setupRoom = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error("Token tidak ditemukan");

        const userRes = await api.get('/users/me', { headers: { 'x-auth-token': token } });
        setUserData(userRes.data);
        const currentUserName = userRes.data.name || userRes.data.username;
        setUserName(currentUserName);

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true
        });

        localStreamRef.current = stream;
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream;
        }

        setupRecording(stream);

        socketRef.current = io.connect("http://localhost:5000");
        socketRef.current.on("connect", () => {
          socketRef.current.emit("join-room", { roomID, userName: currentUserName });
        });

        socketRef.current.on("all-users", (users) => {
          const newPeers = [];
          users.forEach(user => {
            if (!user?.id || !user?.userName || !socketRef.current?.id || !stream) return;
            const peer = createPeer(user.id, socketRef.current.id, stream, currentUserName);
            peersRef.current.push({ peerID: user.id, peer, userName: user.userName });
            newPeers.push({ peerID: user.id, peer, userName: user.userName });
          });
          setPeers(newPeers);
        });

        socketRef.current.on("user-joined", (payload) => {
          if (!stream) return;
          const peer = addPeer(payload.signal, payload.callerID, stream);
          peersRef.current.push({ peerID: payload.callerID, peer, userName: payload.userName });
          setPeers(users => [...users, { peerID: payload.callerID, peer, userName: payload.userName }]);
        });

        socketRef.current.on("receiving-returned-signal", (payload) => {
          const item = peersRef.current.find((p) => p.peerID === payload.id);
          if (item) item.peer.signal(payload.signal);
        });

        socketRef.current.on("user-left", (id) => {
          const peerObj = peersRef.current.find(p => p.peerID === id);
          if (peerObj) peerObj.peer.destroy();
          const newPeers = peersRef.current.filter(p => p.peerID !== id);
          peersRef.current = newPeers;
          setPeers(newPeers);
        });

      } catch (err) {
        console.error("Setup ruangan gagal:", err);
      }
    };

    setupRoom();

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [roomID]);

  const toggleCamera = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()?.[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setVideoEnabled(videoTrack.enabled);
    }
  };

  const toggleMicrophone = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()?.[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setAudioEnabled(audioTrack.enabled);
    }
  };

  const handleLeaveRoom = () => {
    navigate('/');
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/room/${roomID}`;
    navigator.clipboard.writeText(link)
      .then(() => alert("Link meeting berhasil disalin ke clipboard!"))
      .catch(() => alert("Gagal menyalin link."));
  };

  const setupRecording = (stream) => {
    mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm' });
    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };
    mediaRecorderRef.current.onstop = async () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const formData = new FormData();
      formData.append('video', blob, `recording-${Date.now()}.webm`);
      try {
        const res = await fetch('http://localhost:5000/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename || `recording-${Date.now()}.webm`;
        a.click();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Upload gagal:', err);
      }
      recordedChunksRef.current = [];
    };
  };

  const toggleRecording = () => {
    if (!isRecording) {
      recordedChunksRef.current = [];
      mediaRecorderRef.current.start();
    } else {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(prev => !prev);
  };

  const createPeer = (userToSignal, callerID, stream, userName) => {
    const peer = new Peer({ initiator: true, trickle: false, stream });
    peer.on("signal", (signal) => {
      socketRef.current?.emit("sending-signal", { userToSignal, callerID, signal, userName });
    });
    return peer;
  };

  const addPeer = (incomingSignal, callerID, stream) => {
    const peer = new Peer({ initiator: false, trickle: false, stream });
    peer.on("signal", (signal) => {
      socketRef.current?.emit("returning-signal", { signal, callerID });
    });
    peer.signal(incomingSignal);
    return peer;
  };

  const avatarUrl = userData?.avatar ? `http://localhost:5000${userData.avatar}` : null;

  return (
    <Wrapper>
      <Content>
        <VideoGrid>
          <VideoContainer>
            <Video
              ref={userVideoRef}
              autoPlay
              playsInline
              muted
              style={{ display: videoEnabled ? 'block' : 'none' }}
            />
            {!videoEnabled && (
              <Avatar
                src={avatarUrl}
                alt="Foto Profil"
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "150px",
                  height: "150px",
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              >
                {!avatarUrl && (userName ? userName.charAt(0).toUpperCase() : 'U')}
              </Avatar>
            )}
            <UserInfo>{userName} (You)</UserInfo>
          </VideoContainer>
          {peers.map(({ peerID, peer, userName }) => (
            <PeerVideo key={peerID} peer={peer} name={userName} />
          ))}
        </VideoGrid>
      </Content>
      <ControlBar>
        <Button onClick={toggleCamera} variant="contained" color={videoEnabled ? "secondary" : "primary"}>
          {videoEnabled ? "Matikan Kamera" : "Nyalakan Kamera"}
        </Button>
        <Button onClick={toggleMicrophone} variant="contained" color={audioEnabled ? "secondary" : "primary"}>
          {audioEnabled ? "Mute Mikrofon" : "Unmute Mikrofon"}
        </Button>
        <Button onClick={toggleRecording} variant="contained" color={isRecording ? 'error' : 'success'}>
          {isRecording ? 'Stop Record' : 'Mulai Merekam'}
        </Button>
        <Button onClick={handleCopyLink} variant="contained" color="info">
          Salin Link Undangan
        </Button>
        <Button onClick={handleLeaveRoom} variant="contained" color="error">
          Keluar
        </Button>
      </ControlBar>
    </Wrapper>
  );
};

export default RoomPage;
