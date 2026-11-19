import React from 'react';
import { createGlobalStyle } from 'styled-components';

const Style = createGlobalStyle`
  @property --picker-border-angle {
    syntax: '<angle>';
    inherits: false;
    initial-value: 0deg;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --content-width: 940px;
    --bg-base:        220 12% 4%;
    --bg-elev-1:      220 12% 7%;
    --bg-elev-2:      220 12% 10%;
    --glass-bg:       220 20% 100% / 0.055;
    --glass-bg-hover: 220 20% 100% / 0.075;
    --border:         220 20% 100% / 0.08;
    --border-strong:  220 20% 100% / 0.16;
    --text:           220 20% 98%;
    --text-2:         220 10% 70%;
    --text-3:         220 8% 48%;

    --accent-1: 268 90% 75%;
    --accent-2: 226 100% 76%;
    --accent-3: 170 75% 65%;
    --status-green: 142 90% 55%;
    --danger: 0 85% 72%;

    --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
    --shadow-md: 0 8px 24px -8px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.2);
    --shadow-lg: 0 24px 48px -12px rgba(0,0,0,0.6), 0 8px 16px -4px rgba(0,0,0,0.3);
    --shadow-glow: 0 0 0 1px hsl(var(--accent-2) / 0.3),
                   0 0 24px hsl(var(--accent-1) / 0.25),
                   0 0 80px hsl(var(--accent-2) / 0.18);

    --font-sans: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'HarmonyOS Sans', system-ui, sans-serif;
    --font-mono: 'SF Mono', Menlo, Monaco, Consolas, monospace;
  }

  html {
    background: #030a10;
  }
  html, body {
    color: hsl(var(--text));
    font-family: var(--font-sans);
    font-feature-settings: 'cv11', 'ss01', 'ss03';
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    line-height: 1.55;
    min-height: 100vh;
    overflow-x: hidden;
  }
  body {
    background: transparent;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  body::before {
    content: '';
    position: fixed;
    inset: 0;
    z-index: -3;
    pointer-events: none;
    background-image: url('./assets/bg.webp');
    background-repeat: no-repeat;
    background-position: right bottom;
    background-size: cover;
  }
`;

export default function GlobalStyle() {
  return <Style />;
}
