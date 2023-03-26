export interface RoomProps {
  userCounter: number;
  toggleAudio: (toggleOn: boolean) => void;
  micDisabled: boolean;
  speaking: boolean;
  connected: boolean;
}

export interface ButtonProps {
  activated: boolean;
}
