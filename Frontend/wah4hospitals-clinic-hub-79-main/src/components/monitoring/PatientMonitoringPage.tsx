import React from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User } from 'lucide-react';
import { MonitoringAdmission, VitalSign, ClinicalNote, DietaryOrder, HistoryEvent, LabRequest, LabResult } from '../../types/monitoring';

import { VitalSignsTab } from './VitalSignsTab';
import { ClinicalNotesTab } from './ClinicalNotesTab';
import { DietaryTab } from './DietaryTab';
import { HistoryTab } from './HistoryTab';
import { MedicationRequestTab } from './MedicationRequestTab';
import { LaboratoryTab } from './LaboratoryTab';

interface PatientMonitoringPageProps {
    patient: MonitoringAdmission;
    vitals: VitalSign[];
    notes: ClinicalNote[];
    history: HistoryEvent[];
    labRequests: LabRequest[];
    dietaryOrder?: DietaryOrder;
    onBack: () => void;
    onAddVital: (v: VitalSign) => void;
    onAddNote: (n: ClinicalNote) => void;
    onUpdateDietary: (d: DietaryOrder) => void;
    onAddLabRequest: (request: Omit<LabRequest, 'id'>) => void;
    onUpdateLabResult: (requestId: string, result: LabResult) => void;
}

export const PatientMonitoringPage: React.FC<PatientMonitoringPageProps> = ({
    patient,
    vitals,
    notes,
    history,
    labRequests,
    dietaryOrder,
    onBack,
    onAddVital,
    onAddNote,
    onUpdateDietary,
    onAddLabRequest,
    onUpdateLabResult,
}) => {
    const defaultDietaryOrder: DietaryOrder = {
        admissionId: patient.id.toString(),
        dietType: '',
        allergies: [],
        npoResponse: false,
        activityLevel: '',
        lastUpdated: new Date().toISOString(),
        orderedBy: '',
    };

    return (
        <div className="space-y-6 pb-8">
            {/* Enhanced Patient Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={onBack}
                            className="bg-white/20 hover:bg-white/30 border-white/30 text-white backdrop-blur-sm"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 border border-white/30">
                                    <User className="w-6 h-6" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold">{patient.patientName}</h1>
                                    <p className="text-blue-100 text-sm mt-1">Patient ID: {patient.id}</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-4 mt-4 text-sm">
                                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                                    <span className="text-blue-100 text-xs font-medium">Room</span>
                                    <p className="font-semibold text-lg">{patient.room}</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                                    <span className="text-blue-100 text-xs font-medium">Attending Physician</span>
                                    <p className="font-semibold">Dr. {patient.doctorName}</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                                    <span className="text-blue-100 text-xs font-medium">Assigned Nurse</span>
                                    <p className="font-semibold">{patient.nurseName || 'Unassigned'}</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                                    <span className="text-blue-100 text-xs font-medium">Status</span>
                                    <p className="font-semibold">{patient.status}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Enhanced Tabs */}
            <Tabs defaultValue="vitals" className="w-full">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1">
                    <TabsList className="grid w-full grid-cols-6 bg-transparent gap-1">
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
                            value="dietary"
                            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md transition-all"
                        >
                            Dietary
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
                            value="history"
                            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md transition-all"
                        >
                            History
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="vitals" className="mt-6">
                    <VitalSignsTab
                        vitals={vitals.map(v => ({
                            ...v,
                            heartRate: Number(v.heartRate),
                            respiratoryRate: Number(v.respiratoryRate),
                            temperature: Number(v.temperature),
                            oxygenSaturation: Number(v.oxygenSaturation),
                        }))}
                        onAddVital={onAddVital}
                        patientId={patient.id.toString()}
                    />
                </TabsContent>

                <TabsContent value="notes" className="mt-6">
                    <ClinicalNotesTab
                        admissionId={patient.id.toString()}
                        patientId={patient.patientId}
                        notes={notes}
                        onAddNote={onAddNote}
                    />
                </TabsContent>

                <TabsContent value="dietary" className="mt-6">
                    <DietaryTab
                        admissionId={patient.id.toString()}
                        patientId={patient.patientId}
                        order={dietaryOrder ?? defaultDietaryOrder}
                        onSaved={onUpdateDietary}
                    />
                </TabsContent>

                <TabsContent value="laboratory" className="mt-6">
                    <LaboratoryTab
                        labRequests={labRequests}
                        patientName={patient.patientName}
                        patientId={patient.patientId.toString()}
                        onAddRequest={onAddLabRequest}
                        onUpdateResult={onUpdateLabResult}
                    />
                </TabsContent>

                <TabsContent value="medication" className="mt-6">
                    <MedicationRequestTab admissionId={patient.id.toString()} patientId={patient.patientId.toString()} />
                </TabsContent>

                <TabsContent value="history" className="mt-6">
                    <HistoryTab events={history} />
                </TabsContent>
            </Tabs>
        </div>
    );
};
