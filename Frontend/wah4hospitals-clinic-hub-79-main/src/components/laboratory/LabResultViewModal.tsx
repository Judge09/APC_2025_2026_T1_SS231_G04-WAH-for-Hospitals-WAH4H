import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Printer } from 'lucide-react';
import { LabRequest } from '../../types/laboratory';

interface LabResultViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: LabRequest | null;
}

export const LabResultViewModal: React.FC<LabResultViewModalProps> = ({ isOpen, onClose, request }) => {
    if (!isOpen || !request) return null;

    const handlePrint = () => {
        window.print();
    };



    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print:p-0 print:bg-white print:static">
            <style>{`
                @media print {
                    @page {
                        margin: 0;
                        size: auto;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        -webkit-print-color-adjust: exact;
                    }
                    body * {
                        visibility: hidden;
                    }
                    #printable-report, #printable-report * {
                        visibility: visible;
                    }
                    #printable-report {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: 100%;
                        margin: 0;
                        padding: 10mm !important;
                        background: white;
                        box-shadow: none; /* Remove shadows */
                    }
                    .no-print {
                        display: none !important;
                    }
                    
                    /* Compact fonts for one-page fit */
                    h2 { font-size: 1.2rem !important; margin-bottom: 0.5rem !important; }
                    p, td, th, span { font-size: 0.85rem !important; }
                    
                    /* Force background colors */
                    .bg-blue-900 { background-color: #1e3a8a !important; color: white !important; -webkit-print-color-adjust: exact; }
                }
            `}</style>
            <div id="printable-report" className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto print:max-h-none print:rounded-none">

                {/* Print Header - Professional Blue Style */}
                <div className="hidden print:block mb-6">
                    <div className="flex justify-between items-start border-b-2 border-blue-900 pb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-900 flex items-center justify-center text-white font-bold text-xl rounded">W</div>
                            <div>
                                <h1 className="text-2xl font-bold text-blue-900 leading-none">WAH Medical Center</h1>
                                <p className="text-sm text-gray-600">Department of Pathology & Laboratory Medicine</p>
                            </div>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                            <p>123 Hospital Drive, Medical City</p>
                            <p>Tel: (02) 8123-4567</p>
                            <p>lab@wah-hospital.com</p>
                        </div>
                    </div>
                </div>

                {/* Header (Modal Chrome - Hidden on Print) */}
                <div className="flex justify-between items-center p-6 border-b no-print">
                    <h2 className="text-xl font-bold text-gray-900">Lab Request Details</h2>
                    <div className="flex gap-2">

                        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                            <Printer size={16} />
                            Print View
                        </Button>
                        <Button variant="ghost" size="sm" onClick={onClose}>
                            <X size={16} />
                        </Button>
                    </div>
                </div>
                {/* Content */}
                <div className="p-8">
                    {/* Patient Information Section */}
                    <div className="mb-6 bg-gray-50 print:bg-white print:border print:border-gray-200 p-4 rounded">
                        <h4 className="font-semibold text-lg mb-4 text-gray-800 print:text-blue-900">Patient Information</h4>
                        <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
                            <div className="flex">
                                <span className="font-semibold text-gray-700 w-32">Patient Name:</span>
                                <span className="font-medium flex-1">{request.patient_name}</span>
                            </div>
                            <div className="flex">
                                <span className="font-semibold text-gray-700 w-32">Patient ID:</span>
                                <span className="font-medium flex-1">{request.patient_id}</span>
                            </div>
                            <div className="flex">
                                <span className="font-semibold text-gray-700 w-32">Test Type:</span>
                                <span className="font-medium flex-1">{request.test_type_display || (request as any).testName}</span>
                            </div>
                            <div className="flex">
                                <span className="font-semibold text-gray-700 w-32">Request ID:</span>
                                <span className="flex-1 font-mono">{request.request_id || (request as any).id}</span>
                            </div>
                        </div>
                    </div>

                    {/* Results Table */}
                    <div className="mb-8">
                        <h4 className="font-semibold text-lg mb-4 text-gray-800 print:text-blue-900">Test Results</h4>
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-gray-100 text-gray-700 print:bg-blue-900 print:text-white">
                                    <th className="text-left py-2 px-3 font-semibold w-1/3">Parameter</th>
                                    <th className="text-center py-2 px-3 font-semibold">Result</th>
                                    <th className="text-center py-2 px-3 font-semibold">Unit</th>
                                    <th className="text-center py-2 px-3 font-semibold">Ref. Range</th>
                                </tr>
                            </thead>
                            <tbody>
                                {request.results && request.results.length > 0 ? (
                                    request.results.map((res, i) => (
                                        <tr key={i} className={`border-b border-gray-200 ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                                            <td className="py-2.5 px-3 font-medium text-gray-800 text-left">{res.parameter}</td>
                                            <td className="py-2.5 px-3 text-center font-bold text-gray-900">{res.value}</td>
                                            <td className="py-2.5 px-3 text-center text-gray-600">{res.unit || '—'}</td>
                                            <td className="py-2.5 px-3 text-center text-gray-600">{(res.referenceRange && res.referenceRange !== '0-0') ? res.referenceRange : '—'}</td>
                                        </tr>
                                    ))
                                ) : request.result?.parameters && request.result.parameters.length > 0 ? (
                                    request.result.parameters.map((param, i) => (
                                        <tr key={i} className={`border-b border-gray-200 ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                                            <td className="py-2.5 px-3 font-medium text-gray-800 text-left">{param.parameter_name}</td>
                                            <td className="py-2.5 px-3 text-center font-bold text-gray-900">{param.result_value}</td>
                                            <td className="py-2.5 px-3 text-center text-gray-600">{param.unit || '—'}</td>
                                            <td className="py-2.5 px-3 text-center text-gray-600">{(param.reference_range && param.reference_range !== '0-0') ? param.reference_range : '—'}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-gray-500 italic">
                                            No test results available.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Remarks Section */}
                    {request.result?.remarks && (
                        <div className="mb-6 bg-yellow-50 border border-yellow-200 p-3 rounded print:border-gray-200 print:bg-white print:p-2 print:mb-4">
                            <h4 className="text-sm font-bold uppercase text-gray-700 mb-1 print:text-xs">Remarks / Clinical Interpretation:</h4>
                            <p className="text-sm text-gray-800 print:text-xs">{request.result.remarks}</p>
                        </div>
                    )}


                </div>
            </div>
        </div>
    );
};
