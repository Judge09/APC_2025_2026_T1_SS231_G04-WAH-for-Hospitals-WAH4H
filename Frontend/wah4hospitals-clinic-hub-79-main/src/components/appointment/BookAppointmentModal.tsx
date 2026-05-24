// src/components/appointment/BookAppointmentModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Search, ChevronRight, ChevronLeft, CheckCircle2, Clock, User, Stethoscope } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { appointmentService } from '@/services/appointmentService';
import type { PatientSummary, Slot, NewAppointment } from '@/types/appointment';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SERVICE_TYPES = [
  { code: '11429006', display: 'Consultation' },
  { code: '185389009', display: 'Follow-up' },
  { code: '11429007', display: 'Check-up' },
  { code: '306206005', display: 'Referral' },
  { code: '11429008', display: 'Emergency' },
  { code: '11429009', display: 'Procedure' },
];

const APPOINTMENT_TYPES = [
  { code: 'ROUTINE', display: 'Routine' },
  { code: 'WALKIN', display: 'Walk-in' },
  { code: 'CHECKUP', display: 'Check-up' },
  { code: 'FOLLOWUP', display: 'Follow-up' },
  { code: 'EMERGENCY', display: 'Emergency' },
];

const STEPS = ['Patient', 'Details', 'Time & Confirm'];

export const BookAppointmentModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step 1 — Patient
  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState<PatientSummary[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);
  const [patientSearching, setPatientSearching] = useState(false);

  // Step 2 — Details
  const [practitioners, setPractitioners] = useState<any[]>([]);
  const [practitionerId, setPractitionerId] = useState<string>('');
  const [serviceTypeCode, setServiceTypeCode] = useState('');
  const [serviceTypeDisplay, setServiceTypeDisplay] = useState('');
  const [appointmentTypeCode, setAppointmentTypeCode] = useState('ROUTINE');
  const [appointmentTypeDisplay, setAppointmentTypeDisplay] = useState('Routine');
  const [reasonCode, setReasonCode] = useState('');
  const [description, setDescription] = useState('');
  const [patientInstruction, setPatientInstruction] = useState('');

  // Step 3 — Time
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [manualStart, setManualStart] = useState('');
  const [manualEnd, setManualEnd] = useState('');
  const [useManualTime, setUseManualTime] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Reset on open/close
  useEffect(() => {
    if (!isOpen) {
      setStep(0);
      setError('');
      setPatientQuery('');
      setPatientResults([]);
      setSelectedPatient(null);
      setPractitionerId('');
      setServiceTypeCode('');
      setServiceTypeDisplay('');
      setAppointmentTypeCode('ROUTINE');
      setAppointmentTypeDisplay('Routine');
      setReasonCode('');
      setDescription('');
      setPatientInstruction('');
      setSelectedDate('');
      setAvailableSlots([]);
      setSelectedSlot(null);
      setManualStart('');
      setManualEnd('');
      setUseManualTime(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && step === 1 && practitioners.length === 0) {
      appointmentService.getPractitioners('doctor').then(setPractitioners);
    }
  }, [isOpen, step]);

  // Debounced patient search
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(async () => {
      if (patientQuery.length < 2) { setPatientResults([]); return; }
      setPatientSearching(true);
      const results = await appointmentService.searchPatients(patientQuery);
      setPatientResults(results);
      setPatientSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [patientQuery, isOpen]);

  const fetchSlots = useCallback(async () => {
    if (!selectedDate) return;
    setSlotsLoading(true);
    const dateFrom = `${selectedDate}T00:00:00`;
    const dateTo   = `${selectedDate}T23:59:59`;
    const slots = await appointmentService.getAvailableSlots({
      date_from: dateFrom,
      date_to:   dateTo,
      ...(practitionerId ? { practitioner_id: Number(practitionerId) } : {}),
    });
    setAvailableSlots(slots);
    setSelectedSlot(null);
    setSlotsLoading(false);
  }, [selectedDate, practitionerId]);

  useEffect(() => {
    if (step === 2 && selectedDate) fetchSlots();
  }, [step, selectedDate, fetchSlots]);

  const handleServiceTypeChange = (code: string) => {
    const svc = SERVICE_TYPES.find(s => s.code === code);
    setServiceTypeCode(code);
    setServiceTypeDisplay(svc?.display ?? code);
  };

  const handleAppointmentTypeChange = (code: string) => {
    const apt = APPOINTMENT_TYPES.find(a => a.code === code);
    setAppointmentTypeCode(code);
    setAppointmentTypeDisplay(apt?.display ?? code);
  };

  const canNext = () => {
    if (step === 0) return !!selectedPatient;
    if (step === 1) return !!serviceTypeCode;
    if (step === 2) {
      if (useManualTime) return !!(manualStart && manualEnd);
      return !!selectedSlot;
    }
    return false;
  };

  const handleSubmit = async () => {
    if (!selectedPatient) return;
    setError('');
    setIsSubmitting(true);
    try {
      const payload: NewAppointment = {
        patient_id: selectedPatient.id,
        // Guard against the "none" sentinel — Number("none") = NaN
        ...(practitionerId && practitionerId !== 'none' ? { practitioner_id: Number(practitionerId) } : {}),
        service_type_code:    serviceTypeCode,
        service_type_display: serviceTypeDisplay,
        appointment_type_code:    appointmentTypeCode,
        appointment_type_display: appointmentTypeDisplay,
        reason_code:         reasonCode || undefined,
        description:         description || undefined,
        patient_instruction: patientInstruction || undefined,
        status: 'booked',
      };

      if (useManualTime) {
        payload.start = manualStart;
        payload.end   = manualEnd;
      } else if (selectedSlot) {
        payload.slot_id = selectedSlot.slot_id;
        payload.start   = selectedSlot.start;
        payload.end     = selectedSlot.end;
      }

      await appointmentService.create(payload);
      onSuccess();
    } catch (e: any) {
      const detail = e?.response?.data;
      setError(
        typeof detail === 'string'
          ? detail
          : detail?.detail ?? JSON.stringify(detail) ?? 'Booking failed. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">Book Appointment</DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-0 mb-6">
          {STEPS.map((label, i) => (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  i < step ? 'bg-emerald-500 text-white' :
                  i === step ? 'bg-blue-600 text-white' :
                  'bg-slate-100 text-slate-400'
                }`}>
                  {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-[10px] font-semibold uppercase tracking-wide ${i === step ? 'text-blue-600' : 'text-slate-400'}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mb-4 transition-colors ${i < step ? 'bg-emerald-400' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        {/* ── Step 0: Patient ─────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search patient by name or ID..."
                value={patientQuery}
                onChange={e => setPatientQuery(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>

            {selectedPatient && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-center">
                <div>
                  <div className="font-bold text-slate-900 text-sm">{selectedPatient.full_name}</div>
                  <div className="text-xs text-slate-500">ID: {selectedPatient.patient_id} · {selectedPatient.gender ?? ''}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)} className="text-slate-500 h-6 text-xs">Change</Button>
              </div>
            )}

            {!selectedPatient && (
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-50 border rounded-lg bg-white">
                {patientSearching && (
                  <div className="p-4 text-center text-sm text-slate-400 animate-pulse">Searching...</div>
                )}
                {!patientSearching && patientResults.length === 0 && patientQuery.length >= 2 && (
                  <div className="p-4 text-center text-sm text-slate-400">No patients found.</div>
                )}
                {!patientSearching && patientQuery.length < 2 && (
                  <div className="p-4 text-center text-sm text-slate-400">Type at least 2 characters to search.</div>
                )}
                {patientResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedPatient(p); setPatientQuery(''); }}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors"
                  >
                    <div className="font-semibold text-slate-900 text-sm">{p.full_name}</div>
                    <div className="text-xs text-slate-400">
                      ID: {p.patient_id}
                      {p.age != null && ` · ${p.age} yrs`}
                      {p.gender && ` · ${p.gender}`}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step 1: Details ─────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Physician (optional)</Label>
              <Select value={practitionerId} onValueChange={setPractitionerId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select physician..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {practitioners.map((p: any) => (
                    <SelectItem key={p.practitioner_id} value={String(p.practitioner_id)}>
                      {p.first_name} {p.last_name}
                      {p.qualification_display ? ` · ${p.qualification_display}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Service Type <span className="text-red-500">*</span></Label>
              <Select value={serviceTypeCode} onValueChange={handleServiceTypeChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select service type..." />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map(s => (
                    <SelectItem key={s.code} value={s.code}>{s.display}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Appointment Type</Label>
              <Select value={appointmentTypeCode} onValueChange={handleAppointmentTypeChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_TYPES.map(a => (
                    <SelectItem key={a.code} value={a.code}>{a.display}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Reason / Chief Complaint</Label>
              <Input
                className="mt-1"
                placeholder="e.g. Fever, follow-up for hypertension..."
                value={reasonCode}
                onChange={e => setReasonCode(e.target.value)}
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                className="mt-1"
                placeholder="Additional clinical details..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div>
              <Label>Patient Instructions <span className="text-slate-400 font-normal text-xs">(optional)</span></Label>
              <Textarea
                className="mt-1"
                placeholder="e.g. Arrive 15 min early, bring lab results, fast for 8 hours..."
                value={patientInstruction}
                onChange={e => setPatientInstruction(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        )}

        {/* ── Step 2: Time & Confirm ────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Patient summary */}
            <div className="p-3 bg-slate-50 rounded-lg flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">{selectedPatient?.full_name}</div>
                <div className="text-xs text-slate-500">
                  {serviceTypeDisplay} · {appointmentTypeDisplay}
                  {practitioners.find(p => String(p.practitioner_id) === practitionerId)
                    ? ` · Dr. ${practitioners.find(p => String(p.practitioner_id) === practitionerId)?.first_name} ${practitioners.find(p => String(p.practitioner_id) === practitionerId)?.last_name}`
                    : ''}
                </div>
              </div>
            </div>

            <div>
              <Label>Date <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                className="mt-1"
                value={selectedDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={e => setSelectedDate(e.target.value)}
              />
            </div>

            {selectedDate && (
              <>
                <div className="flex items-center justify-between">
                  <Label>Available Slots</Label>
                  <button
                    className="text-xs text-blue-600 underline"
                    onClick={() => { setUseManualTime(v => !v); setSelectedSlot(null); }}
                  >
                    {useManualTime ? 'Use available slot' : 'Enter time manually'}
                  </button>
                </div>

                {useManualTime ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Start</Label>
                      <Input
                        type="datetime-local"
                        className="mt-1 text-sm"
                        value={manualStart}
                        onChange={e => setManualStart(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">End</Label>
                      <Input
                        type="datetime-local"
                        className="mt-1 text-sm"
                        value={manualEnd}
                        onChange={e => setManualEnd(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="max-h-44 overflow-y-auto space-y-2">
                    {slotsLoading && (
                      <div className="py-4 text-center text-sm text-slate-400 animate-pulse">Loading slots...</div>
                    )}
                    {!slotsLoading && availableSlots.length === 0 && (
                      <div className="py-4 text-center text-sm text-slate-400">
                        No available slots for this date.
                        <button className="block mx-auto mt-1 text-blue-600 underline text-xs" onClick={() => setUseManualTime(true)}>
                          Enter time manually instead
                        </button>
                      </div>
                    )}
                    {availableSlots.map(slot => (
                      <button
                        key={slot.slot_id}
                        onClick={() => setSelectedSlot(slot)}
                        className={`w-full text-left p-3 rounded-lg border transition-all flex items-center gap-3 ${
                          selectedSlot?.slot_id === slot.slot_id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                        }`}
                      >
                        <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <div>
                          <div className="font-semibold text-sm text-slate-900">
                            {formatTime(slot.start)} – {formatTime(slot.end)}
                          </div>
                          {slot.service_type_display && (
                            <div className="text-xs text-slate-400">{slot.service_type_display}</div>
                          )}
                        </div>
                        {selectedSlot?.slot_id === slot.slot_id && (
                          <CheckCircle2 className="w-4 h-4 text-blue-500 ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-slate-100 mt-4">
          <Button
            variant="outline"
            onClick={() => step === 0 ? onClose() : setStep(s => s - 1)}
          >
            {step === 0 ? 'Cancel' : <><ChevronLeft className="w-4 h-4 mr-1" /> Back</>}
          </Button>

          {step < 2 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canNext() || isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmitting ? 'Booking...' : 'Confirm Booking'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookAppointmentModal;
