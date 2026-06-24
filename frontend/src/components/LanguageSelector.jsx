import { LANGUAGES } from '../lib/i18n.js';

export default function LanguageSelector({ lang, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => onChange(l.code)}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            lang === l.code
              ? 'bg-teal-500 text-white'
              : 'bg-clinic-surface text-clinic-muted border border-clinic-line hover:border-teal-300'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
