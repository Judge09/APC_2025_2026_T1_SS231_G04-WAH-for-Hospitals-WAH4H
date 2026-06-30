/**
 * NetworkSearchModal
 *
 * Allows staff to search for a patient record across the WAH4PC provider
 * network by PhilHealth ID. On success the FHIR payload is mapped to local
 * PatientFormData and handed back to the parent via `onPatientFound` so the
 * registration form can be pre-filled.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';
import type { PatientFormData } from '@/types/patient';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Provider {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
}

export interface NetworkSearchModalProps {
  open: boolean;
  onClose: () => void;
  /** Called with mapped PatientFormData when the gateway returns a patient. */
  onPatientFound: (data: Partial<PatientFormData>) => void;
  /** Increment to trigger a silent log-list refresh after a search. */
  onSearchComplete?: () => void;
}

// ---------------------------------------------------------------------------
// FHIR → PatientFormData mapper
// The gateway delivers PH Core FHIR R4 via rawPayload.data.
// ---------------------------------------------------------------------------
function fhirToPatientForm(fhir: Record<string, unknown>): Partial<PatientFormData> {
  const name = ((fhir.name as any[])?.[0]) ?? {};
  const given: string[] = name.given ?? [];
  const ids: any[] = (fhir.identifier as any[]) ?? [];
  const extensions: any[] = (fhir.extension as any[]) ?? [];
  const addresses: any[] = (fhir.address as any[]) ?? [];
  const addr = addresses[0] ?? {};
  const telecoms: any[] = (fhir.telecom as any[]) ?? [];
  const contacts: any[] = (fhir.contact as any[]) ?? [];
  const contact = contacts[0] ?? {};
  const contactName = contact.name ?? {};
  const contactTels: any[] = contact.telecom ?? [];
  const contactRels: any[] = contact.relationship ?? [{}];

  const findExt = (url: string) =>
    extensions.find((e) => e.url === url);

  const display = (val: unknown): string | undefined => {
    if (!val || typeof val !== 'object') return undefined;
    const codings: any[] = (val as any).coding ?? [];
    return codings[0]?.display ?? codings[0]?.code;
  };

  const philHealthId = ids.find((i) => i.system?.includes('philhealth'))?.value;
  const phone = telecoms.find((t) => t.system === 'phone')?.value;

  // Nationality: PH Core uses a flat race/valueCodeableConcept extension
  const raceExt = findExt('urn://example.com/ph-core/fhir/StructureDefinition/race');
  const nationality = display(raceExt?.valueCodeableConcept);

  // Civil status: HL7 single-letter code in maritalStatus.coding[0].code
  const civilStatusCode = (fhir.maritalStatus as any)?.coding?.[0]?.code as PatientFormData['civil_status'] | undefined;

  // Indigenous: boolean from indigenous-people, optional group from indigenous-group
  const indigenousExt = findExt('urn://example.com/ph-core/fhir/StructureDefinition/indigenous-people');
  const indigenousGroupExt = findExt('urn://example.com/ph-core/fhir/StructureDefinition/indigenous-group');

  return {
    first_name: (given[0] ?? '').trim(),
    middle_name: (given[1] ?? '').trim(),
    last_name: name.family ?? '',
    gender: (fhir.gender as string)?.toLowerCase() as PatientFormData['gender'],
    birthdate: fhir.birthDate as string | undefined,
    civil_status: civilStatusCode,
    philhealth_id: philHealthId,
    mobile_number: phone,
    nationality,
    religion: display(findExt('urn://example.com/ph-core/fhir/StructureDefinition/religion')?.valueCodeableConcept),
    occupation: display(findExt('urn://example.com/ph-core/fhir/StructureDefinition/occupation')?.valueCodeableConcept),
    education: display(findExt('urn://example.com/ph-core/fhir/StructureDefinition/educational-attainment')?.valueCodeableConcept),
    indigenous_flag: indigenousExt !== undefined ? (indigenousExt as any).valueBoolean as boolean : undefined,
    indigenous_group: display(indigenousGroupExt?.valueCodeableConcept),
    address_line: (addr.line as string[] | undefined)?.[0],
    address_city: addr.city,
    address_district: addr.district,
    address_state: addr.state,
    address_postal_code: addr.postalCode,
    address_country: addr.country,
    contact_first_name: (contactName.given as string[] | undefined)?.[0],
    contact_last_name: contactName.family,
    contact_mobile_number: contactTels.find((t: any) => t.system === 'phone')?.value,
    contact_relationship: (contactRels[0]?.coding as any[] | undefined)?.[0]?.display,
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PHILHEALTH_REGEX = /^\d{2}-\d{9}-\d$/;
const POLL_INTERVAL_MS = 2_000;
const POLL_MAX_ATTEMPTS = 15; // 30 s

type TxnStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'RECEIVED' | string;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const NetworkSearchModal: React.FC<NetworkSearchModalProps> = ({
  open,
  onClose,
  onPatientFound,
  onSearchComplete,
}) => {
  const [philHealthId, setPhilHealthId] = useState('');
  const [philHealthIdError, setPhilHealthIdError] = useState('');
  const [targetProvider, setTargetProvider] = useState('');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [polling, setPolling] = useState(false);
  const [pollStatus, setPollStatus] = useState<TxnStatus | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollAttemptsRef = useRef(0);

  // Load providers when modal opens
  useEffect(() => {
    if (!open) return;
    setProvidersLoading(true);
    api
      .get('/api/patients/wah4pc/providers/')
      .then((res) => setProviders(Array.isArray(res.data) ? res.data : []))
      .catch(() => toast.error('Failed to load providers list'))
      .finally(() => setProvidersLoading(false));
  }, [open]);

  // Cleanup on unmount or close
  useEffect(() => {
    if (!open) stopPolling();
    return stopPolling;
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    pollAttemptsRef.current = 0;
  };

  const resetForm = () => {
    setPhilHealthId('');
    setPhilHealthIdError('');
    setTargetProvider('');
    setSubmitting(false);
    setPolling(false);
    setPollStatus(null);
    setTransactionId(null);
    setErrorMsg(null);
    stopPolling();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handlePhilHealthIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
    let masked = digits;
    if (digits.length > 11)
      masked = `${digits.slice(0, 2)}-${digits.slice(2, 11)}-${digits.slice(11)}`;
    else if (digits.length > 2)
      masked = `${digits.slice(0, 2)}-${digits.slice(2)}`;
    setPhilHealthId(masked);
    setPhilHealthIdError(
      masked && !PHILHEALTH_REGEX.test(masked)
        ? 'Format: XX-XXXXXXXXX-X  (e.g. 12-345678901-2)'
        : ''
    );
  };

  // -------------------------------------------------------------------------
  // Polling
  // -------------------------------------------------------------------------
  const startPolling = (txnId: string) => {
    setPolling(true);
    pollAttemptsRef.current = 0;

    pollRef.current = setInterval(async () => {
      pollAttemptsRef.current += 1;

      if (pollAttemptsRef.current > POLL_MAX_ATTEMPTS) {
        stopPolling();
        setPolling(false);
        setPollStatus('FAILED');
        setErrorMsg('Request timed out. Please check the logs or try again.');
        return;
      }

      try {
        const res = await api.get(`/api/patients/wah4pc/transactions/${txnId}/`);
        const currentStatus: TxnStatus = res.data.status;
        setPollStatus(currentStatus);

        if (currentStatus === 'COMPLETED' || currentStatus === 'RECEIVED') {
          stopPolling();
          setPolling(false);
          onSearchComplete?.();

          // Extract and map the FHIR Patient from rawPayload.
          // The gateway wraps the Patient inside a FHIR Bundle:
          //   rawPayload.data = { resourceType: "Bundle", entry: [{ resource: { ...Patient } }] }
          const raw = res.data.rawPayload;
          const bundle = raw?.data ?? raw;
          let fhirPatient: Record<string, unknown> | null = null;
          if (bundle && typeof bundle === 'object') {
            if ((bundle as any).resourceType === 'Bundle') {
              const entries: any[] = (bundle as any).entry ?? [];
              fhirPatient =
                entries.find((e: any) => e?.resource?.resourceType === 'Patient')?.resource ?? null;
            } else if ((bundle as any).resourceType === 'Patient') {
              fhirPatient = bundle as Record<string, unknown>;
            }
          }
          if (fhirPatient) {
            const mapped = fhirToPatientForm(fhirPatient);
            onPatientFound(mapped);
            handleClose();
          } else {
            setErrorMsg('Patient record received but payload was empty.');
          }
        } else if (currentStatus === 'FAILED') {
          stopPolling();
          setPolling(false);
          const msg = res.data.error || 'Patient not found on the network.';
          setErrorMsg(msg);
        }
      } catch {
        // transient network blip — keep polling
      }
    }, POLL_INTERVAL_MS);
  };

  // -------------------------------------------------------------------------
  // Submit
  // -------------------------------------------------------------------------
  const handleSubmit = async () => {
    if (!PHILHEALTH_REGEX.test(philHealthId) || !targetProvider) return;
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const res = await api.post('/api/patients/wah4pc/fetch', {
        targetProviderId: targetProvider,
        philHealthId,
      });

      const txnId: string = res.data?.transactionId ?? res.data?.id;
      if (!txnId) throw new Error('Server did not return a transaction ID.');
      setTransactionId(txnId);
      setSubmitting(false);
      startPolling(txnId);
    } catch (err: any) {
      setSubmitting(false);
      const msg =
        err.response?.data?.error ??
        err.response?.data?.detail ??
        err.message ??
        'Failed to reach the WAH4PC gateway.';
      setErrorMsg(msg);
    }
  };

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------
  const isSubmitDisabled =
    submitting ||
    polling ||
    !philHealthId ||
    !targetProvider ||
    !!philHealthIdError ||
    !PHILHEALTH_REGEX.test(philHealthId);

  const statusBadge = (s: TxnStatus) => {
    const map: Record<string, 'secondary' | 'default' | 'destructive'> = {
      PENDING: 'secondary',
      COMPLETED: 'default',
      RECEIVED: 'default',
      FAILED: 'destructive',
    };
    return <Badge variant={map[s] ?? 'secondary'}>{s}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Search Patient Network
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* PhilHealth ID */}
          <div className="space-y-1.5">
            <Label htmlFor="nw-philhealth">PhilHealth ID <span className="text-destructive">*</span></Label>
            <Input
              id="nw-philhealth"
              value={philHealthId}
              onChange={handlePhilHealthIdChange}
              placeholder="12-345678901-2"
              maxLength={14}
              inputMode="numeric"
              disabled={submitting || polling}
              className={philHealthIdError ? 'border-destructive' : ''}
            />
            {philHealthIdError && (
              <p className="text-xs text-destructive">{philHealthIdError}</p>
            )}
          </div>

          {/* Target Provider */}
          <div className="space-y-1.5">
            <Label htmlFor="nw-provider">Target Provider <span className="text-destructive">*</span></Label>
            <Select
              value={targetProvider}
              onValueChange={setTargetProvider}
              disabled={submitting || polling || providersLoading}
            >
              <SelectTrigger id="nw-provider">
                <SelectValue placeholder={providersLoading ? 'Loading…' : 'Select a provider'} />
              </SelectTrigger>
              <SelectContent>
                {providers.filter((p) => p.isActive).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} <span className="text-muted-foreground">({p.type})</span>
                  </SelectItem>
                ))}
                {!providersLoading && providers.filter((p) => p.isActive).length === 0 && (
                  <SelectItem value="__none__" disabled>No active providers</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Status feedback */}
          {(polling || pollStatus) && (
            <div className="flex items-center gap-3 rounded-md border p-3 bg-muted/40">
              {polling && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />}
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <p className="text-sm font-medium leading-none">
                  {polling ? 'Waiting for network response…' : 'Status'}
                </p>
                {transactionId && (
                  <code className="text-[10px] text-muted-foreground truncate">{transactionId}</code>
                )}
              </div>
              {pollStatus && statusBadge(pollStatus)}
            </div>
          )}

          {/* Error */}
          {errorMsg && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2">
              <p className="text-sm text-destructive">{errorMsg}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            {pollStatus === 'COMPLETED' || pollStatus === 'RECEIVED' ? 'Done' : 'Cancel'}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitDisabled}>
            {submitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</>
            ) : (
              <><Search className="w-4 h-4 mr-2" />Search Network</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
