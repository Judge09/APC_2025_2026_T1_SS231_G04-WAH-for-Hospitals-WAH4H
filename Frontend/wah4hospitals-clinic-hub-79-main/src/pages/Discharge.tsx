import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserX, FileText, CheckCircle, Search, Filter, X, Plus, AlertTriangle, Users, Download, RefreshCw, Trash2 } from 'lucide-react';
import { PrintButton } from '@/components/ui/PrintButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { DischargeStatusBadge } from '@/components/discharge/DischargeStatusBadge';
import { PendingItemsSection } from '@/components/discharge/PendingItemsSection';
import { DischargedPatientsReport } from '@/components/discharge/DischargedPatientsReport';
import { dischargeService } from '@/services/dischargeService';
import { useToast } from '@/hooks/use-toast';

import {
  DischargeRequirements,
  PendingPatient,
  DischargedPatient,
  DischargeRecord
} from '@/types/discharge';

const Discharge = () => {
  const { toast } = useToast();
  const [pendingDischarges, setPendingDischarges] = useState<PendingPatient[]>([]);
  const [dischargedPatients, setDischargedPatients] = useState<DischargedPatient[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState({
    status: [] as string[],
    department: [] as string[],
    condition: [] as string[]
  });

  const [isDischargeModalOpen, setIsDischargeModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PendingPatient | null>(null);
  const [dischargeForm, setDischargeForm] = useState({
    patientId: '',
    finalDiagnosis: '',
    hospitalStaySummary: '',
    dischargeMedications: '',
    dischargeInstructions: '',
    followUpPlan: '',
    billingStatus: '',
    pendingItems: ''
  });

  const [isAddRecordModalOpen, setIsAddRecordModalOpen] = useState(false);
  const [billingPatients, setBillingPatients] = useState<any[]>([]);
  const [selectedBillingIds, setSelectedBillingIds] = useState<number[]>([]);
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);

  // Load discharge data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch pending discharges
        const pendingData = await dischargeService.getPending();
        setPendingDischarges(pendingData as any);

        // Fetch discharged patients
        const dischargedData = await dischargeService.getDischarged();
        setDischargedPatients(dischargedData as any);
      } catch (error) {
        console.error('Error loading discharge data:', error);
      }
    };

    loadData();
  }, []);

  const handleSyncFromAdmissions = async () => {
    try {
      const result = await dischargeService.syncFromAdmissions();

      if (result.success) {
        toast({
          title: "Sync Successful",
          description: result.message || `Synced ${result.created} patient(s) from admissions`,
        });

        // Reload pending discharges to show newly synced patients
        const pendingData = await dischargeService.getPending();
        setPendingDischarges(pendingData as any);
      } else {
        toast({
          variant: "destructive",
          title: "Sync Failed",
          description: result.error || 'Unknown error'
        });
      }
    } catch (error) {
      console.error('Error syncing from admissions:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to sync from admissions. Please try again."
      });
    }
  };

  const handleRequirementChange = async (patientId: number, requirementKey: string, value: boolean) => {
    try {
      // Find the patient to get current requirements
      const patient = pendingDischarges.find(p => p.id === patientId);
      if (!patient) return;

      // Update requirements
      const updatedRequirements = {
        ...patient.requirements,
        [requirementKey]: value
      };

      // Call API to update
      await dischargeService.updateRequirements(patientId, updatedRequirements);

      // Update local state
      setPendingDischarges(prev => prev.map(p =>
        p.id === patientId
          ? { ...p, requirements: updatedRequirements }
          : p
      ));

      // If this is the selected patient, update it too
      if (selectedPatient?.id === patientId) {
        setSelectedPatient(prev => prev ? { ...prev, requirements: updatedRequirements } : null);
      }
    } catch (error) {
      console.error('Error updating requirement:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update requirement. Please try again."
      });
    }
  };

  const handlePrintDischarge = () => {
  };

  const handleFilterChange = (filterType: string, value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterType]: prev[filterType as keyof typeof prev].includes(value)
        ? prev[filterType as keyof typeof prev].filter(item => item !== value)
        : [...prev[filterType as keyof typeof prev], value]
    }));
  };

  const clearFilters = () => {
    setActiveFilters({
      status: [],
      department: [],
      condition: []
    });
  };

  const handleProcessDischarge = (patient: PendingPatient) => {
    setSelectedPatient(patient);
    setDischargeForm({
      patientId: patient.patient_name,
      finalDiagnosis: '',
      hospitalStaySummary: '',
      dischargeMedications: '',
      dischargeInstructions: '',
      followUpPlan: '',
      billingStatus: 'pending',
      pendingItems: ''
    });
    setIsDischargeModalOpen(true);
  };

  const handleLoadBillingPatients = async () => {
    setIsLoadingBilling(true);
    try {
      const response = await dischargeService.getFromBilling();
      setBillingPatients(response.patients || []);
      setSelectedBillingIds([]);
      setIsAddRecordModalOpen(true);
    } catch (error) {
      console.error('Error loading billing patients:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load patients from billing records. Please try again."
      });
    } finally {
      setIsLoadingBilling(false);
    }
  };

  const handleToggleBillingPatient = (billingId: number) => {
    setSelectedBillingIds(prev =>
      prev.includes(billingId)
        ? prev.filter(id => id !== billingId)
        : [...prev, billingId]
    );
  };

  const handleImportFromBilling = async () => {
    if (selectedBillingIds.length === 0) {
      toast({
        variant: "destructive",
        title: "Selection Required",
        description: "Please select at least one patient to add"
      });
      return;
    }

    setIsLoadingBilling(true);
    try {
      const response = await dischargeService.createFromBilling(selectedBillingIds);

      if (response.errors && response.errors.length > 0) {
        const errorMessages = response.errors.map((err: any) => err.error).join('\n');
        toast({
          variant: "destructive",
          title: "Partial Success",
          description: `Some records could not be added. Successfully added: ${response.created} patient(s)`
        });
      } else {
        toast({
          title: "Import Successful",
          description: `Successfully added ${response.created} patient(s) to discharge queue`
        });
      }

      // Reload pending discharges
      const pendingData = await dischargeService.getPending();
      setPendingDischarges(pendingData);

      setIsAddRecordModalOpen(false);
      setBillingPatients([]);
      setSelectedBillingIds([]);
    } catch (error: any) {
      console.error('Error importing from billing:', error);
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: error?.response?.data?.error || 'Failed to add patients from billing'
      });
    } finally {
      setIsLoadingBilling(false);
    }
  };

  const handleSubmitDischarge = async () => {
    if (!selectedPatient) return;

    if (!dischargeForm.finalDiagnosis || !dischargeForm.hospitalStaySummary) {
      toast({
        variant: "destructive",
        title: "Missing Fields",
        description: "Please fill in all required fields"
      });
      return;
    }

    // Check if all required items are completed
    const allRequiredCompleted = selectedPatient.requirements &&
      selectedPatient.requirements.finalDiagnosis &&
      selectedPatient.requirements.physicianSignature &&
      selectedPatient.requirements.medicationReconciliation &&
      selectedPatient.requirements.dischargeSummary &&
      selectedPatient.requirements.billingClearance;

    if (!allRequiredCompleted) {
      toast({
        variant: "destructive",
        title: "Incomplete Requirements",
        description: "All required discharge items must be completed before final discharge"
      });
      return;
    }

    try {
      // Call backend API to process discharge
      await dischargeService.processDischarge(selectedPatient.id, {
        patientId: selectedPatient.id,
        finalDiagnosis: dischargeForm.finalDiagnosis,
        hospitalStaySummary: dischargeForm.hospitalStaySummary,
        dischargeMedications: dischargeForm.dischargeMedications,
        dischargeInstructions: dischargeForm.dischargeInstructions,
        followUpPlan: dischargeForm.followUpPlan,
        billingStatus: dischargeForm.billingStatus,
        pendingItems: dischargeForm.pendingItems
      });

      toast({
        title: "Discharge Completed",
        description: `Discharge completed successfully for ${selectedPatient.patient_name}`,
      });

      // Reload data
      const pendingData = await dischargeService.getPending();
      setPendingDischarges(pendingData as any);

      const dischargedData = await dischargeService.getDischarged();
      setDischargedPatients(dischargedData as any);

      setIsDischargeModalOpen(false);
      setSelectedPatient(null);
      setDischargeForm({
        patientId: '',
        finalDiagnosis: '',
        hospitalStaySummary: '',
        dischargeMedications: '',
        dischargeInstructions: '',
        followUpPlan: '',
        billingStatus: '',
        pendingItems: ''
      });
    } catch (error) {
      console.error('Error processing discharge:', error);
      toast({
        variant: "destructive",
        title: "Discharge Failed",
        description: "Failed to process discharge. Please try again."
      });
    }
  };

  const canPrint = () => {
    return dischargedPatients.length > 0;
  };

  const filteredDischarges = pendingDischarges.filter(patient => {
    const matchesSearch =
      (patient.patient_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.room || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.condition || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.status || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.physician_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.department || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = activeFilters.status.length === 0 || activeFilters.status.includes(patient.status);
    const matchesDepartment = activeFilters.department.length === 0 || activeFilters.department.includes(patient.department);
    const matchesCondition = activeFilters.condition.length === 0 || activeFilters.condition.includes(patient.condition);

    return matchesSearch && matchesStatus && matchesDepartment && matchesCondition;
  });

  const handleDeleteDischarge = async (id: number) => {
    try {
      await dischargeService.delete(id);

      // Reload data
      const pendingData = await dischargeService.getPending();
      setPendingDischarges(pendingData as any);

      const dischargedData = await dischargeService.getDischarged();
      setDischargedPatients(dischargedData as any);

      toast({
        title: "Success",
        description: "Discharge record deleted successfully."
      });
    } catch (error) {
      console.error('Error deleting discharge record:', error);
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: "Failed to delete discharge record. Please try again."
      });
    }
  };

  const hasActiveFilters = Object.values(activeFilters).some(filter => filter.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Patient Discharge Management</h1>
          <p className="text-muted-foreground">Manage patient discharge procedures with comprehensive status tracking</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={handleSyncFromAdmissions}
            className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Module
          </Button>

        </div>
      </div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 h-auto">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Active Discharges
          </TabsTrigger>
          <TabsTrigger value="discharged" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Discharged Patients ({dischargedPatients.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                    <UserX className="w-6 h-6 text-destructive" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Pending Discharges</p>
                    <p className="text-2xl font-bold text-foreground">{pendingDischarges.filter(p => p.status === 'pending').length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Ready for Discharge</p>
                    <p className="text-2xl font-bold text-foreground">{pendingDischarges.filter(p => p.status === 'ready').length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Patients</p>
                    <p className="text-2xl font-bold text-foreground">{pendingDischarges.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <CardTitle>Active Discharge Queue</CardTitle>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                      <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          placeholder="Search patients, room, condition..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 w-full"
                        />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full sm:w-auto">
                            <Filter className="w-4 h-4 mr-2" />
                            Filter
                            {hasActiveFilters && (
                              <Badge className="ml-2 bg-primary/10 text-primary text-xs">
                                {Object.values(activeFilters).flat().length}
                              </Badge>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-popover">
                          <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                          <DropdownMenuCheckboxItem
                            checked={activeFilters.status.includes('ready')}
                            onCheckedChange={() => handleFilterChange('status', 'ready')}
                          >
                            Ready for Discharge
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem
                            checked={activeFilters.status.includes('pending')}
                            onCheckedChange={() => handleFilterChange('status', 'pending')}
                          >
                            Pending Clearance
                          </DropdownMenuCheckboxItem>
                          {hasActiveFilters && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={clearFilters} className="text-destructive">
                                <X className="w-4 h-4 mr-2" />
                                Clear All Filters
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredDischarges.map((patient) => (
                      <div key={patient.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-lg">{patient.patient_name}</h3>
                          <DischargeStatusBadge status={patient.status} />
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
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="destructive" size="sm"
                            onClick={() => {
                              if (confirm('Delete this discharge record?')) handleDeleteDischarge(patient.id);
                            }}
                          >
                            Remove
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleProcessDischarge(patient)}
                            className="bg-primary hover:bg-primary/90"
                          >
                            {patient.status === 'ready' ? 'Complete Discharge' : 'Review & Update'}
                          </Button>
                        </div>
                      </div>
                    ))}
                    {filteredDischarges.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No discharge records found matching your criteria.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              {selectedPatient && (
                <PendingItemsSection
                  requirements={selectedPatient.requirements}
                  onRequirementChange={(key, value) => handleRequirementChange(selectedPatient.id, key, value)}
                  className="mb-6"
                />
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      const readyPatients = pendingDischarges.filter(p => p.status === 'ready');
                      if (readyPatients.length > 0) {
                        handleProcessDischarge(readyPatients[0]);
                      }
                    }}
                    disabled={pendingDischarges.filter(p => p.status === 'ready').length === 0}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Process Next Ready Patient
                  </Button>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Printing is only available for fully discharged patients in the "Discharged Patients" tab.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="discharged" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{dischargedPatients.length}</p>
                  <p className="text-sm text-muted-foreground">Total Discharged</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {pendingDischarges.filter(p => p.status === 'pending').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Pending Items</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {dischargedPatients.filter(p => p.follow_up_required).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Follow-up Required</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {Math.round((dischargedPatients.length / (dischargedPatients.length + pendingDischarges.length)) * 100) || 0}%
                  </p>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                </div>
              </CardContent>
            </Card>
          </div>
          <DischargedPatientsReport dischargedPatients={dischargedPatients} onDelete={handleDeleteDischarge} />
        </TabsContent>
      </Tabs>

      {/* Discharge Process Modal */}
      <Dialog open={isDischargeModalOpen} onOpenChange={setIsDischargeModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Process Discharge - {selectedPatient?.patient_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {selectedPatient && (
              <PendingItemsSection
                requirements={selectedPatient.requirements}
                onRequirementChange={(key, value) => handleRequirementChange(selectedPatient.id, key, value)}
                className="mb-6"
              />
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="finalDiagnosis">Final Diagnosis *</Label>
                <Textarea
                  id="finalDiagnosis"
                  value={dischargeForm.finalDiagnosis}
                  onChange={(e) => setDischargeForm({ ...dischargeForm, finalDiagnosis: e.target.value })}
                  placeholder="Enter the final diagnosis..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hospitalStaySummary">Summary of Hospital Stay *</Label>
                <Textarea
                  id="hospitalStaySummary"
                  value={dischargeForm.hospitalStaySummary}
                  onChange={(e) => setDischargeForm({ ...dischargeForm, hospitalStaySummary: e.target.value })}
                  placeholder="Provide a comprehensive summary of the patient's hospital stay..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="followUpPlan">Follow-Up Plan</Label>
                <Textarea
                  id="followUpPlan"
                  value={dischargeForm.followUpPlan}
                  onChange={(e) => setDischargeForm({ ...dischargeForm, followUpPlan: e.target.value })}
                  placeholder="Specify follow-up appointments, tests, or procedures needed..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setIsDischargeModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitDischarge} className="bg-primary hover:bg-primary/90">
                Complete Discharge
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add New Discharge Record Modal - Import from Billing */}
      <Dialog open={isAddRecordModalOpen} onOpenChange={setIsAddRecordModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Discharge Record from Billing</DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Select patients from existing billing records to create discharge records
            </p>
          </DialogHeader>
          <div className="space-y-6">
            <Alert>
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm">
                Select patients below to add them to the discharge queue for processing
              </AlertDescription>
            </Alert>

            {billingPatients.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No patients available</p>
                <p className="text-sm text-muted-foreground mt-2">
                  All billing records have been added to discharge queue
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b">
                  <span className="text-sm font-medium">
                    {billingPatients.length} patient(s) available | {selectedBillingIds.length} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedBillingIds.length === billingPatients.length) {
                        setSelectedBillingIds([]);
                      } else {
                        setSelectedBillingIds(billingPatients.map(p => p.billing_id));
                      }
                    }}
                  >
                    {selectedBillingIds.length === billingPatients.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2">
                  {billingPatients.map((patient) => (
                    <div
                      key={patient.billing_id}
                      className={`flex items-start p-4 border-2 rounded-lg transition-all cursor-pointer ${selectedBillingIds.includes(patient.billing_id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        }`}
                      onClick={() => handleToggleBillingPatient(patient.billing_id)}
                    >
                      <div className="flex items-start gap-4 flex-1">
                        <Checkbox
                          checked={selectedBillingIds.includes(patient.billing_id)}
                          onCheckedChange={() => handleToggleBillingPatient(patient.billing_id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-base">{patient.patient_name}</h4>
                            <Badge variant="outline" className="text-xs">
                              ID: {patient.hospital_id}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Room:</span>
                              <span className="ml-2 font-medium">{patient.room}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Age:</span>
                              <span className="ml-2 font-medium">{patient.age} years</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Department:</span>
                              <span className="ml-2 font-medium">{patient.department}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Admission:</span>
                              <span className="ml-2 font-medium">{patient.admission_date}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Physician:</span>
                              <span className="ml-2 font-medium">{patient.physician_name || patient.physician || patient.attending_physician}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Condition:</span>
                              <span className="ml-2 font-medium">{patient.condition}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddRecordModalOpen(false);
                  setBillingPatients([]);
                  setSelectedBillingIds([]);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleImportFromBilling}
                disabled={selectedBillingIds.length === 0 || isLoadingBilling}
                className="bg-primary hover:bg-primary/90"
              >
                {isLoadingBilling ? (
                  <>Processing...</>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Add {selectedBillingIds.length} Record{selectedBillingIds.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Discharge;