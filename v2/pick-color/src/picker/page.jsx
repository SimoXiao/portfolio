import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { extract, sanitizeUrl } from '../lib/picker-pipeline';
import { SAMPLE_COVER_DATA_URL } from './sample-data';
import DropZone from './DropZone';
import GlobalStyle from './global-style';
import Header from './Header';
import HistoryStack from './HistoryStack';
import ResultCard from './ResultCard';
import SkillDetailModal from './SkillDetailModal';
import Toast from './Toast';
import usePaste from './usePaste';

const Container = styled.div`
  max-width: 1080px;
  margin: 0 auto;
  padding: ${(p) => (p.$homeMode ? '230px 28px 60px' : '88px 28px 60px')};
  position: relative;
  z-index: 1;
  width: 100%;
  transition: padding-top 0.28s ease;

  @media (max-width: 640px) {
    padding: ${(p) => (p.$homeMode ? '132px 16px 60px' : '32px 16px 60px')};
  }
`;

const PageLogo = styled.div`
  position: absolute;
  top: 22px;
  left: 28px;
  z-index: 5;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-size: 13px;
  line-height: 1;
  font-weight: 600;
  color: hsl(var(--text-2));
  cursor: pointer;
  user-select: none;
  transition: color 0.16s ease;

  &:hover {
    color: hsl(var(--text));
  }

  @keyframes logoDotPulse {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.6;
      transform: scale(0.85);
    }
  }

  span:first-child {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: hsl(var(--status-green));
    box-shadow:
      0 0 0 4px hsl(var(--status-green) / 0.12),
      0 0 16px hsl(var(--status-green) / 0.95);
    animation: logoDotPulse 2s ease-in-out infinite;
  }

  em {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 13px;
    font-style: normal;
    padding: 0 4px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 3px;
    color: hsl(var(--text-3));
    font-size: 10px;
    line-height: 1;
    font-family: var(--font-mono);
  }

  @media (max-width: 720px) {
    position: static;
    margin: 18px 0 8px;
    justify-content: center;
  }
`;


const BackLink = styled.a`
  position: absolute;
  top: 20px;
  right: 28px;
  z-index: 5;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.045);
  color: hsl(var(--text-2));
  font-size: 12px;
  font-weight: 500;
  text-decoration: none;
  transition: color 0.16s ease, border-color 0.16s ease, background 0.16s ease;

  &:hover {
    color: hsl(var(--text));
    border-color: rgba(255, 231, 186, 0.34);
    background: rgba(255, 255, 255, 0.08);
  }

  @media (max-width: 720px) {
    position: static;
    align-self: center;
    margin: 4px auto 8px;
    background: rgba(8, 15, 22, 0.72);
  }
`;

const BackgroundShade = styled.div`
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(10, 17, 26, 0) 0%, #0a151c 35.34%, #0a121a 60.73%);
`;

const HISTORY_DB_NAME = 'pick-color-history';
const HISTORY_STORE_NAME = 'picker-state';
const HISTORY_STATE_KEY = 'results';
const HISTORY_STORAGE_FALLBACK_KEY = 'pick-color:results:v1';
const HISTORY_MAX_RESULTS = 100;
let persistenceQueue = Promise.resolve();

function enqueuePersistence(task) {
  const next = persistenceQueue.catch(() => {}).then(task);
  persistenceQueue = next.catch(() => {});
  return next;
}

function trimHistoryResults(results) {
  return Array.isArray(results) ? results.slice(0, HISTORY_MAX_RESULTS) : [];
}

function fileSizeText(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

let fallbackCopyTextarea = null;

function getFallbackCopyTextarea() {
  if (fallbackCopyTextarea) return fallbackCopyTextarea;
  fallbackCopyTextarea = document.createElement('textarea');
  fallbackCopyTextarea.setAttribute('readonly', '');
  fallbackCopyTextarea.style.cssText = [
    'position:fixed',
    'left:-9999px',
    'top:0',
    'width:1px',
    'height:1px',
    'opacity:0',
    'pointer-events:none',
  ].join(';');
  document.body.appendChild(fallbackCopyTextarea);
  return fallbackCopyTextarea;
}

async function copyText(text) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fall through to the legacy path for LAN http access.
    }
  }

  const textarea = getFallbackCopyTextarea();
  textarea.value = text;
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch (err) {
    copied = false;
  }
  return copied;
}

function openHistoryDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('indexedDB unavailable'));
      return;
    }

    const request = window.indexedDB.open(HISTORY_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(HISTORY_STORE_NAME)) {
        db.createObjectStore(HISTORY_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('indexedDB open failed'));
  });
}

async function loadPersistedResults() {
  try {
    const db = await openHistoryDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(HISTORY_STORE_NAME, 'readonly');
      const store = tx.objectStore(HISTORY_STORE_NAME);
      const request = store.get(HISTORY_STATE_KEY);
      request.onsuccess = () => resolve(trimHistoryResults(request.result));
      request.onerror = () => reject(request.error || new Error('indexedDB read failed'));
      tx.oncomplete = () => db.close();
      tx.onerror = () => db.close();
    });
  } catch (err) {
    try {
      const raw = window.localStorage?.getItem(HISTORY_STORAGE_FALLBACK_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return trimHistoryResults(parsed);
    } catch {
      return [];
    }
  }
}

async function savePersistedResults(results) {
  const limited = trimHistoryResults(results);
  return enqueuePersistence(async () => {
    try {
      const db = await openHistoryDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(HISTORY_STORE_NAME, 'readwrite');
        const store = tx.objectStore(HISTORY_STORE_NAME);
        const request = store.put(limited, HISTORY_STATE_KEY);
        request.onerror = () => reject(request.error || new Error('indexedDB write failed'));
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error || new Error('indexedDB transaction failed'));
        };
      });
    } catch (err) {
      try {
        window.localStorage?.setItem(HISTORY_STORAGE_FALLBACK_KEY, JSON.stringify(limited));
      } catch {
        /* ignore persistence failures */
      }
    }
  });
}

async function clearPersistedResults() {
  return enqueuePersistence(async () => {
    try {
      window.localStorage?.removeItem(HISTORY_STORAGE_FALLBACK_KEY);
    } catch {
      /* keep indexedDB cleanup below */
    }

    try {
      const db = await openHistoryDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(HISTORY_STORE_NAME, 'readwrite');
        const store = tx.objectStore(HISTORY_STORE_NAME);
        const request = store.delete(HISTORY_STATE_KEY);
        request.onerror = () => reject(request.error || new Error('indexedDB delete failed'));
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error || new Error('indexedDB transaction failed'));
        };
      });
    } catch (err) {
      /* keep fallback cleanup below */
    }

    try {
      window.localStorage?.removeItem(HISTORY_STORAGE_FALLBACK_KEY);
    } catch {
      /* ignore persistence failures */
    }
  });
}

export default function PickerPage() {
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState({ text: '', kind: '' });
  const [results, setResults] = useState([]);
  const [currentKey, setCurrentKey] = useState(null);
  const [homeMode, setHomeMode] = useState(true);
  const [dragover, setDragover] = useState(false);
  const [activeSkillCode, setActiveSkillCode] = useState(null);
  const [toast, setToast] = useState({ message: '', visible: false });
  const pendingFileRef = useRef(null);
  const toastTimer = useRef(0);
  const toastFrame = useRef(0);
  const pendingToastMessage = useRef('');
  const resetTokenRef = useRef(0);

  const current = useMemo(
    () => (
      homeMode
        ? null
        : results.find((item) => item.resultKey === currentKey) || results[0] || null
    ),
    [homeMode, results, currentKey],
  );
  const history = useMemo(
    () => (homeMode ? [] : results.filter((item) => item.resultKey !== current?.resultKey)),
    [homeMode, results, current?.resultKey],
  );

  const showToast = useCallback((message) => {
    pendingToastMessage.current = message;
    if (toastFrame.current) return;
    toastFrame.current = window.requestAnimationFrame(() => {
      toastFrame.current = 0;
      setToast({ message: pendingToastMessage.current, visible: true });
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast((t) => ({ ...t, visible: false })), 1600);
    });
  }, []);

  const pushResult = useCallback((next) => {
    setResults((prev) => {
      const stack = trimHistoryResults([next, ...prev.filter((x) => x.resultKey !== next.resultKey)]);
      savePersistedResults(stack);
      return stack;
    });
    setCurrentKey(next.resultKey);
    setHomeMode(false);
  }, []);

  const handleDeleteHistory = useCallback(
    (key) => {
      setResults((prev) => {
        const next = prev.filter((item) => item.resultKey !== key);
        savePersistedResults(next);
        return next;
      });
      showToast('✓ 已删除历史记录');
    },
    [showToast],
  );

  const handleLogoHome = useCallback(async () => {
    resetTokenRef.current += 1;
    pendingFileRef.current = null;
    setInputValue('');
    setStatus({ text: '', kind: '' });
    setActiveSkillCode(null);
    setResults([]);
    setCurrentKey(null);
    setHomeMode(true);
    await clearPersistedResults();
    showToast('✓ 已清空历史记录');
  }, [showToast]);

  const handleReturnHome = useCallback(() => {
    pendingFileRef.current = null;
    setInputValue('');
    setStatus({ text: '', kind: '' });
    setActiveSkillCode(null);
    setCurrentKey(null);
    setHomeMode(true);
  }, []);

  const doExtract = useCallback(
    async (input) => {
      setStatus({
        text:
          input.url
            ? '正在通过浏览器读取图片 URL…'
            : '浏览器本地取色中…',
        kind: 'loading',
      });
      try {
        const next = await extract(input, {
          onProgress: (progress) => {
            setStatus({
              text: progress.text,
              kind: progress.kind || 'loading',
            });
          },
        });
        pushResult(next);
        setStatus({ text: '✓ 完成', kind: 'success' });
        window.setTimeout(() => {
          setStatus((s) => (s.text === '✓ 完成' ? { text: '', kind: '' } : s));
        }, 900);
      } catch (err) {
        setStatus({ text: `✗ ${err?.message || String(err)}`, kind: 'error' });
      }
    },
    [pushResult],
  );


  const handleSample = useCallback(() => {
    pendingFileRef.current = null;
    setInputValue('示例封面 · 黑底高饱和对比样本');
    doExtract({ base64: SAMPLE_COVER_DATA_URL, sourceLabel: '示例封面 · 黑底绿瞳' });
  }, [doExtract]);

  const handleFile = useCallback(
    (file) => {
      pendingFileRef.current = file;
      setInputValue(`📎 ${file.name || '剪贴板图片'}（${fileSizeText(file.size)}）`);
      doExtract({ file });
    },
    [doExtract],
  );

  const handleInputChange = useCallback((val) => {
    setInputValue(val);
    if (pendingFileRef.current && !val.startsWith('📎')) {
      pendingFileRef.current = null;
    }
  }, []);

  const handleSubmit = useCallback(() => {
    if (pendingFileRef.current) {
      doExtract({ file: pendingFileRef.current });
      return;
    }
    const raw = inputValue.trim();
    if (!raw) {
      setStatus({ text: '请粘贴图片 URL，或拖拽 / 粘贴 / 选择图片', kind: 'error' });
      return;
    }
    if (/^data:image\//i.test(raw)) {
      doExtract({ base64: raw });
      return;
    }
    if (/^https?:\/\//i.test(raw)) {
      const cleaned = sanitizeUrl(raw);
      if (cleaned !== raw) {
        setInputValue(cleaned);
        setStatus({ text: '⚠️ 检测到 URL 重复拼接，已自动清洗后重试', kind: 'loading' });
      }
      doExtract({ url: cleaned });
      return;
    }
    setStatus({ text: '无法识别：请输入 http(s) 图片 URL，或拖拽 / 粘贴图片', kind: 'error' });
  }, [doExtract, inputValue]);

  usePaste({
    onFile: (f) => {
      pendingFileRef.current = f;
      setInputValue(`📎 粘贴的图片（${fileSizeText(f.size)}）`);
      doExtract({ file: f });
    },
    onUrlText: (text) => {
      pendingFileRef.current = null;
      setInputValue(text);
      const kind = /^data:image\//i.test(text) ? 'base64 图片' : 'URL';
      setStatus({ text: `已识别为 ${kind}，点击「开始取色」`, kind: 'success' });
    },
  });

  useEffect(() => {
    let alive = true;
    const token = resetTokenRef.current;
    loadPersistedResults().then((stored) => {
      if (!alive || token !== resetTokenRef.current || !stored.length) return;
      setResults(stored);
      setCurrentKey(stored[0].resultKey);
      setHomeMode(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    function keydownHandler(e) {
      if (e.defaultPrevented || e.isComposing || e.key !== 'Enter') return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;

      const target = e.target;
      const tag = target?.tagName?.toLowerCase?.() || '';
      if (target?.isContentEditable || tag === 'textarea' || tag === 'select') return;
      if ((tag === 'button' || tag === 'a') && target?.id !== 'main-input') return;
      if (tag === 'input' && target?.id !== 'main-input') return;
      if (!pendingFileRef.current && !inputValue.trim()) return;

      e.preventDefault();
      handleSubmit();
    }

    window.addEventListener('keydown', keydownHandler);
    return () => window.removeEventListener('keydown', keydownHandler);
  }, [handleSubmit, inputValue]);

  // Global click-to-copy on any [data-hex] element.
  useEffect(() => {
    async function clickHandler(e) {
      const target = e.target?.closest?.('[data-hex]');
      if (!target) return;
      const hex = target.getAttribute('data-hex');
      if (!hex) return;
      const copied = await copyText(hex);
      showToast(copied ? `✓ 已复制 ${hex}` : hex);
    }
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  }, [showToast]);

  // Cleanup toast timer on unmount.
  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      if (toastFrame.current) window.cancelAnimationFrame(toastFrame.current);
    };
  }, []);

  return (
    <>
      <GlobalStyle />
      <PageLogo
        role="button"
        tabIndex={0}
        aria-label="回到首页并清除所有历史记录"
        title="回到首页并清除所有历史记录"
        onClick={handleLogoHome}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleLogoHome();
          }
        }}
      >
        <span />
        <span>NetEase Cloud Music Color Picking Service</span>
        <em>V2</em>
      </PageLogo>
      <BackLink href="../index.html#tool-color-picker">← 返回作品集</BackLink>
      {!homeMode && <BackgroundShade />}
      <Container $homeMode={homeMode}>
        <Header onHome={handleReturnHome} />
        <DropZone
          inputValue={inputValue}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
          onFile={handleFile}
          status={status}
          dragover={dragover}
          setDragover={setDragover}
          showSkills={homeMode}
          onSkillOpen={setActiveSkillCode}
          onSample={handleSample}
        />
        {current && <ResultCard result={current} />}
        <HistoryStack history={history} onDelete={handleDeleteHistory} />
      </Container>
      {activeSkillCode && (
        <SkillDetailModal
          skillCode={activeSkillCode}
          onClose={() => setActiveSkillCode(null)}
        />
      )}
      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}
