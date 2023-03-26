import { Container, Button } from './room.styles';
import { RoomProps } from './room.types';

export const Room = ({
  userCounter,
  toggleAudio,
  micDisabled,
  speaking,
  connected,
}: RoomProps) => (
  <Container>
    Channel: <b>19</b>, Freq: <b>27,180 MHz</b><br />
    Users: <b>{userCounter}</b><br />
    {connected ? (
      <Button
        onMouseDown={() => toggleAudio(true)}
        onMouseUp={() => toggleAudio(false)}
        onTouchStart={() => toggleAudio(true)}
        onTouchEnd={() => toggleAudio(false)}
        disabled={micDisabled}
        activated={speaking}
      >
        {micDisabled
          ? 'Someone\'s speaking, wait...'
            : speaking
              ? 'Speaking...'
              : 'Press and hold to speak'
        }
      </Button>
    ) : (
      'Connecting...'
    )}
  </Container>
);
