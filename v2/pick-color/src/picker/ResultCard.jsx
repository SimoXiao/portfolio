import React from 'react';
import styled from 'styled-components';
import BigSwatch from './BigSwatch';
import PaletteRow from './PaletteRow';
import RegionMatrix from './RegionMatrix';
import RegionOverlaySVG from './RegionOverlaySVG';
import { formatRegionLabel } from './region-labels';

const Article = styled.article`
  max-width: ${(p) => (p.$compact ? 'none' : 'var(--content-width)')};
  width: 100%;
  margin: ${(p) => (p.$compact ? '0' : '0 auto 28px')};
  min-width: 0;
  ${(p) => p.$compact && `
    content-visibility: auto;
    contain: layout paint;
    contain-intrinsic-size: 720px;
  `}
`;

const HistoryShell = styled.div`
  position: relative;
  width: 100%;
  background: hsl(var(--glass-bg));
  border: 1px solid hsl(var(--border));
  border-radius: 16px;
  padding: 14px;
  transition: border-color 0.25s, background 0.25s, box-shadow 0.25s;

  &:hover {
    background: hsl(var(--glass-bg-hover));
    border-color: hsl(var(--border-strong));
    box-shadow: 0 10px 24px -22px rgba(0, 0, 0, 0.72);
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: ${(p) =>
    p.$compact ? 'minmax(0, 1fr) minmax(0, 1.42fr)' : 'minmax(300px, 1fr) 1.6fr'};
  gap: ${(p) => (p.$compact ? '12px' : '20px')};
  margin-bottom: ${(p) => (p.$compact ? '12px' : '20px')};
  @media (max-width: 880px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: ${(p) => (p.$flat ? 'transparent' : 'hsl(var(--glass-bg))')};
  border: ${(p) => (p.$flat ? '0' : '1px solid hsl(var(--border))')};
  border-radius: ${(p) => (p.$flat ? '0' : p.$compact ? '16px' : '20px')};
  padding: ${(p) => (p.$flat ? '0' : p.$compact ? '14px' : '22px')};
  transition: border-color 0.25s;
  position: relative;
  &:hover {
    border-color: ${(p) => (p.$flat ? 'transparent' : 'hsl(var(--border-strong))')};
  }
`;

const DeleteButton = styled.button`
  position: absolute;
  top: 9px;
  right: 9px;
  z-index: 4;
  width: 20px;
  height: 20px;
  box-sizing: border-box;
  padding: 0;
  border-radius: 50%;
  border: 1px solid hsl(var(--border-strong));
  background: hsl(220 20% 100% / 0.08);
  color: hsl(220 18% 92%);
  font-size: 0;
  line-height: 1;
  font-family: var(--font-sans);
  cursor: pointer;
  opacity: 0;
  transform: translateY(-2px) scale(0.92);
  transition: opacity 0.18s ease, transform 0.18s ease, background 0.18s ease, color 0.18s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.24);

  &::before,
  &::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: 10px;
    height: 1.6px;
    border-radius: 999px;
    background: currentColor;
    transform-origin: center;
  }

  &::before {
    transform: translate(-50%, -50%) rotate(45deg);
  }

  &::after {
    transform: translate(-50%, -50%) rotate(-45deg);
  }

  ${HistoryShell}:hover &,
  &:focus-visible {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  &:hover {
    background: hsl(var(--danger) / 0.18);
    color: hsl(var(--danger));
    border-color: hsl(var(--danger) / 0.42);
  }
`;

const H3 = styled.h3`
  font-size: ${(p) => (p.$compact ? '10px' : '12px')};
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: hsl(220 18% 88%);
  margin: 0 0 ${(p) => (p.$compact ? '10px' : '16px')};
  display: flex;
  align-items: center;
  gap: 8px;
  &::before {
    content: '';
    width: 5px;
    height: 5px;
    background: currentColor;
    border-radius: 50%;
    flex: 0 0 auto;
  }
`;

const ImageWrap = styled.div`
  position: relative;
  width: 100%;
  border-radius: 14px;
  overflow: hidden;
  background: hsl(var(--bg-elev-2));
  border: 1px solid hsl(var(--border));
  img {
    display: block;
    width: 100%;
    height: auto;
  }
`;

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  svg {
    width: 100%;
    height: 100%;
    display: block;
  }
`;

const Placeholder = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: hsl(var(--text-3));
  font-size: 13px;
  padding: 40px 0;
`;

const SourceInfo = styled.pre`
  margin: ${(p) => (p.$compact ? '10px' : '14px')} 0 0;
  font-family: var(--font-mono);
  font-size: ${(p) => (p.$compact ? '8px' : '11px')};
  color: hsl(220 14% 74%);
  word-break: break-all;
  padding: ${(p) => (p.$compact ? '8px' : '10px 12px')};
  background: hsl(220 20% 100% / 0.04);
  border-radius: 10px;
  border: 1px solid hsl(var(--border-strong));
  letter-spacing: -0.005em;
  white-space: pre-wrap;
  line-height: 1.55;
`;

const DominatePair = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${(p) => (p.$compact ? '8px' : '12px')};
  margin-bottom: 6px;
`;

const RegionsSection = styled.div`
  margin-top: ${(p) => (p.$compact ? '16px' : '24px')};
`;

function sizeText(d) {
  if (d.image_size && d.image_size.w) return `${d.image_size.w} × ${d.image_size.h}`;
  return '浏览器本地';
}

/**
 * 预览图来源优先级：
 * 1. result.thumbnail（本地 Canvas 取色路径会生成 base64 data URL）
 * 2. result.source 如果是 http(s) URL（AIO 路径没 thumbnail 但有公开 CDN URL，
 *    浏览器可以直接当 <img src> 加载——同域 / *.music.126.net 都可达）
 * 3. 没有 → 占位
 */
function previewImageSrc(result) {
  if (result?.thumbnail) return result.thumbnail;
  const src = result?.source;
  if (typeof src === 'string' && /^https?:\/\//i.test(src)) return src;
  return null;
}

function ResultCard({ result, compact = false, historyItem = false, onDelete }) {
  if (!result) return null;
  const previewSrc = previewImageSrc(result);
  const flat = Boolean(historyItem);
  const mainRegionLabel = compact ? 'D' : formatRegionLabel('D');
  const content = (
    <>
      <Grid $compact={compact}>
        <Card $compact={compact} $flat={flat}>
          <H3 $compact={compact}>原图 · 含 5 区域示意</H3>
          <ImageWrap>
            {previewSrc ? (
              <img
                src={previewSrc}
                alt=""
                loading={historyItem ? 'lazy' : 'eager'}
                decoding="async"
                fetchPriority={historyItem ? 'low' : 'high'}
              />
            ) : (
              <Placeholder>无预览图</Placeholder>
            )}
            <Overlay>
              <RegionOverlaySVG />
            </Overlay>
          </ImageWrap>
          <SourceInfo $compact={compact}>
            {`📥 ${result.source}\n📐 ${sizeText(result)}  ·  方法 ${result.method}  ·  ${result.elapsedMs}ms`}
          </SourceInfo>
        </Card>
        <Card $compact={compact} $flat={flat}>
          <H3 $compact={compact}>主色 · {mainRegionLabel} 区域</H3>
          <DominatePair $compact={compact}>
            <BigSwatch label={`${mainRegionLabel} · 不过滤`} swatch={result.dominate?.no_filter} compact={compact} />
            <BigSwatch label={`${mainRegionLabel} · 过滤黑白`} swatch={result.dominate?.with_filter} compact={compact} />
          </DominatePair>
          <RegionsSection $compact={compact}>
            <H3 $compact={compact} style={{ marginTop: compact ? 14 : 24 }}>5 区域 × 2 模式</H3>
            <RegionMatrix regions={result.regions} compact={compact} />
          </RegionsSection>
        </Card>
      </Grid>
      <Card $compact={compact} $flat={flat}>
        <H3 $compact={compact}>16 色调色板 · 按 Population 降序</H3>
        <PaletteRow palette={result.palette_16 || []} compact={compact} />
      </Card>
    </>
  );
  return (
    <Article $compact={compact} data-history-item={historyItem ? 'true' : undefined}>
      {historyItem ? (
        <HistoryShell>
          {onDelete && (
            <DeleteButton
              type="button"
              aria-label="删除这条历史记录"
              title="删除这条历史记录"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(result.resultKey);
              }}
            >
            </DeleteButton>
          )}
          {content}
        </HistoryShell>
      ) : (
        content
      )}
    </Article>
  );
}

export default React.memo(ResultCard);
