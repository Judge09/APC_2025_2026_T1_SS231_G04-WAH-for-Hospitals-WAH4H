// src/pages/Appointment.tsx
import React, { useState, useEffect } from 'react';
import {
  Plus, RefreshCw, Search, Calendar, LayoutGrid, List,
  Clock, User, Stethoscope, Trash2, CalendarClock, Edit,
  TableProperties,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { appointmentService } from '@/services/appointmentService';
import { BookAppointmentModal } from '@/components/appointment/BookAppointmentModal';
import { AppointmentDetailsModal } from '@/components/appointment/AppointmentDetailsModal';
import { ScheduleManagementModal } from '@/components/appointment/ScheduleManagementModal';
import { AppointmentCalendarView } from '@/components/appointment/AppointmentCalendarView';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import type { Appointment, Schedule } from '@/types/appointment';

// ── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  proposed:           'bg-gray-100 text-gray-700',
  pending:            'bg-yellow-100 text-yellow-700',
  booked:             'bg-blue-100 text-blue-700',
  arrived:            'bg-emerald-100 text-emerald-700',
  fulfilled:          'bg-purple-100 text-purple-700',
  cancelled:          'bg-red-100 text-red-700',
  noshow:             'bg-orange-100 text-orange-700',
  'entered-in-error': 'bg-gray-100 text-gray-400',
  'checked-in':       'bg-teal-100 text-teal-700',
  waitlist:           'bg-amber-100 text-amber-700',
};

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLE[status] ?? 'bg-gray-100 text-gray-600'}`}>
    {status.replace(/-/g, ' ')}
  </span>
);

// ── Stat card ─────────────────────────────────────────────────────────────────

const StatCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <Card className="shadow-sm">
    <CardContent className="p-5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
    </CardContent>
  </Card>
);

// ── Schedule card ─────────────────────────────────────────────────────────────

const ScheduleCard = ({
  schedule,
  onManage,
  onDelete,
}: {
  schedule: Schedule;
  onManage: (s: Schedule) => void;
  onDelete: (s: Schedule) => void;
}) => {
  const fmtDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <Card className="shadow-sm hover:shadow-md transition-all duration-200">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">{schedule.identifier}</div>
            <h3 className="font-bold text-slate-900 text-base">
              {schedule.actor_name ?? (schedule.actor_practitioner_id ? `Practitioner #${schedule.actor_practitioner_id}` : 'General Schedule')}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{schedule.service_type_display ?? 'All services'}</p>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${schedule.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
            {schedule.status}
          </span>
        </div>
        <div className="text-xs text-slate-500 mb-4">
          <span className="font-medium text-slate-700">{fmtDate(schedule.planning_horizon_start)}</span>
          {' '}→{' '}
          <span className="font-medium text-slate-700">{fmtDate(schedule.planning_horizon_end)}</span>
        </div>
        {schedule.comment && (
          <p className="text-xs text-slate-400 mb-3 line-clamp-1">{schedule.comment}</p>
        )}
        <div className="flex gap-2 border-t border-slate-100 pt-3">
          <Button
            size="sm"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs h-7"
            onClick={() => onManage(schedule)}
          >
            <Edit className="w-3.5 h-3.5 mr-1" /> Manage Slots
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-7 w-7 p-0"
            onClick={() => onDelete(schedule)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const AppointmentPage: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'appointments' | 'schedules'>('appointments');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Modals
  const [isBookOpen, setIsBookOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [appts, scheds] = await Promise.all([
        appointmentService.getAll(),
        appointmentService.getSchedules(),
      ]);
      setAppointments(appts);
      setSchedules(scheds);
    } catch (e) {
      console.error('Fetch error', e);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Computed stats ──────────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const counts = {
    total:     appointments.length,
    today:     appointments.filter(a => a.start?.slice(0, 10) === today).length,
    booked:    appointments.filter(a => ['booked', 'arrived', 'checked-in'].includes(a.status)).length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
  };

  // ── Filtered appointments ───────────────────────────────────────────────────
  const filtered = appointments.filter(a => {
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchDate   = !dateFilter || a.start?.slice(0, 10) === dateFilter;
    const patientName = a.patient_summary?.full_name ?? '';
    const matchSearch =
      !searchQuery ||
      patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.identifier ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.reason_code ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchDate && matchSearch;
  });

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const fmtDateTime = (iso?: string) => {
    if (!iso) return { full: '—', relative: '' };
    const d = new Date(iso);
    return {
      full: d.toLocaleString('en-US', {
        month: 'numeric', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
      }),
      relative: formatDistanceToNow(d, { addSuffix: true }),
    };
  };

  const openDetails = (a: Appointment) => {
    setSelectedAppointment(a);
    setIsDetailsOpen(true);
  };

  const handleAppointmentUpdate = (updated: Appointment) => {
    setAppointments(prev =>
      prev.map(a => a.appointment_id === updated.appointment_id ? updated : a),
    );
    setSelectedAppointment(updated);
  };

  const handleDeleteAppointment = async (a: Appointment) => {
    if (!window.confirm(`Delete appointment ${a.identifier} for ${a.patient_summary?.full_name ?? 'this patient'}?`)) return;
    try {
      await appointmentService.delete(a.identifier);
      setAppointments(prev => prev.filter(x => x.appointment_id !== a.appointment_id));
    } catch {
      alert('Failed to delete appointment.');
    }
  };

  const handleDeleteSchedule = async (s: Schedule) => {
    if (!window.confirm(`Delete schedule ${s.identifier}? This will also delete all its slots.`)) return;
    try {
      await appointmentService.deleteSchedule(s.identifier);
      setSchedules(prev => prev.filter(x => x.schedule_id !== s.schedule_id));
    } catch {
      alert('Failed to delete schedule.');
    }
  };

  const openManageSchedule = (s: Schedule | null) => {
    setSelectedSchedule(s);
    setIsScheduleModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center text-blue-600 font-medium animate-pulse">
        Loading Appointment System...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 bg-slate-50 min-h-screen font-sans">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Appointment Management</h1>
          <p className="text-slate-500 mt-1">Schedule, track, and manage patient appointments.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button variant="outline" size="icon" onClick={fetchAll} className="rounded-full hover:bg-slate-50">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => openManageSchedule(null)}
            className="rounded-full px-5"
          >
            <CalendarClock className="w-4 h-4 mr-2" /> Add Schedule
          </Button>
          <Button
            onClick={() => setIsBookOpen(true)}
            className="rounded-full bg-blue-600 hover:bg-blue-700 px-6 shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4 mr-2" /> Book Appointment
          </Button>
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total"     value={counts.total}     color="text-slate-900" />
        <StatCard label="Today"     value={counts.today}     color="text-blue-600" />
        <StatCard label="Active"    value={counts.booked}    color="text-emerald-600" />
        <StatCard label="Cancelled" value={counts.cancelled} color="text-red-500" />
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <div className="flex gap-8 border-b border-slate-200 px-2">
        <button
          onClick={() => setActiveTab('appointments')}
          className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'appointments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <List className="w-4 h-4" /> Appointments
        </button>
        <button
          onClick={() => setActiveTab('schedules')}
          className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'schedules' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <LayoutGrid className="w-4 h-4" /> Schedules
          <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">{schedules.length}</span>
        </button>
      </div>

      {/* ── Appointments tab ─────────────────────────────────────────────── */}
      {activeTab === 'appointments' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-0 shadow-lg ring-1 ring-slate-100 bg-white overflow-hidden">

            {/* Toolbar */}
            <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 justify-between items-center bg-white sticky top-0 z-10">
              {/* Status filters — only in list mode */}
              {viewMode === 'list' && (
                <div className="flex gap-2 p-1 bg-slate-50 rounded-lg flex-wrap">
                  {[
                    { key: 'all',       label: 'All' },
                    { key: 'proposed',  label: 'Proposed' },
                    { key: 'booked',    label: 'Booked' },
                    { key: 'arrived',   label: 'Arrived' },
                    { key: 'fulfilled', label: 'Fulfilled' },
                    { key: 'cancelled', label: 'Cancelled' },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setStatusFilter(tab.key)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md uppercase transition-all ${
                        statusFilter === tab.key
                          ? 'bg-blue-100 text-blue-800 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Right side: search + date (list only) + view toggle */}
              <div className="flex gap-3 flex-wrap items-center ml-auto">
                {viewMode === 'list' && (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Search patient or ID..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-10 w-56 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                      />
                    </div>
                    <Input
                      type="date"
                      value={dateFilter}
                      onChange={e => setDateFilter(e.target.value)}
                      className="w-40 bg-slate-50 border-slate-200 text-sm"
                      title="Filter by date"
                    />
                    {dateFilter && (
                      <Button variant="ghost" size="sm" onClick={() => setDateFilter('')} className="text-slate-400 text-xs h-9">
                        Clear date
                      </Button>
                    )}
                  </>
                )}

                {/* View mode toggle */}
                <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                  <button
                    onClick={() => setViewMode('list')}
                    title="List view"
                    className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <TableProperties className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('calendar')}
                    title="Calendar view"
                    className={`p-1.5 rounded transition-all ${viewMode === 'calendar' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Table — list view only */}
            {viewMode === 'calendar' ? (
              <div className="p-4">
                <AppointmentCalendarView
                  appointments={appointments}
                  onSelectAppointment={openDetails}
                />
              </div>
            ) : null}
            <div className={`overflow-x-auto ${viewMode === 'calendar' ? 'hidden' : ''}`}>
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-semibold text-xs border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Patient</th>
                    <th className="px-6 py-4">Appointment #</th>
                    <th className="px-6 py-4">Date / Time</th>
                    <th className="px-6 py-4">Physician</th>
                    <th className="px-6 py-4">Service</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.length > 0 ? filtered.map(a => {
                    const dt = fmtDateTime(a.start);
                    const patient = a.patient_summary;
                    const practitioner = a.practitioner_summary;
                    return (
                      <tr key={a.appointment_id} className="hover:bg-blue-50/50 transition-colors group">
                        {/* Patient */}
                        <td className="px-6 py-4 align-top">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <User className="w-4 h-4 text-blue-500" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-sm">{patient?.full_name ?? `Patient #${a.patient_id}`}</div>
                              <div className="text-xs text-slate-400">ID: {patient?.patient_id ?? a.patient_id}</div>
                            </div>
                          </div>
                        </td>

                        {/* Appointment # */}
                        <td className="px-6 py-4 align-top">
                          <div className="font-medium text-slate-700 text-sm">{a.identifier}</div>
                          <div className="mt-1"><StatusBadge status={a.status} /></div>
                        </td>

                        {/* Date/Time */}
                        <td className="px-6 py-4 align-top">
                          <div className="flex items-center gap-1.5 text-sm text-slate-700">
                            <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            {dt.full}
                          </div>
                          {dt.relative && (
                            <div className="text-xs text-slate-400 mt-1 ml-5">{dt.relative}</div>
                          )}
                        </td>

                        {/* Physician */}
                        <td className="px-6 py-4 align-top">
                          {practitioner ? (
                            <>
                              <div className="font-medium text-slate-900 text-sm">{practitioner.full_name}</div>
                              <div className="text-xs text-slate-400 mt-0.5">{practitioner.qualification_code ?? 'Physician'}</div>
                            </>
                          ) : (
                            <span className="text-slate-400 text-sm">—</span>
                          )}
                        </td>

                        {/* Service */}
                        <td className="px-6 py-4 align-top">
                          <div className="text-sm text-slate-700">{a.service_type_display ?? '—'}</div>
                          {a.appointment_type_display && (
                            <div className="text-xs text-slate-400 mt-0.5">{a.appointment_type_display}</div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right align-top">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 h-8"
                              onClick={() => openDetails(a)}
                            >
                              Details
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 w-8 p-0"
                              onClick={(e) => { e.stopPropagation(); handleDeleteAppointment(a); }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        No appointments found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── Schedules tab ────────────────────────────────────────────────── */}
      {activeTab === 'schedules' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {schedules.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
              <CalendarClock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-bold text-slate-700 text-lg mb-2">No schedules yet</h3>
              <p className="text-slate-400 text-sm mb-6">Create a schedule to define when a physician or location is available for appointments.</p>
              <Button
                onClick={() => openManageSchedule(null)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" /> Create First Schedule
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {schedules.map(s => (
                <ScheduleCard
                  key={s.schedule_id}
                  schedule={s}
                  onManage={openManageSchedule}
                  onDelete={handleDeleteSchedule}
                />
              ))}
              {/* Add new schedule card */}
              <button
                onClick={() => openManageSchedule(null)}
                className="border-2 border-dashed border-slate-200 rounded-xl p-5 flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all group min-h-[180px]"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold">Add Schedule</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <BookAppointmentModal
        isOpen={isBookOpen}
        onClose={() => setIsBookOpen(false)}
        onSuccess={() => { setIsBookOpen(false); fetchAll(); }}
      />
      <AppointmentDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => { setIsDetailsOpen(false); setSelectedAppointment(null); }}
        appointment={selectedAppointment}
        onUpdate={handleAppointmentUpdate}
      />
      <ScheduleManagementModal
        isOpen={isScheduleModalOpen}
        onClose={() => { setIsScheduleModalOpen(false); setSelectedSchedule(null); }}
        onSuccess={() => { fetchAll(); }}
        schedule={selectedSchedule}
      />
    </div>
  );
};

export default AppointmentPage;
