import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users } from 'lucide-react';
import { Patient } from './types';
import { Admission } from '@/types/admission';

interface PatientSelectorProps {
    show: boolean;
    admittedPatients: Admission[];
    onSelect: (patient: Patient) => void;
    onCancel: () => void;
    onShow: () => void;
}

export const PatientSelector: React.FC<PatientSelectorProps> = ({
    show,
    admittedPatients,
    onSelect,
    onCancel,
    onShow
}) => {
    if (!show) {
        return (
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Billing Management</CardTitle>
                        <Button
                            onClick={onShow}
                            className="flex items-center gap-2"
                        >
                            <Users className="w-4 h-4" />
                            Create New Bill
                        </Button>
                    </div>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="border-b">
                <CardTitle className="text-xl">Select Patient for Billing</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {admittedPatients.length === 0 ? (
                        <Alert>
                            <AlertDescription>
                                No admitted patients found. Patients must be admitted first before creating a bill.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        admittedPatients.map((admission: Admission, index: number) => {
                            const patientName = admission.patientName || 'Unknown Patient';



                            // Helper to construct Patient object alignment
                            const constructPatient = (): Patient => {
                                // Extract Subject ID (Patient ID)
                                const patientId = typeof admission.subject_id === 'number' ? admission.subject_id :
                                    (admission.patientId ? parseInt(admission.patientId) : 0);

                                return {
                                    id: patientId,
                                    patientName: patientName,
                                    room: `${admission.location?.ward || ''} ${admission.location?.room || ''}`.trim() || 'N/A',
                                    admissionDate: admission.admissionDate || '',
                                    dischargeDate: admission.dischargeDate || undefined,
                                    condition: admission.reasonForAdmission || '',
                                    physician: admission.physician || '',
                                    department: admission.serviceType || '',
                                    age: 0, // Age not in basic list, fetched in summary details
                                    status: 'ready' as const
                                };
                            };


                            return (
                                <div
                                    key={admission.id || admission.encounter_id || index}
                                    className="flex items-center justify-between p-4 border rounded-lg transition-colors hover:bg-blue-50 hover:border-blue-300 cursor-pointer"
                                    onClick={() => {
                                        const p = constructPatient();
                                        onSelect(p);
                                    }}
                                >
                                    <div>
                                        <p className="font-bold text-lg">{patientName}</p>
                                        <div className="text-sm text-gray-500 space-y-1">
                                            <p className="flex items-center gap-1">
                                                <span className="font-medium">Admitted:</span> {admission.admissionDate || 'N/A'}
                                                {admission.dischargeDate && ` • Discharged: ${admission.dischargeDate}`}
                                            </p>
                                            <p className="flex items-center gap-1">
                                                <span className="font-medium">Diagnosis:</span> {admission.reasonForAdmission || 'N/A'}
                                            </p>
                                            <p className="flex items-center gap-1">
                                                <span className="font-medium">Room:</span> {`${admission.location?.ward || ''} ${admission.location?.room || ''}`.trim() || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
