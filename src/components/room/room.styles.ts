import styled from 'styled-components';

import { ButtonProps } from './room.types';

export const Container = styled.div``;

export const Button = styled.button`
  position: absolute;
  top: 150px;
  left: 0;
  right: 0;
  bottom: 100px;
  background-color: ${({ activated }: ButtonProps) => activated ? '#444' : '#333'};
  cursor: pointer;
  border: none;
  color: white;
`;
