import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import ResultCard from './ResultCard';

const HISTORY_PAGE_SIZE = 6;

const Divider = styled.div`
  max-width: var(--content-width);
  margin: 64px auto 26px;
  display: flex;
  align-items: center;
  gap: 14px;
  color: hsl(var(--text-3));
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      hsl(var(--border-strong)),
      transparent
    );
  }

  span {
    padding: 4px 12px;
    background: hsl(var(--bg-base) / 0.28);
    border: 1px solid hsl(var(--border));
    border-radius: 999px;
    white-space: nowrap;
  }
`;

const Masonry = styled.div`
  max-width: var(--content-width);
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;

  @media (max-width: 880px) {
    grid-template-columns: 1fr;
  }
`;

const Column = styled.div`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 20px;
`;

const AutoLoadSentinel = styled.div`
  max-width: var(--content-width);
  height: 1px;
  margin: 1px auto 0;
  pointer-events: none;
`;

function estimateCardHeight(item) {
  const size = item?.image_size;
  if (!size?.w || !size?.h) return 760;
  const ratio = size.h / size.w;
  return 520 + Math.min(900, Math.max(160, ratio * 260));
}

function splitHistory(history) {
  const columns = [[], []];
  const heights = [0, 0];
  history.forEach((item) => {
    const target = heights[0] <= heights[1] ? 0 : 1;
    columns[target].push(item);
    heights[target] += estimateCardHeight(item);
  });
  return columns;
}

function HistoryStack({ history, onDelete }) {
  const [visibleCount, setVisibleCount] = useState(HISTORY_PAGE_SIZE);
  const sentinelRef = useRef(null);
  const total = history?.length || 0;
  useEffect(() => {
    setVisibleCount((prev) => Math.min(Math.max(HISTORY_PAGE_SIZE, prev), Math.max(HISTORY_PAGE_SIZE, total)));
  }, [total]);
  const visibleHistory = useMemo(() => (history || []).slice(0, visibleCount), [history, visibleCount]);
  const [left, right] = useMemo(() => splitHistory(visibleHistory), [visibleHistory]);
  const remaining = Math.max(0, total - visibleHistory.length);
  useEffect(() => {
    if (remaining <= 0) return undefined;
    const node = sentinelRef.current;
    if (!node) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setVisibleCount(total);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisibleCount((count) => Math.min(total, count + HISTORY_PAGE_SIZE));
      },
      { root: null, rootMargin: '520px 0px', threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [remaining, total]);

  if (!history || history.length === 0) return null;
  return (
    <>
      <Divider><span>历史记录</span></Divider>
      <Masonry>
        <Column>
          {left.map((item) => (
            <ResultCard key={item.resultKey} result={item} compact historyItem onDelete={onDelete} />
          ))}
        </Column>
        <Column>
          {right.map((item) => (
            <ResultCard key={item.resultKey} result={item} compact historyItem onDelete={onDelete} />
          ))}
        </Column>
      </Masonry>
      {remaining > 0 && (
        <AutoLoadSentinel ref={sentinelRef} aria-hidden="true" />
      )}
    </>
  );
}

export default React.memo(HistoryStack);
