import React from 'react';
import styled from 'styled-components';
import { formatSwatchTooltip } from './swatch-tooltip';

const Box = styled.div`
  flex: 1 1 0;
  min-width: 0;
  aspect-ratio: 1.5 / 1;
  border-radius: ${(p) => (p.$compact ? '12px' : '16px')};
  padding: ${(p) => (p.$compact ? '10px' : '16px')};
  cursor: pointer;
  position: relative;
  overflow: hidden;
  border: 1px solid hsl(var(--border));
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s;
  &:hover {
    transform: translateY(-3px);
    box-shadow: ${(p) => (p.$compact ? '0 8px 18px rgba(0, 0, 0, 0.24)' : 'var(--shadow-lg)')};
  }
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 50%, rgba(0, 0, 0, 0.3));
    pointer-events: none;
  }
  > * {
    position: relative;
    z-index: 1;
  }
`;

const Empty = styled(Box)`
  background: #1a1d24;
  color: #888;
`;

const Label = styled.div`
  font-size: ${(p) => (p.$compact ? '9px' : '10px')};
  font-weight: 600;
  letter-spacing: ${(p) => (p.$compact ? '0.08em' : '0.12em')};
  text-transform: uppercase;
  opacity: 0.8;
  margin-bottom: ${(p) => (p.$compact ? '5px' : '6px')};
`;
const Hex = styled.div`
  font-family: var(--font-mono);
  font-size: ${(p) => (p.$compact ? '13px' : '24px')};
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: 0;
  white-space: nowrap;
`;
const Meta = styled.div`
  font-family: var(--font-mono);
  font-size: 10px;
  opacity: 0.75;
  margin-top: 4px;
`;

function BigSwatch({ label, swatch, compact = false }) {
  if (!swatch) {
    return (
      <Empty $compact={compact}>
        <Label $compact={compact}>{label}</Label>
        <Hex $compact={compact}>—</Hex>
      </Empty>
    );
  }
  const isLight = (() => {
    const { r, g, b } = swatch.rgb;
    return r * 0.299 + g * 0.587 + b * 0.114 > 175;
  })();
  const upperHex = swatch.hex.toUpperCase();
  return (
    <Box
      $compact={compact}
      style={{ background: swatch.hex, color: isLight ? '#000' : '#fff' }}
      data-hex={upperHex}
      title={formatSwatchTooltip(swatch, label)}
    >
      <Label $compact={compact}>{label}</Label>
      <Hex $compact={compact}>{upperHex}</Hex>
      {!compact && (
        <Meta>
          RGB {swatch.rgb.r},{swatch.rgb.g},{swatch.rgb.b} · HSL {swatch.hsl.h}/{swatch.hsl.s}/{swatch.hsl.l}
        </Meta>
      )}
    </Box>
  );
}

export default React.memo(BigSwatch);
