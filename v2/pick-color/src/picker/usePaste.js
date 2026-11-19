import { useEffect } from 'react';

/**
 * Listen for window-level paste events. If the clipboard carries an image
 * file we treat it as an immediate extraction trigger; if it carries text
 * that looks like a URL or a data URL, we just fill the input box for the
 * user to confirm.
 */
export default function usePaste({ onFile, onUrlText }) {
  useEffect(() => {
    function handler(e) {
      const items = e.clipboardData?.items;
      if (items) {
        for (const it of items) {
          if (it.type && it.type.startsWith('image/')) {
            const f = it.getAsFile();
            if (f) {
              e.preventDefault();
              onFile(f);
              return;
            }
          }
        }
      }
      const text = e.clipboardData?.getData('text');
      if (text) {
        const trimmed = text.trim();
        if (/^https?:\/\//i.test(trimmed) || /^data:image\//i.test(trimmed)) {
          e.preventDefault();
          onUrlText(trimmed);
        }
      }
    }
    window.addEventListener('paste', handler);
    return () => window.removeEventListener('paste', handler);
  }, [onFile, onUrlText]);
}
