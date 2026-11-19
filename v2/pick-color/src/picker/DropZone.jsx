import React, { useRef } from 'react';
import styled, { css } from 'styled-components';
import { SKILL_ITEMS } from './skill-catalog';

const Section = styled.section`
  max-width: var(--content-width);
  margin: 0 auto 48px;
`;

const Zone = styled.div`
  background: hsl(var(--glass-bg));
  border: 1px solid hsl(var(--border));
  border-radius: 24px;
  padding: 28px 24px;
  text-align: center;
  transition: background 0.2s ease, border-color 0.2s ease;
  position: relative;
  isolation: isolate;
  --picker-border-angle: 0deg;

  @keyframes pickerBorderSpin {
    0% {
      --picker-border-angle: 0deg;
      opacity: 0;
    }
    10% {
      opacity: 1;
    }
    82% {
      opacity: 1;
    }
    100% {
      --picker-border-angle: 360deg;
      opacity: 0;
    }
  }

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 24px;
    box-shadow: inset 0 1px 0 hsl(0 0% 100% / 0.08);
    pointer-events: none;
    z-index: 0;
  }

  &::after {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 25px;
    padding: 1px;
    background: conic-gradient(
      from var(--picker-border-angle),
      transparent 0deg,
      transparent 242deg,
      rgba(255, 255, 225, 0.72) 278deg,
      rgba(148, 255, 219, 0.68) 316deg,
      rgba(255, 122, 35, 0.62) 344deg,
      rgba(255, 240, 172, 0.66) 354deg,
      transparent 360deg
    );
    opacity: 0;
    pointer-events: none;
    z-index: 0;
    animation: none;
    transition: opacity 0.2s ease;
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask-composite: exclude;
  }

  > * {
    position: relative;
    z-index: 1;
  }

  &:hover {
    background: hsl(var(--glass-bg-hover));
    border-color: rgba(255, 246, 218, 0.18);
  }

  &:hover::after {
    animation: pickerBorderSpin 2.2s linear 1;
  }

  /* dragover: 跟 hover 同效果，但通过 prop 强制保持（拖拽时鼠标可能不在 zone 中心） */
  ${(p) =>
    p.$dragover &&
    css`
      background: hsl(var(--glass-bg-hover));
      border-color: rgba(255, 231, 186, 0.38);
      &::after {
        animation: pickerBorderSpin 2.2s linear 1;
      }
    `}

  @media (max-width: 640px) {
    padding: 22px 18px;
    border-radius: 20px;
  }
`;

const Icon = styled.div`
  font-size: 32px;
  margin-bottom: 8px;
  opacity: 0.9;
  display: inline-block;
`;

const ZoneTitle = styled.div`
  font-size: 15px;
  color: hsl(var(--text-2));
  margin-bottom: 18px;
  font-weight: 500;
  letter-spacing: -0.005em;
`;

const Row = styled.form`
  display: flex;
  gap: 10px;
  align-items: stretch;
  flex-wrap: wrap;
`;

const InputCombo = styled.div`
  flex: 1;
  min-width: min(280px, 100%);
  display: flex;
  align-items: stretch;
  background: hsl(220 20% 100% / 0.04);
  border: 1px solid hsl(var(--border));
  border-radius: 14px;
  overflow: hidden;
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
  &:focus-within {
    background: hsl(220 20% 100% / 0.06);
    border-color: rgba(255, 231, 186, 0.42);
    box-shadow:
      0 0 0 3px rgba(148, 255, 219, 0.1),
      0 0 18px rgba(255, 122, 35, 0.12),
      inset 0 1px 0 rgba(255, 255, 225, 0.12);
  }
`;

const InputWrap = styled.div`
  flex: 1;
  min-width: 0;
  position: relative;
  display: flex;
`;

const InputPlaceholder = styled.div`
  position: absolute;
  inset: 0;
  display: ${(p) => (p.$hidden ? 'none' : 'flex')};
  align-items: center;
  gap: 5px;
  padding: 0 16px;
  color: hsl(var(--text-3));
  font-size: 15px;
  line-height: 1;
  text-align: left;
  pointer-events: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const KeyBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 18px;
  padding: 0 4px;
  border-radius: 4px;
  background: hsl(220 18% 100% / 0.07);
  border: none;
  box-shadow: none;
  color: hsl(var(--accent-3));
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 400;
  line-height: 1;
`;

const Input = styled.input`
  flex: 1;
  width: 100%;
  min-width: 0;
  border: none;
  background: transparent;
  color: hsl(var(--text));
  font: inherit;
  font-size: 14px;
  padding: 12px 16px;
  outline: none;
  &::placeholder {
    color: hsl(var(--text-3));
  }
`;

const ComboButton = styled.label`
  background: transparent;
  color: hsl(var(--text-2));
  border: none;
  border-left: 1px solid hsl(var(--border));
  padding: 0 18px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  font-family: var(--font-sans);
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
  &:hover {
    background: hsl(var(--glass-bg-hover));
    color: rgba(255, 255, 255, 0.92);
  }
`;

const HiddenFile = styled.input.attrs({ type: 'file', accept: 'image/*' })`
  display: none;
`;

const Primary = styled.button`
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background:
    radial-gradient(circle at 28% 20%, rgba(255, 255, 255, 0.7), transparent 25%),
    radial-gradient(circle at 72% 72%, rgba(255, 122, 35, 0.42), transparent 38%),
    linear-gradient(135deg, rgba(255, 255, 225, 0.96), rgba(148, 255, 219, 0.58) 48%, rgba(255, 240, 172, 0.9));
  background-size: 160% 160%, 150% 150%, 180% 180%;
  background-position: 18% 18%, 78% 78%, 0% 50%;
  color: hsla(10, 74%, 49%, 1);
  border: 1px solid rgba(255, 246, 218, 0.3);
  padding: 0 24px;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  font-family: var(--font-sans);
  letter-spacing: -0.005em;
  transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s, border-color 0.2s, background-position 0.42s ease;
  white-space: nowrap;
  text-shadow: 0 1px 1px rgba(255, 255, 255, 0.34);
  box-shadow:
    0 8px 20px rgba(0, 0, 0, 0.22),
    0 3px 12px rgba(255, 94, 34, 0.16),
    inset 0 0.5px 0 rgba(255, 255, 255, 0.34),
    inset 0 -8px 20px rgba(255, 112, 35, 0.16);

  &::before {
    content: '';
    position: absolute;
    inset: 1px 1.5px;
    z-index: -1;
    border-radius: inherit;
    background:
      linear-gradient(115deg, rgba(255, 255, 255, 0.24), transparent 32%),
      radial-gradient(circle at 82% 26%, rgba(255, 255, 255, 0.18), transparent 26%),
      linear-gradient(285deg, rgba(72, 255, 218, 0.16), transparent 48%);
    opacity: 0.9;
    pointer-events: none;
    transition: opacity 0.2s ease, transform 0.28s ease;
  }

  &::after {
    content: '';
    position: absolute;
    left: -38%;
    top: -58%;
    width: 58%;
    height: 220%;
    z-index: -1;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(108, 255, 218, 0.18),
      rgba(255, 255, 255, 0.6),
      rgba(255, 104, 36, 0.28),
      transparent
    );
    transform: rotate(18deg);
    opacity: 0.36;
    pointer-events: none;
    transition: transform 0.5s cubic-bezier(0.16, 0.95, 0.25, 1), opacity 0.2s ease;
  }

  &:hover {
    transform: translateY(-2px);
    background-position: 38% 12%, 62% 84%, 100% 50%;
    border-color: rgba(255, 231, 186, 0.48);
    box-shadow:
      0 10px 24px rgba(0, 0, 0, 0.24),
      0 5px 16px rgba(255, 94, 34, 0.22),
      inset 0 0.5px 0 rgba(255, 255, 255, 0.42),
      inset 0 -8px 20px rgba(255, 112, 35, 0.2);
  }

  &:hover::before {
    opacity: 1;
    transform: scale(1.01);
  }

  &:hover::after {
    transform: translateX(310%) rotate(18deg);
    opacity: 0.78;
  }

  &:active {
    transform: translateY(0);
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }

  @media (max-width: 640px) {
    width: 100%;
    padding: 14px;
  }
`;

const StatusBar = styled.div`
  margin-top: 18px;
  font-size: 13px;
  min-height: 18px;
  color: hsl(var(--text-2));
  text-align: center;
  &[data-kind='success'] {
    color: hsl(var(--status-green));
  }
  &[data-kind='loading'] {
    color: hsl(var(--accent-3));
  }
  &[data-kind='error'] {
    color: hsl(var(--danger));
  }
`;


const SampleRow = styled.div`
  margin-top: 12px;
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const SampleButton = styled.button`
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(8, 15, 22, 0.72);
  color: hsl(var(--text-2));
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 12px;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: color 0.16s ease, border-color 0.16s ease, background 0.16s ease;

  &:hover {
    color: hsl(var(--text));
    border-color: rgba(255, 231, 186, 0.28);
    background: rgba(12, 22, 31, 0.86);
  }
`;

const SkillGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-auto-rows: 128px;
  align-items: stretch;
  gap: 14px;
  margin-top: 30px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
    grid-auto-rows: auto;
    margin-top: 20px;
  }
`;

const SkillCard = styled.button`
  height: 100%;
  padding: 18px 18px 16px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.03)),
    rgba(10, 18, 25, 0.66);
  color: hsl(var(--text));
  text-align: left;
  cursor: pointer;
  display: grid;
  grid-template-rows: 22px 1fr;
  row-gap: 14px;
  align-content: start;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 14px 34px rgba(0, 0, 0, 0.18);
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(255, 231, 186, 0.28);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.105), rgba(255, 255, 255, 0.04)),
      rgba(14, 25, 33, 0.72);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.1),
      0 18px 42px rgba(0, 0, 0, 0.22),
      0 0 22px rgba(148, 255, 219, 0.08);
  }

  &:focus-visible {
    outline: 2px solid rgba(148, 255, 219, 0.58);
    outline-offset: 3px;
  }
`;

const SkillHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: 22px;
  min-width: 0;
`;

const SkillTitle = styled.div`
  min-width: 0;
  font-size: 14px;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: -0.005em;
  color: rgba(255, 255, 255, 0.92);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const SkillBadge = styled.span`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 18px;
  padding: 0 7px;
  border-radius: 999px;
  background: rgba(255, 245, 205, 0.92);
  color: hsla(10, 74%, 49%, 1);
  font-size: 10px;
  line-height: 1;
  font-weight: 700;
`;

const SkillText = styled.p`
  color: hsl(var(--text-2) / 0.74);
  font-size: 12px;
  line-height: 1.58;
  letter-spacing: -0.005em;
  margin: 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
`;

function SkillModules({ visible, onSkillOpen }) {
  if (!visible) return null;
  return (
    <SkillGrid aria-label="取色 Skill 模块">
      {SKILL_ITEMS.map((item) => (
        <SkillCard
          key={item.code}
          type="button"
          data-skill-code={item.code}
          aria-label={`${item.title} Skill`}
          title={`${item.title}：${item.text}`}
          onClick={() => onSkillOpen?.(item.code)}
        >
          <SkillHeader>
            <SkillTitle>{item.title}</SkillTitle>
            <SkillBadge>{item.badge}</SkillBadge>
          </SkillHeader>
          <SkillText>{item.text}</SkillText>
        </SkillCard>
      ))}
    </SkillGrid>
  );
}

export default function DropZone({
  inputValue,
  onInputChange,
  onSubmit,
  onFile,
  status,
  dragover,
  setDragover,
  showSkills,
  onSkillOpen,
  onSample,
}) {
  const fileRef = useRef(null);

  return (
    <Section>
      <Zone
        $dragover={dragover}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragover(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragover(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragover(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragover(false);
          const f = e.dataTransfer.files && e.dataTransfer.files[0];
          if (f) onFile(f);
        }}
      >
        <Icon>🎨</Icon>
        <ZoneTitle>把图片地址 / 本地文件 / 截图 都扔到这里</ZoneTitle>
        <Row
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <InputCombo>
            <InputWrap>
              <InputPlaceholder $hidden={!!inputValue}>
                <span>大胆使用</span>
                <KeyBadge>Cmd+V</KeyBadge>
                <span>粘贴图片URL，或上传/拖拽/粘贴图片</span>
              </InputPlaceholder>
              <Input
                id="main-input"
                value={inputValue}
                onChange={(e) => onInputChange(e.target.value)}
              />
            </InputWrap>
            <ComboButton htmlFor="file-input">📂 选择文件</ComboButton>
            <HiddenFile
              id="file-input"
              ref={fileRef}
              onChange={(e) => {
                const f = e.target.files && e.target.files[0];
                if (f) onFile(f);
                e.target.value = '';
              }}
            />
          </InputCombo>
          <Primary type="submit">
            开始取色
          </Primary>
        </Row>
        <StatusBar data-kind={status?.kind || ''}>{status?.text || ''}</StatusBar>
        {onSample && (
          <SampleRow>
            <SampleButton type="button" onClick={onSample}>
              ⚡ 加载示例图片一键取色
            </SampleButton>
          </SampleRow>
        )}
      </Zone>
      <SkillModules visible={showSkills} onSkillOpen={onSkillOpen} />
    </Section>
  );
}
