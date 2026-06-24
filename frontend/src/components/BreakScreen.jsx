import Countdown from './Countdown.jsx';
import { IconPause } from './icons.jsx';

// Full-screen calm break state. Sizing is driven by the `scale` prop so the same
// component reads correctly on a TV (large) and a phone (compact).
export default function BreakScreen({ seconds, scale = 'tv', message, resumingLabel }) {
  const isTv = scale === 'tv';
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-teal-700 text-white">
      <IconPause className={isTv ? 'mb-8 h-[8vw] w-[8vw]' : 'mb-4 h-12 w-12'} />
      <p
        className={
          isTv
            ? 'max-w-[80vw] text-center text-[4vw] font-semibold leading-tight'
            : 'max-w-xs text-center text-2xl font-semibold leading-tight'
        }
      >
        {message}
      </p>
      <div className={isTv ? 'mt-10 text-center' : 'mt-6 text-center'}>
        <p className={isTv ? 'text-[2vw] text-teal-100' : 'text-sm text-teal-100'}>
          {resumingLabel}
        </p>
        <Countdown
          seconds={seconds}
          className={
            isTv
              ? 'text-[12vw] font-extrabold leading-none'
              : 'text-6xl font-extrabold leading-none'
          }
        />
      </div>
    </div>
  );
}
