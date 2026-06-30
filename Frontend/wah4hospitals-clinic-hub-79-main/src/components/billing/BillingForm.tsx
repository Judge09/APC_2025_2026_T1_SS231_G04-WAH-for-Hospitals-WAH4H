import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Receipt, Save, RefreshCw, Plus, Trash2, CheckCircle, AlertCircle, FileText, Printer } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { DiscountCheckboxGroup, DiscountType } from './DiscountCheckboxGroup';
import { Patient, BillingRecord, MedicineItem, DiagnosticItem } from './types';
import billingService, { BillingRecord as APIBillingRecord } from '@/services/billingService';
import { convertAPIToLocal, convertLocalToAPI } from './utils';

interface BillingFormProps {
    patient: Patient;
    onSaveSuccess: () => void;
    onCancel: () => void;
    onPrint: () => void;
}

export const BillingForm: React.FC<BillingFormProps> = ({
    patient,
    onSaveSuccess,
    onCancel,
    onPrint
}) => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [patientName, setPatientName] = useState('');
    const [hospitalId, setHospitalId] = useState('');
    const [admissionDate, setAdmissionDate] = useState('');
    const [dischargeDate, setDischargeDate] = useState('');
    const [roomWard, setRoomWard] = useState('');

    const [roomType, setRoomType] = useState('');
    const [numberOfDays, setNumberOfDays] = useState(0);
    const [ratePerDay, setRatePerDay] = useState(0);

    const [attendingPhysicianFee, setAttendingPhysicianFee] = useState(0);
    const [specialistFee, setSpecialistFee] = useState(0);
    const [surgeonFee, setSurgeonFee] = useState(0);
    const [otherProfessionalFees, setOtherProfessionalFees] = useState(0);

    const [dietType, setDietType] = useState('');
    const [mealsPerDay, setMealsPerDay] = useState(0);
    const [dietDuration, setDietDuration] = useState(0);
    const [costPerMeal, setCostPerMeal] = useState(0);

    const [suppliesCharge, setSuppliesCharge] = useState(0);
    const [procedureCharge, setProcedureCharge] = useState(0);
    const [nursingCharge, setNursingCharge] = useState(0);
    const [miscellaneousCharge, setMiscellaneousCharge] = useState(0);

    const [discount, setDiscount] = useState(0);
    const [philhealthCoverage, setPhilhealthCoverage] = useState(0);

    const [selectedDiscount, setSelectedDiscount] = useState<DiscountType>(null);

    // Derived values for backward compatibility
    const isSenior = selectedDiscount === 'senior';
    const isPWD = selectedDiscount === 'pwd';
    const isPhilHealthMember = selectedDiscount === 'philhealth';

    // Calculation derived state
    const totalRoomCharge = numberOfDays * ratePerDay;
    const totalProfessionalFees = attendingPhysicianFee + specialistFee + surgeonFee + otherProfessionalFees;
    const totalDietaryCharge = mealsPerDay * dietDuration * costPerMeal;

    const subtotal = totalRoomCharge + totalProfessionalFees +
        totalDietaryCharge + suppliesCharge +
        procedureCharge + nursingCharge + miscellaneousCharge;

    const outOfPocketTotal = subtotal - discount - philhealthCoverage;

    // Load data when patient changes
    useEffect(() => {
        const loadPatientData = async () => {
            // Initialize new
            // Default fields from patient prop
            setHospitalId(patient.id.toString());
            setPatientName(patient.patientName);
            setAdmissionDate(patient.admissionDate);
            setDischargeDate(patient.dischargeDate || '');
            setRoomWard(patient.room);

            // Calculate days
            const startDate = new Date(patient.admissionDate);
            const endDate = patient.dischargeDate ? new Date(patient.dischargeDate) : new Date();
            if (!isNaN(startDate.getTime())) {
                const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
                setNumberOfDays(days > 0 ? days : 1);
            }

            // Default Fees & Room
            // We'd need more logic here if we want to infer Room Type from the string "room"
            // For now, implementing basic defaults
            if (patient.room.toLowerCase().includes('private')) {
                setRoomType('Private');
                setRatePerDay(3000);
            } else if (patient.room.toLowerCase().includes('semi')) {
                setRoomType('Semi-Private');
                setRatePerDay(2000);
            } else {
                setRoomType('Ward');
                setRatePerDay(1500);
            }

            // Diet defaults
            setDietType('Regular');
            setMealsPerDay(3);
            setDietDuration(numberOfDays || 1);
            setCostPerMeal(150);
        };

        loadPatientData();
    }, [patient]);

    // Discount auto-calculation
    useEffect(() => {
        let newDiscount = 0;
        const vatableAmount = totalRoomCharge + totalProfessionalFees;

        if (selectedDiscount === 'senior' || selectedDiscount === 'pwd') {
            newDiscount = vatableAmount * 0.20;
        }
        setDiscount(newDiscount);
    }, [selectedDiscount, totalRoomCharge, totalProfessionalFees]);


    const handleSaveBill = async () => {
        if (!patient.id || patient.id === 0) {
            toast({
                variant: 'destructive',
                title: 'Data Error',
                description: 'Invalid Patient ID. Cannot proceed with billing. Please select a patient with valid data.',
            });
            return;
        }

        if (!patientName || !hospitalId || !admissionDate) {
            toast({
                variant: 'destructive',
                title: 'Validation Error',
                description: 'Please fill in all required patient information fields.',
            });
            return;
        }

        if (!dischargeDate) {
            toast({
                variant: 'destructive',
                title: 'Validation Error',
                description: 'Discharge date is required. Please enter the patient discharge date.',
            });
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const record: Partial<BillingRecord> = {
                patientId: patient.id,
                patientName, hospitalId, admissionDate, dischargeDate, roomWard,
                roomType, numberOfDays, ratePerDay,
                attendingPhysicianFee, specialistFee, surgeonFee, otherProfessionalFees,
                medicines: [], // No manual meds
                dietType, mealsPerDay, dietDuration, costPerMeal,
                diagnostics: [], // No manual diagnostics
                suppliesCharge, procedureCharge, nursingCharge, miscellaneousCharge,
                discount, philhealthCoverage
            };

            const apiData = convertLocalToAPI(record, selectedDiscount);

            // Always create new or update based on backend logic (handled by service)
            // But since we removed existingBilling logic, checking against patient's existing bill via API might be needed
            // OR we just create a new record which backend might merge/update.
            // For now, let's assume create works for "Save Draft" equivalent.
            // Ideally we should check if one exists via getByPatient.

            const created = await billingService.create(apiData);
            toast({ title: 'Success', description: 'Charges updated successfully.' });
            onSaveSuccess();

        } catch (err: any) {
            console.error('Error saving billing record:', err);
            let errorMessage = 'Failed to save billing record.';
            if (err.response?.data) {
                const errors = err.response.data;
                if (typeof errors === 'object') {
                    errorMessage += " " + Object.entries(errors).map(([k, v]) => `${k}: ${v}`).join(', ');
                } else {
                    errorMessage += " " + errors;
                }
            }
            setError(errorMessage);
            toast({ variant: 'destructive', title: 'Error', description: errorMessage });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100 sticky top-0 z-10">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Receipt className="w-6 h-6 text-primary" />
                            Manage Room & Professional Fees
                        </h2>
                    </div>
                    <p className="text-gray-500">
                        Add manual charges for this patient
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button onClick={handleSaveBill} disabled={isLoading} className="bg-primary hover:bg-primary/90">
                        <Save className="w-4 h-4 mr-2" />
                        {isLoading ? 'Saving...' : 'Save Charges'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Patient Info & Professional Fees */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Patient Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="patientName">Patient Name</Label>
                                <Input id="patientName" value={patientName} onChange={e => setPatientName(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="hospitalId">Hospital ID</Label>
                                    <Input id="hospitalId" value={hospitalId} onChange={e => setHospitalId(e.target.value)} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="roomWard">Room/Ward</Label>
                                    <Input id="roomWard" value={roomWard} onChange={e => setRoomWard(e.target.value)} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="admissionDate">Admission Date</Label>
                                    <Input id="admissionDate" type="date" value={admissionDate} onChange={e => setAdmissionDate(e.target.value)} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="dischargeDate">Discharge Date</Label>
                                    <Input id="dischargeDate" type="date" value={dischargeDate} onChange={e => setDischargeDate(e.target.value)} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Room Charges</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Room Type</Label>
                                    <Select value={roomType} onValueChange={setRoomType}>
                                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Ward">Ward</SelectItem>
                                            <SelectItem value="Semi-Private">Semi-Private</SelectItem>
                                            <SelectItem value="Private">Private</SelectItem>
                                            <SelectItem value="Suite">Suite</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>No. of Days</Label>
                                    <Input type="number" value={numberOfDays} onChange={e => setNumberOfDays(Number(e.target.value))} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Rate per Day</Label>
                                    <Input type="number" value={ratePerDay} onChange={e => setRatePerDay(Number(e.target.value))} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Total</Label>
                                    <div className="p-2 bg-gray-100 rounded text-right font-medium">
                                        PHP {totalRoomCharge.toFixed(2)}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="text-lg">Professional Fees</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label>Attending Physician</Label>
                                <Input type="number" value={attendingPhysicianFee} onChange={e => setAttendingPhysicianFee(Number(e.target.value))} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Specialist</Label>
                                <Input type="number" value={specialistFee} onChange={e => setSpecialistFee(Number(e.target.value))} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Surgeon</Label>
                                <Input type="number" value={surgeonFee} onChange={e => setSurgeonFee(Number(e.target.value))} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Other Fees</Label>
                                <Input type="number" value={otherProfessionalFees} onChange={e => setOtherProfessionalFees(Number(e.target.value))} />
                            </div>
                            <div className="pt-2 border-t flex justify-between font-medium">
                                <span>Total PF:</span>
                                <span>PHP {totalProfessionalFees.toFixed(2)}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Other Charges & Summary */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle className="text-lg">Other Charges</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <Label>Dietary</Label>
                                    <div className="flex gap-2">
                                        <Input placeholder="Type" value={dietType} onChange={e => setDietType(e.target.value)} className="w-1/3" />
                                        <Input type="number" placeholder="Meals/Day" value={mealsPerDay} onChange={e => setMealsPerDay(Number(e.target.value))} className="w-1/4" />
                                        <Input type="number" placeholder="Cost" value={costPerMeal} onChange={e => setCostPerMeal(Number(e.target.value))} className="w-1/3" />
                                    </div>
                                    <div className="text-xs text-right mt-1 text-gray-500">Total: {totalDietaryCharge.toFixed(2)}</div>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Supplies</Label>
                                    <Input type="number" value={suppliesCharge} onChange={e => setSuppliesCharge(Number(e.target.value))} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Procedures</Label>
                                    <Input type="number" value={procedureCharge} onChange={e => setProcedureCharge(Number(e.target.value))} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Nursing</Label>
                                    <Input type="number" value={nursingCharge} onChange={e => setNursingCharge(Number(e.target.value))} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Misc</Label>
                                    <Input type="number" value={miscellaneousCharge} onChange={e => setMiscellaneousCharge(Number(e.target.value))} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-50 border-slate-200">
                        <CardHeader><CardTitle className="text-lg">Provisional Summary</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <DiscountCheckboxGroup selectedDiscount={selectedDiscount} onDiscountChange={setSelectedDiscount} />
                            </div>

                            <div className="space-y-2 pt-4 border-t border-slate-200">
                                <div className="flex justify-between">
                                    <span>Subtotal (Room/PF/Misc)</span>
                                    <span>{subtotal.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</span>
                                </div>
                                <div className="flex justify-between items-center text-red-600">
                                    <span>Discount</span>
                                    <div className="w-32">
                                        <Input type="number" className="h-8 text-right" value={discount} onChange={e => setDiscount(Number(e.target.value))} />
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-blue-600">
                                    <span>PhilHealth</span>
                                    <div className="w-32">
                                        <Input type="number" className="h-8 text-right" value={philhealthCoverage} onChange={e => setPhilhealthCoverage(Number(e.target.value))} />
                                    </div>
                                </div>
                                <Separator className="my-2" />
                                <div className="flex justify-between font-bold text-xl">
                                    <span>Total (This Session)</span>
                                    <span>{Math.max(0, outOfPocketTotal).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</span>
                                </div>
                            </div>
                            <Alert className="mt-4 bg-blue-50 text-blue-800 border-blue-200">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Note: Pharmacy and Lab charges are automatically added to the final invoice and are not shown here.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};
