import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { createBlackVinylThemeFromHsl } from '../lib/skills/black-vinyl-theme';
import { extract } from '../lib/picker-pipeline';
import { getSkillItem } from './skill-catalog';
const blackVinylSkillZip = './assets/black-vinyl-page-theme-skill.zip';
const neteaseImageColorPickerSkillZip = './assets/netease-image-color-picker-skill.zip';

const TABS = ['概述', '安装方式', '效果验证', '版本历史'];

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px;
  background:
    radial-gradient(circle at 50% 20%, rgba(24, 45, 54, 0.3), transparent 46%),
    rgba(2, 6, 10, 0.72);

  @media (max-width: 720px) {
    align-items: flex-end;
    padding: 12px;
  }
`;

const Dialog = styled.section`
  width: min(980px, 100%);
  height: min(760px, calc(100vh - 56px));
  overflow: hidden;
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.04)),
    rgba(8, 14, 20, 0.92);
  box-shadow:
    0 30px 90px rgba(0, 0, 0, 0.48),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);

  @media (max-width: 720px) {
    height: min(760px, calc(100vh - 24px));
  }
`;

const Top = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 24px 28px 16px;
  border-bottom: 1px solid hsl(var(--border));
  flex: 0 0 auto;
`;

const TitleWrap = styled.div`
  min-width: 0;
`;

const Name = styled.h2`
  margin: 0;
  color: hsl(220 18% 96%);
  font-size: 22px;
  line-height: 1.22;
  font-weight: 750;
  letter-spacing: -0.01em;
`;

const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
  color: hsl(var(--text-3));
  font-size: 12px;
`;

const Pill = styled.span`
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const Close = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid hsl(var(--border-strong));
  background: rgba(255, 255, 255, 0.06);
  color: hsl(var(--text-2));
  cursor: pointer;
  font-size: 18px;
  line-height: 1;

  &:hover {
    color: hsl(var(--text));
    background: rgba(255, 255, 255, 0.1);
  }
`;

const TabBar = styled.div`
  display: flex;
  gap: 34px;
  padding: 0 28px;
  border-bottom: 1px solid hsl(var(--border));
  overflow-x: auto;
  flex: 0 0 auto;
`;

const Tab = styled.button`
  position: relative;
  height: 54px;
  border: 0;
  background: transparent;
  color: ${(p) => (p.$active ? 'hsl(220 18% 96%)' : 'hsl(var(--text-3))')};
  cursor: pointer;
  font-size: 15px;
  font-weight: 700;
  font-family: var(--font-sans);
  white-space: nowrap;
  outline: none;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 3px;
    border-radius: 999px 999px 0 0;
    background: ${(p) => (p.$active ? 'hsl(220 18% 96%)' : 'transparent')};
  }

  &:focus-visible {
    color: hsl(220 18% 96%);
  }

  &:focus-visible::before {
    content: '';
    position: absolute;
    left: -8px;
    right: -8px;
    top: 10px;
    bottom: 10px;
    border-radius: 8px;
    border: 1px solid rgba(148, 255, 219, 0.36);
    pointer-events: none;
  }
`;

const Content = styled.div`
  padding: 28px;
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  contain: layout paint;
`;

const Panel = styled.div`
  display: ${(p) => (p.$active ? 'block' : 'none')};
  min-height: 100%;
`;

const Lead = styled.p`
  margin: 0 0 24px;
  max-width: 780px;
  color: hsl(var(--text-2));
  font-size: 14px;
  line-height: 1.8;
`;

const H3 = styled.h3`
  margin: 0 0 12px;
  color: hsl(220 18% 94%);
  font-size: 16px;
  line-height: 1.35;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 24px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const InfoCard = styled.div`
  min-height: 104px;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid hsl(var(--border));
  background: hsl(220 20% 100% / 0.035);
`;

const InfoTitle = styled.div`
  margin-bottom: 8px;
  color: hsl(220 18% 90%);
  font-size: 13px;
  font-weight: 700;
`;

const InfoText = styled.div`
  color: hsl(var(--text-3));
  font-size: 12px;
  line-height: 1.65;
`;

const Code = styled.pre`
  position: relative;
  margin: 0 0 22px;
  padding: 18px;
  border-radius: 14px;
  border: 1px solid hsl(var(--border));
  background: hsl(220 18% 2% / 0.32);
  color: hsl(220 18% 80%);
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.7;
  white-space: pre-wrap;
  overflow: auto;
`;

const Timeline = styled.div`
  display: grid;
  gap: 18px;
`;

const VersionRow = styled.div`
  display: grid;
  grid-template-columns: 120px 1fr 110px;
  gap: 18px;
  align-items: start;
  padding-bottom: 18px;
  border-bottom: 1px solid hsl(var(--border));

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 6px;
  }
`;

const Version = styled.div`
  color: hsl(220 18% 96%);
  font-size: 16px;
  font-weight: 750;
`;

const Date = styled.div`
  color: hsl(var(--text-3));
  font-size: 13px;
  text-align: right;

  @media (max-width: 640px) {
    text-align: left;
  }
`;

const CopyButton = styled.button`
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid hsl(var(--border-strong));
  background: hsl(220 20% 100% / 0.055);
  color: hsl(var(--text-2));
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 650;
  font-family: var(--font-sans);
  text-decoration: none;

  &:hover {
    color: hsl(var(--text));
    border-color: rgba(255, 231, 186, 0.32);
  }
`;

const InstallActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: -8px 0 24px;
`;

const DemoCard = styled.div`
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid hsl(var(--border));
  background: hsl(220 20% 100% / 0.035);
`;

const DemoPreview = styled.div`
  min-height: 146px;
  padding: 18px;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  gap: 14px;
  background: ${(p) => p.$gradient};
`;

const DemoText = styled.div`
  min-width: 0;
  color: #fff;
  text-align: right;
`;

const DemoTitle = styled.div`
  font-size: 15px;
  font-weight: 750;
  line-height: 1.25;
`;

const DemoSub = styled.div`
  margin-top: 6px;
  color: rgba(255, 255, 255, 0.68);
  font-size: 11px;
  font-family: var(--font-mono);
`;

const PreviewCopyButton = styled.button`
  margin-top: 10px;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(0, 0, 0, 0.16);
  color: rgba(255, 255, 255, 0.92);
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
  font-family: var(--font-sans);

  &:hover {
    border-color: rgba(255, 255, 255, 0.42);
    background: rgba(255, 255, 255, 0.12);
  }
`;

const DemoBody = styled.div`
  padding: 14px;
`;

const DemoHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
`;

const DemoName = styled.div`
  min-width: 0;
  color: hsl(220 18% 94%);
  font-size: 13px;
  font-weight: 750;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const DemoRange = styled.span`
  flex: 0 0 auto;
  height: 20px;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: hsl(var(--text-3));
  font-size: 10px;
  font-family: var(--font-mono);
`;

const DemoSwatches = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 12px;
`;

const DemoSwatch = styled.button`
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font-family: var(--font-sans);

  &:hover > div:first-child {
    border-color: rgba(255, 231, 186, 0.42);
  }
`;

const DemoSwatchColor = styled.div`
  height: 34px;
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: ${(p) => p.$color};
`;

const DemoSwatchLabel = styled.div`
  margin-top: 5px;
  color: hsl(var(--text-3));
  font-size: 10px;
  font-family: var(--font-mono);
  line-height: 1.35;
  word-break: break-all;
`;

const DemoSwatchCopied = styled.span`
  color: hsl(44 92% 84%);
  font-weight: 750;
`;

const DemoCode = styled.pre`
  margin: 0;
  padding: 10px;
  border-radius: 10px;
  background: hsl(220 18% 2% / 0.32);
  border: 1px solid hsl(var(--border));
  color: hsl(220 18% 78%);
  font-size: 10px;
  line-height: 1.55;
  font-family: var(--font-mono);
  white-space: pre-wrap;
`;

const ValidatorGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
  gap: 14px;
  margin-bottom: 22px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const ValidatorCard = styled.div`
  padding: 16px;
  border-radius: 16px;
  border: 1px dashed ${(p) => (p.$dragover ? 'rgba(255, 231, 186, 0.58)' : 'hsl(var(--border))')};
  background: ${(p) => (p.$dragover ? 'rgba(255, 231, 186, 0.07)' : 'hsl(220 20% 100% / 0.035)')};
  transition: border-color 0.16s ease, background 0.16s ease;
`;

const FieldLabel = styled.label`
  display: block;
  margin-bottom: 8px;
  color: hsl(220 18% 94%);
  font-size: 13px;
  font-weight: 750;
`;

const ColorInput = styled.input`
  width: 100%;
  height: 44px;
  padding: 0 13px;
  border-radius: 12px;
  border: 1px solid hsl(var(--border-strong));
  background: rgba(0, 0, 0, 0.22);
  color: hsl(220 18% 96%);
  font-size: 15px;
  font-family: var(--font-mono);
  outline: none;

  &:focus {
    border-color: rgba(255, 231, 186, 0.36);
    box-shadow: 0 0 0 3px rgba(255, 231, 186, 0.08);
  }
`;

const InputActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 10px;
`;

const ExtractButton = styled(CopyButton)`
  flex: 1;
  height: 36px;

  &:disabled {
    cursor: wait;
    opacity: 0.62;
  }
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const UploadButton = styled(CopyButton)`
  height: 36px;
`;

const FieldHelp = styled.div`
  margin-top: 8px;
  color: hsl(var(--text-2) / 0.74);
  font-size: 12px;
  line-height: 1.6;
`;

const ErrorText = styled.div`
  margin-top: 10px;
  color: hsl(8 86% 72%);
  font-size: 12px;
  line-height: 1.6;
`;

const ResultRows = styled.div`
  display: grid;
  gap: 10px;
  margin-top: 14px;
`;

const ResultRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid hsl(var(--border));

  &:last-child {
    border-bottom: 0;
  }
`;

const ResultKey = styled.div`
  color: hsl(var(--text-3));
  font-size: 12px;
`;

const ResultValue = styled.button`
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: hsl(220 18% 92%);
  font-size: 12px;
  font-family: var(--font-mono);
  text-align: right;
  overflow-wrap: anywhere;
  cursor: pointer;

  &:hover {
    color: hsl(44 92% 84%);
  }
`;

const CopyActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: -8px 0 22px;
`;

async function copyText(text, formats) {
  if (formats && navigator.clipboard?.write && window.ClipboardItem && window.isSecureContext) {
    const entries = {
      'text/plain': new Blob([formats.plain || text], { type: 'text/plain' }),
      'text/html': new Blob([formats.html], { type: 'text/html' }),
    };
    if (window.ClipboardItem.supports?.('image/svg+xml')) {
      entries['image/svg+xml'] = new Blob([formats.svg], { type: 'image/svg+xml' });
    }
    try {
      await navigator.clipboard.write([new ClipboardItem(entries)]);
      return true;
    } catch {
      /* fallback */
    }
  }

  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fallback */
    }
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  } finally {
    document.body.removeChild(textarea);
  }
  return ok;
}

function createFigmaGradientClipboard(theme) {
  const top = theme.tokens.bgTop;
  const bottom = theme.tokens.bgBottom;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="240" viewBox="0 0 360 240">
  <defs>
    <linearGradient id="vinylGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${top}"/>
      <stop offset="100%" stop-color="${bottom}"/>
    </linearGradient>
  </defs>
  <rect width="360" height="240" rx="24" fill="url(#vinylGradient)"/>
</svg>`;
  return {
    plain: svg,
    svg,
    html: `<meta charset="utf-8">${svg}`,
  };
}

function overview(skill) {
  if (skill.code === 'BATCH_COLOR_EXTRACT') {
    return (
      <>
        <Lead>
          这个 Skill 把网站取色能力整理成可调用流程：设计师直接用网页，开发和 AI 工作流通过脚本/API 调用 URL 取色，插件侧消费紧凑 DTBLR JSON 结果。
        </Lead>
        <Grid>
          <InfoCard>
            <InfoTitle>设计师</InfoTitle>
            <InfoText>打开网站，粘贴图片 URL、上传文件、拖拽图片或 Cmd+V 粘贴图片本体，直接复制色值和色板。</InfoText>
          </InfoCard>
          <InfoCard>
            <InfoTitle>开发 / AI 工作流</InfoTitle>
            <InfoText>URL 输入优先调用网站 AIO imageUrl 能力；默认只返回 D/T/B/L/R 的不过滤与过滤黑白结果。</InfoText>
          </InfoCard>
          <InfoCard>
            <InfoTitle>插件</InfoTitle>
            <InfoText>消费 DTBLR JSON，把 D 主色、边缘色转换成 Figma fills、tokens 或业务配色规则。</InfoText>
          </InfoCard>
        </Grid>
        <H3>调用路径</H3>
        <Code>{`图片 URL
  -> 网站 /g/pick-color/api/aio/extract
  -> AIO imageUrl 取色
  -> DTBLR JSON

上传 / 拖拽 / Cmd+V 粘贴图片本体
  -> 网站浏览器 Canvas 本地取色
  -> DTBLR JSON

外网 URL 当前网络不可读
  -> 提示复制图片本体后 Cmd+V 粘贴，或下载后上传`}</Code>
      </>
    );
  }

  if (skill.code !== 'BLACK_VINYL_PAGE_THEME') {
    return (
      <>
        <Lead>{skill.text}</Lead>
        <Grid>
          <InfoCard><InfoTitle>输入</InfoTitle><InfoText>图片 URL、上传图、粘贴图、当前取色结果。</InfoText></InfoCard>
          <InfoCard><InfoTitle>输出</InfoTitle><InfoText>结构化 JSON、CSS token、可复制色值。</InfoText></InfoCard>
          <InfoCard><InfoTitle>状态</InfoTitle><InfoText>当前为预设能力，后续可接入可执行规则函数。</InfoText></InfoCard>
        </Grid>
      </>
    );
  }
  return (
    <>
      <Lead>
        黑胶页调色规则把图片取色结果转换成播放页可用的背景渐变、按钮色、文字色和解释说明。它不是静态文档，而是可以被网页、AI 工作流、Figma 插件共同调用的确定性规则。
      </Lead>
      <Grid>
        <InfoCard>
          <InfoTitle>输入</InfoTitle>
          <InfoText>当前图片的 D.no_filter dominant 主色；缺失时兜底 D.with_filter / palette_16[0]。</InfoText>
        </InfoCard>
        <InfoCard>
          <InfoTitle>规则</InfoTitle>
          <InfoText>H 保持不变；按 L 区间执行“新 S = 原 S ÷ 倍数”，并计算顶部/底部 L。</InfoText>
        </InfoCard>
        <InfoCard>
          <InfoTitle>输出</InfoTitle>
          <InfoText>顶部色、底部色、linear-gradient、CSS token、JSON payload 与规则解释。</InfoText>
        </InfoCard>
      </Grid>
      <H3>快速参考</H3>
      <Code>{`基准色 = D.no_filter || D.with_filter || palette_16[0]
H 保持不变
新 S = round(原 S ÷ L区间倍数)
顶点/底点 L = 按 L 区间公式计算并四舍五入
输出 bgTop、bgBottom、backgroundGradient、CSS token、JSON payload`}</Code>
    </>
  );
}

function install(skill, copiedKey, onCopy) {
  if (skill.code === 'BATCH_COLOR_EXTRACT') {
    const prompt = `请使用 NETEASE_IMAGE_COLOR_PICKER 能力：
1. 如果输入是图片 URL，调用云音乐取色网站的 URL 取色能力，返回紧凑 DTBLR JSON。
2. 如果输入是本地上传、截图、拖拽或粘贴图片本体，引导用户打开网站完成取色。
3. 只输出 D/T/B/L/R 两套结果：no_filter 与 with_filter。
4. 默认不要输出 palette_16、thumbnail、raw 等冗余字段。
5. 如果 URL 当前网络不可读，提示用户复制图片本体后用 Cmd+V 粘贴，不能自行猜测色值。`;
    return (
      <>
        <Lead>
          这个安装包把网站取色能力封装成可下载 Skill：默认只输出 D/T/B/L/R 两套取色结果，完整原始 JSON 可用 --full 调试。
        </Lead>
        <H3>下载安装包</H3>
        <Code>{`netease-image-color-picker-skill.zip
包含 SKILL.md、URL 调用脚本、DTBLR 输出协议、不同角色使用说明。`}</Code>
        <InstallActions>
          <CopyButton
            as="a"
            href={neteaseImageColorPickerSkillZip}
            download="netease-image-color-picker-skill.zip"
          >
            下载 Skill 安装包
          </CopyButton>
        </InstallActions>
        <H3>脚本调用</H3>
        <Code>{`node scripts/extract-url.mjs 'http://p2.music.126.net/TLaWmMvoLmiOC27ce8B2fg==/807041534787715.jpg'

PICK_COLOR_ORIGIN='https://cms.qa.igame.163.com' \\
node scripts/extract-url.mjs 'http://p2.music.126.net/TLaWmMvoLmiOC27ce8B2fg==/807041534787715.jpg'

# 调试完整结果
node scripts/extract-url.mjs --full 'http://p2.music.126.net/TLaWmMvoLmiOC27ce8B2fg==/807041534787715.jpg'`}</Code>
        <H3>API 调用</H3>
        <Code>{`POST /g/pick-color/api/aio/extract
Content-Type: application/json

{
  "imageUrl": "http://p2.music.126.net/TLaWmMvoLmiOC27ce8B2fg==/807041534787715.jpg"
}`}</Code>
        <H3>通过对话调用</H3>
        <Code>{prompt}</Code>
        <CopyButton type="button" onClick={() => onCopy(prompt, null, 'install-prompt')}>
          {copiedKey === 'install-prompt' ? '已复制' : '复制提示词'}
        </CopyButton>
      </>
    );
  }

  if (skill.code !== 'BLACK_VINYL_PAGE_THEME') {
    const prompt = `请按 ${skill.title} 预设方向处理：
1. 先通过取色网站获取图片 D/T/B/L/R 与 palette_16。
2. 基于主色、边缘色和 16 色调色板输出界面配色建议。
3. 当前能力还没有封装成可下载 Skill 包，不要套用其他 Skill 的安装包。`;
    return (
      <>
        <Lead>
          这个模块目前是配色预设，还没有封装成独立可安装 Skill 包。可以先复制提示词进行人工或 AI 工作流试跑。
        </Lead>
        <H3>安装状态</H3>
        <Code>{`${skill.title}
状态：暂未开放安装包
说明：当前仅作为预设能力展示，后续需要补齐可执行规则函数、输入输出协议和评测样例后再开放下载。`}</Code>
        <H3>通过对话调用</H3>
        <Code>{prompt}</Code>
        <CopyButton type="button" onClick={() => onCopy(prompt, null, 'install-prompt')}>
          {copiedKey === 'install-prompt' ? '已复制' : '复制提示词'}
        </CopyButton>
      </>
    );
  }

  const prompt = `请使用 ${skill.code} 能力：
1. 对输入图片先执行取色，获取 D.no_filter、D.with_filter 和 palette_16。
2. 默认取 D.no_filter dominant 主色；缺失时兜底 D.with_filter / palette_16[0]。
3. H 保持不变，只按黑胶页调色规则调整 S/L。
4. 输出顶部色、底部色、linear-gradient、CSS token、JSON payload 和简短解释。
5. 如果缺少取色结果，请先要求用户提供图片 URL 或上传图片。`;
  return (
    <>
      <Lead>
        这里提供可下载的 Skill 安装包，也保留提示词兜底调用方式，方便不同 AI 助手或工作流接入同一套规则。
      </Lead>
      <H3>下载安装包</H3>
      <Code>{`black-vinyl-page-theme-skill.zip
包含 SKILL.md、可执行规则脚本、S/L 调色公式、输入输出协议和 Skill 展示信息。`}</Code>
      <InstallActions>
        <CopyButton
          as="a"
          href={blackVinylSkillZip}
          download="black-vinyl-page-theme-skill.zip"
        >
          下载 Skill 安装包
        </CopyButton>
      </InstallActions>
      <Lead>
        如果使用的 AI 助手暂时不支持安装 Skill 包，也可以复制下面提示词，让它按同一套规则执行。
      </Lead>
      <H3>通过对话安装 / 调用</H3>
      <Code>{prompt}</Code>
      <CopyButton type="button" onClick={() => onCopy(prompt, null, 'install-prompt')}>
        {copiedKey === 'install-prompt' ? '已复制' : '复制提示词'}
      </CopyButton>
      <H3 style={{ marginTop: 28 }}>开发接入方式</H3>
      <Code>{`import { createBlackVinylTheme } from '@/lib/skills/black-vinyl-theme';

const theme = createBlackVinylTheme(pickerResult);
// theme.tokens.backgroundGradient 可直接用于页面背景
// theme.gradient.top / bottom 可用于 Figma 插件或 AI 工作流。`}</Code>
    </>
  );
}

function versions(skill) {
  if (skill.code === 'BATCH_COLOR_EXTRACT') {
    const rows = [
      { version: skill.version, note: '整理网站取色能力调用 Skill：补齐 URL 调用脚本、DTBLR JSON 协议和角色使用说明。', date: skill.updatedAt },
      { version: 'v0.0.2', note: '支持网页入口对 URL、上传、拖拽、粘贴图片的取色路径说明。', date: '2026/06/11' },
      { version: 'v0.0.1', note: '定义 D/T/B/L/R 的不过滤与过滤黑白返回结构。', date: '2026/06/02' },
    ];
    return (
      <Timeline>
        {rows.map((row, index) => (
          <VersionRow key={row.version}>
            <Version>{row.version}{index === 0 ? '  最新' : ''}</Version>
            <InfoText>{row.note}</InfoText>
            <Date>{row.date}</Date>
          </VersionRow>
        ))}
      </Timeline>
    );
  }

  if (skill.code !== 'BLACK_VINYL_PAGE_THEME') {
    const rows = [
      { version: skill.version, note: '当前为预设能力展示，尚未开放独立安装包。', date: skill.updatedAt },
      { version: 'v0.0.1', note: '定义封面卡片配色方向，等待补齐规则函数、输入输出协议和评测样例。', date: '2026/06/02' },
    ];
    return (
      <Timeline>
        {rows.map((row, index) => (
          <VersionRow key={row.version}>
            <Version>{row.version}{index === 0 ? '  最新' : ''}</Version>
            <InfoText>{row.note}</InfoText>
            <Date>{row.date}</Date>
          </VersionRow>
        ))}
      </Timeline>
    );
  }

  const rows = [
    { version: skill.version, note: '落地黑胶页 S/L 调色公式：H 保持不变，输出渐变色、CSS token 与解释。', date: skill.updatedAt },
    { version: 'v0.0.3', note: '新增 Skill 详情页结构，补齐概述、安装方式、版本历史、效果验证。', date: '2026/06/02' },
    { version: 'v0.0.2', note: '接入首页 Skill 卡片入口，完成一排三模块展示。', date: '2026/06/02' },
    { version: 'v0.0.1', note: '定义黑胶页调色规则的输入、输出和可执行 token 方向。', date: '2026/06/02' },
  ];
  return (
    <Timeline>
      {rows.map((row, index) => (
        <VersionRow key={row.version}>
          <Version>{row.version}{index === 0 ? '  最新' : ''}</Version>
          <InfoText>{row.note}</InfoText>
          <Date>{row.date}</Date>
        </VersionRow>
      ))}
    </Timeline>
  );
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeHex(input) {
  const value = input.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(value)) {
    return `#${value.split('').map((char) => char + char).join('').toUpperCase()}`;
  }
  if (/^[0-9a-f]{6}$/i.test(value)) {
    return `#${value.toUpperCase()}`;
  }
  return null;
}

function hexToHsl(hex) {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const r = parseInt(normalized.slice(1, 3), 16) / 255;
  const g = parseInt(normalized.slice(3, 5), 16) / 255;
  const b = parseInt(normalized.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }

  return {
    hex: normalized,
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function parseHslNumbers(h, s, l) {
  const hh = Number(h);
  const ss = Number(s);
  const ll = Number(l);
  if (![hh, ss, ll].every(Number.isFinite)) return null;
  return {
    h: Math.round((((hh % 360) + 360) % 360)),
    s: Math.round(clampNumber(ss, 0, 100)),
    l: Math.round(clampNumber(ll, 0, 100)),
  };
}

function parseColorValue(value) {
  const raw = value.trim();
  if (!raw) return { ok: false, error: '请输入一个色值，例如 #4C4C4D 或 hsl(108 34% 13%)。' };

  const hex = hexToHsl(raw);
  if (hex) return { ok: true, value: { ...hex, source: '效果验证输入 · HEX' } };

  const hslFn = raw.match(/^hsla?\(\s*(-?\d+(?:\.\d+)?)(?:deg)?[\s,]+(\d+(?:\.\d+)?)%?[\s,]+(\d+(?:\.\d+)?)%?(?:\s*[/,]\s*[\d.]+%?)?\s*\)$/i);
  if (hslFn) {
    const hsl = parseHslNumbers(hslFn[1], hslFn[2], hslFn[3]);
    if (hsl) return { ok: true, value: { ...hsl, source: '效果验证输入 · HSL' } };
  }

  const labeled = raw.match(/^h\s*[:=]?\s*(-?\d+(?:\.\d+)?)\D+s\s*[:=]?\s*(\d+(?:\.\d+)?)%?\D+l\s*[:=]?\s*(\d+(?:\.\d+)?)%?$/i);
  if (labeled) {
    const hsl = parseHslNumbers(labeled[1], labeled[2], labeled[3]);
    if (hsl) return { ok: true, value: { ...hsl, source: '效果验证输入 · HSL' } };
  }

  const triplet = raw.match(/^\s*(-?\d+(?:\.\d+)?)\s*[,，\s]\s*(\d+(?:\.\d+)?)%?\s*[,，\s]\s*(\d+(?:\.\d+)?)%?\s*$/);
  if (triplet) {
    const hsl = parseHslNumbers(triplet[1], triplet[2], triplet[3]);
    if (hsl) return { ok: true, value: { ...hsl, source: '效果验证输入 · HSL' } };
  }

  return { ok: false, error: '暂不识别该格式。支持 #RGB、#RRGGBB、hsl(108 34% 13%)、H108 S34 L13 或 108 34 13。' };
}

function parseImageUrl(value) {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function BlackVinylValidator({ copiedKey, onCopy }) {
  const [value, setValue] = useState('#4C4C4D');
  const [extractedColor, setExtractedColor] = useState(null);
  const [imageSource, setImageSource] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractStatus, setExtractStatus] = useState('');
  const [extractError, setExtractError] = useState('');
  const [isDragover, setIsDragover] = useState(false);
  const fileInputRef = useRef(null);
  const parsed = useMemo(() => parseColorValue(value), [value]);
  const imageUrl = useMemo(() => parseImageUrl(value), [value]);
  const input = extractedColor || (imageSource ? null : imageUrl ? null : parsed.ok ? parsed.value : null);
  const theme = useMemo(() => {
    if (!input) return null;
    return createBlackVinylThemeFromHsl(input);
  }, [input]);

  const handleValueChange = useCallback((nextValue) => {
    setValue(nextValue);
    setExtractedColor(null);
    setImageSource('');
    setIsExtracting(false);
    setExtractStatus('');
    setExtractError('');
  }, []);

  const handleExtractImage = useCallback(async (input, sourceLabel) => {
    setIsExtracting(true);
    setExtractStatus('正在提取图片 D 主色…');
    setExtractError('');
    setExtractedColor(null);
    setImageSource(sourceLabel);
    try {
      const result = await extract(input, {
        onProgress: (progress) => setExtractStatus(progress.text || '正在提取图片 D 主色…'),
      });
      const swatch = result.regions?.D?.no_filter || result.dominate?.no_filter;
      if (!swatch?.hsl) throw new Error('未获取到图片 D 主色');
      setExtractedColor({ ...swatch.hsl, hex: swatch.hex, source: `${sourceLabel} · D.no_filter` });
      setImageSource(sourceLabel);
      setExtractStatus('已提取 D 主色，正在应用黑胶页调色规则。');
    } catch (error) {
      setExtractError(`图片取色失败：${error?.message || String(error)}`);
      setExtractStatus('提取失败，请检查图片后重试。');
    } finally {
      setIsExtracting(false);
    }
  }, []);

  const handleExtractUrl = useCallback(() => {
    if (!imageUrl) return;
    handleExtractImage({ url: imageUrl }, '图片链接');
  }, [handleExtractImage, imageUrl]);

  const handleImageFile = useCallback((file, sourceLabel) => {
    if (!file || !file.type?.startsWith('image/')) {
      setExtractError('请选择或粘贴图片文件。');
      return;
    }
    const fileName = file.name || '未命名图片';
    const source = `${sourceLabel || '本地图片'} · ${fileName}`;
    setValue(fileName);
    handleExtractImage({ file }, source);
  }, [handleExtractImage]);

  useEffect(() => {
    const handlePaste = (event) => {
      const imageItem = [...(event.clipboardData?.items || [])].find((item) => item.type.startsWith('image/'));
      const imageFile = imageItem?.getAsFile();
      if (imageFile) {
        event.preventDefault();
        event.stopImmediatePropagation();
        handleImageFile(imageFile, '粘贴图片');
        return;
      }

      const url = parseImageUrl(event.clipboardData?.getData('text') || '');
      if (!url) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setValue(url);
      handleExtractImage({ url }, '图片链接');
    };

    window.addEventListener('paste', handlePaste, true);
    return () => window.removeEventListener('paste', handlePaste, true);
  }, [handleExtractImage, handleImageFile]);

  const jsonPayload = useMemo(() => {
    if (!theme) return '';
    return JSON.stringify(
      {
        skillCode: theme.skillCode,
        version: theme.version,
        input: theme.base,
        range: theme.range,
        output: {
          top: theme.gradient.top,
          bottom: theme.gradient.bottom,
          backgroundGradient: theme.tokens.backgroundGradient,
        },
        tokens: theme.tokens,
        formulas: {
          saturation: theme.adjusted.saturationFormula,
          topLightness: theme.adjusted.topLightnessFormula,
          bottomLightness: theme.adjusted.bottomLightnessFormula,
        },
      },
      null,
      2,
    );
  }, [theme]);

  const cssSnippet = theme
    ? `background: ${theme.tokens.backgroundGradient};
--vinyl-bg-top: ${theme.tokens.bgTop};
--vinyl-bg-bottom: ${theme.tokens.bgBottom};
--vinyl-accent: ${theme.tokens.accent};`
    : '';
  const figmaGradientClipboard = theme ? createFigmaGradientClipboard(theme) : null;
  const figmaGradientText = figmaGradientClipboard?.plain || '';

  return (
    <>
      <Lead>
        输入 D 主色、粘贴图片链接，或上传、拖拽、粘贴图片本体即可验证黑胶页调色规则。图片会先提取 D 主色，再生成渐变；设计师可复制 Figma 渐变，开发可复制 CSS token 或 JSON。
      </Lead>
      <ValidatorGrid>
        <ValidatorCard
          $dragover={isDragover}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragover(true);
          }}
          onDragLeave={() => setIsDragover(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragover(false);
            handleImageFile(event.dataTransfer.files?.[0], '拖拽图片');
          }}
        >
          <FieldLabel htmlFor="black-vinyl-color-input">支持输入具体色值 / 图片链接 / 图片文件</FieldLabel>
          <ColorInput
            id="black-vinyl-color-input"
            value={value}
            spellCheck={false}
            placeholder="#4C4C4D / hsl(108 34% 13%) / https://..."
            onChange={(e) => handleValueChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && imageUrl) {
                e.preventDefault();
                handleExtractUrl();
              }
            }}
            onPaste={(event) => {
              const imageItem = [...event.clipboardData.items].find((item) => item.type.startsWith('image/'));
              if (!imageItem) return;
              const file = imageItem.getAsFile();
              if (!file) return;
              event.preventDefault();
              event.stopPropagation();
              handleImageFile(file, '粘贴图片');
            }}
          />
          <InputActions>
            {imageUrl ? (
                <ExtractButton type="button" onClick={handleExtractUrl} disabled={isExtracting}>
                  {isExtracting ? extractStatus : extractedColor ? '重新提取图片 D 主色' : '提取图片 D 主色'}
                </ExtractButton>
            ) : null}
            <UploadButton type="button" onClick={() => fileInputRef.current?.click()} disabled={isExtracting}>
              选择图片
            </UploadButton>
            <HiddenFileInput
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(event) => {
                handleImageFile(event.target.files?.[0], '上传图片');
                event.target.value = '';
              }}
            />
          </InputActions>
          {extractStatus || imageSource || imageUrl ? (
            <FieldHelp>
              {extractStatus || (imageSource
                ? `${imageSource}已提取 D 主色。可直接修改输入重新计算。`
                : '图片链接按回车即可提取 D 主色。')}
            </FieldHelp>
          ) : null}
          {!imageSource && !imageUrl && !parsed.ok ? <ErrorText>{parsed.error}</ErrorText> : null}
          {extractError ? <ErrorText>{extractError}</ErrorText> : null}
          {theme ? (
            <ResultRows>
              <ResultRow>
                <ResultKey>{imageSource || imageUrl ? '图片 D 主色' : '原始 D 主色'}</ResultKey>
                <ResultValue
                  type="button"
                  title="复制 D 主色"
                  onClick={() => onCopy(theme.base.hex, null, 'color-base')}
                >
                  {copiedKey === 'color-base'
                    ? '已复制色值'
                    : `${theme.base.hex} · H${theme.base.h} S${theme.base.s} L${theme.base.l}`}
                </ResultValue>
              </ResultRow>
              <ResultRow>
                <ResultKey>命中区间</ResultKey>
                <ResultValue type="button" title="复制区间" onClick={() => onCopy(theme.range, null, 'range')}>
                  {copiedKey === 'range' ? '已复制' : theme.range}
                </ResultValue>
              </ResultRow>
              <ResultRow>
                <ResultKey>新 S</ResultKey>
                <ResultValue type="button" title="复制新 S" onClick={() => onCopy(String(theme.adjusted.s), null, 'saturation')}>
                  {copiedKey === 'saturation' ? '已复制' : `${theme.adjusted.s}（÷ ${theme.adjusted.saturationDivisor}）`}
                </ResultValue>
              </ResultRow>
              <ResultRow>
                <ResultKey>顶部色</ResultKey>
                <ResultValue
                  type="button"
                  title="复制顶部色"
                  onClick={() => onCopy(theme.tokens.bgTop, null, 'color-top')}
                >
                  {copiedKey === 'color-top'
                    ? '已复制色值'
                    : `${theme.tokens.bgTop} · H${theme.gradient.top.h} S${theme.gradient.top.s} L${theme.gradient.top.l}`}
                </ResultValue>
              </ResultRow>
              <ResultRow>
                <ResultKey>底部色</ResultKey>
                <ResultValue
                  type="button"
                  title="复制底部色"
                  onClick={() => onCopy(theme.tokens.bgBottom, null, 'color-bottom')}
                >
                  {copiedKey === 'color-bottom'
                    ? '已复制色值'
                    : `${theme.tokens.bgBottom} · H${theme.gradient.bottom.h} S${theme.gradient.bottom.s} L${theme.gradient.bottom.l}`}
                </ResultValue>
              </ResultRow>
            </ResultRows>
          ) : null}
        </ValidatorCard>
        {theme ? (
          <DemoCard>
            <DemoPreview $gradient={theme.tokens.backgroundGradient}>
              <DemoText>
                <DemoTitle>效果预览</DemoTitle>
                <DemoSub>{theme.gradient.css}</DemoSub>
                <PreviewCopyButton
                  type="button"
                  onClick={() => onCopy(figmaGradientText, figmaGradientClipboard, 'figma-preview')}
                >
                  {copiedKey === 'figma-preview' ? '已复制' : '复制 Figma 渐变'}
                </PreviewCopyButton>
              </DemoText>
            </DemoPreview>
            <DemoBody>
              <DemoHeader>
                <DemoName>黑胶页渐变结果</DemoName>
                <DemoRange>{theme.range}</DemoRange>
              </DemoHeader>
              <DemoSwatches>
                <DemoSwatch type="button" title="复制 D 主色" onClick={() => onCopy(theme.base.hex, null, 'color-base')}>
                  <DemoSwatchColor $color={theme.base.hex} />
                  <DemoSwatchLabel>
                    D {theme.base.hex}<br />
                    {copiedKey === 'color-base'
                      ? <DemoSwatchCopied>已复制色值</DemoSwatchCopied>
                      : <>H{theme.base.h} S{theme.base.s} L{theme.base.l}</>}
                  </DemoSwatchLabel>
                </DemoSwatch>
                <DemoSwatch type="button" title="复制顶部色" onClick={() => onCopy(theme.tokens.bgTop, null, 'color-top')}>
                  <DemoSwatchColor $color={theme.tokens.bgTop} />
                  <DemoSwatchLabel>
                    顶点 {theme.tokens.bgTop}<br />
                    {copiedKey === 'color-top'
                      ? <DemoSwatchCopied>已复制色值</DemoSwatchCopied>
                      : <>S{theme.gradient.top.s} L{theme.gradient.top.l}</>}
                  </DemoSwatchLabel>
                </DemoSwatch>
                <DemoSwatch type="button" title="复制底部色" onClick={() => onCopy(theme.tokens.bgBottom, null, 'color-bottom')}>
                  <DemoSwatchColor $color={theme.tokens.bgBottom} />
                  <DemoSwatchLabel>
                    底点 {theme.tokens.bgBottom}<br />
                    {copiedKey === 'color-bottom'
                      ? <DemoSwatchCopied>已复制色值</DemoSwatchCopied>
                      : <>S{theme.gradient.bottom.s} L{theme.gradient.bottom.l}</>}
                  </DemoSwatchLabel>
                </DemoSwatch>
              </DemoSwatches>
              <DemoCode>{`H 保持 ${theme.base.h}
${theme.adjusted.saturationFormula}
新 S = ${theme.adjusted.s}
顶点 L = ${theme.adjusted.topL}
底点 L = ${theme.adjusted.bottomL}`}</DemoCode>
            </DemoBody>
          </DemoCard>
        ) : null}
      </ValidatorGrid>
      {theme ? (
        <>
          <H3>CSS 结果</H3>
          <Code>{cssSnippet}</Code>
          <CopyActions>
            <CopyButton
              type="button"
              onClick={() => onCopy(figmaGradientText, figmaGradientClipboard, 'figma-gradient')}
            >
              {copiedKey === 'figma-gradient' ? '已复制' : '复制 Figma 渐变'}
            </CopyButton>
            <CopyButton type="button" onClick={() => onCopy(cssSnippet, null, 'css')}>
              {copiedKey === 'css' ? '已复制' : '复制 CSS'}
            </CopyButton>
            <CopyButton type="button" onClick={() => onCopy(jsonPayload, null, 'json')}>
              {copiedKey === 'json' ? '已复制' : '复制 JSON'}
            </CopyButton>
          </CopyActions>
          <H3>JSON 结果</H3>
          <Code>{jsonPayload}</Code>
        </>
      ) : null}
    </>
  );
}

function validation(skill, copiedKey, onCopy) {
  if (skill.code === 'BLACK_VINYL_PAGE_THEME') return <BlackVinylValidator copiedKey={copiedKey} onCopy={onCopy} />;

  if (skill.code === 'BATCH_COLOR_EXTRACT') {
    const sample = `{
  "D": { "no_filter": "#4c4c4d", "with_filter": "#4c4c4d" },
  "T": { "no_filter": "#xxxxxx", "with_filter": "#xxxxxx" },
  "B": { "no_filter": "#xxxxxx", "with_filter": "#xxxxxx" },
  "L": { "no_filter": "#xxxxxx", "with_filter": "#xxxxxx" },
  "R": { "no_filter": "#xxxxxx", "with_filter": "#xxxxxx" }
}`;
    return (
      <>
        <Lead>
          验证重点是“同一张图由不同人员调用时拿到同一份 DTBLR 结构化结果”。URL 走网站接口，上传和粘贴图片走网站浏览器取色。
        </Lead>
        <Grid>
          <InfoCard><InfoTitle>一致性</InfoTitle><InfoText>所有调用方默认只消费 D/T/B/L/R，字段语义保持一致。</InfoText></InfoCard>
          <InfoCard><InfoTitle>可追踪</InfoTitle><InfoText>需要排查 AIO 或 Canvas 路径时，脚本可加 --full 输出完整结果。</InfoText></InfoCard>
          <InfoCard><InfoTitle>兜底</InfoTitle><InfoText>URL 不可读时不猜色，提示用户粘贴图片本体或上传文件。</InfoText></InfoCard>
        </Grid>
        <H3>标准结果片段</H3>
        <Code>{sample}</Code>
      </>
    );
  }

  return (
    <>
      <Lead>
        当前验证重点是“输出是否可解释、可复制、可复用”。视觉效果仍需要结合真实业务页面继续抽样校验。
      </Lead>
      <Grid>
        <InfoCard><InfoTitle>稳定性</InfoTitle><InfoText>纯函数规则，无网络依赖，输入一致时输出一致。</InfoText></InfoCard>
        <InfoCard><InfoTitle>可落地性</InfoTitle><InfoText>输出 CSS token 与 JSON，可直接给开发或设计插件消费。</InfoText></InfoCard>
        <InfoCard><InfoTitle>待补充</InfoTitle><InfoText>需要用真实黑胶页样本批量评估 L 区间公式的视觉边界。</InfoText></InfoCard>
      </Grid>
      <Code>{`建议评测集：
- 深色封面
- 高亮封面
- 低饱和灰色封面
- 大面积黑白封面
- 强红/强绿/强蓝封面`}</Code>
    </>
  );
}

export default function SkillDetailModal({ skillCode, onClose }) {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [copiedKey, setCopiedKey] = useState('');
  const copyResetTimerRef = useRef(null);
  const skill = useMemo(() => getSkillItem(skillCode), [skillCode]);

  useEffect(() => () => {
    if (copyResetTimerRef.current) window.clearTimeout(copyResetTimerRef.current);
  }, []);

  const handleCopy = useCallback(async (text, formats, key = '') => {
    const ok = await copyText(text, formats);
    if (copyResetTimerRef.current) window.clearTimeout(copyResetTimerRef.current);
    setCopiedKey(ok && key ? key : '');
    if (ok && key) {
      copyResetTimerRef.current = window.setTimeout(() => setCopiedKey(''), 1400);
    }
  }, []);

  const panels = useMemo(
    () => ({
      概述: overview(skill),
      安装方式: install(skill, copiedKey, handleCopy),
      版本历史: versions(skill),
      效果验证: validation(skill, copiedKey, handleCopy),
    }),
    [skill, copiedKey, handleCopy]
  );

  return (
    <Backdrop
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <Dialog role="dialog" aria-modal="true" aria-label={`${skill.title}详情`}>
        <Top>
          <TitleWrap>
            <Name>{skill.title}</Name>
            <Meta>
              <Pill>{skill.code}</Pill>
              <Pill>{skill.version}</Pill>
              <Pill>{skill.updatedAt}</Pill>
            </Meta>
          </TitleWrap>
          <Close type="button" aria-label="关闭" onClick={onClose}>×</Close>
        </Top>
        <TabBar>
          {TABS.map((tab) => (
            <Tab
              key={tab}
              type="button"
              $active={tab === activeTab}
              onClick={() => {
                if (tab !== activeTab) setActiveTab(tab);
              }}
            >
              {tab}
            </Tab>
          ))}
        </TabBar>
        <Content>
          {TABS.map((tab) => (
            <Panel key={tab} $active={tab === activeTab}>
              {panels[tab]}
            </Panel>
          ))}
        </Content>
      </Dialog>
    </Backdrop>
  );
}
