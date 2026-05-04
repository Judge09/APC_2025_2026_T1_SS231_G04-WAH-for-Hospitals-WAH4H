// src/pages/PhilHealthClaims.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, RefreshCw, Search, Shield, Trash2, Edit2, SendHorizonal } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { eclaimsService } from '@/services/eclaimsService';
import type { EClaim, Coverage } from '@/types/eclaims';
import { FileClaimModal } from '@/components/eclaims/FileClaimModal';
import { ClaimDetailsModal } from '@/components/eclaims/ClaimDetailsModal';
import { CoverageFormModal } from '@/components/eclaims/CoverageFormModal';

// ── helpers ───────────────────────────────────────────────────────────────────

const fmt = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const fmtPHP = (v?: string | number | null) =>
  v != null ? `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—';

const CLAIM_STATUS_STYLE: Record<string, string> = {
  draft:              'bg-yellow-100 text-yellow-700',
  active:             'bg-blue-100 text-blue-700',
  cancelled:          'bg-red-100 text-red-700',
  'entered-in-error': 'bg-gray-100 text-gray-500',
};

const COVERAGE_STATUS_STYLE: Record<string, string> = {
  active:             'bg-green-100 text-green-700',
  cancelled:          'bg-red-100 text-red-700',
  draft:              'bg-yellow-100 text-yellow-700',
  'entered-in-error': 'bg-gray-100 text-gray-500',
};

// ── stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps { label: string; value: number; color: string; icon: React.ReactNode }
const StatCard: React.FC<StatCardProps> = ({ label, value, color, icon }) => (
  <Card>
    <CardContent className="p-5">
      <div className="flex items-center gap-4">
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

// ── main page ─────────────────────────────────────────────────────────────────

type ClaimTab = 'claims' | 'coverage';
type ClaimFilter = 'all' | 'draft' | 'active' | 'cancelled';

const PhilHealthClaims: React.FC = () => {
  const [activeTab, setActiveTab]       = useState<ClaimTab>('claims');
  const [claimFilter, setClaimFilter]   = useState<ClaimFilter>('all');
  const [claimSearch, setClaimSearch]   = useState('');
  const [covSearch, setCovSearch]       = useState('');

  const [claims, setClaims]             = useState<EClaim[]>([]);
  const [coverages, setCoverages]       = useState<Coverage[]>([]);
  const [loading, setLoading]           = useState(true);

  // modals
  const [fileOpen, setFileOpen]         = useState(false);
  const [detailsClaim, setDetailsClaim] = useState<EClaim | null>(null);
  const [covFormOpen, setCovFormOpen]   = useState(false);
  const [editCoverage, setEditCoverage] = useState<Coverage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [c, v] = await Promise.all([
      eclaimsService.getAll(),
      eclaimsService.getCoverageAll(),
    ]);
    setClaims(c);
    setCoverages(v);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleClaimUpdate = (updated: EClaim) =>
    setClaims(prev => prev.map(c => c.identifier === updated.identifier ? updated : c));

  const handleDeleteClaim = async (identifier: string) => {
    if (!confirm('Delete this claim? This cannot be undone.')) return;
    await eclaimsService.delete(identifier);
    setClaims(prev => prev.filter(c => c.identifier !== identifier));
  };

  const handleDeleteCoverage = async (identifier: string) => {
    if (!confirm('Delete this coverage record?')) return;
    await eclaimsService.deleteCoverage(identifier);
    setCoverages(prev => prev.filter(c => c.identifier !== identifier));
  };

  const handleQuickSubmit = async (claim: EClaim) => {
    try {
      const updated = await eclaimsService.submit(claim.identifier);
      handleClaimUpdate(updated);
    } catch {
      alert('Failed to submit claim.');
    }
  };

  // ── filtered views ─────────────────────────────────────────────────────────

  const filteredClaims = claims.filter(c => {
    const matchStatus = claimFilter === 'all' || c.status === claimFilter;
    const q = claimSearch.toLowerCase();
    const matchSearch = !q ||
      c.identifier.toLowerCase().includes(q) ||
      (c.patient_summary?.full_name ?? '').toLowerCase().includes(q) ||
      (c.type ?? '').toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const filteredCoverages = coverages.filter(v => {
    const q = covSearch.toLowerCase();
    return !q ||
      v.identifier.toLowerCase().includes(q) ||
      (v.patient_summary?.full_name ?? '').toLowerCase().includes(q) ||
      (v.subscriber_pin ?? '').toLowerCase().includes(q);
  });

  // ── stat counts ────────────────────────────────────────────────────────────

  const totalClaims  = claims.length;
  const draftClaims  = claims.filter(c => c.status === 'draft').length;
  const activeClaims = claims.filter(c => c.status === 'active').length;
  const voidedClaims = claims.filter(c => c.status === 'cancelled').length;

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">PhilHealth eClaims</h1>
          <p className="text-slate-500 text-sm">FHIR R4-compliant PhilHealth claim management</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setEditCoverage(null); setCovFormOpen(true); }}>
            <Shield className="w-4 h-4 mr-1.5" />
            Add Coverage
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" size="sm" onClick={() => setFileOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            File a Claim
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Claims"  value={totalClaims}  color="bg-blue-100"   icon={<FileText className="w-5 h-5 text-blue-600" />} />
        <StatCard label="Draft"         value={draftClaims}  color="bg-yellow-100" icon={<FileText className="w-5 h-5 text-yellow-600" />} />
        <StatCard label="Submitted"     value={activeClaims} color="bg-green-100"  icon={<SendHorizonal className="w-5 h-5 text-green-600" />} />
        <StatCard label="Voided"        value={voidedClaims} color="bg-red-100"    icon={<FileText className="w-5 h-5 text-red-600" />} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {(['claims', 'coverage'] as ClaimTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab === 'claims' ? `Claims (${totalClaims})` : `Coverage (${coverages.length})`}
          </button>
        ))}
      </div>

      {/* Claims tab */}
      {activeTab === 'claims' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            {/* Status pills */}
            {(['all', 'draft', 'active', 'cancelled'] as ClaimFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setClaimFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-colors ${
                  claimFilter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f === 'active' ? 'Submitted' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
            <div className="ml-auto relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search claims..."
                value={claimSearch}
                onChange={e => setClaimSearch(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Claim #</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Patient</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Service Period</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Total</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClaims.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">
                      {loading ? 'Loading claims…' : 'No claims found.'}
                    </td>
                  </tr>
                )}
                {filteredClaims.map(claim => (
                  <tr key={claim.identifier} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{claim.identifier}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {claim.patient_summary?.full_name ?? `Patient #${claim.subject_id}`}
                      </div>
                      {claim.patient_summary?.philhealth_id && (
                        <div className="text-xs text-slate-400">{claim.patient_summary.philhealth_id}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{claim.type ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {fmt(claim.billablePeriod_start)}
                      {claim.billablePeriod_end && ` – ${fmt(claim.billablePeriod_end)}`}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmtPHP(claim.total)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${CLAIM_STATUS_STYLE[claim.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {claim.status === 'active' ? 'Submitted' : claim.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setDetailsClaim(claim)}>
                          <FileText className="w-3 h-3 mr-1" /> Details
                        </Button>
                        {claim.status === 'draft' && (
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => handleQuickSubmit(claim)}
                          >
                            <SendHorizonal className="w-3 h-3 mr-1" /> Submit
                          </Button>
                        )}
                        {claim.status === 'draft' && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteClaim(claim.identifier)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Coverage tab */}
      {activeTab === 'coverage' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search coverage..."
                value={covSearch}
                onChange={e => setCovSearch(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Patient</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">PhilHealth PIN</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Class / Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Period</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Network</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCoverages.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">
                      {loading ? 'Loading coverage…' : 'No coverage records found.'}
                    </td>
                  </tr>
                )}
                {filteredCoverages.map(cov => (
                  <tr key={cov.identifier} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {cov.patient_summary?.full_name ?? `Patient #${cov.beneficiary_id}`}
                      </div>
                      <div className="text-xs text-slate-400">{cov.patient_summary?.patient_id}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{cov.subscriber_pin ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      <div>{cov.class_name ?? '—'}</div>
                      <div className="text-slate-400">{cov.type_display ?? cov.type_code ?? ''}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {cov.period_start ? fmt(cov.period_start) : '—'}
                      {cov.period_end && ` – ${fmt(cov.period_end)}`}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{cov.network ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${COVERAGE_STATUS_STYLE[cov.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {cov.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setEditCoverage(cov); setCovFormOpen(true); }}>
                          <Edit2 className="w-3 h-3 mr-1" /> Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteCoverage(cov.identifier)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <FileClaimModal
        isOpen={fileOpen}
        onClose={() => setFileOpen(false)}
        onSuccess={() => { setFileOpen(false); load(); }}
      />

      <ClaimDetailsModal
        isOpen={!!detailsClaim}
        onClose={() => setDetailsClaim(null)}
        claim={detailsClaim}
        onUpdate={c => { handleClaimUpdate(c); setDetailsClaim(c); }}
      />

      <CoverageFormModal
        isOpen={covFormOpen}
        onClose={() => { setCovFormOpen(false); setEditCoverage(null); }}
        onSuccess={() => { setCovFormOpen(false); setEditCoverage(null); load(); }}
        coverage={editCoverage}
      />
    </div>
  );
};

export default PhilHealthClaims;
