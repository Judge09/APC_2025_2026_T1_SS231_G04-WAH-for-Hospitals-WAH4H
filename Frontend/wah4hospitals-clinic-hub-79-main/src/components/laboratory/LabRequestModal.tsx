import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, X, Check, ChevronsUpDown } from 'lucide-react';
import { LabTestType, LabPriority, LabRequestFormData } from '../../types/laboratory';
import { admissionService } from '../../services/admissionService';
import type { Admission } from '@/types/admission';
import { cn } from "@/lib/utils";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface LabRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: LabRequestFormData) => void;
}

export const LabRequestModal: React.FC<LabRequestModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [admissions, setAdmissions] = useState<Admission[]>([]);
    const [loadingAdmissions, setLoadingAdmissions] = useState(false);
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        admission: '',
        requesting_doctor: '',
        test_type: 'cbc' as LabTestType,
        clinical_reason: '',
        priority: 'routine' as LabPriority,
    });

    useEffect(() => {
        if (isOpen) {
            fetchAdmissions();
        }
    }, [isOpen]);

    const fetchAdmissions = async () => {
        try {
            setLoadingAdmissions(true);
            const data = await admissionService.getAll();
            // Filter only active admissions (case sensitive check or status check)
            const activeAdmissions = data.filter(a => a.status === 'in-progress' || a.status === 'active');
            setAdmissions(activeAdmissions);
        } catch (error) {
            console.error('Error fetching admissions:', error);
        } finally {
            setLoadingAdmissions(false);
        }
    };

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Find selected admission to get subject_id
        const selected = admissions.find(a => a.encounter_id === parseInt(formData.admission));

        const requestData = {
            subject_id: selected?.subject_id || 0,
            admission: parseInt(formData.admission),
            requesting_doctor: parseInt(formData.requesting_doctor) || 1, // Default to 1 for MVP
            test_type: formData.test_type,
            priority: formData.priority,
            clinical_reason: formData.clinical_reason
        };

        onSubmit(requestData);
        onClose();

        // Reset form
        setFormData({
            admission: '',
            requesting_doctor: '',
            test_type: 'cbc',
            clinical_reason: '',
            priority: 'routine',
        });
    };

    const selectedAdmission = admissions.find(a => a.encounter_id?.toString() === formData.admission);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-lg w-full">
                <div className="flex justify-between items-center p-6 border-b">
                    <h3 className="text-xl font-bold">New Laboratory Request</h3>
                    <Button variant="ghost" size="sm" onClick={onClose}><X className="w-5 h-5" /></Button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Select Patient (Admission) *</label>
                        {loadingAdmissions ? (
                            <div className="text-sm text-gray-500">Loading admissions...</div>
                        ) : (
                            <Popover open={open} onOpenChange={setOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={open}
                                        className="w-full justify-between"
                                    >
                                        {formData.admission
                                            ? admissions.find((a) => a.encounter_id.toString() === formData.admission)?.patient_summary
                                                ? `${admissions.find((a) => a.encounter_id.toString() === formData.admission)?.patient_summary?.last_name}, ${admissions.find((a) => a.encounter_id.toString() === formData.admission)?.patient_summary?.first_name} - ${admissions.find((a) => a.encounter_id.toString() === formData.admission)?.identifier}`
                                                : "Selected Patient"
                                            : "Select an admitted patient..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[450px] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search patient name or ID..." />
                                        <CommandList>
                                            <CommandEmpty>No patient found.</CommandEmpty>
                                            <CommandGroup>
                                                {admissions.map((admission) => (
                                                    <CommandItem
                                                        key={admission.encounter_id}
                                                        value={`${admission.patient_summary?.last_name || ''} ${admission.patient_summary?.first_name || ''} ${admission.identifier}`}
                                                        onSelect={() => {
                                                            setFormData({ ...formData, admission: admission.encounter_id.toString() });
                                                            setOpen(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                formData.admission === admission.encounter_id.toString() ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {admission.patient_summary
                                                            ? `${admission.patient_summary.last_name}, ${admission.patient_summary.first_name} ${admission.patient_summary.gender === 'M' ? '(M)' : '(F)'} - ${admission.identifier}`
                                                            : `${admission.identifier} - ${admission.location_summary?.name || 'Unknown Location'}`}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        )}
                        {selectedAdmission && (
                            <div className="mt-2 p-3 bg-blue-50 rounded border border-blue-100">
                                {selectedAdmission.patient_summary && (
                                    <div className="mb-2 pb-2 border-b border-blue-200">
                                        <div className="font-semibold text-blue-900">
                                            {selectedAdmission.patient_summary.last_name}, {selectedAdmission.patient_summary.first_name}
                                        </div>
                                        <div className="text-xs text-gray-600 mt-1">
                                            <span className="font-medium">Patient ID:</span> {selectedAdmission.patient_summary.patient_id} |
                                            <span className="font-medium ml-2">Admission ID:</span> {selectedAdmission.identifier}
                                        </div>
                                    </div>
                                )}
                                <div className="text-xs text-gray-600 space-y-1">
                                    <div><strong>Location:</strong> {selectedAdmission.location_summary?.name || 'N/A'}</div>
                                    {selectedAdmission.patient_summary && (
                                        <>
                                            <div><strong>Gender:</strong> {selectedAdmission.patient_summary.gender}</div>
                                            {selectedAdmission.patient_summary.birthdate && (
                                                <div><strong>Date of Birth:</strong> {selectedAdmission.patient_summary.birthdate}</div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Requesting Doctor ID</label>
                        <Input
                            type="number"
                            value={formData.requesting_doctor}
                            onChange={e => setFormData({ ...formData, requesting_doctor: e.target.value })}
                            placeholder="1 (Default)"
                        />
                        <p className="text-xs text-gray-500 mt-1">Enter doctor user ID (defaults to 1 for MVP)</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Test Type *</label>
                            <select
                                className="w-full rounded-md border border-gray-300 px-3 py-2"
                                value={formData.test_type}
                                onChange={e => setFormData({ ...formData, test_type: e.target.value as LabTestType })}
                            >
                                <optgroup label="Hematology">
                                    <option value="cbc">Complete Blood Count (CBC)</option>
                                    <option value="blood_typing">Blood Typing</option>
                                </optgroup>
                                <optgroup label="Clinical Microscopy">
                                    <option value="urinalysis">Urinalysis</option>
                                    <option value="fecalysis">Fecalysis</option>
                                </optgroup>
                                <optgroup label="Blood Chemistry">
                                    <option value="fbs">Fasting Blood Sugar (FBS)</option>
                                    <option value="rbs">Random Blood Sugar (RBS)</option>
                                    <option value="glucose_panel">Blood Glucose Panel</option>
                                </optgroup>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Priority</label>
                            <select
                                className="w-full rounded-md border border-gray-300 px-3 py-2"
                                value={formData.priority}
                                onChange={e => setFormData({ ...formData, priority: e.target.value as LabPriority })}
                            >
                                <option value="routine">Routine</option>
                                <option value="stat">STAT (Emergency)</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Clinical Reason / Diagnosis</label>
                        <Textarea
                            value={formData.clinical_reason}
                            onChange={e => setFormData({ ...formData, clinical_reason: e.target.value })}
                            placeholder="E.g. Fever for 3 days, Rule out Dengue"
                        />
                    </div>

                    {formData.priority === 'stat' && (
                        <div className="flex items-center text-red-600 bg-red-50 p-3 rounded-md">
                            <AlertCircle className="w-5 h-5 mr-2" />
                            <span className="text-sm font-medium">STAT requests require immediate attention.</span>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Submit Request</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
