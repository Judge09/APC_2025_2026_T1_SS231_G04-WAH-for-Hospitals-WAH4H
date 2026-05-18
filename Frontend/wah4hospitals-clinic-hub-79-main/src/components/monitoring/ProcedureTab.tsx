import React, { useState } from 'react';
import { useRole } from '@/contexts/RoleContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Stethoscope, Clock, Trash2, Calendar } from 'lucide-react';
import { Procedure, ProcedureStatus } from '../../types/monitoring';
import monitoringService from '../../services/monitoringService';
import { toast } from 'sonner';

interface ProcedureTabProps {
    procedures: Procedure[];
    encounterId: number;
    patientId: number;
    onRefresh: () => void;
}

const STATUS_COLORS: Record<ProcedureStatus, string> = {
    'completed':        'bg-green-100 text-green-800 border-green-200',
    'in-progress':      'bg-blue-100 text-blue-800 border-blue-200',
    'preparation':      'bg-yellow-100 text-yellow-800 border-yellow-200',
    'not-done':         'bg-gray-100 text-gray-700 border-gray-200',
    'on-hold':          'bg-orange-100 text-orange-800 border-orange-200',
    'stopped':          'bg-red-100 text-red-800 border-red-200',
    'entered-in-error': 'bg-red-100 text-red-600 border-red-200',
    'unknown':          'bg-gray-100 text-gray-500 border-gray-200',
};

const CATEGORY_OPTIONS = [
    { value: '387713003', label: 'Surgical procedure' },
    { value: '103693007', label: 'Diagnostic procedure' },
    { value: '46947000',  label: 'Chiropractic manipulation' },
    { value: '409063005', label: 'Counselling' },
    { value: '409073007', label: 'Education' },
    { value: '387713003', label: 'Medical procedure' },
    { value: 'other',     label: 'Other' },
];

const TIMING_MODES = ['datetime', 'period', 'text'] as const;
type TimingMode = typeof TIMING_MODES[number];

interface FormState {
    status: ProcedureStatus;
    status_reason_code: string;
    status_reason_display: string;
    code_code: string;
    code_display: string;
    category_code: string;
    category_display: string;
    timingMode: TimingMode;
    performed_datetime: string;
    performed_period_start: string;
    performed_period_end: string;
    performed_string: string;
    reason_code_display: string;
    body_site_display: string;
    outcome_display: string;
    complication_display: string;
    follow_up_display: string;
    used_code_display: string;
    note: string;
}

const EMPTY_FORM: FormState = {
    status: 'completed',
    status_reason_code: '',
    status_reason_display: '',
    code_code: '',
    code_display: '',
    category_code: '',
    category_display: '',
    timingMode: 'datetime',
    performed_datetime: '',
    performed_period_start: '',
    performed_period_end: '',
    performed_string: '',
    reason_code_display: '',
    body_site_display: '',
    outcome_display: '',
    complication_display: '',
    follow_up_display: '',
    used_code_display: '',
    note: '',
};

function formatPerformed(p: Procedure): string {
    if (p.performed_datetime)
        return new Date(p.performed_datetime).toLocaleString('en-PH', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    if (p.performed_period_start)
        return `${p.performed_period_start}${p.performed_period_end ? ' – ' + p.performed_period_end : ''}`;
    if (p.performed_string) return p.performed_string;
    return '—';
}

export const ProcedureTab: React.FC<ProcedureTabProps> = ({
    procedures, encounterId, patientId, onRefresh,
}) => {
    const { currentRole } = useRole();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);

    const canWrite = currentRole === 'doctor' || currentRole === 'nurse';

    const set = (field: keyof FormState) => (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => setForm(prev => ({ ...prev, [field]: e.target.value }));

    const resetAndClose = () => {
        setForm(EMPTY_FORM);
        setIsModalOpen(false);
    };

    const handleCategoryChange = (value: string) => {
        const opt = CATEGORY_OPTIONS.find(o => o.value === value);
        setForm(prev => ({
            ...prev,
            category_code: value === 'other' ? '' : value,
            category_display: opt?.label ?? '',
        }));
    };

    const handleSave = async () => {
        if (!form.code_display && !form.code_code) {
            toast.error('Procedure name or code is required.');
            return;
        }

        setIsSaving(true);
        try {
            const payload: Partial<Procedure> = {
                status: form.status,
                code_code: form.code_code || undefined,
                code_display: form.code_display || undefined,
                category_code: form.category_code || undefined,
                category_display: form.category_display || undefined,
                encounter: encounterId,
                subject_id: patientId,
                note: form.note || undefined,
                reason_code_display: form.reason_code_display || undefined,
                body_site_display: form.body_site_display || undefined,
                outcome_display: form.outcome_display || undefined,
                complication_display: form.complication_display || undefined,
                follow_up_display: form.follow_up_display || undefined,
                used_code_display: form.used_code_display || undefined,
            };

            if (form.status === 'not-done') {
                payload.status_reason_display = form.status_reason_display || undefined;
                payload.status_reason_code = form.status_reason_code || undefined;
            }

            if (form.timingMode === 'datetime' && form.performed_datetime)
                payload.performed_datetime = form.performed_datetime;
            else if (form.timingMode === 'period') {
                payload.performed_period_start = form.performed_period_start || undefined;
                payload.performed_period_end = form.performed_period_end || undefined;
            } else if (form.timingMode === 'text' && form.performed_string)
                payload.performed_string = form.performed_string;

            await monitoringService.createProcedure(payload);
            toast.success('Procedure recorded successfully.');
            resetAndClose();
            onRefresh();
        } catch (err: any) {
            console.error('Failed to save procedure', err);
            toast.error(err?.response?.data?.detail ?? 'Failed to save procedure.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (identifier: string) => {
        if (!confirm('Delete this procedure record? This cannot be undone.')) return;
        setDeletingId(identifier);
        try {
            await monitoringService.deleteProcedure(identifier);
            toast.success('Procedure deleted.');
            onRefresh();
        } catch {
            toast.error('Failed to delete procedure.');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                {canWrite && (
                    <Button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Record Procedure
                    </Button>
                )}
            </div>

            {procedures.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                    <div className="bg-red-50 rounded-full p-6 mb-4">
                        <Stethoscope className="w-12 h-12 text-red-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Procedures Recorded</h3>
                    <p className="text-sm text-gray-500 text-center max-w-md">
                        No procedures have been documented for this encounter yet.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {procedures.map(proc => (
                        <Card
                            key={proc.procedure_id}
                            className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <CardHeader className="pb-3 bg-gradient-to-r from-red-50/50 to-transparent">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Stethoscope className="w-5 h-5 text-red-600" />
                                            <CardTitle className="text-lg font-bold text-gray-900">
                                                {proc.code_display || proc.code_code || 'Unnamed Procedure'}
                                            </CardTitle>
                                            <Badge className={STATUS_COLORS[proc.status]}>
                                                {proc.status}
                                            </Badge>
                                            {proc.category_display && (
                                                <Badge variant="outline" className="text-xs">
                                                    {proc.category_display}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {formatPerformed(proc)}
                                            </span>
                                            {proc.body_site_display && (
                                                <span>Site: <span className="font-medium">{proc.body_site_display}</span></span>
                                            )}
                                            {proc.outcome_display && (
                                                <span>Outcome: <span className="font-medium">{proc.outcome_display}</span></span>
                                            )}
                                        </div>
                                    </div>
                                    {canWrite && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(proc.identifier)}
                                            disabled={deletingId === proc.identifier}
                                            className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1 h-auto"
                                        >
                                            {deletingId === proc.identifier
                                                ? <Clock className="w-4 h-4 animate-spin" />
                                                : <Trash2 className="w-4 h-4" />}
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>

                            {(proc.reason_code_display || proc.complication_display ||
                              proc.follow_up_display || proc.used_code_display ||
                              proc.status_reason_display || proc.note) && (
                                <CardContent className="text-sm space-y-2 pt-0">
                                    {proc.status_reason_display && (
                                        <div className="bg-gray-50 rounded p-2">
                                            <span className="font-semibold text-gray-600">Reason not done: </span>
                                            {proc.status_reason_display}
                                        </div>
                                    )}
                                    {proc.reason_code_display && (
                                        <div><span className="font-semibold text-gray-600">Reason: </span>{proc.reason_code_display}</div>
                                    )}
                                    {proc.complication_display && (
                                        <div><span className="font-semibold text-red-600">Complication: </span>{proc.complication_display}</div>
                                    )}
                                    {proc.follow_up_display && (
                                        <div><span className="font-semibold text-gray-600">Follow-up: </span>{proc.follow_up_display}</div>
                                    )}
                                    {proc.used_code_display && (
                                        <div><span className="font-semibold text-gray-600">Materials used: </span>{proc.used_code_display}</div>
                                    )}
                                    {proc.note && (
                                        <div className="bg-gray-50 rounded p-2 whitespace-pre-wrap text-gray-700">
                                            {proc.note}
                                        </div>
                                    )}
                                </CardContent>
                            )}
                        </Card>
                    ))}
                </div>
            )}

            {/* ── Add Procedure Modal ───────────────────────────────────────── */}
            <Dialog open={isModalOpen} onOpenChange={resetAndClose}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <Stethoscope className="w-6 h-6 text-red-600" />
                            Record Procedure
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Section 1 — Identity */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Procedure Identity</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label>Procedure Name <span className="text-red-500">*</span></Label>
                                    <Input
                                        value={form.code_display}
                                        onChange={set('code_display')}
                                        placeholder="e.g. Appendectomy"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>SNOMED Code</Label>
                                    <Input
                                        value={form.code_code}
                                        onChange={set('code_code')}
                                        placeholder="e.g. 80146002"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label>Category</Label>
                                    <Select onValueChange={handleCategoryChange}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CATEGORY_OPTIONS.map(o => (
                                                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Status</Label>
                                    <Select
                                        value={form.status}
                                        onValueChange={v => setForm(prev => ({ ...prev, status: v as ProcedureStatus }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="completed">Completed</SelectItem>
                                            <SelectItem value="in-progress">In Progress</SelectItem>
                                            <SelectItem value="preparation">Preparation</SelectItem>
                                            <SelectItem value="on-hold">On Hold</SelectItem>
                                            <SelectItem value="stopped">Stopped</SelectItem>
                                            <SelectItem value="not-done">Not Done</SelectItem>
                                            <SelectItem value="unknown">Unknown</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {form.status === 'not-done' && (
                                <div className="space-y-1">
                                    <Label>Reason Not Performed</Label>
                                    <Input
                                        value={form.status_reason_display}
                                        onChange={set('status_reason_display')}
                                        placeholder="e.g. Patient refused, contraindicated"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Section 2 — Timing */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Timing</h3>

                            <div className="space-y-1">
                                <Label>Timing Type</Label>
                                <Select
                                    value={form.timingMode}
                                    onValueChange={v => setForm(prev => ({ ...prev, timingMode: v as TimingMode }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="datetime">Single Date/Time</SelectItem>
                                        <SelectItem value="period">Period (Start – End)</SelectItem>
                                        <SelectItem value="text">Free Text</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {form.timingMode === 'datetime' && (
                                <div className="space-y-1">
                                    <Label>Performed Date & Time</Label>
                                    <Input
                                        type="datetime-local"
                                        value={form.performed_datetime}
                                        onChange={set('performed_datetime')}
                                    />
                                </div>
                            )}

                            {form.timingMode === 'period' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label>Start Date</Label>
                                        <Input type="date" value={form.performed_period_start} onChange={set('performed_period_start')} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>End Date</Label>
                                        <Input type="date" value={form.performed_period_end} onChange={set('performed_period_end')} />
                                    </div>
                                </div>
                            )}

                            {form.timingMode === 'text' && (
                                <div className="space-y-1">
                                    <Label>Timing Description</Label>
                                    <Input
                                        value={form.performed_string}
                                        onChange={set('performed_string')}
                                        placeholder="e.g. During morning rounds on Day 3"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Section 3 — Clinical Details */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Clinical Details</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label>Body Site</Label>
                                    <Input value={form.body_site_display} onChange={set('body_site_display')} placeholder="e.g. Right lower quadrant" />
                                </div>
                                <div className="space-y-1">
                                    <Label>Reason</Label>
                                    <Input value={form.reason_code_display} onChange={set('reason_code_display')} placeholder="e.g. Acute appendicitis" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label>Outcome</Label>
                                    <Input value={form.outcome_display} onChange={set('outcome_display')} placeholder="e.g. Successful" />
                                </div>
                                <div className="space-y-1">
                                    <Label>Complication</Label>
                                    <Input value={form.complication_display} onChange={set('complication_display')} placeholder="e.g. Minor bleeding" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label>Follow-up</Label>
                                    <Input value={form.follow_up_display} onChange={set('follow_up_display')} placeholder="e.g. Wound check in 7 days" />
                                </div>
                                <div className="space-y-1">
                                    <Label>Materials / Devices Used</Label>
                                    <Input value={form.used_code_display} onChange={set('used_code_display')} placeholder="e.g. Laparoscope, sutures" />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label>Notes</Label>
                                <Textarea
                                    value={form.note}
                                    onChange={set('note')}
                                    placeholder="Additional procedural notes..."
                                    className="min-h-[80px]"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={resetAndClose}>Cancel</Button>
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isSaving ? 'Saving...' : 'Save Procedure'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
