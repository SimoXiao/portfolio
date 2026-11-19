import React from 'react';
import styled, { css } from 'styled-components';

const Box = styled.div`
  position: fixed;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  background: hsl(var(--bg-elev-2));
  border: 1px solid hsla(var(--border-strong));
  color: hsl(var(--text));
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 13.5px;
  font-family: var(--font-mono);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease, transform 0.2s ease;
  box-shadow: var(--shadow-md);
  z-index: 9999;
  ${(p) =>
    p.$visible &&
    css`
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    `}
`;

export default function Toast({ message, visible }) {
  return <Box $visible={visible}>{message}</Box>;
}
