import { useState } from 'react';
import Button from './Button.jsx';
import { IconPlus } from './icons.jsx';
import { CATEGORY_LABELS } from '../lib/format.js';

const CATEGORIES = ['general', 'followup', 'report', 'emergency'];

export default function AddPatientForm({ onAdd }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('general');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    await onAdd({ name: trimmed, category });
    setName('');
    setCategory('general');
    setBusy(false);
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-lg border border-clinic-line bg-clinic-surface p-4 sm:flex-row sm:items-end"
    >
      <label className="flex flex-1 flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-clinic-muted">
          Patient name
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          className="rounded-lg border border-clinic-line bg-white px-3 py-2 text-clinic-ink outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100"
        />
      </label>
      <label className="flex flex-col gap-1 sm:w-40">
        <span className="text-xs font-semibold uppercase tracking-wide text-clinic-muted">
          Category
        </span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-clinic-line bg-white px-3 py-2 text-clinic-ink outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" variant="primary" disabled={!name.trim() || busy}>
        <IconPlus className="h-5 w-5" />
        Add
      </Button>
    </form>
  );
}
