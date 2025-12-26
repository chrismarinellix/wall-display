import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useSettings } from '../../contexts/SettingsContext';

export function ClockWidget() {
  const [time, setTime] = useState(new Date());
  const { settings } = useSettings();

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const timeFormat = settings.timeFormat === '12h' ? 'h:mm' : 'HH:mm';
  const ampm = settings.timeFormat === '12h' ? format(time, 'a') : '';

  return (
    <div className="eink-mono text-right">
      <div className="text-2xl font-medium text-eink-black tracking-tight">
        {format(time, timeFormat)}
        {ampm && <span className="text-sm ml-1 text-eink-dark">{ampm}</span>}
      </div>
      <div className="text-xs text-eink-dark">
        {format(time, 'EEEE, MMM d')}
      </div>
    </div>
  );
}
