import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Activity, Users, AlertTriangle, Heart, User, ChevronRight, ArrowLeft, Clock } from 'lucide-react';
import {
  MonitoringAdmission,
  VitalSign,
  ClinicalNote,
  DietaryOrder,
  HistoryEvent,
  LabRequest,
  LabResult,
  MedicationRequest,
  Procedure,
} from '../types/monitoring';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VitalSignsTab } from '@/components/monitoring/VitalSignsTab';
import { ClinicalNotesTab } from '@/components/monitoring/ClinicalNotesTab';
import { DietaryTab } from '@/components/monitoring/DietaryTab';
import { HistoryTab } from '@/components/monitoring/HistoryTab';
import { MedicationRequestTab } from '@/components/monitoring/MedicationRequestTab';
import { LaboratoryTab } from '@/components/monitoring/LaboratoryTab';
import { ProcedureTab } from '@/components/monitoring/ProcedureTab';
import { admissionService } from '@/services/admissionService';
import { CareTeamPanel } from '@/components/monitoring/CareTeamPanel';
import monitoringService from '@/services/monitoringService';
import laboratoryService from '@/services/laboratoryService';  // For lab requests/results

const Monitoring: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [admissions, setAdmissions] = useState<MonitoringAdmission[]>([]);
  const [selectedAdmission, setSelectedAdmission] = useState<MonitoringAdmission | null>(null);

  const [vitals, setVitals] = useState<VitalSign[]>([]);
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [dietary, setDietary] = useState<DietaryOrder | null>(null);
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [labRequests, setLabRequests] = useState<LabRequest[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'Stable' | 'Critical'>('all');

  // Fetch all admissions
  useEffect(() => {
    const fetchAdmissions = async () => {
      try {
        const userRole = (user as any)?.role;
        const params = (userRole === 'doctor' || userRole === 'nurse') ? { mine: '1' } : {};
        const data = await admissionService.getAll(params);
        if (Array.isArray(data)) {
          // Only show patients with active admissions (not discharged/finished)
          const activeAdmissions = data.filter((adm: any) => adm.status === 'in-progress');
          const mapped: MonitoringAdmission[] = activeAdmissions.map((adm: any) => ({
            id: adm.encounter_id,
            patientId: adm.subject_id,
            patientName: adm.patientName || 'Unknown Patient',
            room: adm.location?.room || '—',
            doctorName: adm.physician || 'Unassigned',
            status: adm.status === 'in-progress' ? 'Stable' : 'Observation',
            encounterType: adm.encounterType || 'IMP',
            admittingDiagnosis: adm.reasonForAdmission || 'N/A',
            reasonForAdmission: adm.reasonForAdmission || 'N/A',
            admissionCategory: adm.serviceType || 'General',
            modeOfArrival: adm.admitSource || 'Physician Referral',
            admissionDate: adm.admissionDate || '',
            attendingPhysician: adm.physician || 'Unassigned',
            ward: adm.location?.ward || 'General Ward',
          }));
          setAdmissions(mapped);
        }
      } catch (err) {
        console.error('Error fetching admissions:', err);
      }
    };
    fetchAdmissions();
  }, []);

  // Select an admission
  const handleSelectAdmission = async (adm: MonitoringAdmission) => {
    setSelectedAdmission(adm);

    try {
      // Fetch monitoring data (vitals, notes, dietary)
      const [fetchedVitals, fetchedNotes, fetchedDietary] = await Promise.all([
        monitoringService.getVitals(adm.id),
        monitoringService.getNotes(adm.id),
        monitoringService.getDietary(adm.id),
      ]);

      setVitals(fetchedVitals);
      setNotes(fetchedNotes);
      setDietary(fetchedDietary);

      // Fetch lab results from laboratory module (finalized only for monitoring view)
      try {
        const labResponse = await laboratoryService.getLabRequests({
          subject_id: adm.patientId,  // Filter by patient ID
          encounter_id: adm.id,
        } as any);


        // API returns paginated response with results array
        const labResults = labResponse.results || [];

        // Map laboratory DiagnosticReport to monitoring LabRequest format
        const mappedLabs: LabRequest[] = labResults.map((report: any) => ({
          id: report.request_id,
          admissionId: report.admission_id,
          testName: report.test_type_display || report.test_type,
          testCode: report.test_type as any, // Cast to LabTestType
          priority: (report.priority || 'routine') as any,
          notes: report.clinical_reason || '',
          lifecycleStatus: (['verified', 'registered', 'preliminary', 'partial'].includes(report.status)) ? 'verified' :
            (['completed', 'final', 'amended', 'corrected'].includes(report.status) ? 'completed' : 'requested'),
          status_display: (() => {
            const s = report.status;
            if (['completed', 'final', 'amended', 'corrected'].includes(s)) return 'Completed';
            if (['verified', 'registered', 'preliminary', 'partial'].includes(s)) return 'Verified';
            return 'Requested'; // 'requested', 'draft'
          })(),
          orderedBy: report.doctor_name || report.orderedBy || 'Unknown',
          orderedAt: report.created_at,
          patient_name: report.patient_name || report.subject_display || 'Unknown Patient',
          patient_id: report.patient_id || report.subject_patient_id || '',
          completedAt: report.updated_at,

          results: report.results ? report.results.map((r: any) => ({
            parameter: r.parameter,
            value: r.value,
            unit: r.unit,
            referenceRange: r.referenceRange,
            flag: r.flag,
            interpretation: r.interpretation
          })) : []
        }));
        setLabRequests(mappedLabs);
      } catch (labErr) {
        console.error('Error fetching lab results:', labErr);
        setLabRequests([]);
      }

      // Fetch procedures for this encounter
      let fetchedProcedures: Procedure[] = [];
      try {
        fetchedProcedures = await monitoringService.fetchProcedures(adm.id);
        setProcedures(fetchedProcedures);
      } catch {
        setProcedures([]);
      }

      // Populate history timeline with procedure events
      const procedureEvents: HistoryEvent[] = fetchedProcedures.map(p => ({
        id: p.procedure_id.toString(),
        admissionId: p.encounter.toString(),
        dateTime: p.performed_datetime || p.performed_period_start || p.created_at,
        category: 'Procedure' as const,
        description: p.code_display || p.code_code || 'Procedure',
        details: p.note,
      }));
      setHistory(procedureEvents);
    } catch (err) {
      console.error('Error fetching admission details:', err);
    }
  };

  const handleRefreshProcedures = async () => {
    if (!selectedAdmission) return;
    try {
      const fetched = await monitoringService.fetchProcedures(selectedAdmission.id);
      setProcedures(fetched);
      const events: HistoryEvent[] = fetched.map(p => ({
        id: p.procedure_id.toString(),
        admissionId: p.encounter.toString(),
        dateTime: p.performed_datetime || p.performed_period_start || p.created_at,
        category: 'Procedure' as const,
        description: p.code_display || p.code_code || 'Procedure',
        details: p.note,
      }));
      setHistory(events);
    } catch {
      // silently ignore refresh errors
    }
  };

  const handleBackToList = () => {
    setSelectedAdmission(null);
  };

  // Filtered admissions
  const filteredAdmissions = admissions.filter(admission => {
    const matchesSearch =
      admission.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admission.id.toString().includes(searchTerm) ||
      admission.room.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || admission.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Add handlers
  const handleAddVital = async (newVital: Omit<VitalSign, 'id'>) => {
    if (!selectedAdmission) return;
    try {
      await monitoringService.addVital(newVital, selectedAdmission.patientId);
      const updatedVitals = await monitoringService.getVitals(selectedAdmission.id);
      setVitals(updatedVitals);
    } catch (err) {
      console.error('Error adding vital:', err);
    }
  };

  const handleAddNote = async (newNote: ClinicalNote) => {
    if (!selectedAdmission) return;
    try {
      await monitoringService.addNote(newNote, selectedAdmission.patientId);
      const updatedNotes = await monitoringService.getNotes(selectedAdmission.id);
      setNotes(updatedNotes);
    } catch (err) {
      console.error(err);
      throw err; // Propagate error for UI feedback
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!selectedAdmission) return;
    try {
      await monitoringService.deleteNote(noteId);
      const updatedNotes = await monitoringService.getNotes(selectedAdmission.id);
      setNotes(updatedNotes);
    } catch (err) {
      console.error('Error deleting note:', err);
      throw err;
    }
  };

  const handleUpdateDietary = async (order: DietaryOrder) => {
    if (!selectedAdmission) return;
    try {
      await monitoringService.saveDietary(order, selectedAdmission.patientId);
      const updatedDietary = await monitoringService.getDietary(selectedAdmission.id);
      setDietary(updatedDietary);
    } catch (err) {
      console.error('Error updating dietary order:', err);
    }
  };

  const handleAddLabRequest = async (request: Omit<LabRequest, 'id'>) => {
    if (!selectedAdmission) return;
    try {
      // Map monitoring LabRequest format to laboratory DiagnosticReport format
      const labRequestPayload = {
        subject_id: selectedAdmission.patientId,
        admission: selectedAdmission.id,  // Backend expects 'admission', not 'encounter_id'
        requesting_doctor: user ? parseInt(user.id) : null,  // Use current user ID to override token if backend supports it
        test_type: request.testCode as any,  // Type assertion for cross-module integration
        priority: request.priority as any,  // Type assertion for cross-module integration
        clinical_reason: request.notes,
        requester_name: request.orderedBy // Pass frontend user name to service
      };

      await laboratoryService.createLabRequest(labRequestPayload);

      // Refresh lab requests - handle paginated response
      const labResponse = await laboratoryService.getLabRequests({
        subject_id: selectedAdmission.patientId,  // Filter by patient ID
        encounter_id: selectedAdmission.id,
      } as any);


      const labResults = labResponse.results || [];
      const mappedLabs: LabRequest[] = labResults.map((report: any) => ({
        id: report.request_id,
        admissionId: report.admission_id,
        testName: report.test_type_display || report.test_type,
        testCode: report.test_type as any, // Cast to LabTestType
        priority: (report.priority || 'routine') as any,
        notes: report.clinical_reason || '',
        lifecycleStatus: (['verified', 'registered', 'preliminary', 'partial'].includes(report.status)) ? 'verified' :
          (['completed', 'final', 'amended', 'corrected'].includes(report.status) ? 'completed' : 'requested'),
        status_display: (() => {
          const s = report.status;
          if (['completed', 'final', 'amended', 'corrected'].includes(s)) return 'Completed';
          if (['verified', 'registered', 'preliminary', 'partial'].includes(s)) return 'Verified';
          return 'Requested'; // 'requested', 'draft'
        })(),
        orderedBy: report.doctor_name || report.orderedBy || 'Unknown',
        orderedAt: report.created_at,
        patient_name: report.patient_name || report.subject_display || 'Unknown Patient',
        patient_id: report.patient_id || report.subject_patient_id || '',
        completedAt: report.updated_at,
        results: report.results ? report.results.map((r: any) => ({
          parameter: r.parameter,
          value: r.value,
          unit: r.unit,
          referenceRange: r.referenceRange,
          flag: r.flag,
          interpretation: r.interpretation
        })) : []
      }));
      setLabRequests(mappedLabs);
    } catch (err: any) {
      console.error('Error adding lab request:', err);
      console.error('Error response data:', err.response?.data);
      alert(`Failed to create lab request: ${JSON.stringify(err.response?.data || err.message)}`);
    }
  };

  const handleUpdateLabResult = async (requestId: string, result: LabResult) => {
    // Lab results are managed in Laboratory module
    // This is view-only in monitoring
    alert('Please use the Laboratory page to enter/update lab results');
  };

  const handleVerifyLabRequest = async (requestId: number | string) => {
    try {
      await laboratoryService.verifyLabRequest(requestId);
      toast({
        title: "Success",
        description: "Lab request verified successfully",
        className: "bg-green-600 text-white border-green-700",
      });

      // Refresh requests
      if (selectedAdmission) {
        handleSelectAdmission(selectedAdmission);
      }
    } catch (err: any) {
      console.error("Failed to verify lab request", err);
      const errorMessage = err.response?.data?.error || "Failed to verify lab request";
      toast({
        title: "Verification Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDeleteLabRequest = async (requestId: number | string) => {
    try {
      await laboratoryService.deleteLabRequest(requestId);
      toast({
        title: "Success",
        description: "Lab request deleted successfully",
        className: "bg-green-600 text-white border-green-700",
      });

      if (selectedAdmission) {
        handleSelectAdmission(selectedAdmission);
      }
    } catch (err: any) {
      console.error("Failed to delete lab request", err);
      toast({
        title: "Error",
        description: "Failed to delete lab request",
        variant: "destructive",
      });
    }
  };



  const defaultDietaryOrder: DietaryOrder = selectedAdmission ? {
    admissionId: selectedAdmission.id.toString(),
    dietType: '',
    allergies: [],
    npoResponse: false,
    activityLevel: '',
    lastUpdated: new Date().toISOString(),
    orderedBy: '',
  } : {
    admissionId: '',
    dietType: '',
    allergies: [],
    npoResponse: false,
    activityLevel: '',
    lastUpdated: new Date().toISOString(),
    orderedBy: '',
  };

  return (
    <div className="h-[calc(100vh-180px)] flex bg-gray-50 overflow-hidden rounded-lg border border-gray-200">
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {!selectedAdmission ? (
            <>
              <div className="p-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Admitted Patients</h2>

                {/* Stats */}
                <div className="flex gap-2 mb-4 text-xs">
                  <div className="flex-1 bg-gray-50 rounded-lg p-3 flex flex-col items-center justify-center min-h-[60px]">
                    <p className="text-gray-500 mb-1">Patients</p>
                    <p className="text-lg font-bold text-gray-900">{admissions.length}</p>
                  </div>
                  <div className="flex-1 bg-red-50 rounded-lg p-3 flex flex-col items-center justify-center min-h-[60px]">
                    <p className="text-red-600 mb-1">Critical</p>
                    <p className="text-lg font-bold text-red-600">{admissions.filter(a => a.status === 'Critical').length}</p>
                  </div>
                  <div className="flex-1 bg-green-50 rounded-lg p-3 flex flex-col items-center justify-center min-h-[60px]">
                    <p className="text-green-600 mb-1">Stable</p>
                    <p className="text-lg font-bold text-green-600">{admissions.filter(a => a.status === 'Stable').length}</p>
                  </div>
                </div>

                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search patients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                <div className="flex gap-2 flex-wrap">
                  {(['all', 'Stable', 'Critical'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${filterStatus === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      {status === 'all' ? 'All' : status}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {filteredAdmissions.map((patient) => (
                  <div
                    key={patient.id}
                    onClick={() => handleSelectAdmission(patient)}
                    className="p-4 border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{patient.patientName}</h3>
                        <p className="text-sm text-gray-500">ID: {patient.id}</p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${patient.status === 'Stable'
                          ? 'bg-green-100 text-green-700'
                          : patient.status === 'Critical'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                          }`}
                      >
                        {patient.status}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <User size={12} />
                        <span>{patient.room}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>Updated: {patient.admissionDate}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="p-4 border-b border-gray-100">
                <button
                  onClick={handleBackToList}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-4 text-sm"
                >
                  <ArrowLeft size={16} />
                  Back to List
                </button>

                <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg p-4 text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <User size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{selectedAdmission.patientName}</h2>
                      <p className="text-sm text-blue-100">Patient ID: {selectedAdmission.id}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-blue-200 text-xs">Room</p>
                      <p className="font-medium">{selectedAdmission.room}</p>
                    </div>
                    <div>
                      <p className="text-blue-200 text-xs">Status</p>
                      <p className="font-medium capitalize">{selectedAdmission.status}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-blue-200 text-xs">Attending Physician</p>
                      <p className="font-medium">{selectedAdmission.attendingPhysician}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-2 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Encounter ID:</span>
                  <span className="font-medium">{selectedAdmission.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Admitted:</span>
                  <span className="font-medium">{selectedAdmission.admissionDate}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ward:</span>
                  <span className="font-medium">{selectedAdmission.ward}</span>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3">
                <CareTeamPanel
                  encounterId={selectedAdmission.id}
                  canManage={(user as any)?.role === 'admin' || (user as any)?.role === 'doctor'}
                />
              </div>
            </>
          )}
        </div>

        {/* Right Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedAdmission ? (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Activity className="text-gray-400" size={48} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a patient to view details</h3>
                <p className="text-gray-600">Choose a patient from the list to access their clinical workspace</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
              <Tabs defaultValue="vitals" className="w-full">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 mb-6 sticky top-0 z-10">
                  <TabsList className="grid w-full grid-cols-5 bg-transparent gap-1">
                    <TabsTrigger
                      value="vitals"
                      className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md transition-all"
                    >
                      Vitals
                    </TabsTrigger>
                    <TabsTrigger
                      value="notes"
                      className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md transition-all"
                    >
                      Clinical Notes
                    </TabsTrigger>
                    <TabsTrigger
                      value="laboratory"
                      className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md transition-all"
                    >
                      Laboratory
                    </TabsTrigger>
                    <TabsTrigger
                      value="medication"
                      className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md transition-all"
                    >
                      Medication
                    </TabsTrigger>
                    <TabsTrigger
                      value="procedures"
                      className="data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md transition-all"
                    >
                      Procedures
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="vitals">
                  <VitalSignsTab
                    vitals={vitals.map(v => ({
                      ...v,
                      heartRate: Number(v.heartRate),
                      respiratoryRate: Number(v.respiratoryRate),
                      temperature: Number(v.temperature),
                      oxygenSaturation: Number(v.oxygenSaturation),
                    }))}
                    onAddVital={handleAddVital}
                    patientId={selectedAdmission.id.toString()}
                  />
                </TabsContent>

                <TabsContent value="notes">
                  <ClinicalNotesTab
                    admissionId={selectedAdmission.id.toString()}
                    patientId={selectedAdmission.patientId}
                    notes={notes}
                    onAddNote={handleAddNote}
                    onDeleteNote={handleDeleteNote}
                  />
                </TabsContent>



                <TabsContent value="laboratory">
                  <LaboratoryTab
                    labRequests={labRequests}
                    currentUserName={(() => {
                      if (!user) return '';
                      const fName = ((user as any)?.firstName || (user as any)?.first_name || '').trim();
                      const lName = ((user as any)?.lastName || (user as any)?.last_name || '').trim();
                      const fullName = fName && lName ? `${fName} ${lName}` : (fName || lName || '');
                      return ((user as any).role === 'doctor' && fullName) ? `Dr. ${fullName}` : fullName;
                    })()}
                    onAddRequest={handleAddLabRequest}
                    onUpdateResult={handleUpdateLabResult}
                    onVerifyRequest={handleVerifyLabRequest}
                    onDeleteRequest={handleDeleteLabRequest}
                    onRefresh={() => {
                      if (selectedAdmission) handleSelectAdmission(selectedAdmission);
                    }}
                  />
                </TabsContent>

                <TabsContent value="medication">
                  <MedicationRequestTab
                    admissionId={selectedAdmission.id.toString()}
                    patientId={selectedAdmission.patientId.toString()}
                  />
                </TabsContent>

                <TabsContent value="procedures">
                  <ProcedureTab
                    procedures={procedures}
                    encounterId={selectedAdmission.id}
                    patientId={selectedAdmission.patientId}
                    onRefresh={handleRefreshProcedures}
                  />
                </TabsContent>

              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Monitoring;
