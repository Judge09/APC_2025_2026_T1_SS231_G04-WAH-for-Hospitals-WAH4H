import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Trash2, FileText, Beaker } from 'lucide-react';
import { LabRequest, TestParameterFormData, LabResultFormData, LabInterpretation } from '../../types/laboratory';
import { getTestParameters, calculateInterpretation } from './labTestParameters'; // Keeping for generic fallback
import { labPanelsArray } from '@/config/labParameters';
import { LabPanelForm } from '../LabParameterField';

interface LabResultEncodingModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: LabRequest | null;
    onSubmit: (requestId: number, data: LabResultFormData) => void;
}

export const LabResultEncodingModal: React.FC<LabResultEncodingModalProps> = ({ isOpen, onClose, request, onSubmit }) => {
    // Metadata state
    const [medTech, setMedTech] = useState('');
    const [prcNumber, setPrcNumber] = useState('');
    const [overallRemarks, setOverallRemarks] = useState('');

    // Form Data State for Configured Panels (CBC, CMP, Lipid, etc.)
    // Matches ResultFormState structure (flat dictionary)
    const [formData, setFormData] = useState<Record<string, string>>({});

    // Interpretation logic removed as per requirements (no automatic flagging)


    // Load predefined parameters and local draft when modal opens
    useEffect(() => {
        if (isOpen && request) {
            const draft = localStorage.getItem(`lab_draft_${request.id}`);
            if (draft) {
                try {
                    const parsed = JSON.parse(draft);
                    setFormData(parsed.formData || {});
                    setMedTech(parsed.medTech || '');
                    setPrcNumber(parsed.prcNumber || '');
                    setOverallRemarks(parsed.overallRemarks || '');
                } catch (e) {
                    setFormData({});
                }
            } else {
                setFormData({});
            }
        }
    }, [isOpen, request]);

    // Save draft automatically as user types
    useEffect(() => {
        if (isOpen && request) {
            const draft = { formData, medTech, prcNumber, overallRemarks };
            localStorage.setItem(`lab_draft_${request.id}`, JSON.stringify(draft));
        }
    }, [formData, medTech, prcNumber, overallRemarks, isOpen, request]);

    if (!isOpen || !request) return null;

    // Convert Configured Panels Data to API Parameter Format
    const panelsToParameters = (): TestParameterFormData[] => {
        const results: TestParameterFormData[] = [];

        // Iterate through all configured panels
        labPanelsArray.forEach(panel => {
            panel.parameters.forEach(param => {
                const value = formData[param.formKey];
                if (value && value.trim() !== '') {
                    // Only include filled fields
                    // Interpretation is now explicitly empty to disable automatic flagging
                    const apiInterp: LabInterpretation | '' = '';

                    // Hide reference range if both low and high are 0 (e.g. Qualitative tests)
                    const refRange = (param.refLow === 0 && param.refHigh === 0) ? '' : `${param.refLow}-${param.refHigh}`;

                    results.push({
                        parameter_name: param.label,
                        result_value: value,
                        unit: param.unit,
                        reference_range: refRange,
                        interpretation: apiInterp
                    });
                }
            });
        });

        // Also add Urinalysis/Fecalysis/Other fields if they are in formData but not in panels
        // (If we added them to labParameters.ts, they would be covered above. For now, we assume labParameters.ts covers the core blood tests)
        // Note: You should ideally add Urinalysis params to labParameters.ts to fully unify this.

        return results;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Always use Panels data
        const finalParameters = panelsToParameters();

        const resultData: LabResultFormData = {
            lab_request: request.id,
            medical_technologist: medTech,
            prc_number: prcNumber,
            remarks: overallRemarks,
            parameters: finalParameters
        };

        onSubmit(request.id, resultData);

        // Clear Draft
        localStorage.removeItem(`lab_draft_${request.id}`);

        // Reset
        setMedTech('');
        setPrcNumber('');
        setOverallRemarks('');
        setFormData({});
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-purple-600 text-white px-6 py-4 rounded-t-lg flex items-center justify-between z-10">
                    <div className="flex items-center gap-3">
                        <FileText size={24} />
                        <div>
                            <h3 className="text-lg font-semibold">Encode Lab Results</h3>
                            <p className="text-sm text-purple-100 mt-0.5">
                                Request ID: {request.request_id} • {request.test_type_display}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-purple-700 rounded-full p-1 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    {/* Patient Info */}
                    <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 mb-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-purple-600 font-medium mb-1">Patient</p>
                                <p className="font-semibold text-purple-900">{request.patient_name}</p>
                            </div>
                            <div>
                                <p className="text-xs text-purple-600 font-medium mb-1">Doctor</p>
                                <p className="font-semibold text-purple-900">{request.doctor_name || 'Unknown'}</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                                <Beaker size={16} />
                                Test Results
                            </h4>

                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                    Standardized Panel
                                </Badge>
                            </div>
                        </div>

                        {/* Standard Panels Mode */}
                        <div className="space-y-6 mb-8">
                            {(() => {
                                // Filter panels based on test type
                                const testTypeToPanels: Record<string, string[]> = {
                                    // Hematology
                                    'cbc': ['cbc'],
                                    'blood_typing': ['blood_typing'],
                                    // Microscopy
                                    'urinalysis': ['urinalysis'],
                                    'fecalysis': ['fecalysis'],
                                    // Chemistry
                                    'fbs': ['glucose_panel'],
                                    'rbs': ['glucose_panel'],
                                    'glucose_panel': ['glucose_panel'],
                                };

                                const testTypeKey = request.test_type.toLowerCase();
                                const matchingPanelIds = testTypeToPanels[testTypeKey] || [];
                                const filteredPanels = labPanelsArray.filter(panel => matchingPanelIds.includes(panel.id));

                                if (filteredPanels.length === 0) {
                                    return (
                                        <div className="p-8 text-center bg-gray-50 rounded-lg border border-gray-200 border-dashed">
                                            <p className="text-gray-500">No standard panel configuration found for "<strong>{request.test_type_display}</strong>".</p>
                                            <p className="text-sm text-gray-400 mt-1">Please contact the system administrator to configure this test.</p>
                                        </div>
                                    );
                                }

                                return filteredPanels.map((panel) => (
                                    <LabPanelForm
                                        key={panel.id}
                                        panelId={panel.id}
                                        title={panel.title}
                                        color={panel.color}
                                        parameters={panel.parameters}
                                        formData={formData}
                                        onFieldChange={(fieldKey, value) => setFormData(prev => ({ ...prev, [fieldKey]: value }))}
                                    />
                                ));
                            })()}
                        </div>
                    </div>

                    {/* Technician Info */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Technician Information</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Medical Technologist *</label>
                                <Input
                                    required
                                    value={medTech}
                                    onChange={e => setMedTech(e.target.value)}
                                    placeholder="Name of MedTech"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">PRC Number *</label>
                                <Input
                                    required
                                    value={prcNumber}
                                    onChange={e => setPrcNumber(e.target.value)}
                                    placeholder="License Number"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">Remarks / Conclusion</h3>
                        <Textarea
                            className="h-24 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            value={overallRemarks}
                            onChange={e => setOverallRemarks(e.target.value)}
                            placeholder="Overall clinical interpretation or remarks..."
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                        <Button type="button" variant="outline" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors">
                            Cancel
                        </Button>
                        <Button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors">
                            Finalize Results
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
