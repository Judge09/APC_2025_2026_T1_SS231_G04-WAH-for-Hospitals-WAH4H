// src/components/eclaims/ClaimDetailsModal.tsx
import React, { useState } from 'react';
import { SendHorizonal, XCircle, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { eclaimsService } from '@/services/eclaimsService';
import type { EClaim } from '@/types/eclaims';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  claim: EClaim | null;
  onUpdate: (c: EClaim) => void;
}

const STATUS_STYLE: Record<string, string> = {
  draft:             'bg-yellow-100 text-yellow-700',
  active:            'bg-blue-100 text-blue-700',
  cancelled:         'bg-red-100 text-red-700',
  'entered-in-error':'bg-gray-100 text-gray-400',
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">{title}</h4>
    {children}
  </div>
);

const Row: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => (
  <div className="flex justify-between text-sm py-1 border-b border-slate-50 last:border-0">
    <span className="text-slate-500">{label}</span>
    <span className="font-medium text-slate-900 text-right max-w-[60%]">{value ?? '—'}</span>
  </div>
);

const fmt = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export const ClaimDetailsModal: React.FC<Props> = ({ isOpen, onClose, claim, onUpdate }) => {
  const [confirming, setConfirming] = useState<'submit' | 'void' | null>(null);
  const [acting, setActing]         = useState(false);
  const [actError, setActError]     = useState('');

  if (!claim) return null;

  const canSubmit = claim.status === 'draft';
  const canVoid   = !['cancelled', 'entered-in-error'].includes(claim.status);

  const handleAction = async () => {
    if (!confirming) return;
    setActing(true); setActError('');
    try {
      const updated = confirming === 'submit'
        ? await eclaimsService.submit(claim.identifier)
        : await eclaimsService.void(claim.identifier);
      onUpdate(updated);
      setConfirming(null);
    } catch (e: any) {
      const d = e?.response?.data;
      setActError(typeof d === 'string' ? d : d?.detail ?? 'Action failed.');
    } finally {
      setActing(false);
    }
  };

  const totalAmount = Number(claim.total ?? 0);

  return (
    <Dialog open={isOpen} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
            <span>{claim.identifier}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${STATUS_STYLE[claim.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {claim.status}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">

          {/* Patient */}
          <Section title="Patient">
            <Row label="Name"         value={claim.patient_summary?.full_name ?? `Patient #${claim.subject_id}`} />
            <Row label="Patient ID"   value={claim.patient_summary?.patient_id} />
            <Row label="PhilHealth #" value={claim.patient_summary?.philhealth_id} />
          </Section>

          {/* Claim header */}
          <Section title="Claim Details">
            <Row label="Type"           value={claim.type} />
            <Row label="Use"            value={claim.use} />
            <Row label="Priority"       value={claim.priority} />
            <Row label="Service Start"  value={fmt(claim.billablePeriod_start)} />
            <Row label="Service End"    value={fmt(claim.billablePeriod_end)} />
            <Row label="Filed On"       value={fmt(claim.created)} />
          </Section>

          {/* Diagnoses */}
          {claim.diagnoses?.length > 0 && (
            <Section title="Diagnoses">
              {claim.diagnoses.map((d, i) => (
                <div key={i} className="flex justify-between text-sm py-1 border-b border-slate-50 last:border-0">
                  <span className="font-mono text-blue-700">{d.diagnosisCodeableConcept}</span>
                  <span className="text-xs text-slate-400 uppercase">{d.type}</span>
                </div>
              ))}
            </Section>
          )}

          {/* Procedures */}
          {claim.procedures?.length > 0 && (
            <Section title="Procedures">
              {claim.procedures.map((p, i) => (
                <div key={i} className="text-sm py-1 font-mono text-slate-700 border-b border-slate-50 last:border-0">
                  {p.procedureCodeableConcept}
                </div>
              ))}
            </Section>
          )}

          {/* Service items */}
          {claim.items?.length > 0 && (
            <Section title="Service Items">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 border-b border-slate-100">
                    <th className="text-left pb-1">Description</th>
                    <th className="text-center pb-1">Qty</th>
                    <th className="text-right pb-1">Unit ₱</th>
                    <th className="text-right pb-1">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {claim.items.map((item, i) => (
                    <tr key={i} className="border-b border-slate-50 last:border-0">
                      <td className="py-1 text-slate-700">{item.productOrService}</td>
                      <td className="py-1 text-center text-slate-500">{item.quantity ?? 1}</td>
                      <td className="py-1 text-right text-slate-500">₱{Number(item.unitPrice ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                      <td className="py-1 text-right font-semibold text-slate-800">
                        ₱{((Number(item.quantity) || 1) * (Number(item.unitPrice) || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="pt-2 text-right text-sm font-bold text-slate-700">Total</td>
                    <td className="pt-2 text-right text-base font-bold text-blue-700">
                      ₱{totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </Section>
          )}

          {/* Action confirmation */}
          {confirming && (
            <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-slate-700">
                  {confirming === 'submit'
                    ? 'Submit this claim to PhilHealth? Status will change from Draft to Active.'
                    : 'Void (cancel) this claim? This cannot be undone.'}
                </p>
              </div>
              {actError && <p className="text-xs text-red-600">{actError}</p>}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setConfirming(null)} disabled={acting}>Cancel</Button>
                <Button
                  size="sm"
                  onClick={handleAction}
                  disabled={acting}
                  className={confirming === 'submit' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
                >
                  {acting ? 'Processing...' : confirming === 'submit' ? 'Confirm Submit' : 'Confirm Void'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!confirming && (
          <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
            {canSubmit && (
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5" onClick={() => setConfirming('submit')}>
                <SendHorizonal className="w-4 h-4" /> Submit to PhilHealth
              </Button>
            )}
            {canVoid && (
              <Button size="sm" variant="destructive" className="flex items-center gap-1.5" onClick={() => setConfirming('void')}>
                <XCircle className="w-4 h-4" /> Void Claim
              </Button>
            )}
            <Button variant="outline" size="sm" className="ml-auto" onClick={onClose}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ClaimDetailsModal;
