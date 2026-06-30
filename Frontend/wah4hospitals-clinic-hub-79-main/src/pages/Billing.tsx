import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Receipt, AlertCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import billingService from '@/services/billingService';
import { admissionService } from '@/services/admissionService';

// Components
// import PatientBillPrint from '@/components/billing/PatientBillPrint';
import PatientBillPrint from '@/components/billing/PatientBillPrint';
import { PatientBillingSummary } from '@/components/billing/PatientBillingSummary';
import { PatientSelector } from '@/components/billing/PatientSelector';
// import { BillingForm } from '@/components/billing/BillingForm';

// Types
import type { Patient } from '@/components/billing/types';
import type { Admission } from '@/types/admission';

const Billing = () => {
  const { toast } = useToast();

  // Patient & View State
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [currentView, setCurrentView] = useState<'list' | 'billing' | 'print'>('list');

  // Admitted patients from Admissions module
  const [admittedPatients, setAdmittedPatients] = useState<Admission[]>([]);
  const [showPatientSelector, setShowPatientSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [printingInvoice, setPrintingInvoice] = useState<any | null>(null);

  // Fetch admitted patients on mount
  useEffect(() => {
    fetchAdmittedPatients();
  }, []);

  // Auto-open patient selector if no patient is selected and patients are loaded
  useEffect(() => {
    if (!selectedPatient && admittedPatients.length > 0 && !showPatientSelector && !isLoading) {
      setShowPatientSelector(true);
    }
  }, [admittedPatients, selectedPatient, showPatientSelector, isLoading]);

  const fetchAdmittedPatients = async () => {
    setIsLoading(true);
    try {
      const admissions = await admissionService.getAll();
      const activeAdmissions = admissions.filter((adm: any) =>
        ['active', 'in-progress', 'admitted', 'finished'].includes(adm.status?.toLowerCase())
      );
      setAdmittedPatients(activeAdmissions);
    } catch (err) {
      console.error('Error fetching admitted patients:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load patients."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowPatientSelector(false);
  };

  const handleSaveSuccess = async () => {
    // Refresh summary if needed
    setCurrentView('list');
    toast({
      title: "Success",
      description: "Billing updated successfully.",
    });
  };

  // Print View
  if (currentView === 'print' && selectedPatient && printingInvoice) {
    return (
      <PatientBillPrint
        invoice={printingInvoice}
        patientName={selectedPatient.patientName}
        onClose={() => {
          setCurrentView('list');
          setPrintingInvoice(null);
        }}
      />
    );
  }

  // Main List View

  // Main List View
  return (
    <div className="space-y-6">
      {/* Glass Card Header */}
      <div className="glass-card p-6 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #45017c 0%, #0a9bff 100%)' }}>
              <Receipt className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
              <p className="text-gray-600 mt-0.5">Patient billing management</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Stats in header */}
            {!selectedPatient && (
              <div className="flex gap-3 text-sm text-gray-600">
                <div>
                  <span className="font-semibold text-purple-600">{admittedPatients.length}</span> Patient{admittedPatients.length !== 1 ? 's' : ''}
                </div>
              </div>
            )}

            {selectedPatient && (
              <Button
                variant="outline"
                onClick={() => setSelectedPatient(null)}
                className="gap-2 border-gray-300 hover:bg-gray-100"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Patient Selected - Show Summary and Actions */}
      {selectedPatient && (
        <div className="space-y-6">
          {/* Patient Card - Front and Center */}
          <Card className="border-purple-100 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Patient</div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedPatient.patientName}</h2>
                  <div className="flex gap-3 mt-2 text-sm text-gray-600">
                    <span>ID: {selectedPatient.id}</span>
                    <span>•</span>
                    <span>Room: {selectedPatient.room}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {/* Action buttons can go here */}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Billing Summary */}
          <PatientBillingSummary
            subjectId={selectedPatient.id}
            patientName={selectedPatient.patientName}
            onPrintInvoice={(invoice) => {
              setPrintingInvoice(invoice);
              setCurrentView('print');
            }}
          />
        </div>
      )}

      {/* Patient Selector Modal */}
      {showPatientSelector && (
        <PatientSelector
          show={showPatientSelector}
          onShow={() => setShowPatientSelector(true)}
          admittedPatients={admittedPatients}
          onSelect={handlePatientSelect}
          onCancel={() => setShowPatientSelector(false)}
        />
      )}
    </div>
  );
};

export default Billing;
