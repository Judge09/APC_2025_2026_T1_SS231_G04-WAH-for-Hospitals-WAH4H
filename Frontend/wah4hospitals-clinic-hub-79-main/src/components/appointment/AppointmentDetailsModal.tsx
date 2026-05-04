// src/components/appointment/AppointmentDetailsModal.tsx
import React, { useState } from 'react';
import { Clock, User, Stethoscope, CalendarCheck, XCircle, CheckSquare, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { appointmentService } from '@/services/appointmentService';
import type { Appointment } from '@/types/appointment';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onUpdate: (updated: Appointment) => void;
}

const STATUS_STYLE: Record<string, string> = {
  proposed:         'bg-gray-100 text-gray-700',
  pending:          'bg-yellow-100 text-yellow-700',
  booked:           'bg-blue-100 text-blue-700',
  arrived:          'bg-emerald-100 text-emerald-700',
  fulfilled:        'bg-purple-100 text-purple-700',
  cancelled:        'bg-red-100 text-red-700',
  noshow:           'bg-orange-100 text-orange-700',
  'entered-in-error': 'bg-gray-100 text-gray-400',
  'checked-in':     'bg-teal-100 text-teal-700',
  waitlist:         'bg-amber-100 text-amber-700',
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">{title}</h4>
    <div className="space-y-2">{children}</div>
  </div>
);

const Field: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => (
  <div className="flex justify-between text-sm">
    <span className="text-slate-500">{label}</span>
    <span className="font-medium text-slate-900 text-right max-w-[55%]">{value ?? '—'}</span>
  </div>
);

const fmt = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
      })
    : '—';

export const AppointmentDetailsModal: React.FC<Props> = ({
  isOpen, onClose, appointment, onUpdate,
}) => {
  const [confirming, setConfirming] = useState<'cancel' | 'arrive' | 'fulfill' | null>(null);
  const [isActing, setIsActing] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [encounterRef, setEncounterRef] = useState('');
  const [actionError, setActionError] = useState('');

  if (!appointment) return null;

  const { status } = appointment;
  const canArrive  = status === 'booked';
  const canCancel  = !['fulfilled', 'cancelled', 'entered-in-error'].includes(status);
  const canFulfill = ['booked', 'arrived', 'checked-in'].includes(status);

  const handleAction = async () => {
    if (!confirming) return;
    setIsActing(true);
    setActionError('');
    try {
      let updated: Appointment;
      if (confirming === 'arrive') {
        updated = await appointmentService.arrive(appointment.identifier);
      } else if (confirming === 'cancel') {
        updated = await appointmentService.cancel(appointment.identifier, {
          cancellation_reason_display: cancelReason || undefined,
        });
      } else {
        updated = await appointmentService.fulfill(
          appointment.identifier,
          encounterRef ? Number(encounterRef) : undefined,
        );
      }
      onUpdate(updated);
      setConfirming(null);
    } catch (e: any) {
      const detail = e?.response?.data;
      setActionError(
        typeof detail === 'string'
          ? detail
          : detail?.detail ?? 'Action failed. Please try again.',
      );
    } finally {
      setIsActing(false);
    }
  };

  const resetAction = () => {
    setConfirming(null);
    setCancelReason('');
    setEncounterRef('');
    setActionError('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) { resetAction(); onClose(); } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-3">
            <span>{appointment.identifier}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wide ${STATUS_STYLE[status] ?? 'bg-gray-100 text-gray-600'}`}>
              {status.replace(/-/g, ' ')}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">

          {/* Patient */}
          <Section title="Patient">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="font-bold text-slate-900">{appointment.patient_summary?.full_name ?? `Patient #${appointment.patient_id}`}</div>
                <div className="text-xs text-slate-500">
                  ID: {appointment.patient_summary?.patient_id ?? appointment.patient_id}
                  {appointment.patient_summary?.age != null && ` · ${appointment.patient_summary.age} yrs`}
                  {appointment.patient_summary?.gender && ` · ${appointment.patient_summary.gender}`}
                </div>
                {appointment.patient_summary?.contact && (
                  <div className="text-xs text-slate-400">{appointment.patient_summary.contact}</div>
                )}
              </div>
            </div>
          </Section>

          {/* Timing */}
          <Section title="Appointment Time">
            <Field label="Start"        value={fmt(appointment.start)} />
            <Field label="End"          value={fmt(appointment.end)} />
            <Field label="Duration"     value={appointment.minutes_duration ? `${appointment.minutes_duration} min` : null} />
            <Field label="Booked on"    value={fmt(appointment.created_datetime)} />
          </Section>

          {/* Clinical */}
          <Section title="Clinical Details">
            <Field label="Service"        value={appointment.service_type_display} />
            <Field label="Specialty"      value={appointment.specialty_display} />
            <Field label="Type"           value={appointment.appointment_type_display} />
            <Field label="Reason"         value={appointment.reason_code} />
            {appointment.description && (
              <div className="text-sm text-slate-700 bg-slate-50 rounded p-2 mt-1">{appointment.description}</div>
            )}
          </Section>

          {/* Practitioner */}
          {appointment.practitioner_summary && (
            <Section title="Physician">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Stethoscope className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-slate-900 text-sm">{appointment.practitioner_summary.full_name}</div>
                  {appointment.practitioner_summary.qualification_code && (
                    <div className="text-xs text-slate-400">{appointment.practitioner_summary.qualification_code}</div>
                  )}
                </div>
              </div>
            </Section>
          )}

          {/* Slot */}
          {appointment.slot_detail && (
            <Section title="Slot">
              <Field label="Slot start" value={fmt(appointment.slot_detail.start)} />
              <Field label="Slot end"   value={fmt(appointment.slot_detail.end)} />
              <Field label="Slot status" value={appointment.slot_detail.status} />
            </Section>
          )}

          {/* Cancellation */}
          {appointment.cancellation_reason_display && (
            <Section title="Cancellation Reason">
              <div className="text-sm text-red-700 bg-red-50 rounded p-2">{appointment.cancellation_reason_display}</div>
            </Section>
          )}

          {/* Notes */}
          {(appointment.comment || appointment.patient_instruction) && (
            <Section title="Notes">
              {appointment.comment && <Field label="Comment" value={appointment.comment} />}
              {appointment.patient_instruction && <Field label="Patient instruction" value={appointment.patient_instruction} />}
            </Section>
          )}

          {/* ── Action confirmation zone ────────────────────────── */}
          {confirming && (
            <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-3">
              {confirming === 'cancel' && (
                <>
                  <p className="text-sm font-semibold text-slate-700">Provide a cancellation reason (optional):</p>
                  <Textarea
                    placeholder="e.g. Patient request, scheduling conflict..."
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    rows={2}
                  />
                </>
              )}
              {confirming === 'fulfill' && (
                <>
                  <p className="text-sm font-semibold text-slate-700">Link resulting encounter (optional):</p>
                  <Input
                    type="number"
                    placeholder="Encounter ID..."
                    value={encounterRef}
                    onChange={e => setEncounterRef(e.target.value)}
                  />
                </>
              )}
              {confirming === 'arrive' && (
                <p className="text-sm text-slate-700">Mark this patient as <strong>arrived</strong>?</p>
              )}
              {actionError && (
                <p className="text-xs text-red-600">{actionError}</p>
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={resetAction} disabled={isActing}>Cancel</Button>
                <Button
                  size="sm"
                  onClick={handleAction}
                  disabled={isActing}
                  className={
                    confirming === 'cancel' ? 'bg-red-600 hover:bg-red-700 text-white' :
                    confirming === 'arrive' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' :
                    'bg-purple-600 hover:bg-purple-700 text-white'
                  }
                >
                  {isActing ? 'Processing...' :
                   confirming === 'cancel' ? 'Confirm Cancel' :
                   confirming === 'arrive' ? 'Confirm Arrived' :
                   'Confirm Fulfilled'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer action buttons */}
        {!confirming && (
          <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
            {canArrive && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                onClick={() => setConfirming('arrive')}
              >
                <CalendarCheck className="w-4 h-4" /> Mark Arrived
              </Button>
            )}
            {canFulfill && (
              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5"
                onClick={() => setConfirming('fulfill')}
              >
                <CheckSquare className="w-4 h-4" /> Mark Fulfilled
              </Button>
            )}
            {canCancel && (
              <Button
                size="sm"
                variant="destructive"
                className="flex items-center gap-1.5"
                onClick={() => setConfirming('cancel')}
              >
                <XCircle className="w-4 h-4" /> Cancel Appointment
              </Button>
            )}
            <Button variant="outline" size="sm" className="ml-auto" onClick={onClose}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentDetailsModal;
