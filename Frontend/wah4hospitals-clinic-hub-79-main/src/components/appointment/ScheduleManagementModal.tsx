// src/components/appointment/ScheduleManagementModal.tsx
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Clock, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { appointmentService } from '@/services/appointmentService';
import { useAuth } from '@/contexts/AuthContext';
import type { Schedule, NewSchedule, Slot, NewSlot } from '@/types/appointment';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schedule?: Schedule | null;
}

const SERVICE_TYPES = [
  { code: '11429006', display: 'Consultation' },
  { code: '185389009', display: 'Follow-up' },
  { code: '11429007', display: 'Check-up' },
  { code: '306206005', display: 'Referral' },
  { code: '11429008', display: 'Emergency' },
  { code: '11429009', display: 'Procedure' },
];

const SLOT_STATUS_STYLE: Record<string, string> = {
  free:              'bg-emerald-100 text-emerald-700',
  busy:              'bg-red-100 text-red-700',
  'busy-unavailable': 'bg-gray-100 text-gray-600',
  'busy-tentative':  'bg-yellow-100 text-yellow-700',
  'entered-in-error': 'bg-gray-100 text-gray-400',
};

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '—';

export const ScheduleManagementModal: React.FC<Props> = ({
  isOpen, onClose, onSuccess, schedule,
}) => {
  const { user } = useAuth();
  const isEditing = !!schedule;

  // Form fields
  const [practitioners, setPractitioners] = useState<any[]>([]);
  const [practitionerId, setPractitionerId] = useState<string>('');
  const [serviceTypeCode, setServiceTypeCode] = useState('');
  const [serviceTypeDisplay, setServiceTypeDisplay] = useState('');
  const [horizonStart, setHorizonStart] = useState('');
  const [horizonEnd, setHorizonEnd] = useState('');
  const [comment, setComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Slots panel (only when editing an existing schedule)
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Add slot form
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [slotStart, setSlotStart] = useState('');
  const [slotEnd, setSlotEnd] = useState('');
  const [slotComment, setSlotComment] = useState('');
  const [isAddingSlot, setIsAddingSlot] = useState(false);
  const [slotError, setSlotError] = useState('');

  // Populate form when editing
  useEffect(() => {
    if (isOpen && schedule) {
      setPractitionerId(schedule.actor_practitioner_id ? String(schedule.actor_practitioner_id) : '');
      setServiceTypeCode(schedule.service_type_code ?? '');
      setServiceTypeDisplay(schedule.service_type_display ?? '');
      setHorizonStart(schedule.planning_horizon_start?.slice(0, 16) ?? '');
      setHorizonEnd(schedule.planning_horizon_end?.slice(0, 16) ?? '');
      setComment(schedule.comment ?? '');
      loadSlots(schedule.identifier);
    }
  }, [isOpen, schedule]);

  useEffect(() => {
    if (isOpen && practitioners.length === 0) {
      appointmentService.getPractitioners('doctor').then(setPractitioners);
    }
  }, [isOpen]);

  // Pre-fill physician to logged-in doctor/nurse when creating a new schedule
  useEffect(() => {
    if (isOpen && !schedule && (user?.role === 'doctor' || user?.role === 'nurse') && user?.id) {
      setPractitionerId(user.id);
    }
  }, [isOpen, schedule, user?.id, user?.role]);

  const loadSlots = async (identifier: string) => {
    setSlotsLoading(true);
    const data = await appointmentService.getScheduleSlots(identifier);
    setSlots(data);
    setSlotsLoading(false);
  };

  const handleReset = () => {
    setPractitionerId('');
    setServiceTypeCode('');
    setServiceTypeDisplay('');
    setHorizonStart('');
    setHorizonEnd('');
    setComment('');
    setFormError('');
    setSlots([]);
    setShowSlotForm(false);
    setSlotStart('');
    setSlotEnd('');
    setSlotComment('');
    setSlotError('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSaveSchedule = async () => {
    if (!horizonStart || !horizonEnd) {
      setFormError('Planning horizon start and end are required.');
      return;
    }
    setFormError('');
    setIsSaving(true);
    try {
      const payload: NewSchedule = {
        planning_horizon_start: new Date(horizonStart).toISOString(),
        planning_horizon_end:   new Date(horizonEnd).toISOString(),
        service_type_code:    serviceTypeCode || undefined,
        service_type_display: serviceTypeDisplay || undefined,
        comment:              comment || undefined,
        status:               'active',
        ...(practitionerId && practitionerId !== 'none'
          ? { actor_practitioner_id: Number(practitionerId) }
          : {}),
      };
      if (isEditing && schedule) {
        await appointmentService.updateSchedule(schedule.identifier, payload);
      } else {
        await appointmentService.createSchedule(payload);
      }
      onSuccess();
      handleClose();
    } catch (e: any) {
      const detail = e?.response?.data;
      setFormError(
        typeof detail === 'string'
          ? detail
          : detail?.detail ?? JSON.stringify(detail) ?? 'Failed to save schedule.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSlot = async () => {
    if (!slotStart || !slotEnd || !schedule) return;
    setSlotError('');
    setIsAddingSlot(true);
    try {
      const newSlot: NewSlot = {
        schedule_id:          schedule.schedule_id,
        start:                new Date(slotStart).toISOString(),
        end:                  new Date(slotEnd).toISOString(),
        service_type_code:    serviceTypeCode || undefined,
        service_type_display: serviceTypeDisplay || undefined,
        comment:              slotComment || undefined,
        status:               'free',
      };
      await appointmentService.createSlot(newSlot);
      setSlotStart('');
      setSlotEnd('');
      setSlotComment('');
      setShowSlotForm(false);
      await loadSlots(schedule.identifier);
    } catch (e: any) {
      const detail = e?.response?.data;
      setSlotError(
        typeof detail === 'string'
          ? detail
          : detail?.detail ?? JSON.stringify(detail) ?? 'Failed to create slot.',
      );
    } finally {
      setIsAddingSlot(false);
    }
  };

  const handleDeleteSlot = async (slot: Slot) => {
    if (!window.confirm('Delete this slot?')) return;
    try {
      await appointmentService.deleteSlot(slot.identifier);
      setSlots(prev => prev.filter(s => s.slot_id !== slot.slot_id));
    } catch {
      alert('Failed to delete slot.');
    }
  };

  const handleServiceTypeChange = (code: string) => {
    const svc = SERVICE_TYPES.find(s => s.code === code);
    setServiceTypeCode(code);
    setServiceTypeDisplay(svc?.display ?? code);
  };

  const freeSlotsCount  = slots.filter(s => s.status === 'free').length;
  const busySlotsCount  = slots.filter(s => s.status === 'busy').length;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            {isEditing ? `Manage Schedule · ${schedule!.identifier}` : 'Create Schedule'}
          </DialogTitle>
        </DialogHeader>

        {/* ── Schedule form ─────────────────────────────── */}
        <div className="space-y-4 py-2">
          <div>
            <Label>Physician / Actor</Label>
            <Select value={practitionerId} onValueChange={setPractitionerId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select physician..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {practitioners.map((p: any) => (
                  <SelectItem key={p.practitioner_id} value={String(p.practitioner_id)}>
                    {p.first_name} {p.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Service Type</Label>
            <Select value={serviceTypeCode} onValueChange={handleServiceTypeChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select service type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {SERVICE_TYPES.map(s => (
                  <SelectItem key={s.code} value={s.code}>{s.display}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Horizon Start <span className="text-red-500">*</span></Label>
              <Input
                type="datetime-local"
                className="mt-1"
                value={horizonStart}
                onChange={e => setHorizonStart(e.target.value)}
              />
            </div>
            <div>
              <Label>Horizon End <span className="text-red-500">*</span></Label>
              <Input
                type="datetime-local"
                className="mt-1"
                value={horizonEnd}
                onChange={e => setHorizonEnd(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Comment</Label>
            <Textarea
              className="mt-1"
              placeholder="Optional notes about this schedule..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={2}
            />
          </div>

          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{formError}</div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button
              onClick={handleSaveSchedule}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Schedule'}
            </Button>
          </div>
        </div>

        {/* ── Slots panel (only when editing) ──────────── */}
        {isEditing && schedule && (
          <>
            <div className="border-t border-slate-200 my-2" />

            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-sm">Slots</h3>
                  <span className="text-xs text-slate-400">
                    {freeSlotsCount} free · {busySlotsCount} busy · {slots.length} total
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => loadSlots(schedule.identifier)}
                    disabled={slotsLoading}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${slotsLoading ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => setShowSlotForm(v => !v)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Slot
                  </Button>
                </div>
              </div>

              {/* Add slot inline form */}
              {showSlotForm && (
                <div className="p-3 border border-slate-200 rounded-lg bg-slate-50 mb-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Start <span className="text-red-500">*</span></Label>
                      <Input
                        type="datetime-local"
                        className="mt-1 text-sm"
                        value={slotStart}
                        onChange={e => setSlotStart(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">End <span className="text-red-500">*</span></Label>
                      <Input
                        type="datetime-local"
                        className="mt-1 text-sm"
                        value={slotEnd}
                        onChange={e => setSlotEnd(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Comment</Label>
                    <Input
                      className="mt-1 text-sm"
                      placeholder="Optional slot note..."
                      value={slotComment}
                      onChange={e => setSlotComment(e.target.value)}
                    />
                  </div>
                  {slotError && <p className="text-xs text-red-600">{slotError}</p>}
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setShowSlotForm(false)}>Cancel</Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={handleAddSlot}
                      disabled={isAddingSlot || !slotStart || !slotEnd}
                    >
                      {isAddingSlot ? 'Adding...' : 'Add Slot'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Slots list */}
              {slotsLoading ? (
                <div className="py-6 text-center text-sm text-slate-400 animate-pulse">Loading slots...</div>
              ) : slots.length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-400">No slots yet. Add the first one above.</div>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {slots.map(slot => (
                    <div
                      key={slot.slot_id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-slate-300 flex-shrink-0" />
                        <div>
                          <div className="text-sm font-semibold text-slate-800">
                            {fmtDate(slot.start)}
                          </div>
                          <div className="text-xs text-slate-400">→ {fmtDate(slot.end)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${SLOT_STATUS_STYLE[slot.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {slot.status}
                        </span>
                        {slot.status !== 'busy' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-slate-400 hover:text-red-500"
                            onClick={() => handleDeleteSlot(slot)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleManagementModal;
