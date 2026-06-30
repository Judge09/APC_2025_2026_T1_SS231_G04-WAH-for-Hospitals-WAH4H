
// src/pages/Admission.tsx

import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, RefreshCw, LayoutGrid, List, MoreHorizontal
} from 'lucide-react';
import { Admission } from '@/types/admission';
import { admissionService } from '@/services/admissionService';
import RoomManagementView from '@/components/admission/RoomManagementView';
import AdmitPatientModal from '@/components/admission/AdmitPatientModal';
import { AdmissionDetailsModal } from '@/components/admission/AdmissionDetailsModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

// --- Polished Helper Components ---

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    'in-progress': 'bg-emerald-100 text-emerald-700',
    'planned': 'bg-blue-100 text-blue-700',
    'finished': 'bg-gray-100 text-gray-700',
    'cancelled': 'bg-red-100 text-red-700',
  };
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${styles[status] || styles['finished']}`}>
      {(status || '').replace('-', ' ')}
    </span>
  );
};

const CapacityCard = ({ name, type, occupied, total, status }: any) => {
  const percentage = total > 0 ? Math.min((occupied / total) * 100, 100) : 0;
  const colorClass = status === 'full' ? 'bg-red-500' : status === 'near-full' ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <Card className="shadow-sm hover:shadow-md transition-all duration-200">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">{name}</h3>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{type === 'wa' ? 'General Ward' : 'Specialized Unit'}</p>
          </div>
          <div className="text-right">
             <span className="text-2xl font-bold text-gray-900">{occupied}</span>
             <span className="text-sm text-gray-400">/{total}</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-medium">
            <span className={status === 'full' ? 'text-red-600' : 'text-gray-600'}>
              {Math.round(percentage)}% Utilization
            </span>
          </div>
          <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full ${colorClass} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${percentage}%` }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface AdmissionPageProps {
  onNavigate?: (path: string) => void;
}

const AdmissionPage: React.FC<AdmissionPageProps> = ({ onNavigate }) => {
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [locations, setLocations] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'patients' | 'rooms'>('patients');
  const [statusFilter, setStatusFilter] = useState('in-progress');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal States
  const [isAdmitModalOpen, setIsAdmitModalOpen] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
        const [adm, loc] = await Promise.all([admissionService.getAll(), admissionService.getLocations()]);
        setAdmissions(adm || []);
        setLocations(loc || null);
    } catch (e) {
        console.error("Fetch Data Error", e);
    } finally {
        setIsLoading(false);
    }
  };

  const filteredAdmissions = admissions.filter(a => {
    const matchesStatus = statusFilter === 'all' ? true : a.status === statusFilter;
    const matchesSearch = (a.patientName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (a.admissionNo || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });
  
  // Calculate counts
  const counts = {
      'in-progress': admissions.filter(a => a.status === 'in-progress').length,
      'planned': admissions.filter(a => a.status === 'planned').length,
      'finished': admissions.filter(a => a.status === 'finished').length,
      'all': admissions.length
  };

  const getWardStats = () => {
    if (!locations) return [];
    const stats: any[] = [];
    Object.values(locations.wards || {}).forEach((wards: any) => {
      wards.forEach((w: any) => {
        const pct = w.capacity > 0 ? (w.occupied / w.capacity) * 100 : 0;
        stats.push({ ...w, status: pct >= 100 ? 'full' : pct >= 75 ? 'near-full' : 'available' });
      });
    });
    return stats;
  };
  
  const formatDate = (dateStr?: string) => {
      if (!dateStr) return { full: 'N/A', relative: '' };
      const date = new Date(dateStr);
      return {
          full: date.toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
          relative: formatDistanceToNow(date, { addSuffix: true })
      };
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center text-blue-600 font-medium animate-pulse">Loading Hospital System...</div>;

  return (
    <div className="p-6 md:p-8 space-y-8 bg-slate-50 min-h-screen font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admission Management</h1>
          <p className="text-slate-500 mt-1">Real-time overview of inpatient encounters and bed capacity.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="icon" onClick={fetchData} className="rounded-full hover:bg-slate-50"><RefreshCw className="w-4 h-4" /></Button>
          <Button onClick={() => setIsAdmitModalOpen(true)} className="rounded-full bg-blue-600 hover:bg-blue-700 px-6 shadow-md hover:shadow-lg transition-all">
            <Plus className="w-4 h-4 mr-2" /> Admit Patient
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-8 border-b border-slate-200 px-2">
        <button onClick={() => setActiveTab('patients')} className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'patients' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          <List className="w-4 h-4" /> Admitted List
        </button>
        <button onClick={() => setActiveTab('rooms')} className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'rooms' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          <LayoutGrid className="w-4 h-4" /> Room View
        </button>
      </div>

      {activeTab === 'patients' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {getWardStats().slice(0, 4).map((ward) => (
              <CapacityCard key={ward.code} {...ward} total={ward.capacity} />
            ))}
          </div>

          {/* Table Card */}
          <Card className="border-0 shadow-lg ring-1 ring-slate-100 bg-white overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 justify-between items-center bg-white sticky top-0 z-10">
              <div className="flex gap-2 p-1 bg-slate-50 rounded-lg">
                {[
                    { key: 'in-progress', label: 'IN-PROGRESS' },
                    { key: 'finished', label: 'FINISHED' },
                    { key: 'all', label: 'ALL' }
                ].map(tab => (
                  <button 
                    key={tab.key} 
                    onClick={() => setStatusFilter(tab.key)} 
                    className={`px-4 py-2 text-xs font-bold rounded-md uppercase transition-all flex items-center gap-2 ${statusFilter === tab.key ? 'bg-emerald-100 text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                  >
                    {tab.label}
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${statusFilter === tab.key ? 'bg-white text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                        {counts[tab.key as keyof typeof counts] || 0}
                    </span>
                  </button>
                ))}
              </div>
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <Input placeholder="Search patients..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-all" />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-semibold text-xs border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Patient Name</th>
                    <th className="px-6 py-4">Admission #</th>
                    <th className="px-6 py-4">Date/Time</th>
                    <th className="px-6 py-4">Physician</th>
                    <th className="px-6 py-4">Source</th>
                    <th className="px-6 py-4">Room/Bed</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredAdmissions.length > 0 ? filteredAdmissions.map(p => {
                      const dateInfo = formatDate(p.admissionDate);
                      return (
                        <tr key={p.id} className="hover:bg-blue-50/50 transition-colors group">
                          {/* Patient Name */}
                          <td className="px-6 py-4 align-top">
                            <div>
                                <div className="font-bold text-slate-900 text-sm">{p.patientName}</div>
                                <div className="text-xs text-slate-400 mt-1">ID: {p.patientId}</div>
                            </div>
                          </td>
                          
                          {/* Admission # */}
                          <td className="px-6 py-4 align-top">
                             <div className="font-medium text-slate-700 text-sm">{p.admissionNo}</div>
                             <div className="mt-1">
                                <StatusBadge status={p.status} />
                             </div>
                          </td>

                          {/* Date/Time */}
                          <td className="px-6 py-4 align-top">
                              <div className="text-sm text-slate-700">{dateInfo.full}</div>
                              <div className="text-xs text-slate-400 mt-1">{dateInfo.relative}</div>
                          </td>
                          
                          {/* Physician */}
                          <td className="px-6 py-4 align-top">
                              <div className="font-medium text-slate-900 text-sm">{p.physician}</div>
                              <div className="text-xs text-slate-400 mt-1">Attending</div>
                          </td>

                          {/* Source */}
                          <td className="px-6 py-4 align-top">
                              <div className="text-sm font-medium text-slate-700">{p.admitSource || 'N/A'}</div>
                          </td>

                          {/* Room/Bed */}
                          <td className="px-6 py-4 align-top">
                              <div className="font-medium text-slate-700 text-sm">{p.location?.ward || 'Unassigned'}</div>
                              <div className="text-xs text-slate-400 mt-1">
                                {p.location?.room ? `Room ${p.location.room}` : ''}
                                {p.location?.bed ? `, Bed ${p.location.bed}` : ''}
                              </div>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-right align-top">
                  <div className="flex justify-end gap-2">
                            <Button 
                                size="sm" 
                                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 h-8"
                                onClick={() => { setSelectedAdmission(p); setIsDetailsOpen(true); }}
                            >
                              Details
                            </Button>
                            <Button 
                                size="sm" 
                                variant="destructive"
                                className="h-8 w-8 p-0"
                                onClick={async (e) => {
                                   e.stopPropagation();
                                   if (window.confirm(`Are you sure you want to delete admission for ${p.patientName}? This action cannot be undone.`)) {
                                       try {
                                           await admissionService.delete(p.id);
                                           fetchData();
                                       } catch (err) {
                                           console.error("Failed to delete", err);
                                           alert("Failed to delete admission.");
                                       }
                                   }
                                }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                            </Button>
                            </div>
                          </td>
                        </tr>
                      );
                  }) : (
                    <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">No patients found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'rooms' && <RoomManagementView locations={locations} admissions={admissions} />}

      {/* Modals */}
      <AdmitPatientModal isOpen={isAdmitModalOpen} onClose={() => setIsAdmitModalOpen(false)} onSuccess={() => { setIsAdmitModalOpen(false); fetchData(); }} onNavigate={onNavigate} />
      <AdmissionDetailsModal 
        isOpen={isDetailsOpen} 
        onClose={() => setIsDetailsOpen(false)} 
        admission={selectedAdmission} 
        onUpdate={(updatedAdmission) => {
           fetchData(); // Refresh list
           setSelectedAdmission(updatedAdmission); // Update modal view
        }} 
        onDelete={() => { fetchData(); setIsDetailsOpen(false); }} 
      />
    </div>
  );
};

export default AdmissionPage;
