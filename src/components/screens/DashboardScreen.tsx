import { format } from 'date-fns';
import { Mail, Calendar, Sun, Cloud, CloudRain, CloudSnow } from 'lucide-react';
import { useEmails } from '../../hooks/useEmails';
import { useCalendar } from '../../hooks/useCalendar';
import { useWeather } from '../../hooks/useWeather';
import { useScreen } from '../../contexts/ScreenContext';
import { weatherCodeToDescription } from '../../types/weather';

function getWeatherIcon(code: number, size: number = 40) {
  const props = { size, strokeWidth: 1.25 };
  if (code === 0 || code === 1) return <Sun {...props} />;
  if (code >= 61 && code <= 67) return <CloudRain {...props} />;
  if (code >= 71 && code <= 77) return <CloudSnow {...props} />;
  return <Cloud {...props} />;
}

export function DashboardScreen() {
  const { emails } = useEmails();
  const { events } = useCalendar();
  const { current, forecast } = useWeather();
  const { goToScreen } = useScreen();

  const unreadCount = emails.filter(e => !e.isRead).length;
  const todayEvents = events.filter(e => {
    const today = new Date();
    return e.start.toDateString() === today.toDateString();
  });

  return (
    <div className="h-full flex flex-col gap-8">
      {/* Weather - Large hero display */}
      {current && (
        <div
          className="cursor-pointer py-6"
          onClick={() => goToScreen('weather')}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="stat-number text-7xl tracking-tighter text-eink-black">
                {current.temperature}°
              </div>
              <div className="text-sm text-eink-dark mt-2 tracking-tight">
                {weatherCodeToDescription[current.weatherCode] || 'Unknown'}
              </div>
            </div>
            <div className="text-eink-dark pt-2">
              {getWeatherIcon(current.weatherCode, 48)}
            </div>
          </div>
        </div>
      )}

      {/* Email & Calendar cards */}
      <div className="grid grid-cols-2 gap-6 flex-1">
        {/* Emails */}
        <div
          className="eink-card p-5 cursor-pointer flex flex-col"
          onClick={() => goToScreen('emails')}
        >
          <div className="flex items-center gap-2 mb-4 text-eink-dark">
            <Mail size={14} strokeWidth={1.5} />
            <span className="text-xs font-medium uppercase tracking-wide">Mail</span>
          </div>

          {unreadCount > 0 ? (
            <>
              <div className="stat-number text-4xl text-eink-black">
                {unreadCount}
              </div>
              <div className="text-xs text-eink-mid mt-1">
                unread
              </div>
              {emails[0] && (
                <div className="mt-auto pt-4 border-t border-eink-light">
                  <div className="text-xs text-eink-dark truncate font-medium">
                    {emails[0].fromName || emails[0].from}
                  </div>
                  <div className="text-xs text-eink-mid truncate mt-0.5">
                    {emails[0].subject}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center">
              <span className="text-sm text-eink-mid">All caught up</span>
            </div>
          )}
        </div>

        {/* Calendar */}
        <div
          className="eink-card p-5 cursor-pointer flex flex-col"
          onClick={() => goToScreen('calendar')}
        >
          <div className="flex items-center gap-2 mb-4 text-eink-dark">
            <Calendar size={14} strokeWidth={1.5} />
            <span className="text-xs font-medium uppercase tracking-wide">Today</span>
          </div>

          {todayEvents.length > 0 ? (
            <>
              <div className="stat-number text-4xl text-eink-black">
                {todayEvents.length}
              </div>
              <div className="text-xs text-eink-mid mt-1">
                {todayEvents.length === 1 ? 'event' : 'events'}
              </div>
              {todayEvents[0] && (
                <div className="mt-auto pt-4 border-t border-eink-light">
                  <div className="text-xs text-eink-dark truncate font-medium">
                    {todayEvents[0].title}
                  </div>
                  <div className="text-xs text-eink-mid eink-mono mt-0.5">
                    {todayEvents[0].allDay ? 'All day' : format(todayEvents[0].start, 'h:mm a')}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center">
              <span className="text-sm text-eink-mid">Clear schedule</span>
            </div>
          )}
        </div>
      </div>

      {/* Forecast strip */}
      {forecast.length > 0 && (
        <div className="flex justify-around py-2 border-t border-eink-light">
          {forecast.slice(1, 5).map((day, i) => (
            <div key={i} className="text-center">
              <div className="text-[10px] text-eink-mid uppercase tracking-wide">
                {format(day.date, 'EEE')}
              </div>
              <div className="text-sm text-eink-dark font-medium mt-1">
                {day.tempMax}°
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
