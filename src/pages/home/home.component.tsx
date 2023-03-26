import { useEffect, useRef, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import useSound from 'use-sound';
import Peer from 'simple-peer';

import { RoomList } from '../../components/roomList/roomList.component';
import { Room } from '../../components/room/room.component';
import { PeerAudio } from '../../components/peerAudio/peerAudio.component';
import { TurnCredentials } from '../../interfaces/turnCredentials.interface';
import wtSfx from '../../sounds/wt.mp3';

import { Container } from './home.styles';
import { HomeProps } from './home.types';
import { getIceConfig } from './home.utils';

export const Home = ({ socket }: HomeProps) => {
  const [play] = useSound(wtSfx, { interrupt: true, volume: 1 }); // change to 0.5 later or remove completely
  // The state 'visibilityChanged' is needed to check if app went from background mode on iOS
  const [visibilityChanged, setVisibilityChanged] = useState(false);
  const [stream, setStream] = useState<MediaStream>();
  const [mySocketId, setMySocketId] = useState();
  const [peers, setPeers] = useState<{ socketId: string; peer?: Peer.Instance }[]>([]);
  const [turnCredentials, setTurnCredentials] = useState<TurnCredentials>();
  const [joined, setJoined] = useState(false);
  const [roomConnected, setRoomConnected] = useState(false);
  const [micDisabled, setMicDisabled] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const myAudio = useRef<any>();

  useEffect(() => {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        setVisibilityChanged(true);
      }
    });

    setInterval(() => {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const availableMic = devices.find((device) => device.kind === 'audioinput' && !!device.deviceId);

        if (!availableMic) {
          setVisibilityChanged(true);
        }
      });
    }, 5000);
  }, []);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((media) => {
      const mediaStream = new MediaStream();
      const audioTracks = media.getAudioTracks();
      audioTracks[0].enabled = false;
      setStream(mediaStream);
      myAudio.current.srcObject = mediaStream;

      if (audioTracks?.length) {
        mediaStream.addTrack(audioTracks[0]);
      }
    });
  }, []);

    useEffect(() => {
    if (visibilityChanged && stream) {
      setVisibilityChanged(false);

      navigator.mediaDevices.getUserMedia({ audio: true }).then((media) => {
        const oldTrack = stream.getAudioTracks()[0];
        const newTrack = media.getAudioTracks()[0];
        oldTrack.enabled = false;
        newTrack.enabled = false;
        stream.removeTrack(oldTrack);
        stream.addTrack(newTrack);
  
        peers.forEach(({ peer }) => {
          peer?.replaceTrack(oldTrack, newTrack, stream);
        });
      });
    }
  }, [visibilityChanged, peers, stream]);

  useEffect(() => {
    socket.on('initInfo', ({ turnId, turnPwd, mySocketId }) => {
      setTurnCredentials({ id: turnId, pwd: turnPwd });
      setMySocketId(mySocketId);
    });
  }, [socket]);

  useEffect(() => {
    if (!joined) return;

    socket.on('userJoined', (socketId) => {
      setPeers((prev) => [
        ...prev.filter((peer) => peer.socketId !== socketId),
        { socketId },
      ]);
      socket.emit('welcomeUser', { from: mySocketId, to: socketId });
    });

    socket.on('userDisconnected', (removedSocketId) => {
      const peerInstance = peers.find(({ socketId }) => socketId === removedSocketId);
      peerInstance?.peer?.destroy();
      setPeers((prev) => prev.filter((peer) => peer.socketId !== removedSocketId));
    });

    socket.on('welcomeUser', (socketId) => {
      const peer = new Peer({
        initiator: true,
        trickle: false,
        config: getIceConfig(turnCredentials),
        stream,
      });
  
      peer.on('signal', (signal) => {
        socket.emit('callUser', { to: socketId, from: mySocketId, signal });
      });

      setPeers((prev) => [
        ...prev.filter((peer) => peer.socketId !== socketId),
        { socketId, peer },
      ]);
    });
  
    socket.on('incomingCall', ({ from, signal }) => {
      const peer = new Peer({
        trickle: false,
        config: getIceConfig(turnCredentials),
        stream,
      });
  
      peer.on('signal', (signal) => {
        socket.emit('answerCall', { from: mySocketId, to: from, signal });
        setRoomConnected(true);
      });
  
      peer.signal(signal);

      setPeers((prev) => [
        ...prev.filter(({ socketId }) => socketId !== from),
        { socketId: from, peer },
      ]);
    });

    socket.on('callAccepted', ({ from, signal }) => {
      const peerInstance = peers.find((peer) => peer.socketId === from);
      peerInstance?.peer?.signal(signal);
      setRoomConnected(true);
    });

    socket.on('disableMic', () => {
      setMicDisabled(true);
    });

    socket.on('enableMic', () => {
      setMicDisabled(false);
    });

    return () => {
      socket.off();
    };
  }, [mySocketId, peers, stream, turnCredentials, joined, socket]);

  useEffect(() => {
    if (joined) {
      play();
    }
  }, [micDisabled, joined, play]);

  const joinChat = () => {
    setJoined(true);
    socket.emit('joinRoom');
  };

  const toggleAudio = (toggleOn: boolean) => {
    const audioTracks = stream?.getAudioTracks();

    if (audioTracks?.length) {
      audioTracks[0].enabled = toggleOn;
      socket.emit(toggleOn ? 'startSpeaking' : 'stopSpeaking');
      setSpeaking(toggleOn);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>WalkieTalkie</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">WalkieTalkie</IonTitle>
          </IonToolbar>
        </IonHeader>
        <Container>
          <audio ref={myAudio} playsInline muted autoPlay />
          {peers.map(({ socketId, peer }) => (
            <PeerAudio key={socketId} peer={peer} muted={!joined} />
          ))}
          {joined ? (
            <Room
              userCounter={peers.length + 1}
              speaking={speaking}
              micDisabled={micDisabled}
              toggleAudio={toggleAudio}
              connected={roomConnected}
            />
          ) : (
            <RoomList joinChat={joinChat} />
          )}
        </Container>
      </IonContent>
    </IonPage>
  );
};
