import { useState, useCallback, useMemo } from 'react';
import { getStoredLang, storeLang, translator } from '../lib/i18n.js';

export function useLang() {
  const [lang, setLang] = useState(getStoredLang);

  const changeLang = useCallback((code) => {
    storeLang(code);
    setLang(code);
  }, []);

  const t = useMemo(() => translator(lang), [lang]);

  return { lang, changeLang, t };
}
