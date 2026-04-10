import React, { useState, ChangeEvent, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Calendar, User, Users, Briefcase, MapPin, Stethoscope, FileText, X, Save, AlertCircle, LogOut, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import type { Admission } from '@/types/admission';
import { admissionService } from '@/services/admissionService';
import { LocationSelector } from './LocationSelector';
import { useToast } from '@/hooks/use-toast';

const StatusBadge = ({ status }: { status: string }) => {
   const styles: Record<string, string> = {
      'in-progress': 'bg-emerald-100 text-emerald-700',
      'planned': 'bg-blue-100 text-blue-700',
      'finished': 'bg-gray-200 text-gray-700',
      'cancelled': 'bg-red-100 text-red-700',
   };

   return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${styles[status] || styles['finished']}`}>
         {(status || '').replace('-', ' ')}
      </span>
   );
};

interface AdmissionDetailsModalProps {
   isOpen: boolean;
   onClose: () => void;
   admission: Admission | null;
   onUpdate?: (updatedAdmission: Admission) => void;
   onDelete?: (id: number | string) => void;
}

export const AdmissionDetailsModal: React.FC<AdmissionDetailsModalProps> = ({
   isOpen,
   onClose,
   admission,
   onUpdate,
   onDelete,
}) => {
   const [currentAdmission, setCurrentAdmission] = useState<Admission | null>(admission);
   const [mode, setMode] = useState<'view' | 'edit' | 'delete'>('view');
   const [editData, setEditData] = useState<Admission | null>(admission);
   const [confirmText, setConfirmText] = useState('');
   const [isLoading, setIsLoading] = useState(false);
   const [errors, setErrors] = useState<Record<string, string>>({});

   const [activeTab, setActiveTab] = useState<'medical' | 'tracking' | 'timeline'>('medical');
   const { toast } = useToast();

   const [locations, setLocations] = useState<any>(null);
   const [practitioners, setPractitioners] = useState<any[]>([]);
   const [allAdmissions, setAllAdmissions] = useState<any[]>([]);
   const [physicianSearch, setPhysicianSearch] = useState('');
   const [showPhysicianResults, setShowPhysicianResults] = useState(false);

   // Fetch fresh data whenever the modal opens or admission changes
   useEffect(() => {
      if (isOpen && admission?.id) {
         const fetchFullDetails = async () => {
            setIsLoading(true);
            try {
               const freshData = await admissionService.getById(admission.id);
               setCurrentAdmission(freshData);
               setEditData({
                  ...freshData,
                  location: freshData.location || { building: '', ward: '', room: '', bed: '' }
               });
            } catch (err) {
               console.error("Failed to fetch accurate admission details", err);
               toast({ title: "Warning", description: "Could not load latest admission data. Showing cached version.", variant: "destructive" });
               // Fallback to prop data if fetch fails
               setCurrentAdmission(admission);
               setEditData({ ...admission, location: admission.location || { building: '', ward: '', room: '', bed: '' } });
            } finally {
               setIsLoading(false);
            }
         };

         fetchFullDetails();

         // Fetch support data
         admissionService.getLocations().then(setLocations);
         admissionService.getAll().then(setAllAdmissions);
         admissionService.getPractitioners('doctor').then(setPractitioners);
      } else {
         setEditData(null);
         setCurrentAdmission(null);
      }

      setMode('view');
      setConfirmText('');
      setErrors({});
      setActiveTab('medical');
   }, [isOpen, admission?.id]);

   const data = currentAdmission || admission;
   if (!data) return null;

   const handleLocationChange = (level: string, value: string) => {
      if (!editData) return;
      setEditData(prev => {
         if (!prev) return prev;
         const newLoc = { ...prev.location, [level]: value };

         // Reset children when parent changes
         if (level === 'building') { newLoc.ward = ''; newLoc.room = ''; newLoc.bed = ''; }
         if (level === 'ward') { newLoc.room = ''; newLoc.bed = ''; }
         if (level === 'room') { newLoc.bed = ''; }

         // Construct Path IDs
         const ids: any[] = [];
         if (newLoc.building) ids.push(newLoc.building);
         if (newLoc.ward) ids.push(newLoc.ward);
         if (newLoc.room) ids.push(newLoc.room);
         if (newLoc.bed) ids.push(newLoc.bed);

         return { ...prev, location: newLoc, location_ids: ids };
      });
   };

   const initials = data.patient_summary?.full_name
      ? data.patient_summary.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
      : 'NA';

   const handleEditChange = (field: keyof Admission, value: any) => {
      if (!editData) return;
      setEditData(prev => prev ? { ...prev, [field]: value } : prev);
   };

   const validateForm = (): boolean => {
      // Simplified validation for now
      return true;
   };

   const handleUpdate = async () => {
      if (!editData) return;
      setIsLoading(true);
      try {
         const updated = await admissionService.update(editData.id, editData);
         onUpdate?.(updated);
         setMode('view');
         toast({
            title: "Success",
            description: "Admission updated successfully",
         });
      } catch (err: any) {
         console.error('Update failed:', err);
         toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to update admission",
         });
      } finally {
         setIsLoading(false);
      }
   };

   const handleDelete = async () => {
      if (confirmText !== 'DELETE') return;
      setIsLoading(true);
      try {
         await admissionService.delete(data.id);
         onDelete?.(data.id);
         onClose();
         toast({
            title: "Success",
            description: "Admission deleted successfully",
         });
      } catch (err: any) {
         console.error('Delete failed:', err);
         toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to delete admission",
         });
      } finally {
         setIsLoading(false);
      }
   };

   // Helper to calculate duration
   const getDuration = () => {
      const start = data.created_at || data.admissionDate || data.period_start;
      if (!start) return '0 days';

      const startDate = new Date(start);
      let endDate = new Date(); // Default to now for active patients

      if (data.status === 'finished') {
         // If finished, use updated_at (actual discharge timestamp) if available
         // Fallback to dischargeDate (which is just YYYY-MM-DD, so we might want to set to end of day)
         if (data.updated_at) {
            endDate = new Date(data.updated_at);
         } else if (data.dischargeDate) {
            endDate = new Date(data.dischargeDate);
            // If only date is available, maybe assume end of day or just use date diff
            endDate.setHours(23, 59, 59);
         }
      }

      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());

      // Calculate total days (rounded up to count partial days as 1)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Calculate hours for more precision if needed, but "days" is the request
      // "the duration of the patients stay as admitted until discharge"

      return `${Math.max(1, diffDays)} days`;
   };


   // Helper to calculate age
   const calculateAge = (dob: string) => {
      if (!dob) return 'N/A';
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
         age--;
      }
      return age;
   };

   const renderHeader = () => (
      <div className="bg-blue-600 p-6 text-white text-left">
         <div className="flex justify-between items-start">
            <div className="pr-20"> {/* Give space for absolute buttons */}
               <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h2 className="text-2xl font-bold uppercase tracking-wide">{data.patient_summary?.full_name || 'UNKNOWN PATIENT'}</h2>
                  <div className="flex gap-2">
                     <StatusBadge status={data.status} />
                  </div>
               </div>
               <div className="flex gap-4 text-sm mt-1 opacity-90">
                  <span>Patient ID: {data.patientId || 'N/A'}</span>
                  <span>Age: {calculateAge(data.patient_summary?.birthdate)}</span>
                  <span>Sex: {data.patient_summary?.gender || 'N/A'}</span>
               </div>
               <div className="flex gap-6 mt-4 text-sm font-medium">
                  <div className="flex items-center gap-2">
                     <Calendar className="w-4 h-4 opacity-80" />
                     Admission: {data.created_at ? new Date(data.created_at).toLocaleString() : (data.admissionDate || data.period_start ? new Date(data.admissionDate || data.period_start!).toLocaleString() : 'N/A')}
                  </div>
                  <div className="flex items-center gap-2">
                     <div className="w-4 h-4 rounded-full border border-white/40 flex items-center justify-center text-[10px]">D</div>
                     Duration: {getDuration()}
                  </div>
               </div>
            </div>
         </div>
      </div>
   );

   const renderMedicalInfo = () => (
      <div className="space-y-8 p-6 bg-slate-50/50 min-h-[500px] text-left">

         {/* Encounter Classification */}
         <section>
            <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide">Encounter Classification</h3>
            <Card className="border-0 shadow-sm bg-slate-50">
               <CardContent className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-y-4 gap-x-8">
                  <div><span className="block text-xs font-bold text-slate-500 mb-1">Encounter Type</span><span className="font-medium text-slate-900">{data.encounterType || 'Inpatient (IMP)'}</span></div>
                  <div><span className="block text-xs font-bold text-slate-500 mb-1">Service Type</span><span className="font-medium text-slate-900">{data.serviceType || 'General'}</span></div>
                  <div><span className="block text-xs font-bold text-slate-500 mb-1">Priority</span><span className={`font-bold uppercase ${data.priority === 'emergency' ? 'text-red-600' : data.priority === 'urgent' ? 'text-amber-600' : 'text-blue-600'}`}>{data.priority || 'Routine'}</span></div>
                  <div><span className="block text-xs font-bold text-slate-500 mb-1">Status</span><span className="font-medium text-slate-900 uppercase">{data.status || 'In Progress'}</span></div>
               </CardContent>
            </Card>
         </section>

         {/* Discharge Details (Only show if finished) */}
         {data.status === 'finished' && (
            <section>
               <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide">Discharge Details</h3>
               <Card className="border-0 shadow-sm bg-blue-50/50 border-l-4 border-l-blue-500">
                  <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                     <div>
                        <span className="block text-xs font-bold text-blue-500 mb-1 uppercase">Discharge Date</span>
                        <span className="font-bold text-slate-900">{data.dischargeDate ? new Date(data.dischargeDate).toLocaleString() : 'N/A'}</span>
                     </div>
                     <div>
                        <span className="block text-xs font-bold text-blue-500 mb-1 uppercase">Disposition</span>
                        <span className="font-medium text-slate-900">{data.discharge_disposition || 'Not specified'}</span>
                     </div>
                  </CardContent>
               </Card>
            </section>
         )}

         {/* Admission Details */}
         <section>
            <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide">Admission Details</h3>
            <Card className="border-0 shadow-sm bg-slate-50">
               <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                  <div className="col-span-full">
                     <span className="block text-xs font-bold text-slate-500 mb-1">Reason for Admission / Diagnosis</span>
                     <span className="font-medium text-slate-900 break-words">{data.reasonForAdmission || 'N/A'}</span>
                  </div>
                  <div><span className="block text-xs font-bold text-slate-500 mb-1">Admit Source</span><span className="font-medium text-slate-900">{data.admitSource || 'N/A'}</span></div>
                  <div><span className="block text-xs font-bold text-slate-500 mb-1">Pre-Admission ID</span><span className="font-medium text-slate-900">{data.preAdmissionIdentifier || 'None'}</span></div>
                  <div><span className="block text-xs font-bold text-slate-500 mb-1">Re-admission</span><span className="font-medium text-slate-900">{data.isReadmission ? 'Yes' : 'No'}</span></div>
               </CardContent>
            </Card>
         </section>

         {/* Hospitalization Details */}
         <section>
            <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide">Hospitalization Details</h3>
            <Card className="border-0 shadow-sm bg-slate-50">
               <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                     <span className="block text-xs font-bold text-slate-500 mb-2">Diet Preference</span>
                     <div className="flex flex-wrap gap-1">
                        {data.dietPreference && data.dietPreference.length > 0 ? (
                           data.dietPreference.map(d => <Badge key={d} variant="secondary" className="bg-slate-200 text-slate-700 font-medium text-[10px]">{d}</Badge>)
                        ) : <span className="text-slate-400 text-sm">None selected</span>}
                     </div>
                  </div>
                  <div>
                     <span className="block text-xs font-bold text-slate-500 mb-2">Special Arrangements</span>
                     <div className="flex flex-wrap gap-1">
                        {data.specialArrangements && data.specialArrangements.length > 0 ? (
                           data.specialArrangements.map(a => <Badge key={a} variant="secondary" className="bg-emerald-100 text-emerald-700 font-medium text-[10px]">{a}</Badge>)
                        ) : <span className="text-slate-400 text-sm">None selected</span>}
                     </div>
                  </div>
                  <div>
                     <span className="block text-xs font-bold text-slate-500 mb-2">Special Courtesy</span>
                     <div className="flex flex-wrap gap-1">
                        {data.specialCourtesy && data.specialCourtesy.length > 0 ? (
                           data.specialCourtesy.map(c => <Badge key={c} variant="secondary" className="bg-amber-100 text-amber-700 font-medium text-[10px]">{c}</Badge>)
                        ) : <span className="text-slate-400 text-sm">None selected</span>}
                     </div>
                  </div>
               </CardContent>
            </Card>
         </section>
      </div>
   );

   const renderTrackingInfo = () => (
      <div className="space-y-8 p-6 bg-slate-50/50 min-h-[500px] text-left">

         {/* Current Location */}
         <section>
            <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide">Current Location</h3>
            <Card className="border-0 shadow-sm bg-slate-50">
               <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-4">
                     <div>
                        <span className="block text-xs font-bold text-slate-500 mb-1">Building</span>
                        <span className="text-lg font-medium text-slate-900">
                           {data.location?.building || 'Not Defined'}
                        </span>
                     </div>
                     <div>
                        <span className="block text-xs font-bold text-slate-500 mb-1">Ward</span>
                        <span className="text-lg font-medium text-slate-900">
                           {data.location?.ward || 'Unassigned'}
                        </span>
                     </div>
                     <div>
                        <span className="block text-xs font-bold text-slate-500 mb-1">Room</span>
                        <span className="text-lg font-medium text-slate-900">
                           {data.location?.room || 'Unassigned'}
                        </span>
                     </div>
                     <div>
                        <span className="block text-xs font-bold text-slate-500 mb-1">Bed</span>
                        <span className="text-lg font-medium text-slate-900">
                           {data.location?.bed || 'None'}
                        </span>
                     </div>
                  </div>
                  <div className="pt-4 border-t border-slate-200 text-xs text-slate-500">
                     <span className="font-medium text-slate-700">Status: {data.status || 'Active'}</span> • Admitted: {data.admissionDate ? new Date(data.admissionDate).toLocaleString() : 'N/A'}
                  </div>
               </CardContent>
            </Card>
         </section>

         {/* Attending Staff */}
         <section>
            <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide">Attending Staff</h3>
            <Card className="border-0 shadow-sm bg-slate-50">
               <CardContent className="p-6">
                  <div className="mb-2">
                     <span className="block text-xs font-bold text-slate-500 mb-1">Primary Physician</span>
                     <div className="text-lg font-bold text-slate-900">{data.physician || 'Unassigned'}</div>
                  </div>
                  <div className="text-xs text-slate-500">
                     Role: {data.practitioner_summary?.role || 'Attending'} • Since: {data.admissionDate ? new Date(data.admissionDate).toLocaleString() : 'N/A'}
                  </div>
               </CardContent>
            </Card>
         </section>
      </div>
   );

   const renderEditMode = () => (
      <div className="p-8 space-y-8 bg-white min-h-[500px] text-left">
         <div className="flex justify-between items-center pb-4 border-b border-slate-100 bg-white">
            <h3 className="text-xl font-bold text-slate-900">Edit Admission Details</h3>
            <div className="flex gap-3 flex-shrink-0">
               <Button
                  variant="outline"
                  onClick={() => setMode('view')}
                  className="border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 h-10 px-5 transition-all active:scale-95 flex items-center gap-2 flex-shrink-0"
               >
                  <RotateCcw className="w-4 h-4" /> Cancel
               </Button>
               <Button
                  onClick={handleUpdate}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 h-10 px-8 transition-all active:scale-95 flex items-center gap-2 flex-shrink-0 whitespace-nowrap"
               >
                  {isLoading ? (
                     <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                     </>
                  ) : (
                     <>
                        <Save className="w-4 h-4" />
                        <span>Save Changes</span>
                     </>
                  )}
               </Button>
            </div>
         </div>

         <div className="space-y-8">
            {/* Attending Staff */}
            <section className="space-y-4">
               <h4 className="font-bold text-slate-800 flex items-center gap-2 tracking-tight">
                  <Users className="w-4 h-4 text-blue-500" /> Attending Staff
               </h4>
               <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 mb-1 block uppercase tracking-wider">Primary Physician</label>
                        <select
                           className="w-full p-2.5 bg-white border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                           value={editData?.participant_individual_id || ''}
                           onChange={e => {
                              const id = Number(e.target.value);
                              const p = practitioners.find(prac => prac.practitioner_id === id);
                              if (p) {
                                 handleEditChange('physician', `${p.first_name} ${p.last_name}`);
                                 handleEditChange('participant_individual_id', p.practitioner_id);
                              }
                           }}
                        >
                           <option value="" disabled>Select Physician</option>
                           {practitioners.map(p => (
                              <option key={p.practitioner_id} value={p.practitioner_id}>
                                 {p.first_name} {p.last_name} ({p.identifier}) - {p.user_role || 'Staff'}
                              </option>
                           ))}
                        </select>
                     </div>

                  </div>
               </div>
            </section>

            {/* Encounter Classification */}
            <section className="space-y-4">
               <h4 className="font-bold text-slate-800 flex items-center gap-2 tracking-tight">
                  <Stethoscope className="w-4 h-4 text-purple-500" /> Encounter Classification
               </h4>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-100">
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-500 mb-1 block uppercase tracking-wider">Encounter Class</label>
                     <select
                        className="w-full p-2 border border-slate-200 rounded-md text-sm bg-white"
                        value={editData?.encounterType || ''}
                        onChange={e => handleEditChange('encounterType', e.target.value)}
                     >
                        <option value="IMP">Inpatient (IMP)</option>
                        <option value="EMER">Emergency (EMER)</option>
                        <option value="AMB">Ambulatory (AMB)</option>
                        <option value="HH">Home Health (HH)</option>
                     </select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-500 mb-1 block uppercase tracking-wider">Encounter Sub-Type</label>
                     <select
                        className="w-full p-2 border border-slate-200 rounded-md text-sm bg-white"
                        value={editData?.type || 'admission'}
                        onChange={e => handleEditChange('type', e.target.value)}
                     >
                        <option value="admission">Admission</option>
                        <option value="transfer">Transfer</option>
                        <option value="visit">Visit</option>
                        <option value="consultation">Consultation</option>
                     </select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-500 mb-1 block uppercase tracking-wider">Service Type</label>
                     <select
                        className="w-full p-2 border border-slate-200 rounded-md text-sm bg-white"
                        value={editData?.serviceType || ''}
                        onChange={e => handleEditChange('serviceType', e.target.value)}
                     >
                        <option value="Internal Medicine">Internal Medicine</option>
                        <option value="Cardiology">Cardiology</option>
                        <option value="Surgery">Surgery</option>
                        <option value="Pediatrics">Pediatrics</option>
                     </select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-500 mb-1 block uppercase tracking-wider">Priority</label>
                     <select
                        className="w-full p-2 border border-slate-200 rounded-md text-sm bg-white"
                        value={editData?.priority || 'routine'}
                        onChange={e => handleEditChange('priority', e.target.value)}
                     >
                        <option value="routine">Routine (R)</option>
                        <option value="urgent">Urgent (UR)</option>
                        <option value="emergency">Emergency (EM)</option>
                     </select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-500 mb-1 block uppercase tracking-wider">Status</label>
                     <div className="p-2 bg-white border border-slate-200 rounded-md text-sm font-medium text-emerald-600 uppercase">
                        {editData?.status || 'in-progress'}
                     </div>
                  </div>
               </div>
            </section>

            {/* Admission Details & Location Assignment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <section className="space-y-4">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2 tracking-tight">
                     <FileText className="w-4 h-4 text-emerald-500" /> Admission Details
                  </h4>
                  <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 space-y-4">
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 mb-1 block uppercase tracking-wider">Reason for Admission / Diagnosis</label>
                        <Textarea value={editData?.reasonForAdmission || ''} onChange={e => handleEditChange('reasonForAdmission', e.target.value)} className="h-32" placeholder="Describe the clinical reason for admission or primary diagnosis..." />
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-xs font-bold text-slate-500 mb-1 block uppercase tracking-wider">Diagnosis Rank</label>
                           <select
                              className="w-full p-2 border border-slate-200 rounded-md text-sm bg-white"
                              value={editData?.diagnosis_rank || '1'}
                              onChange={e => handleEditChange('diagnosis_rank', e.target.value)}
                           >
                              <option value="1">Primary (1)</option>
                              <option value="2">Secondary (2)</option>
                              <option value="3">Tertiary (3)</option>
                           </select>
                        </div>
                        <div className="space-y-2">
                           <label className="text-xs font-bold text-slate-500 mb-1 block uppercase tracking-wider">Diagnosis Use</label>
                           <select
                              className="w-full p-2 border border-slate-200 rounded-md text-sm bg-white"
                              value={editData?.diagnosis_use || 'admission'}
                              onChange={e => handleEditChange('diagnosis_use', e.target.value)}
                           >
                              <option value="admission">Admission</option>
                              <option value="discharge">Discharge</option>
                              <option value="billing">Billing</option>
                           </select>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-xs font-bold text-slate-500 mb-1 block uppercase tracking-wider">Admit Source</label>
                           <select
                              className="w-full p-2 border border-slate-200 rounded-md text-sm bg-white"
                              value={editData?.admitSource || ''}
                              onChange={e => handleEditChange('admitSource', e.target.value)}
                           >
                              <option value="Physician Referral">Physician Referral</option>
                              <option value="Emergency Room">Emergency Room</option>
                              <option value="Clinic Referral">Clinic Referral</option>
                              <option value="Transfer">Transfer from Hospital</option>
                           </select>
                        </div>
                        <div className="space-y-2">
                           <label className="text-xs font-bold text-slate-500 mb-1 block uppercase tracking-wider">Pre-Admission ID</label>
                           <Input value={editData?.preAdmissionIdentifier || ''} onChange={e => handleEditChange('preAdmissionIdentifier', e.target.value)} placeholder="None" />
                        </div>
                     </div>
                     <div className="flex items-center gap-2 pt-2">
                        <input
                           type="checkbox"
                           id="editIsReadmission"
                           checked={!!editData?.isReadmission}
                           onChange={e => handleEditChange('isReadmission', e.target.checked)}
                           className="w-4 h-4 rounded border-slate-300"
                        />
                        <label htmlFor="editIsReadmission" className="text-sm font-bold text-slate-700">Re-admission</label>
                     </div>
                  </div>
               </section>

               <section className="space-y-4">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2 tracking-tight">
                     <MapPin className="w-4 h-4 text-indigo-500" /> Location Assignment
                  </h4>
                  <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                     {locations ? (
                        <LocationSelector
                           locations={locations}
                           value={editData?.location || { building: '', ward: '', room: '', bed: '' }}
                           onChange={handleLocationChange}
                           showRoom={true}
                           showBed={true}
                           admissions={allAdmissions}
                        />
                     ) : (
                        <div className="text-center py-4 text-slate-400 text-sm">Loading locations...</div>
                     )}
                  </div>
               </section>
            </div>

            {/* Hospitalization Details */}
            <section className="space-y-4">
               <h4 className="font-bold text-slate-800 flex items-center gap-2 tracking-tight">
                  <Briefcase className="w-4 h-4 text-amber-500" /> Hospitalization Details
               </h4>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-6 bg-slate-50 rounded-xl border border-slate-100">
                  {/* Diet */}
                  <div>
                     <label className="text-xs font-bold text-slate-900 mb-3 block uppercase tracking-tight">Diet Preference</label>
                     <div className="space-y-2">
                        {['No restrictions', 'Low-sodium', 'Halal', 'Diabetic', 'Vegetarian'].map(opt => (
                           <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                              <input
                                 type="checkbox"
                                 checked={editData?.dietPreference?.includes(opt)}
                                 onChange={e => {
                                    const current = editData?.dietPreference || [];
                                    const next = e.target.checked ? [...current, opt] : current.filter(x => x !== opt);
                                    handleEditChange('dietPreference', next);
                                 }}
                                 className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-xs text-slate-600 group-hover:text-blue-600 transition-colors">{opt}</span>
                           </label>
                        ))}
                        {(!editData?.dietPreference || editData.dietPreference.length === 0) && (
                           <span className="text-xs text-slate-400 italic">None selected</span>
                        )}
                     </div>
                  </div>

                  {/* Arrangements */}
                  <div>
                     <label className="text-xs font-bold text-slate-900 mb-3 block uppercase tracking-tight">Special Arrangements</label>
                     <div className="space-y-2">
                        {['Wheelchair', 'Oxygen', 'IV Pole', 'Translator', 'Monitors'].map(opt => (
                           <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                              <input
                                 type="checkbox"
                                 checked={editData?.specialArrangements?.includes(opt)}
                                 onChange={e => {
                                    const current = editData?.specialArrangements || [];
                                    const next = e.target.checked ? [...current, opt] : current.filter(x => x !== opt);
                                    handleEditChange('specialArrangements', next);
                                 }}
                                 className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                              />
                              <span className="text-xs text-slate-600 group-hover:text-emerald-600 transition-colors">{opt}</span>
                           </label>
                        ))}
                        {(!editData?.specialArrangements || editData.specialArrangements.length === 0) && (
                           <span className="text-xs text-slate-400 italic">None selected</span>
                        )}
                     </div>
                  </div>

                  {/* Courtesy */}
                  <div>
                     <label className="text-xs font-bold text-slate-900 mb-3 block uppercase tracking-tight">Special Courtesy</label>
                     <div className="space-y-2">
                        {['VIP', 'Government Official', 'Professional Courtesy', 'Senior Citizen'].map(opt => (
                           <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                              <input
                                 type="checkbox"
                                 checked={editData?.specialCourtesy?.includes(opt)}
                                 onChange={e => {
                                    const current = editData?.specialCourtesy || [];
                                    const next = e.target.checked ? [...current, opt] : current.filter(x => x !== opt);
                                    handleEditChange('specialCourtesy', next);
                                 }}
                                 className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                              />
                              <span className="text-xs text-slate-600 group-hover:text-amber-600 transition-colors">{opt}</span>
                           </label>
                        ))}
                        {(!editData?.specialCourtesy || editData.specialCourtesy.length === 0) && (
                           <span className="text-xs text-slate-400 italic">None selected</span>
                        )}
                     </div>
                  </div>
               </div>
            </section>
         </div>
      </div>
   );

   return (
      <Dialog open={isOpen} onOpenChange={onClose}>
         <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden p-0 bg-white [&>button:last-child]:hidden">
            <DialogTitle className="sr-only">Admission Details</DialogTitle>
            <div className="flex flex-col h-full max-h-[90vh]">
               {/* Header */}
               {mode === 'view' ? renderHeader() : (
                  <div className="bg-blue-600 p-6 text-white flex justify-between items-center relative pr-16">
                     <h2 className="text-xl font-bold uppercase tracking-wide">Editing Admission</h2>
                     <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-6 right-6 text-white hover:bg-white/20 rounded-full w-10 h-10 p-0"
                        onClick={() => setMode('view')}
                     >
                        <X className="w-6 h-6" />
                     </Button>
                  </div>
               )}

               {mode === 'view' ? (
                  <>
                     {/* Header View Extra Controls */}
                     <div className="absolute top-6 right-6 flex gap-2">
                        <Button
                           size="sm"
                           variant="secondary"
                           className="bg-white/20 hover:bg-white/30 text-white border-0 h-9 px-4"
                           onClick={() => {
                              if (admission) {
                                 const safeLocation = {
                                    building: admission.location?.building || '',
                                    ward: admission.location?.ward || '',
                                    room: admission.location?.room || '',
                                    bed: admission.location?.bed || ''
                                 };
                                 setEditData({ ...admission, location: safeLocation });
                              }
                              setMode('edit');
                           }}
                        >
                           <Edit className="w-4 h-4 mr-2" /> Edit
                        </Button>
                        <Button
                           size="sm"
                           variant="ghost"
                           className="text-white hover:bg-white/20 rounded-full w-9 h-9 p-0"
                           onClick={onClose}
                        >
                           <X className="w-5 h-5" />
                        </Button>
                     </div>

                     {/* Tabs */}
                     <div className="bg-white border-b border-slate-200 px-6 flex gap-8">
                        {['Medical Information', 'Tracking', 'Timeline'].map(tab => {
                           const id = tab.toLowerCase().split(' ')[0] as any;
                           return (
                              <button
                                 key={id}
                                 onClick={() => setActiveTab(id)}
                                 className={`py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                              >
                                 {tab}
                              </button>
                           );
                        })}
                     </div>

                     {/* Content Scrollable Area */}
                     <div className="overflow-y-auto flex-1 bg-white">
                        {activeTab === 'medical' && renderMedicalInfo()}
                        {activeTab === 'tracking' && renderTrackingInfo()}
                        {activeTab === 'timeline' && (
                           <div className="p-8 text-center text-slate-500 italic">Timeline view coming soon...</div>
                        )}
                     </div>
                  </>
               ) : (
                  <div className="overflow-y-auto flex-1 bg-white">
                     {renderEditMode()}
                  </div>
               )}
            </div>

         </DialogContent>
      </Dialog>
   );
};
