import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket.js';
import { useLang } from '../hooks/useLang.js';
import LanguageSelector from '../components/LanguageSelector.jsx';
import BreakScreen from '../components/BreakScreen.jsx';
import CategoryBadge from '../components/CategoryBadge.jsx';
import { confidenceLabel } from '../lib/i18n.js';

function minutes(seconds) {
  return Math.max(0, Math.round(seconds / 60));
}

function WaitBlock({ me, t }) {
  if (!me.wait) return null;
  return (
    <div className="rounded-xl border border-clinic-line bg-clinic-surface p-5">
      <p className="text-sm font-medium uppercase tracking-wide text-clinic-muted">
        {t('estimatedWait')}
      </p>
      <p className="mt-1 text-4xl font-bold tabular-nums text-clinic-ink">
        {minutes(me.wait.rangeLow)} to {minutes(me.wait.rangeHigh)} {t('minutes')}
      </p>
      <p className="mt-2 inline-flex rounded-md bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700">
        {confidenceLabel(t, me.wait.confidence)} {t('confidence')}
      </p>
    </div>
  );
}

export default function PatientPage() {
  const { tokenId } = useParams();
  const [me, setMe] = useState(null);
  const { lang, changeLang, t } = useLang();
  useSocket({ tokenId, onPatientUpdate: setMe });

  const header = (
    <header className="mb-6 flex items-center justify-between">
      <span className="text-sm font-semibold text-teal-600">Queue Cure</span>
      <LanguageSelector lang={lang} onChange={changeLang} />
    </header>
  );

  if (!me) {
    return (
      <div className="mx-auto min-h-screen max-w-md px-5 py-8">
        {header}
        <p className="mt-20 text-center text-clinic-muted">{t('connecting')}</p>
      </div>
    );
  }

  if (me.break?.isPaused) {
    return (
      <div className="mx-auto min-h-screen max-w-md px-5 py-8">
        {header}
        <div className="mt-4 overflow-hidden rounded-2xl">
          <div className="h-[60vh]">
            <BreakScreen
              seconds={me.break.breakRemaining}
              scale="phone"
              message={t('breakMessage')}
              resumingLabel={t('resumingIn')}
            />
          </div>
        </div>
        <div className="mt-6 text-center">
          <p className="text-sm text-clinic-muted">{t('yourToken')}</p>
          <p className="text-5xl font-extrabold tabular-nums text-teal-600">
            {me.tokenNumber}
          </p>
        </div>
      </div>
    );
  }

  if (me.status === 'active') {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
        {header}
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl bg-teal-500 px-6 py-12 text-center text-white">
          <p className="text-7xl font-extrabold tabular-nums">{me.tokenNumber}</p>
          <p className="mt-4 text-2xl font-bold">{t('yourTurnTitle')}</p>
          <p className="mt-2 text-teal-50">{t('yourTurnBody')}</p>
        </div>
      </div>
    );
  }

  if (me.status === 'done') {
    return (
      <div className="mx-auto min-h-screen max-w-md px-5 py-8">
        {header}
        <div className="mt-10 rounded-2xl border border-clinic-line bg-clinic-surface p-8 text-center">
          <p className="text-5xl font-extrabold tabular-nums text-clinic-muted">
            {me.tokenNumber}
          </p>
          <p className="mt-4 text-lg font-medium text-clinic-ink">{t('done')}</p>
        </div>
      </div>
    );
  }

  const isNext = me.ahead === 0;

  return (
    <div className="mx-auto min-h-screen max-w-md px-5 py-8">
      {header}

      <div className="rounded-2xl border border-clinic-line bg-clinic-surface p-6 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-clinic-muted">
          {t('yourToken')}
        </p>
        <p className="mt-1 text-7xl font-extrabold tabular-nums text-teal-600">
          {me.tokenNumber}
        </p>
        <div className="mt-3 flex justify-center">
          <CategoryBadge category={me.category} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-clinic-line bg-clinic-surface p-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-clinic-muted">
            {t('nowServing')}
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-clinic-ink">
            {me.nowServing ?? '--'}
          </p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-clinic-line bg-clinic-surface p-4 text-center">
          {isNext ? (
            <p className="text-lg font-bold text-teal-600">{t('noneAhead')}</p>
          ) : (
            <>
              <p className="text-3xl font-bold tabular-nums text-clinic-ink">
                {me.ahead}
              </p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-clinic-muted">
                {t('aheadOfYou')}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="mt-4">
        <WaitBlock me={me} t={t} />
      </div>
    </div>
  );
}
