// src/components/eclaims/CoverageFormModal.tsx
import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { eclaimsService } from '@/services/eclaimsService';
import type { Coverage, NewCoverage, EClaimPatient } from '@/types/eclaims';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  coverage?: Coverage | null;
}

const COVERAGE_TYPES = [
  { code: 'PHIC',   display: 'PhilHealth Individual Contributor' },
  { code: 'PHICSP', display: 'PhilHealth Sponsored Program' },
  { code: 'PHICOP', display: 'PhilHealth Optional Program' },
];

const MEMBER_CLASSES = [
  { code: 'employed',   name: 'Employed' },
  { code: 'self',       name: 'Self-Employed' },
  { code: 'indigent',   name: 'Indigent' },
  { code: 'senior',     name: 'Senior Citizen' },
  { code: 'lifetime',   name: 'Lifetime Member' },
  { code: 'sponsored',  name: 'Sponsored' },
  { code: 'dependent',  name: 'Dependent' },
];

const RELATIONSHIPS = [
  { code: 'self',   display: 'Self (Principal Member)' },
  { code: 'spouse', display: 'Spouse' },
  { code: 'child',  display: 'Child' },
  { code: 'parent', display: 'Parent' },
];

export const CoverageFormModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, coverage }) => {
  const isEditing = !!coverage;

  const [patientQuery, setPatientQuery]     = useState('');
  const [patientResults, setPatientResults] = useState<EClaimPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<EClaimPatient | null>(null);
  const [searching, setSearching]           = useState(false);

  const [subscriberPin, setSubscriberPin]   = useState('');
  const [typeCode, setTypeCode]             = useState('PHIC');
  const [classCode, setClassCode]           = useState('employed');
  const [className, setClassName]           = useState('Employed');
  const [periodStart, setPeriodStart]       = useState('');
  const [periodEnd, setPeriodEnd]           = useState('');
  const [relationshipCode, setRelationshipCode] = useState('self');
  const [relationshipDisplay, setRelationshipDisplay] = useState('Self (Principal Member)');
  const [network, setNetwork]               = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError]       = useState('');

  // Populate when editing
  useEffect(() => {
    if (isOpen && coverage) {
      setSubscriberPin(coverage.subscriber_pin ?? '');
      setTypeCode(coverage.type_code ?? 'PHIC');
      setClassCode(coverage.class_code ?? 'employed');
      setClassName(coverage.class_name ?? 'Employed');
      setPeriodStart(coverage.period_start ?? '');
      setPeriodEnd(coverage.period_end ?? '');
      setRelationshipCode(coverage.relationship_code ?? 'self');
      setRelationshipDisplay(coverage.relationship_display ?? 'Self (Principal Member)');
      setNetwork(coverage.network ?? '');
    }
  }, [isOpen, coverage]);

  const reset = () => {
    setPatientQuery(''); setPatientResults([]); setSelectedPatient(null);
    setSubscriberPin(''); setTypeCode('PHIC'); setClassCode('employed');
    setClassName('Employed'); setPeriodStart(''); setPeriodEnd('');
    setRelationshipCode('self'); setRelationshipDisplay('Self (Principal Member)');
    setNetwork(''); setError('');
  };

  useEffect(() => { if (!isOpen) reset(); }, [isOpen]);

  useEffect(() => {
    if (!isOpen || isEditing) return;
    const t = setTimeout(async () => {
      if (patientQuery.length < 2) { setPatientResults([]); return; }
      setSearching(true);
      const r = await eclaimsService.searchPatients(patientQuery);
      setPatientResults(r);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [patientQuery, isOpen, isEditing]);

  const handleClassChange = (code: string) => {
    const mc = MEMBER_CLASSES.find(m => m.code === code);
    setClassCode(code);
    setClassName(mc?.name ?? code);
  };

  const handleRelationshipChange = (code: string) => {
    const rel = RELATIONSHIPS.find(r => r.code === code);
    setRelationshipCode(code);
    setRelationshipDisplay(rel?.display ?? code);
  };

  const handleSave = async () => {
    const beneficiaryId = isEditing ? coverage!.beneficiary_id : selectedPatient?.id;
    if (!beneficiaryId) { setError('Please select a patient.'); return; }
    if (!subscriberPin) { setError('PhilHealth PIN is required.'); return; }
    setError(''); setIsSaving(true);
    try {
      const payload: NewCoverage = {
        beneficiary_id: beneficiaryId,
        subscriber_pin: subscriberPin,
        type_code: typeCode,
        type_display: COVERAGE_TYPES.find(c => c.code === typeCode)?.display ?? typeCode,
        class_code: classCode,
        class_name: className,
        period_start: periodStart || undefined,
        period_end: periodEnd || undefined,
        relationship_code: relationshipCode,
        relationship_display: relationshipDisplay,
        network: network || undefined,
        status: 'active',
      };
      if (isEditing && coverage) {
        await eclaimsService.updateCoverage(coverage.identifier, payload);
      } else {
        await eclaimsService.createCoverage(payload);
      }
      onSuccess();
      onClose();
    } catch (e: any) {
      const d = e?.response?.data;
      setError(typeof d === 'string' ? d : d?.detail ?? JSON.stringify(d) ?? 'Failed to save coverage.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            {isEditing ? 'Edit Coverage' : 'Add PhilHealth Coverage'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Patient selection (create only) */}
          {!isEditing && (
            <div>
              <Label>Patient</Label>
              {selectedPatient ? (
                <div className="mt-1 p-3 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-center">
                  <div>
                    <div className="font-bold text-sm text-slate-900">{selectedPatient.full_name}</div>
                    <div className="text-xs text-slate-500">ID: {selectedPatient.patient_id}</div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => setSelectedPatient(null)}>Change</Button>
                </div>
              ) : (
                <>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <Input placeholder="Search by name or patient ID..." value={patientQuery} onChange={e => setPatientQuery(e.target.value)} className="pl-10" />
                  </div>
                  {(patientResults.length > 0 || searching) && (
                    <div className="mt-1 max-h-40 overflow-y-auto border rounded-lg bg-white">
                      {searching && <div className="p-3 text-center text-sm text-slate-400 animate-pulse">Searching...</div>}
                      {patientResults.map(p => (
                        <button key={p.id} onClick={() => { setSelectedPatient(p); setPatientQuery(''); setPatientResults([]); if (p.philhealth_id) setSubscriberPin(p.philhealth_id); }}
                          className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b last:border-0 text-sm">
                          <div className="font-semibold text-slate-900">{p.full_name}</div>
                          <div className="text-xs text-slate-400">{p.patient_id}{p.philhealth_id && ` · PhilHealth: ${p.philhealth_id}`}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* PhilHealth PIN */}
          <div>
            <Label>PhilHealth PIN <span className="text-red-500">*</span></Label>
            <Input className="mt-1 font-mono tracking-widest" placeholder="XX-XXXXXXXXX-X" value={subscriberPin} onChange={e => setSubscriberPin(e.target.value)} maxLength={14} />
          </div>

          {/* Coverage type */}
          <div>
            <Label>Coverage Type</Label>
            <Select value={typeCode} onValueChange={setTypeCode}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {COVERAGE_TYPES.map(c => <SelectItem key={c.code} value={c.code}>{c.display}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Member class */}
          <div>
            <Label>Membership Class</Label>
            <Select value={classCode} onValueChange={handleClassChange}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MEMBER_CLASSES.map(m => <SelectItem key={m.code} value={m.code}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Relationship */}
          <div>
            <Label>Relationship to Member</Label>
            <Select value={relationshipCode} onValueChange={handleRelationshipChange}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RELATIONSHIPS.map(r => <SelectItem key={r.code} value={r.code}>{r.display}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Period */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Coverage Start</Label>
              <Input type="date" className="mt-1" value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
            </div>
            <div>
              <Label>Coverage End</Label>
              <Input type="date" className="mt-1" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
            </div>
          </div>

          {/* Network */}
          <div>
            <Label>Benefit Package / Network</Label>
            <Input className="mt-1" placeholder="e.g. Z-Benefit, Konsulta Package..." value={network} onChange={e => setNetwork(e.target.value)} />
          </div>

          {error && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}

          <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
              {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Coverage'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CoverageFormModal;
