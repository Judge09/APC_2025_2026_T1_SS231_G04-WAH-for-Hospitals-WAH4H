// src/components/appointment/AppointmentCalendarView.tsx
// Microsoft Teams-style calendar: Week view (default) + Day view toggle.
// Time grid from 7 AM – 9 PM, appointment blocks positioned by actual time,
// overlapping appointments rendered side-by-side, live "now" indicator.

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, isToday,
  addWeeks, subWeeks, addDays, subDays,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Appointment } from '@/types/appointment';

// ── Layout constants ──────────────────────────────────────────────────────────

const HOUR_HEIGHT  = 64;   // px per hour
const START_HOUR   = 7;    // grid begins at 7 AM
const END_HOUR     = 21;   // grid ends at 9 PM
const MIN_HEIGHT   = 26;   // minimum appointment block height in px
const HOURS        = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
const GRID_HEIGHT  = (END_HOUR - START_HOUR) * HOUR_HEIGHT;

// ── Status colour maps ────────────────────────────────────────────────────────

const STATUS_BG: Record<string, string> = {
  proposed:           'bg-gray-100',
  pending:            'bg-yellow-100',
  booked:             'bg-blue-100',
  arrived:            'bg-emerald-100',
  fulfilled:          'bg-purple-100',
  cancelled:          'bg-red-100',
  noshow:             'bg-orange-100',
  'entered-in-error': 'bg-gray-50',
  'checked-in':       'bg-teal-100',
  waitlist:           'bg-amber-100',
};
const STATUS_BORDER: Record<string, string> = {
  proposed:           'border-gray-400',
  pending:            'border-yellow-500',
  booked:             'border-blue-500',
  arrived:            'border-emerald-500',
  fulfilled:          'border-purple-500',
  cancelled:          'border-red-400',
  noshow:             'border-orange-400',
  'entered-in-error': 'border-gray-300',
  'checked-in':       'border-teal-500',
  waitlist:           'border-amber-400',
};
const STATUS_TEXT: Record<string, string> = {
  proposed:           'text-gray-700',
  pending:            'text-yellow-800',
  booked:             'text-blue-800',
  arrived:            'text-emerald-800',
  fulfilled:          'text-purple-800',
  cancelled:          'text-red-700',
  noshow:             'text-orange-700',
  'entered-in-error': 'text-gray-400',
  'checked-in':       'text-teal-800',
  waitlist:           'text-amber-700',
};

// ── Pure helpers ──────────────────────────────────────────────────────────────

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** Minutes since midnight for a given ISO datetime string. */
function minsOf(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

/** Top offset (px) for an appointment start time within the time grid. */
function getTop(iso?: string): number {
  if (!iso) return 0;
  const mins = clamp(minsOf(iso), START_HOUR * 60, END_HOUR * 60);
  return ((mins - START_HOUR * 60) / 60) * HOUR_HEIGHT;
}

/** Height (px) for an appointment block, clamped to a minimum. */
function getHeight(appt: Appointment): number {
  if (!appt.start) return MIN_HEIGHT;
  const startMins = minsOf(appt.start);
  const endMins   = appt.end
    ? minsOf(appt.end)
    : startMins + (appt.minutes_duration ?? 30);
  return Math.max(((endMins - startMins) / 60) * HOUR_HEIGHT, MIN_HEIGHT);
}

/**
 * Greedy column-packing for overlapping appointments within one day.
 * Returns a Map from appointment_id → { left%, width% }.
 */
function computeLayout(appts: Appointment[]): Map<number, { left: number; width: number }> {
  const result = new Map<number, { left: number; width: number }>();
  if (!appts.length) return result;

  const sorted = [...appts]
    .filter(a => a.start)
    .sort((a, b) => a.start!.localeCompare(b.start!));

  const colEnds: number[] = [];   // end-minute for the last appt in each column
  const apptCols: number[] = [];

  for (const appt of sorted) {
    const s = minsOf(appt.start!);
    const e = appt.end ? minsOf(appt.end) : s + (appt.minutes_duration ?? 30);
    let col = colEnds.findIndex(end => end <= s);
    if (col === -1) { col = colEnds.length; colEnds.push(e); }
    else colEnds[col] = e;
    apptCols.push(col);
  }

  const total = colEnds.length;
  sorted.forEach((appt, i) => {
    result.set(appt.appointment_id, {
      left:  (apptCols[i] / total) * 100,
      width: (1 / total) * 100,
    });
  });
  return result;
}

/** Format an hour integer as "7 AM", "12 PM", "3 PM" etc. */
const fmtHour = (h: number) =>
  h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;

/** Format an ISO datetime as "9:30 AM". */
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  appointments: Appointment[];
  onSelectAppointment: (a: Appointment) => void;
}

export const AppointmentCalendarView: React.FC<Props> = ({ appointments, onSelectAppointment }) => {
  const [viewMode, setViewMode]     = useState<'week' | 'day'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Days to display
  const days = useMemo<Date[]>(() => {
    if (viewMode === 'day') return [currentDate];
    const ws = startOfWeek(currentDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: ws, end: endOfWeek(ws, { weekStartsOn: 0 }) });
  }, [viewMode, currentDate]);

  // Header label  ("May 26 – Jun 1, 2026" / "Monday, May 26, 2026")
  const periodLabel = useMemo(() => {
    if (viewMode === 'day') return format(currentDate, 'EEEE, MMMM d, yyyy');
    const [s, e] = [days[0], days[days.length - 1]];
    if (format(s, 'MMMM yyyy') === format(e, 'MMMM yyyy'))
      return `${format(s, 'MMMM d')} – ${format(e, 'd, yyyy')}`;
    if (format(s, 'yyyy') === format(e, 'yyyy'))
      return `${format(s, 'MMM d')} – ${format(e, 'MMM d, yyyy')}`;
    return `${format(s, 'MMM d, yyyy')} – ${format(e, 'MMM d, yyyy')}`;
  }, [viewMode, currentDate, days]);

  // Navigation
  const prev    = () => setCurrentDate(d => viewMode === 'week' ? subWeeks(d, 1) : subDays(d, 1));
  const next    = () => setCurrentDate(d => viewMode === 'week' ? addWeeks(d, 1) : addDays(d, 1));
  const goToday = () => setCurrentDate(new Date());

  // Auto-scroll to current time on mount / view-mode change
  useEffect(() => {
    if (!scrollRef.current) return;
    const now  = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const px   = Math.max(0, ((mins - START_HOUR * 60) / 60) * HOUR_HEIGHT - 80);
    scrollRef.current.scrollTop = px;
  }, [viewMode]);

  // Index appointments by day key "yyyy-MM-dd"
  const apptsByDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const day of days) {
      const key = format(day, 'yyyy-MM-dd');
      map.set(key, appointments.filter(a => a.start && isSameDay(new Date(a.start), day)));
    }
    return map;
  }, [appointments, days]);

  // Appointments with no start time (shown in a separate "unscheduled" strip)
  const unscheduled = useMemo(() => appointments.filter(a => !a.start), [appointments]);

  // Current-time indicator position
  const nowPx = useMemo(() => {
    const now  = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    return ((clamp(mins, START_HOUR * 60, END_HOUR * 60) - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  }, []);

  const colsTemplate = viewMode === 'week' ? '52px repeat(7, 1fr)' : '52px 1fr';

  return (
    <div
      className="flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm"
      style={{ height: 'calc(100vh - 330px)', minHeight: '520px' }}
    >
      {/* ── Navigation bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 bg-white flex-shrink-0 select-none">
        <button
          onClick={goToday}
          className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-700"
        >
          Today
        </button>

        {/* Prev / Next */}
        <div className="flex">
          <button
            onClick={prev}
            aria-label="Previous"
            className="p-1.5 border border-slate-300 rounded-l-lg hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <button
            onClick={next}
            aria-label="Next"
            className="p-1.5 border border-l-0 border-slate-300 rounded-r-lg hover:bg-slate-50 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <h2 className="text-sm font-bold text-slate-800 ml-1 tracking-tight">{periodLabel}</h2>

        {/* Week / Day toggle */}
        <div className="ml-auto flex border border-slate-300 rounded-lg overflow-hidden">
          {(['week', 'day'] as const).map((mode, i) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={[
                'px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors',
                viewMode === mode ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50',
                i > 0 ? 'border-l border-slate-300' : '',
              ].join(' ')}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* ── Day header row ───────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-slate-200 bg-white select-none">
        <div className="grid" style={{ gridTemplateColumns: colsTemplate }}>
          {/* Time gutter spacer */}
          <div className="border-r border-slate-100 py-2" />

          {days.map(day => {
            const today = isToday(day);
            const key   = format(day, 'yyyy-MM-dd');
            const count = apptsByDay.get(key)?.length ?? 0;
            return (
              <div
                key={key}
                onClick={() => { setCurrentDate(day); setViewMode('day'); }}
                className={[
                  'border-l border-slate-100 py-2 text-center cursor-pointer transition-colors',
                  today ? 'bg-blue-50/60' : 'hover:bg-slate-50',
                ].join(' ')}
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {format(day, viewMode === 'week' ? 'EEE' : 'EEEE')}
                </p>
                <div
                  className={[
                    'text-xl font-bold mx-auto w-9 h-9 flex items-center justify-center rounded-full mt-0.5 transition-colors',
                    today
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-800 hover:bg-slate-100',
                  ].join(' ')}
                >
                  {format(day, 'd')}
                </div>
                {count > 0 && (
                  <p className="text-[10px] font-semibold text-blue-500 mt-0.5">
                    {count} appt{count !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Unscheduled strip (only when there are time-less appointments) ──── */}
      {unscheduled.length > 0 && (
        <div className="flex-shrink-0 border-b border-amber-100 bg-amber-50/50">
          <div className="grid" style={{ gridTemplateColumns: colsTemplate }}>
            <div className="border-r border-slate-100 px-1.5 py-2 flex items-center justify-end">
              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-500">
                No time
              </span>
            </div>
            <div
              style={{ gridColumn: '2 / -1' }}
              className="border-l border-slate-100 px-2 py-1.5 flex flex-wrap gap-1.5"
            >
              {unscheduled.map(a => (
                <button
                  key={a.appointment_id}
                  onClick={() => onSelectAppointment(a)}
                  className={[
                    'text-[10px] font-semibold px-2 py-0.5 rounded-full truncate max-w-[180px] transition-all',
                    'hover:brightness-95 shadow-sm',
                    STATUS_BG[a.status]   ?? 'bg-gray-100',
                    STATUS_TEXT[a.status] ?? 'text-gray-700',
                    STATUS_BORDER[a.status] ? `border-l-2 ${STATUS_BORDER[a.status]}` : '',
                  ].join(' ')}
                >
                  {a.patient_summary?.full_name ?? `Patient #${a.patient_id}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Scrollable time grid ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden" ref={scrollRef}>
        <div
          className="relative"
          style={{
            height:               `${GRID_HEIGHT}px`,
            display:              'grid',
            gridTemplateColumns:  colsTemplate,
          }}
        >
          {/* ── Time label column ─────────────────────────────────────────── */}
          <div className="relative border-r border-slate-100">
            {HOURS.map(h => (
              <div
                key={h}
                style={{ top: `${(h - START_HOUR) * HOUR_HEIGHT}px` }}
                className="absolute w-full pr-2 flex justify-end"
              >
                <span className="text-[10px] font-medium text-slate-400 -translate-y-2 inline-block">
                  {fmtHour(h)}
                </span>
              </div>
            ))}
          </div>

          {/* ── Day columns ───────────────────────────────────────────────── */}
          {days.map(day => {
            const key      = format(day, 'yyyy-MM-dd');
            const dayAppts = apptsByDay.get(key) ?? [];
            const layout   = computeLayout(dayAppts);
            const today    = isToday(day);

            return (
              <div
                key={key}
                className={['relative border-l border-slate-100', today ? 'bg-blue-50/10' : ''].join(' ')}
              >
                {/* Hour and half-hour grid lines */}
                {HOURS.map(h => (
                  <React.Fragment key={h}>
                    <div
                      style={{ top: `${(h - START_HOUR) * HOUR_HEIGHT}px` }}
                      className="absolute left-0 right-0 border-t border-slate-100 pointer-events-none"
                    />
                    <div
                      style={{ top: `${(h - START_HOUR + 0.5) * HOUR_HEIGHT}px` }}
                      className="absolute left-0 right-0 border-t border-dashed border-slate-50 pointer-events-none"
                    />
                  </React.Fragment>
                ))}

                {/* Current-time indicator (red line on today's column) */}
                {today && (
                  <div
                    style={{ top: `${nowPx}px` }}
                    className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 flex-shrink-0 shadow-sm" />
                    <div className="flex-1 border-t-2 border-red-500" />
                  </div>
                )}

                {/* Appointment blocks */}
                {dayAppts.map(appt => {
                  const pos    = layout.get(appt.appointment_id) ?? { left: 0, width: 100 };
                  const top    = getTop(appt.start);
                  const height = getHeight(appt);
                  const bg     = STATUS_BG[appt.status]     ?? 'bg-gray-100';
                  const border = STATUS_BORDER[appt.status] ?? 'border-gray-400';
                  const text   = STATUS_TEXT[appt.status]   ?? 'text-gray-700';

                  return (
                    <button
                      key={appt.appointment_id}
                      onClick={() => onSelectAppointment(appt)}
                      title={[
                        appt.patient_summary?.full_name ?? `Patient #${appt.patient_id}`,
                        appt.start ? fmtTime(appt.start) : '',
                        appt.service_type_display,
                        appt.practitioner_summary?.full_name,
                      ].filter(Boolean).join(' · ')}
                      style={{
                        top:    `${top}px`,
                        height: `${height}px`,
                        left:   `calc(${pos.left}% + 2px)`,
                        width:  `calc(${pos.width}% - 4px)`,
                      }}
                      className={[
                        'absolute rounded-md overflow-hidden text-left z-10 select-none',
                        'cursor-pointer shadow-sm hover:shadow-md hover:brightness-95 transition-all',
                        `border-l-[3px] ${bg} ${border} ${text}`,
                      ].join(' ')}
                    >
                      <div className="px-1.5 py-1 h-full flex flex-col justify-start gap-0">
                        {/* Patient name — always shown */}
                        <p className="text-[11px] font-bold leading-tight truncate">
                          {appt.patient_summary?.full_name ?? `Patient #${appt.patient_id}`}
                        </p>

                        {/* Time range — shown when block is tall enough */}
                        {height >= 42 && appt.start && (
                          <p className="text-[10px] opacity-75 leading-tight truncate mt-px">
                            {fmtTime(appt.start)}
                            {appt.end ? ` – ${fmtTime(appt.end)}` : ''}
                          </p>
                        )}

                        {/* Service type */}
                        {height >= 58 && appt.service_type_display && (
                          <p className="text-[10px] opacity-60 leading-tight truncate">
                            {appt.service_type_display}
                          </p>
                        )}

                        {/* Physician */}
                        {height >= 74 && appt.practitioner_summary?.full_name && (
                          <p className="text-[10px] opacity-55 leading-tight truncate">
                            {appt.practitioner_summary.full_name}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
