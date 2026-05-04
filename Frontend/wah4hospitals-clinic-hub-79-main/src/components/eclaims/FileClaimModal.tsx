// src/components/eclaims/FileClaimModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Search, ChevronRight, ChevronLeft, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { eclaimsService } from '@/services/eclaimsService';
import type { EClaimPatient, Coverage, ClaimDiagnosis, ClaimProcedure, ClaimItem, NewEClaim } from '@/types/eclaims';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const STEPS = ['Patient & Coverage', 'Diagnoses & Procedures', 'Service Items', 'Review & File'];

const CLAIM_TYPES = [
  { code: 'institutional', display: 'Institutional (Inpatient)' },
  { code: 'professional',  display: 'Professional (Outpatient)' },
  { code: 'oral',          display: 'Oral / Dental' },
  { code: 'pharmacy',      display: 'Pharmacy' },
  { code: 'vision',        display: 'Vision' },
];

const DIAGNOSIS_TYPES = ['principal', 'secondary', 'admitting', 'discharge'];

export const FileClaimModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step 0 — Patient & Coverage
  const [patientQuery, setPatientQuery]     = useState('');
  const [patientResults, setPatientResults] = useState<EClaimPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<EClaimPatient | null>(null);
  const [patientSearching, setPatientSearching] = useState(false);
  const [coverages, setCoverages]           = useState<Coverage[]>([]);
  const [selectedCoverageId, setSelectedCoverageId] = useState('');
  const [claimType, setClaimType]           = useState('institutional');
  const [billStart, setBillStart]           = useState('');
  const [billEnd, setBillEnd]               = useState('');

  // Step 1 — Diagnoses & Procedures
  const [diagnoses, setDiagnoses]   = useState<ClaimDiagnosis[]>([{ diagnosisCodeableConcept: '', type: 'principal' }]);
  const [procedures, setProcedures] = useState<ClaimProcedure[]>([]);

  // Step 2 — Items
  const [items, setItems] = useState<ClaimItem[]>([{ productOrService: '', quantity: 1, unitPrice: 0 }]);

  const totalAmount = items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);

  const reset = () => {
    setStep(0); setError('');
    setPatientQuery(''); setPatientResults([]); setSelectedPatient(null);
    setCoverages([]); setSelectedCoverageId('');
    setClaimType('institutional'); setBillStart(''); setBillEnd('');
    setDiagnoses([{ diagnosisCodeableConcept: '', type: 'principal' }]);
    setProcedures([]); setItems([{ productOrService: '', quantity: 1, unitPrice: 0 }]);
  };

  useEffect(() => { if (!isOpen) reset(); }, [isOpen]);

  // Debounced patient search
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(async () => {
      if (patientQuery.length < 2) { setPatientResults([]); return; }
      setPatientSearching(true);
      const r = await eclaimsService.searchPatients(patientQuery);
      setPatientResults(r);
      setPatientSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [patientQuery, isOpen]);

  const selectPatient = useCallback(async (p: EClaimPatient) => {
    setSelectedPatient(p);
    setPatientQuery('');
    setPatientResults([]);
    const covs = await eclaimsService.getCoverageForPatient(p.id);
    setCoverages(covs);
    if (covs.length > 0) setSelectedCoverageId(covs[0].identifier);
  }, []);

  const canNext = () => {
    if (step === 0) return !!selectedPatient && !!billStart;
    if (step === 1) return diagnoses.some(d => d.diagnosisCodeableConcept);
    if (step === 2) return items.some(i => i.productOrService && Number(i.unitPrice) > 0);
    return false;
  };

  // ── Diagnoses helpers ────────────────────────────────────────────────────
  const addDiagnosis   = () => setDiagnoses(d => [...d, { diagnosisCodeableConcept: '', type: 'secondary' }]);
  const removeDiagnosis = (i: number) => setDiagnoses(d => d.filter((_, idx) => idx !== i));
  const setDiagField   = (i: number, k: keyof ClaimDiagnosis, v: string) =>
    setDiagnoses(d => d.map((x, idx) => idx === i ? { ...x, [k]: v } : x));

  // ── Procedures helpers ───────────────────────────────────────────────────
  const addProcedure    = () => setProcedures(p => [...p, { procedureCodeableConcept: '', type: 'primary' }]);
  const removeProcedure = (i: number) => setProcedures(p => p.filter((_, idx) => idx !== i));
  const setProcField    = (i: number, k: keyof ClaimProcedure, v: string) =>
    setProcedures(p => p.map((x, idx) => idx === i ? { ...x, [k]: v } : x));

  // ── Items helpers ────────────────────────────────────────────────────────
  const addItem    = () => setItems(it => [...it, { productOrService: '', quantity: 1, unitPrice: 0 }]);
  const removeItem = (i: number) => setItems(it => it.filter((_, idx) => idx !== i));
  const setItemField = (i: number, k: keyof ClaimItem, v: any) =>
    setItems(it => it.map((x, idx) => idx === i ? { ...x, [k]: v } : x));

  const handleSubmit = async () => {
    if (!selectedPatient) return;
    setError(''); setIsSubmitting(true);
    try {
      const payload: NewEClaim = {
        subject_id: selectedPatient.id,
        type: claimType,
        use: 'claim',
        billablePeriod_start: billStart || undefined,
        billablePeriod_end:   billEnd   || undefined,
        priority: 'normal',
        total: totalAmount,
        total_currency: 'PHP',
        status: 'draft',
        diagnoses: diagnoses.filter(d => d.diagnosisCodeableConcept),
        procedures: procedures.filter(p => p.procedureCodeableConcept),
        items: items.filter(i => i.productOrService && Number(i.unitPrice) > 0).map(i => ({
          ...i,
          net: String((Number(i.quantity) || 0) * (Number(i.unitPrice) || 0)),
          servicedDate: billStart || undefined,
        })),
      };
      await eclaimsService.create(payload);
      onSuccess();
    } catch (e: any) {
      const d = e?.response?.data;
      setError(typeof d === 'string' ? d : d?.detail ?? JSON.stringify(d) ?? 'Failed to file claim.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">File eClaim</DialogTitle>
        </DialogHeader>

        {/* Step bar */}
        <div className="flex items-center gap-0 mb-5">
          {STEPS.map((label, i) => (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center gap-1 min-w-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors flex-shrink-0 ${
                  i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {i < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-wide text-center ${i === step ? 'text-blue-600' : 'text-slate-400'}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mb-4 mx-1 transition-colors ${i < step ? 'bg-emerald-400' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}

        {/* ── Step 0: Patient & Coverage ─────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-4">
            {selectedPatient ? (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-start">
                <div>
                  <div className="font-bold text-slate-900">{selectedPatient.full_name}</div>
                  <div className="text-xs text-slate-500">
                    ID: {selectedPatient.patient_id}
                    {selectedPatient.philhealth_id && ` · PhilHealth: ${selectedPatient.philhealth_id}`}
                  </div>
                  {coverages.length > 0 ? (
                    <div className="mt-1 text-xs text-emerald-600 font-semibold">✓ {coverages.length} active coverage(s)</div>
                  ) : (
                    <div className="mt-1 text-xs text-amber-600">⚠ No active PhilHealth coverage on file</div>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedPatient(null); setCoverages([]); }} className="text-xs h-6">Change</Button>
              </div>
            ) : (
              <div>
                <Label>Search Patient</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <Input placeholder="Name, patient ID, or PhilHealth #..." value={patientQuery} onChange={e => setPatientQuery(e.target.value)} className="pl-10" autoFocus />
                </div>
                <div className="mt-2 max-h-48 overflow-y-auto border rounded-lg bg-white">
                  {patientSearching && <div className="p-4 text-center text-sm text-slate-400 animate-pulse">Searching...</div>}
                  {!patientSearching && patientQuery.length >= 2 && patientResults.length === 0 && <div className="p-4 text-center text-sm text-slate-400">No patients found.</div>}
                  {!patientSearching && patientQuery.length < 2 && <div className="p-4 text-center text-sm text-slate-400">Type at least 2 characters.</div>}
                  {patientResults.map(p => (
                    <button key={p.id} onClick={() => selectPatient(p)} className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b last:border-0">
                      <div className="font-semibold text-sm text-slate-900">{p.full_name}</div>
                      <div className="text-xs text-slate-400">
                        ID: {p.patient_id}
                        {p.philhealth_id && ` · PhilHealth: ${p.philhealth_id}`}
                        {p.age != null && ` · ${p.age} yrs`}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label>Claim Type</Label>
              <Select value={claimType} onValueChange={setClaimType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLAIM_TYPES.map(c => <SelectItem key={c.code} value={c.code}>{c.display}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Service Period Start <span className="text-red-500">*</span></Label>
                <Input type="date" className="mt-1" value={billStart} onChange={e => setBillStart(e.target.value)} />
              </div>
              <div>
                <Label>Service Period End</Label>
                <Input type="date" className="mt-1" value={billEnd} onChange={e => setBillEnd(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 1: Diagnoses & Procedures ────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Diagnoses (ICD-10) <span className="text-red-500">*</span></Label>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addDiagnosis}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {diagnoses.map((d, i) => (
                  <div key={i} className="grid grid-cols-[1fr_140px_32px] gap-2 items-center">
                    <Input placeholder="ICD-10 code (e.g. J18.9 – Pneumonia)" value={d.diagnosisCodeableConcept ?? ''} onChange={e => setDiagField(i, 'diagnosisCodeableConcept', e.target.value)} className="text-sm" />
                    <Select value={d.type ?? 'principal'} onValueChange={v => setDiagField(i, 'type', v)}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DIAGNOSIS_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => removeDiagnosis(i)} disabled={diagnoses.length === 1}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Procedures (optional)</Label>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addProcedure}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add
                </Button>
              </div>
              {procedures.length === 0 && <p className="text-xs text-slate-400 py-2">No procedures added.</p>}
              <div className="space-y-2">
                {procedures.map((p, i) => (
                  <div key={i} className="grid grid-cols-[1fr_32px] gap-2 items-center">
                    <Input placeholder="Procedure code (SNOMED/ICD-9-CM)" value={p.procedureCodeableConcept ?? ''} onChange={e => setProcField(i, 'procedureCodeableConcept', e.target.value)} className="text-sm" />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => removeProcedure(i)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Service Items ──────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Service Line Items <span className="text-red-500">*</span></Label>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addItem}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
              </Button>
            </div>

            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-[1fr_80px_100px_32px] gap-2 items-center">
                  <Input placeholder="Description / service code" value={item.productOrService ?? ''} onChange={e => setItemField(i, 'productOrService', e.target.value)} className="text-sm" />
                  <Input type="number" min={1} placeholder="Qty" value={item.quantity ?? 1} onChange={e => setItemField(i, 'quantity', Number(e.target.value))} className="text-sm text-center" />
                  <Input type="number" min={0} placeholder="Unit ₱" value={item.unitPrice ?? 0} onChange={e => setItemField(i, 'unitPrice', Number(e.target.value))} className="text-sm text-right" />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => removeItem(i)} disabled={items.length === 1}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <div className="text-right">
                <div className="text-xs text-slate-400">Total Amount</div>
                <div className="text-xl font-bold text-slate-900">₱{totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Review ────────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Patient</span><span className="font-semibold">{selectedPatient?.full_name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">PhilHealth ID</span><span className="font-semibold">{selectedPatient?.philhealth_id ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Claim Type</span><span className="font-semibold">{CLAIM_TYPES.find(c => c.code === claimType)?.display}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Service Period</span><span className="font-semibold">{billStart} → {billEnd || billStart}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Diagnoses</span><span className="font-semibold text-right max-w-[55%]">{diagnoses.filter(d => d.diagnosisCodeableConcept).map(d => d.diagnosisCodeableConcept).join(', ')}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Line Items</span><span className="font-semibold">{items.filter(i => i.productOrService).length} service(s)</span></div>
              <div className="border-t border-slate-200 pt-2 flex justify-between text-base">
                <span className="text-slate-700 font-semibold">Claim Total</span>
                <span className="font-bold text-blue-700">₱{totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            <p className="text-xs text-slate-400">The claim will be saved as <strong>Draft</strong>. You can review and submit it to PhilHealth from the claims list.</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-100 mt-4">
          <Button variant="outline" onClick={() => step === 0 ? onClose() : setStep(s => s - 1)}>
            {step === 0 ? 'Cancel' : <><ChevronLeft className="w-4 h-4 mr-1" />Back</>}
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canNext()} className="bg-blue-600 hover:bg-blue-700">
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700">
              {isSubmitting ? 'Filing...' : 'Save as Draft'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FileClaimModal;
