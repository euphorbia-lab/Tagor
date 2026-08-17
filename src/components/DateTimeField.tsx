// A date input + a time dropdown (every 15 min). Avoids the fiddly native
// datetime-local (which needed two taps and re-opened things). Emits a combined
// "YYYY-MM-DDTHH:MM" string, or "" when incomplete.

interface Props {
  label: string;
  /** Combined "YYYY-MM-DDTHH:MM" (or "YYYY-MM-DD" when timeless/all-day). */
  value: string;
  onChange: (v: string) => void;
  /** Hide the time dropdown (all-day). */
  dateOnly?: boolean;
  timeLabel: string;
}

// 00:00 .. 23:45 in 15-min steps.
const TIMES: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIMES.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

function split(value: string): { date: string; time: string } {
  if (!value) return { date: '', time: '' };
  const [d, t] = value.split('T');
  return { date: d || '', time: (t || '').slice(0, 5) };
}

export default function DateTimeField({ label, value, onChange, dateOnly, timeLabel }: Props) {
  const { date, time } = split(value);

  function setDate(d: string) {
    if (!d) return onChange('');
    onChange(dateOnly ? d : `${d}T${time || '19:00'}`);
  }
  function setTime(t: string) {
    if (!date) return; // need a date first
    onChange(`${date}T${t}`);
  }

  return (
    <div className="dtf">
      <span className="dtf__label">{label}</span>
      <div className="dtf__row">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        {!dateOnly && (
          <select
            aria-label={timeLabel}
            value={time || ''}
            onChange={(e) => setTime(e.target.value)}
            disabled={!date}
          >
            <option value="" disabled>
              {timeLabel}
            </option>
            {TIMES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
      </div>
      <style>{`
        .dtf { display: grid; gap: 6px; }
        .dtf__label { font-weight: 600; font-size: 14px; }
        .dtf__row { display: flex; gap: 8px; }
        .dtf__row input[type="date"] { flex: 1 1 60%; }
        .dtf__row select { flex: 0 0 40%; }
      `}</style>
    </div>
  );
}
