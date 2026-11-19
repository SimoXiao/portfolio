import React from 'react';
import styled from 'styled-components';

const HeaderWrap = styled.header`
  text-align: center;
  margin: 0 auto 48px;
  max-width: 720px;
  position: relative;
`;

const TitleImage = styled.img`
  display: block;
  width: min(100%, 620px);
  height: auto;
  margin-bottom: 16px;
  margin-left: auto;
  margin-right: auto;
  filter:
    drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6))
    drop-shadow(0 8px 24px rgba(0, 0, 0, 0.4));
  cursor: ${(p) => (p.$clickable ? 'pointer' : 'default')};
`;

const Subtitle = styled.p`
  font-size: 13px;
  color: hsl(var(--text-3));
  max-width: 560px;
  margin: 0 auto;
  font-weight: 400;
  letter-spacing: -0.005em;
`;

export default function Header({ onHome }) {
  const handleKeyDown = (e) => {
    if (!onHome) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onHome();
    }
  };

  return (
    <HeaderWrap>
      <TitleImage
        src="./assets/hero-title.png"
        alt="云音乐自研取色及应用"
        $clickable={Boolean(onHome)}
        role={onHome ? 'button' : undefined}
        tabIndex={onHome ? 0 : undefined}
        title={onHome ? '回到首页' : undefined}
        aria-label={onHome ? '回到首页' : undefined}
        onClick={onHome}
        onKeyDown={handleKeyDown}
      />
      <Subtitle>
        纯前端免内网体验版 · 支持上传 / 粘贴 / 拖拽图片及公开 CORS 图片 URL
      </Subtitle>
    </HeaderWrap>
  );
}
