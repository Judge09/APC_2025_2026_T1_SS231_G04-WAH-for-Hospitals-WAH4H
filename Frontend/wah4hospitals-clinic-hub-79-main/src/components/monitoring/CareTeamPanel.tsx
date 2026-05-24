// src/components/monitoring/CareTeamPanel.tsx
import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, Stethoscope, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { admissionService, type CareTeamMember } from '@/services/admissionService';

interface Props {
  encounterId: number;
  canManage: boolean;
}

const ROLE_TYPES = [
  { code: 'ATND',  label: 'Attending Physician' },
  { code: 'PPRF',  label: 'Primary Performer' },
  { code: 'NURSE', label: 'Assigned Nurse' },
  { code: 'CONS',  label: 'Consultant' },
  { code: 'REF',   label: 'Referring Physician' },
  { code: 'PART',  label: 'Participant' },
];

const ROLE_BADGE: Record<string, string> = {
  ATND:  'bg-blue-100 text-blue-700',
  PPRF:  'bg-indigo-100 text-indigo-700',
  NURSE: 'bg-emerald-100 text-emerald-700',
  CONS:  'bg-purple-100 text-purple-700',
  REF:   'bg-amber-100 text-amber-700',
  PART:  'bg-slate-100 text-slate-600',
};

export const CareTeamPanel: React.FC<Props> = ({ encounterId, canManage }) => {
  const [members, setMembers] = useState<CareTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Add form state
  const [practitioners, setPractitioners] = useState<any[]>([]);
  const [selectedPractId, setSelectedPractId] = useState('');
  const [selectedRole, setSelectedRole] = useState('PART');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await admissionService.getCareTeam(encounterId);
      setMembers(data);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [encounterId]);

  useEffect(() => {
    if (showForm && practitioners.length === 0) {
      // load both doctors and nurses
      Promise.all([
        admissionService.getPractitioners('doctor'),
        admissionService.getPractitioners('nurse'),
      ]).then(([docs, nurses]) => {
        const combined = [
          ...docs.map((p: any) => ({ ...p, _roleHint: 'Doctor' })),
          ...nurses.map((p: any) => ({ ...p, _roleHint: 'Nurse' })),
        ];
        // deduplicate by practitioner_id
        const seen = new Set<number>();
        setPractitioners(combined.filter(p => {
          if (seen.has(p.practitioner_id)) return false;
          seen.add(p.practitioner_id);
          return true;
        }));
      });
    }
  }, [showForm]);

  const handleAdd = async () => {
    if (!selectedPractId) { setFormError('Select a practitioner.'); return; }
    setSaving(true);
    setFormError('');
    try {
      await admissionService.addCareTeamMember(encounterId, Number(selectedPractId), selectedRole);
      await load();
      setShowForm(false);
      setSelectedPractId('');
      setSelectedRole('PART');
    } catch (e: any) {
      setFormError(e?.response?.data?.error ?? 'Failed to add member.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (member: CareTeamMember) => {
    if (!window.confirm(`Remove ${member.full_name} from care team?`)) return;
    try {
      await admissionService.removeCareTeamMember(encounterId, member.id);
      setMembers(prev => prev.filter(m => m.id !== member.id));
    } catch {
      alert('Failed to remove member.');
    }
  };

  return (
    <div className="px-4 pb-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Care Team</h4>
        <div className="flex gap-1">
          <button onClick={load} className="text-slate-400 hover:text-slate-600 p-0.5">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {canManage && (
            <button
              onClick={() => setShowForm(v => !v)}
              className="text-blue-500 hover:text-blue-700 p-0.5"
              title="Add care team member"
            >
              <UserPlus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Add form */}
      {showForm && canManage && (
        <div className="mb-3 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
          <Select value={selectedPractId} onValueChange={setSelectedPractId}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select practitioner..." />
            </SelectTrigger>
            <SelectContent>
              {practitioners.map(p => (
                <SelectItem key={p.practitioner_id} value={String(p.practitioner_id)}>
                  {p.first_name} {p.last_name}
                  {p._roleHint ? ` (${p._roleHint})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_TYPES.map(r => (
                <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {formError && <p className="text-xs text-red-600">{formError}</p>}

          <div className="flex gap-1.5 justify-end">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700" onClick={handleAdd} disabled={saving}>
              {saving ? 'Adding...' : 'Add'}
            </Button>
          </div>
        </div>
      )}

      {/* Member list */}
      {loading ? (
        <p className="text-xs text-slate-400 animate-pulse">Loading...</p>
      ) : members.length === 0 ? (
        <p className="text-xs text-slate-400 italic">No care team members assigned.</p>
      ) : (
        <div className="space-y-1.5">
          {members.map(m => (
            <div key={m.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Stethoscope className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{m.full_name}</p>
                  {m.qualification && (
                    <p className="text-[10px] text-slate-400 truncate">{m.qualification}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${ROLE_BADGE[m.role_type] ?? 'bg-gray-100 text-gray-600'}`}>
                  {m.role_display}
                </span>
                {canManage && (
                  <button
                    onClick={() => handleRemove(m)}
                    className="text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CareTeamPanel;
