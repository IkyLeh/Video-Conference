import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import Peer from "simple-peer";
import styled from "styled-components";
import { Typography, Button, Box, Avatar } from "@mui/material";
import api from "../api/axios";

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
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 10px;
  width: 100%;
  height: 100%;
  padding: 10px;
  box-sizing: border-box;
  overflow-y: auto;
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
  background-color: rgba(17, 17, 17, 0.7);
`;

// --- PEER VIDEO COMPONENT ---
const PeerVideo = ({
  peer,
  stream,
  name,
  isLocal = false,
  videoEnabled = true,
  avatarUrl = null,
}) => {
  const ref = useRef();

  useEffect(() => {
    if (isLocal && stream && ref.current) {
      ref.current.srcObject = stream;
    }
    if (peer) {
      peer.on("stream", (incomingStream) => {
        if (ref.current) {
          ref.current.srcObject = incomingStream;
        }
      });
    }
  }, [peer, stream, isLocal]);

  return (
    <VideoContainer>
      {videoEnabled ? (
        <Video autoPlay playsInline muted={isLocal} ref={ref} />
      ) : (
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
            borderRadius: "50%",
            objectFit: "cover",
          }}
        >
          {!avatarUrl && name?.charAt(0).toUpperCase()}
        </Avatar>
      )}
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
  const [userName, setUserName] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [userData, setUserData] = useState(null);

  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const socketRef = useRef();
  const userVideoRef = useRef();
  const peersRef = useRef([]);
  const localStreamRef = useRef();

  useEffect(() => {
    // 🧼 Clean up peers
    peersRef.current.forEach((p) => p.peer.destroy());
    peersRef.current = [];
    setPeers([]);
    const setupRoom = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Token tidak ditemukan");

        const userRes = await api.get("/users/me", {
          headers: { "x-auth-token": token },
        });
        setUserData(userRes.data);
        const currentUserName = userRes.data.name || userRes.data.username;
        setUserName(currentUserName);

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });

        localStreamRef.current = stream;
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream;
        }

        setupRecording(stream);

        socketRef.current = io(import.meta.env.VITE_SOCKET_URL, {
          transports: ["websocket"],
          withCredentials: true,
        });
        socketRef.current.on("connect", () => {
          socketRef.current.emit("join-room", {
            roomID,
            userName: currentUserName,
          });
        });

        socketRef.current.on("all-users", (users) => {
          console.log("🔹 Daftar user di room saat join:", users);

          users.forEach(({ id: userToSignal, userName: remoteName }) => {
            const isDuplicate =
              userToSignal === socketRef.current.id ||
              remoteName === userName ||
              peersRef.current.some((p) => p.peerID === userToSignal);

            if (isDuplicate) {
              console.log("⚠️ Duplikat peer (abaikan):", remoteName);
              return;
            }

            const peer = new Peer({
              initiator: true,
              trickle: false,
              stream: localStreamRef.current,
            });

            peer.on("signal", (signal) => {
              socketRef.current.emit("sending-signal", {
                userToSignal,
                callerID: socketRef.current.id,
                signal,
                userName,
              });
            });

            const newPeer = {
              peerID: userToSignal,
              peer,
              userName: remoteName,
            };

            peersRef.current.push(newPeer);
            setPeers((prev) => [...prev, newPeer]);

            console.log("📤 Mengirim signal ke:", userToSignal);
          });
        });

        socketRef.current.on("user-joined", (payload) => {
          if (!stream) return;

          const alreadyExists = peersRef.current.some(
            (p) =>
              p.peerID === payload.callerID || p.userName === payload.userName
          );

          if (alreadyExists || payload.callerID === socketRef.current.id) {
            console.log("⛔ Duplikat user, abaikan:", payload);
            return;
          }

          // 🔧 Buat peer initiator (karena kita user lama)
          const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
          });

          peer.on("signal", (signal) => {
            console.log("📤 Kirim offer ke:", payload.callerID);
            socketRef.current.emit("sending-signal", {
              userToSignal: payload.callerID,
              signal,
              userName,
            });
          });

          const newPeer = {
            peerID: payload.callerID,
            peer,
            userName: payload.userName,
          };

          peersRef.current.push(newPeer);
          setPeers((prev) => [...prev, newPeer]);

          console.log("✅ Peer initiator dibuat untuk:", payload.callerID);
        });

        socketRef.current.on("receiving-returned-signal", (payload) => {
          const item = peersRef.current.find(
            (p) => p.peerID === payload.id || p.userName === payload.userName
          );
          if (!item) return;

          // 🔒 Cegah setRemoteDescription dua kali
          try {
            item.peer.signal(payload.signal);
            console.log("📶 Signal balasan diterima dari:", payload.id);
          } catch (err) {
            console.warn("⚠️ Gagal set remote signal:", err.message);
          }
        });

        socketRef.current.on("user-left", (id) => {
          const peerObj = peersRef.current.find((p) => p.peerID === id);
          if (peerObj) peerObj.peer.destroy();
          const newPeers = peersRef.current.filter((p) => p.peerID !== id);
          peersRef.current = newPeers;
          setPeers(newPeers);
        });

        socketRef.current.on(
          "signal-received",
          ({ signal, callerID, userName }) => {
            if (!stream) return;

            // 🔒 Cegah jika peer sudah dibuat
            const alreadyExists = peersRef.current.some(
              (p) => p.peerID === callerID
            );
            if (alreadyExists) {
              console.log("⚠️ Peer sudah ada untuk:", callerID);
              return;
            }

            const peer = new Peer({
              initiator: false,
              trickle: false,
              stream,
            });

            peer.signal(signal); // ✅ Terima offer

            peer.on("signal", (returnSignal) => {
              socketRef.current.emit("returning-signal", {
                signal: returnSignal, // ⬅️ SDP answer
                callerID,
              });
            });

            const newPeer = {
              peerID: callerID,
              peer,
              userName,
            };

            peersRef.current.push(newPeer);
            setPeers((prev) => [...prev, newPeer]);

            console.log("✅ Peer responder dibuat untuk:", callerID);
          }
        );
      } catch (err) {
        console.error("Setup ruangan gagal:", err);
      }
    };

    setupRoom();

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
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
    navigate("/");
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/room/${roomID}`;
    navigator.clipboard
      .writeText(link)
      .then(() => alert("Link meeting berhasil disalin ke clipboard!"))
      .catch(() => alert("Gagal menyalin link."));
  };

  const setupRecording = (stream) => {
    mediaRecorderRef.current = new MediaRecorder(stream, {
      mimeType: "video/webm",
    });
    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };
    mediaRecorderRef.current.onstop = async () => {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      const formData = new FormData();
      formData.append("video", blob, `recording-${Date.now()}.webm`);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/upload`, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.filename || `recording-${Date.now()}.webm`;
        a.click();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Upload gagal:", err);
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
    setIsRecording((prev) => !prev);
  };

  const isPeerExist = (peerID, name) => {
    return peersRef.current.some(
      (p) => p.peerID === peerID || p.userName === name
    );
  };

  const addPeer = (incomingSignal, callerID, stream, userName) => {
    if (isPeerExist(callerID, userName)) {
      console.warn("⛔ Peer sudah ada, abaikan addPeer:", callerID, userName);
      return null;
    }

    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
    });

    peer.on("signal", (signal) => {
      console.log("📡 SIGNAL dikirim (responder):", signal);
      socketRef.current.emit("returning-signal", { signal, callerID });
    });

    peer.on("connect", () => {
      console.log("✅ PEER TERHUBUNG (responder):", callerID);
    });

    if (incomingSignal) {
      try {
        peer.signal(incomingSignal);
      } catch (err) {
        console.error("❌ Gagal memproses incoming signal:", err);
      }
    }

    return peer;
  };

  const createPeer = (userToSignal, callerID, stream, userName) => {
    if (!stream) {
      console.warn("⚠️ Stream tidak tersedia saat createPeer!");
      return null;
    }

    if (isPeerExist(userToSignal, userName)) {
      console.warn(
        "⛔ Peer sudah ada, abaikan createPeer:",
        userToSignal,
        userName
      );
      return null;
    }

    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on("signal", (signal) => {
      socketRef.current.emit("sending-signal", {
        userToSignal,
        callerID,
        signal,
        userName,
      });
    });

    peer.on("connect", () => {
      console.log("✅ PEER TERHUBUNG (initiator):", userToSignal);
    });

    return peer;
  };

  const avatarUrl = userData?.avatar
    ? `${import.meta.env.VITE_API_URL}${userData.avatar}`
    : null;

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
              style={{ display: videoEnabled ? "block" : "none" }}
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
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              >
                {!avatarUrl &&
                  (userName ? userName.charAt(0).toUpperCase() : "U")}
              </Avatar>
            )}
            <UserInfo>{userName} (You)</UserInfo>
          </VideoContainer>
          {[
            ...new Map(
              peers.map((p) => [`${p.peerID}-${p.userName}`, p])
            ).values(),
          ].map(({ peerID, peer, userName }) => (
            <PeerVideo
              key={`${peerID}-${userName}`} // pastikan key benar-benar unik
              peer={peer}
              name={userName}
            />
          ))}
        </VideoGrid>
      </Content>
      <ControlBar>
        <Button
          onClick={toggleCamera}
          variant="contained"
          color={videoEnabled ? "secondary" : "primary"}
        >
          {videoEnabled ? "Matikan Kamera" : "Nyalakan Kamera"}
        </Button>
        <Button
          onClick={toggleMicrophone}
          variant="contained"
          color={audioEnabled ? "secondary" : "primary"}
        >
          {audioEnabled ? "Mute Mikrofon" : "Unmute Mikrofon"}
        </Button>
        <Button
          onClick={toggleRecording}
          variant="contained"
          color={isRecording ? "error" : "success"}
        >
          {isRecording ? "Stop Record" : "Mulai Merekam"}
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
