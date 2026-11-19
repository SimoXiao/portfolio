import React from 'react';
import styled from 'styled-components';
import { formatPct, formatSwatchTooltip, totalPopulation } from './swatch-tooltip';

const Row = styled.div`
  display: grid;
  grid-template-columns: repeat(16, minmax(0, 1fr));
  gap: ${(p) => (p.$compact ? '4px' : '6px')};
  margin-top: ${(p) => (p.$compact ? '0' : '12px')};

  @media (max-width: 880px) {
    grid-template-columns: repeat(8, minmax(0, 1fr));
  }
`;
const Swatch = styled.div`
  aspect-ratio: 1 / 1.35;
  min-height: ${(p) => (p.$compact ? '24px' : '54px')};
  border-radius: ${(p) => (p.$compact ? '6px' : '10px')};
  border: 1px solid hsl(var(--border));
  cursor: pointer;
  position: relative;
  transition:
    transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  &:hover {
    transform: translateY(-4px) scale(1.04);
    z-index: 5;
    box-shadow: ${(p) => (p.$compact ? '0 5px 14px rgba(0, 0, 0, 0.24)' : 'var(--shadow-md)')};
    border-color: hsl(var(--accent-2) / 0.5);
  }
  &::before,
  &::after {
    display: ${(p) => (p.$compact ? 'none' : 'block')};
    position: absolute;
    left: 0;
    right: 0;
    box-sizing: border-box;
    padding: 0 7px;
    text-align: left;
    color: white;
    text-shadow: 0 1px 1.5px rgba(0, 0, 0, 0.38);
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0;
    pointer-events: none;
  }
  &::before {
    content: attr(data-pct);
    top: 5px;
  }
  &::after {
    content: attr(data-hex);
    bottom: 4px;
    font-weight: 600;
  }
`;

function PaletteRow({ palette, compact = false }) {
  if (!palette || palette.length === 0) {
    return <Row />;
  }
  const total = totalPopulation(palette);
  return (
    <Row $compact={compact}>
      {palette.map((sw, i) => {
        const pct = formatPct(sw, total);
        const upper = sw.hex.toUpperCase();
        return (
          <Swatch
            key={`${upper}-${i}`}
            $compact={compact}
            style={{ background: sw.hex }}
            data-hex={upper}
            data-pct={pct}
            title={formatSwatchTooltip(sw, '', total)}
          />
        );
      })}
    </Row>
  );
}

export default React.memo(PaletteRow);
