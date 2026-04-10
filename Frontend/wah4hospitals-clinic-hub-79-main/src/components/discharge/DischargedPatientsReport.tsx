import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PrintButton } from '@/components/ui/PrintButton';
import { DischargeStatusBadge } from './DischargeStatusBadge';
import { Search, Calendar, FileText, User, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

import { DischargedPatient } from '@/types/discharge';

interface DischargedPatientsReportProps {
  dischargedPatients: DischargedPatient[];
  onDelete?: (id: number) => void;
}

export const DischargedPatientsReport: React.FC<DischargedPatientsReportProps> = ({
  dischargedPatients,
  onDelete
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<DischargedPatient | null>(null);

  const handlePrintReport = () => {
  };

  const handlePrintPatientPacket = (patient: DischargedPatient) => {
  };

  const filteredPatients = dischargedPatients.filter(patient =>
    (patient.patient_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (patient.room || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (patient.condition || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (patient.physician_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (patient.department || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-600" />
                Discharged Patients Report
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Patients who have been fully discharged - Print access available
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              Individual patient print options available below
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search discharged patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div id="printable-content" className="space-y-4">
            <div className="print-header no-print">
              <h2 className="text-xl font-semibold mb-4">Discharged Patients Summary</h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm text-green-600 font-medium">Total Discharged</p>
                      <p className="text-2xl font-bold text-green-800">{dischargedPatients.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-yellow-600" />
                    <div>
                      <p className="text-sm text-yellow-600 font-medium">Follow-up Required</p>
                      <p className="text-2xl font-bold text-yellow-800">
                        {dischargedPatients.filter(p => p.follow_up_required).length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {filteredPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="flex items-center justify-between p-4 border border-green-200 rounded-lg bg-green-50/30"
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">{patient.patient_name}</h3>
                      <DischargeStatusBadge status="discharged" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium text-foreground">Room:</span> {patient.room}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Condition:</span> {patient.condition}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Department:</span> {patient.department}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Physician:</span> {patient.physician_name}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Admitted:</span> {patient.admission_date}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Discharged:</span> {patient.discharge_date ? format(new Date(patient.discharge_date), 'PPpp') : 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Age:</span> 
                        {(() => {
                          let displayAge: string | number = patient.age;
                          if (patient.birthdate) {
                            displayAge = Math.floor((new Date().getTime() - new Date(patient.birthdate).getTime()) / 31557600000);
                          }
                          // If age is 0 and we don't have a birthdate, treat as N/A (missing data)
                          // If we DO have a birthdate, 0 is a valid age (newborn)
                          if ((displayAge === 0 || displayAge === "0") && !patient.birthdate) {
                            return "N/A";
                          }
                          return displayAge;
                        })()}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Follow-up:</span>
                        <span className={patient.follow_up_required ? 'text-yellow-600' : 'text-green-600'}>
                          {patient.follow_up_required ? ' Required' : ' Not Required'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 no-print flex items-center gap-2">
                    <PrintButton
                      onPrint={() => handlePrintPatientPacket(patient)}
                      className="bg-primary hover:bg-primary/90"
                      printData={patient}
                      printType="discharge-packet"
                    >
                      Print Discharge Packet
                    </PrintButton>
                    {onDelete && (
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this discharge record?')) {
                            onDelete(patient.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {filteredPatients.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ?
                  'No discharged patients found matching your search.' :
                  'No patients have been discharged yet.'
                }
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};