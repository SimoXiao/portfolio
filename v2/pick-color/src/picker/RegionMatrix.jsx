import React from 'react';
import styled from 'styled-components';
import { REGION_ORDER, formatRegionLabel } from './region-labels';
import { formatSwatchTooltip } from './swatch-tooltip';

const Grid = styled.div`
  display: grid;
  grid-template-columns: ${(p) =>
    p.$compact ? '42px repeat(5, minmax(0, 1fr))' : '76px repeat(5, minmax(0, 1fr))'};
  gap: ${(p) => (p.$compact ? '4px' : '8px')};
  align-items: center;

  @media (max-width: 640px) {
    grid-template-columns: 60px repeat(5, minmax(0, 1fr));
    gap: 6px;
  }
`;
const ColLabel = styled.div`
  font-family: var(--font-sans);
  font-size: ${(p) => (p.$compact ? '8px' : '10px')};
  color: hsl(220 13% 66%);
  text-transform: uppercase;
  letter-spacing: 0;
  line-height: 1.2;
  text-align: center;
  font-weight: 600;
  padding: ${(p) => (p.$compact ? '4px 2px' : '6px 0')};
  white-space: nowrap;
`;
const RowLabel = styled.div`
  font-size: ${(p) => (p.$compact ? '9px' : '10px')};
  color: hsl(220 13% 66%);
  text-transform: uppercase;
  letter-spacing: ${(p) => (p.$compact ? '0.04em' : '0.06em')};
  font-weight: 500;
  padding: ${(p) => (p.$compact ? '4px 2px' : '4px 8px')};
`;
const Cell = styled.div`
  aspect-ratio: 1.2 / 1;
  border-radius: ${(p) => (p.$compact ? '7px' : '10px')};
  border: 1px solid hsl(var(--border));
  font-family: var(--font-mono);
  font-size: ${(p) => (p.$compact ? '0' : '10px')};
  font-weight: 600;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: ${(p) => (p.$compact ? '4px' : '6px 8px')};
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition:
    transform 0.15s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  &:hover {
    transform: scale(1.06);
    z-index: 2;
    box-shadow: ${(p) => (p.$compact ? '0 5px 14px rgba(0, 0, 0, 0.24)' : 'var(--shadow-md)')};
  }
`;
const EmptyCell = styled(Cell)`
  background:
    repeating-linear-gradient(
      45deg,
      hsl(var(--bg-elev-1)) 0 4px,
      hsl(var(--bg-elev-2)) 4px 8px
    );
  color: hsl(var(--text-3));
  cursor: default;
  &:hover {
    transform: none;
    box-shadow: none;
  }
`;

function isLightHex(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 > 175;
}

function CellOrEmpty({ swatch, compact, label }) {
  if (!swatch) return <EmptyCell $compact={compact}>—</EmptyCell>;
  const dark = isLightHex(swatch.hex);
  return (
    <Cell
      $compact={compact}
      style={{
        background: swatch.hex,
        color: dark ? '#000' : '#fff',
        textShadow: dark ? 'none' : '0 1px 2px rgba(0,0,0,0.6)',
      }}
      data-hex={swatch.hex.toUpperCase()}
      title={formatSwatchTooltip(swatch, label)}
    >
      {compact ? '' : swatch.hex.toUpperCase()}
    </Cell>
  );
}

function RegionMatrix({ regions, compact = false }) {
  return (
    <Grid $compact={compact}>
      <ColLabel $compact={compact} />
      {REGION_ORDER.map((r) => (
        <ColLabel key={`h-${r}`} $compact={compact}>{compact ? r : formatRegionLabel(r)}</ColLabel>
      ))}
      <RowLabel $compact={compact}>不过滤</RowLabel>
      {REGION_ORDER.map((r) => (
        <CellOrEmpty
          key={`nf-${r}`}
          swatch={regions?.[r]?.no_filter}
          compact={compact}
          label={`${compact ? r : formatRegionLabel(r)} · 不过滤`}
        />
      ))}
      <RowLabel $compact={compact}>过滤黑白</RowLabel>
      {REGION_ORDER.map((r) => (
        <CellOrEmpty
          key={`wf-${r}`}
          swatch={regions?.[r]?.with_filter}
          compact={compact}
          label={`${compact ? r : formatRegionLabel(r)} · 过滤黑白`}
        />
      ))}
    </Grid>
  );
}

export default React.memo(RegionMatrix);
