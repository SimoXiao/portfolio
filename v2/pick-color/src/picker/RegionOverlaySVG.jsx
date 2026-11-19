import React from 'react';
import styled from 'styled-components';

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  container-type: size;
`;

const Lines = styled.svg`
  width: 100%;
  height: 100%;
  display: block;
`;

const Label = styled.span`
  position: absolute;
  transform: translate(-50%, -50%);
  color: ${(p) => p.$color};
  font-family: var(--font-mono);
  font-size: ${(p) =>
    p.$kind === 'center'
      ? 'clamp(10px, min(10.5cqw, 10.5cqh), 26px)'
      : 'clamp(12px, min(14cqw, 14cqh), 28px)'};
  font-weight: 900;
  line-height: 1;
  white-space: nowrap;
  opacity: ${(p) => p.$opacity || 1};
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
`;

export default function RegionOverlaySVG() {
  return (
    <Overlay>
      <Lines viewBox="0 0 100 100" preserveAspectRatio="none">
        <rect x="0" y="0" width="100" height="100" fill="rgba(0, 0, 0, 0.2)" />
        <line x1="0" y1="20" x2="100" y2="20" stroke="rgba(94,234,212,0.9)" strokeWidth="0.42" />
        <line x1="0" y1="80" x2="100" y2="80" stroke="rgba(94,234,212,0.9)" strokeWidth="0.42" />
        <line x1="20" y1="0" x2="20" y2="100" stroke="rgba(129,140,248,0.95)" strokeWidth="0.42" />
        <line x1="80" y1="0" x2="80" y2="100" stroke="rgba(129,140,248,0.95)" strokeWidth="0.42" />
      </Lines>
      <Label $color="#5eead4" style={{ left: '50%', top: '11%' }}>T</Label>
      <Label $color="#5eead4" style={{ left: '50%', top: '89%' }}>B</Label>
      <Label $color="#9b8cff" style={{ left: '12%', top: '52%' }}>L</Label>
      <Label $color="#9b8cff" style={{ left: '88%', top: '52%' }}>R</Label>
      <Label $color="#d8fff8" $opacity="0.9" $kind="center" style={{ left: '50%', top: '52%' }}>D</Label>
    </Overlay>
  );
}
