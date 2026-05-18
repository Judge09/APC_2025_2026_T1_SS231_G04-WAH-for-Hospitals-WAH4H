// src/components/appointment/AppointmentCalendarView.tsx
import React, { useState } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameDay, isSameMonth,
  isToday, addMonths, subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { Appointment } from '@/types/appointment';

const STATUS_DOT: Record<string, string> = {
  proposed:           'bg-gray-400',
  pending:            'bg-yellow-400',
  booked:             'bg-blue-500',
  arrived:            'bg-emerald-500',
  fulfilled:          'bg-purple-500',
  cancelled:          'bg-red-400',
  noshow:             'bg-orange-400',
  'entered-in-error': 'bg-gray-300',
  'checked-in':       'bg-teal-500',
  waitlist:           'bg-amber-400',
};

const STATUS_CHIP: Record<string, string> = {
  proposed:           'bg-gray-100 text-gray-600',
  pending:            'bg-yellow-100 text-yellow-700',
  booked:             'bg-blue-100 text-blue-700',
  arrived:            'bg-emerald-100 text-emerald-700',
  fulfilled:          'bg-purple-100 text-purple-700',
  cancelled:          'bg-red-100 text-red-500',
  noshow:             'bg-orange-100 text-orange-600',
  'entered-in-error': 'bg-gray-100 text-gray-400',
  'checked-in':       'bg-teal-100 text-teal-700',
  waitlist:           'bg-amber-100 text-amber-600',
};

interface Props {
  appointments: Appointment[];
  onSelectAppointment: (a: Appointment) => void;
}

export const AppointmentCalendarView: React.FC<Props> = ({ appointments, onSelectAppointment }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd   = endOfMonth(currentMonth);
  const calStart   = startOfWeek(monthStart);
  const calEnd     = endOfWeek(monthEnd);
  const days       = eachDayOfInterval({ start: calStart, end: calEnd });

  const apptsByDay = (day: Date) =>
    appointments.filter(a => a.start && isSameDay(new Date(a.start), day));

  const selectedAppts = selectedDay ? apptsByDay(selectedDay) : [];

  const toggleDay = (day: Date) =>
    setSelectedDay(prev => (prev && isSameDay(prev, day) ? null : day));

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden">

      {/* Month navigation */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
        <button
          onClick={() => { setCurrentMonth(m => subMonths(m, 1)); setSelectedDay(null); }}
          className="p-2 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4 text-slate-600" />
        </button>

        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-slate-800 tracking-tight">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button
            onClick={() => { setCurrentMonth(new Date()); setSelectedDay(null); }}
            className="text-xs font-semibold text-blue-600 hover:underline"
          >
            Today
          </button>
        </div>

        <button
          onClick={() => { setCurrentMonth(m => addMonths(m, 1)); setSelectedDay(null); }}
          className="p-2 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2.5">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const dayAppts  = apptsByDay(day);
          const inMonth   = isSameMonth(day, currentMonth);
          const todayCell = isToday(day);
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          const visible   = dayAppts.slice(0, 3);
          const extra     = dayAppts.length - 3;

          return (
            <div
              key={idx}
              onClick={() => toggleDay(day)}
              className={[
                'min-h-[90px] p-1.5 cursor-pointer border-b border-r border-slate-50 transition-colors select-none',
                !inMonth ? 'bg-slate-50/60' : 'bg-white hover:bg-blue-50/30',
                isSelected ? 'ring-2 ring-inset ring-blue-400 bg-blue-50/30' : '',
              ].join(' ')}
            >
              {/* Day number */}
              <div className="flex justify-end mb-1">
                <span
                  className={[
                    'w-6 h-6 flex items-center justify-center text-xs font-bold rounded-full',
                    todayCell
                      ? 'bg-blue-600 text-white shadow-sm'
                      : inMonth
                      ? 'text-slate-700'
                      : 'text-slate-300',
                  ].join(' ')}
                >
                  {format(day, 'd')}
                </span>
              </div>

              {/* Appointment chips */}
              <div className="space-y-0.5">
                {visible.map(a => (
                  <div
                    key={a.appointment_id}
                    onClick={e => { e.stopPropagation(); onSelectAppointment(a); }}
                    title={[
                      a.patient_summary?.full_name ?? `Patient #${a.patient_id}`,
                      a.service_type_display,
                      a.start ? new Date(a.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '',
                    ].filter(Boolean).join(' · ')}
                    className={[
                      'flex items-center gap-1 truncate text-[10px] font-semibold px-1.5 py-0.5 rounded cursor-pointer',
                      'hover:brightness-95 transition-all',
                      STATUS_CHIP[a.status] ?? 'bg-gray-100 text-gray-600',
                    ].join(' ')}
                  >
                    <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[a.status] ?? 'bg-gray-400'}`} />
                    <span className="truncate">
                      {a.patient_summary?.full_name ?? `#${a.patient_id}`}
                    </span>
                  </div>
                ))}
                {extra > 0 && (
                  <div className="text-[9px] text-slate-400 font-semibold pl-1">+{extra} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected day detail panel */}
      {selectedDay && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-sm font-bold text-slate-800">
                {format(selectedDay, 'EEEE, MMMM d, yyyy')}
              </span>
              <span className="ml-2 text-xs text-slate-400">
                {selectedAppts.length} appointment{selectedAppts.length !== 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={() => setSelectedDay(null)}
              className="p-1 rounded-full hover:bg-slate-200 transition-colors"
              aria-label="Close day panel"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          {selectedAppts.length === 0 ? (
            <p className="text-xs text-slate-400 py-2">No appointments scheduled for this day.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {selectedAppts
                .slice()
                .sort((a, b) => (a.start ?? '').localeCompare(b.start ?? ''))
                .map(a => (
                  <div
                    key={a.appointment_id}
                    onClick={() => onSelectAppointment(a)}
                    className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-100 cursor-pointer hover:border-blue-200 hover:shadow-sm transition-all"
                  >
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${STATUS_DOT[a.status] ?? 'bg-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate">
                        {a.patient_summary?.full_name ?? `Patient #${a.patient_id}`}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 space-y-0.5">
                        {a.start && (
                          <div>
                            {new Date(a.start).toLocaleTimeString('en-US', {
                              hour: 'numeric', minute: '2-digit', hour12: true,
                            })}
                            {a.end && ` – ${new Date(a.end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`}
                          </div>
                        )}
                        {a.practitioner_summary?.full_name && (
                          <div className="truncate">{a.practitioner_summary.full_name}</div>
                        )}
                        {a.service_type_display && (
                          <div className="truncate">{a.service_type_display}</div>
                        )}
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase whitespace-nowrap flex-shrink-0 ${STATUS_CHIP[a.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {a.status.replace(/-/g, ' ')}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
