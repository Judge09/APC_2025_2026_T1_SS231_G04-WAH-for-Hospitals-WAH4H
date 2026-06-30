import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FileText, AlertCircle, CheckCircle, Clock, RefreshCw, ExternalLink, Trash2 } from 'lucide-react';
import { LabRequest, LabResult } from '../../types/monitoring';
import { LabTestType, LabPriority } from '../../types/laboratory';
import { useRole } from '@/contexts/RoleContext';
import { LabResultViewModal } from '../laboratory/LabResultViewModal';

interface LaboratoryTabProps {
    labRequests: LabRequest[];
    currentUserName?: string;
    patientName?: string;
    patientId?: string;
    onAddRequest?: (request: Omit<LabRequest, 'id'>) => void;
    onUpdateResult?: (requestId: string, result: LabResult) => void;
    onVerifyRequest?: (requestId: number | string) => void;
    onDeleteRequest?: (requestId: number | string) => void;
    onRefresh?: () => void;
}

const COMMON_LAB_TESTS: { code: LabTestType; name: string }[] = [
    // Hematology
    { code: 'cbc', name: 'Complete Blood Count (CBC)' },
    { code: 'blood_typing', name: 'Blood Typing' },
    // Microscopy
    { code: 'urinalysis', name: 'Urinalysis' },
    { code: 'fecalysis', name: 'Fecalysis' },
    // Chemistry
    { code: 'fbs', name: 'Fasting Blood Sugar (FBS)' },
    { code: 'rbs', name: 'Random Blood Sugar (RBS)' },
];

export const LaboratoryTab: React.FC<LaboratoryTabProps> = ({
    labRequests,
    currentUserName,
    patientName = 'Unknown Patient',
    patientId = '',
    onAddRequest,
    onUpdateResult,
    onVerifyRequest,
    onDeleteRequest,
    onRefresh
}) => {
    const { currentRole, canModify } = useRole();

    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [isResultModalOpen, setIsResultModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<LabRequest | null>(null);

    // Order Lab Test Form State
    const [orderForm, setOrderForm] = useState({
        testCode: '' as LabTestType | '',
        testName: '',
        priority: 'routine' as LabPriority,
        notes: '',
    });

    // Lab Result Form State
    const [resultForm, setResultForm] = useState<LabResult>({
        findings: '',
        results: [],
        interpretation: '',
        reportedBy: '',
        reportedAt: new Date().toISOString(),
    });

    // Permissions
    // Role-based default filter
    const [statusFilter, setStatusFilter] = useState<'all' | 'requested' | 'verified' | 'completed'>('all');

    React.useEffect(() => {
        if (currentRole === 'doctor') {
            setStatusFilter('requested');
        } else if (currentRole === 'nurse') {
            setStatusFilter('requested');
        } else {
            setStatusFilter('all');
        }
    }, [currentRole]);

    const canOrderLabs = currentRole === 'doctor';
    const canViewLabs = currentRole === 'doctor' || currentRole === 'nurse' || currentRole === 'lab_technician';

    const handleOrderSubmit = () => {
        if (!orderForm.testCode || !orderForm.testName) {
            alert('Please select a test');
            return;
        }

        const newRequest: Omit<LabRequest, 'id'> = {
            admissionId: '', // Will be set by parent
            testCode: orderForm.testCode as LabTestType,
            testName: orderForm.testName,
            priority: orderForm.priority,
            notes: orderForm.notes,
            lifecycleStatus: 'requested', // Default to requested (Active/Registered)
            orderedBy: currentUserName || currentRole,
            orderedAt: new Date().toISOString(),
            patient_name: patientName,
            patient_id: patientId,
        };

        onAddRequest?.(newRequest);
        setIsOrderModalOpen(false);
        setOrderForm({ testCode: '' as LabTestType | '', testName: '', priority: 'routine', notes: '' });
    };

    const handleVerifyClick = (request: LabRequest) => {
        if (onVerifyRequest) {
            onVerifyRequest(request.id);
        }
    };

    const handleDeleteClick = (request: LabRequest) => {
        if (onDeleteRequest && window.confirm('Are you sure you want to delete this lab request?')) {
            onDeleteRequest(request.id);
        }
    };



    const filteredRequests = labRequests.filter(req => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'requested') return req.lifecycleStatus === 'requested';
        if (statusFilter === 'verified') return req.lifecycleStatus === 'verified';
        if (statusFilter === 'completed') return req.lifecycleStatus === 'completed';
        return true;
    });

    const getStatusBadge = (status: string) => {
        // In monitoring, we only show completed results
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'stat':
                return <Badge className="bg-red-100 text-red-800">STAT</Badge>;
            case 'urgent':
                return <Badge className="bg-orange-100 text-orange-800">Urgent</Badge>;
            case 'routine':
                return <Badge className="bg-gray-100 text-gray-800">Routine</Badge>;
            default:
                return <Badge>{priority}</Badge>;
        }
    };

    if (!canViewLabs) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">You do not have permission to view laboratory requests.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Laboratory Results</h3>
                    <div className="flex items-center gap-2 mt-2">
                        <Label className="text-sm font-medium text-gray-700">Filter Status:</Label>
                        <Select
                            value={statusFilter}
                            onValueChange={(value: any) => setStatusFilter(value)}
                        >
                            <SelectTrigger className="w-[180px] h-8">
                                <SelectValue placeholder="Filter Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Requests</SelectItem>
                                <SelectItem value="requested">Requested (Active)</SelectItem>
                                <SelectItem value="verified">Verified (Prelim)</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {onRefresh && (
                        <Button variant="outline" size="icon" onClick={onRefresh} title="Reload Requests">
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                    )}
                    {canOrderLabs && (
                        <Button
                            onClick={() => setIsOrderModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            {currentRole === 'doctor' ? 'Order Lab Test' : 'Request Lab Test'}
                        </Button>
                    )}
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                    <p className="font-medium">Monitoring View (Read-Only)</p>
                    <p className="text-blue-700">This shows finalized lab results only. To process lab tests or view detailed results, visit the <a href="/laboratory" className="underline font-medium">Laboratory page</a>.</p>
                </div>
            </div>

            {/* Lab Requests List */}
            <div className="space-y-3">
                {filteredRequests.length === 0 ? (
                    <Card className="p-8 text-center">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600">No laboratory results found</p>
                        {canOrderLabs && (
                            <p className="text-sm text-gray-500 mt-2">Click "Request Lab Test" to create a new request</p>
                        )}
                    </Card>
                ) : (
                    filteredRequests.map((request) => (
                        <Card key={request.id} className="p-4">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h4 className="font-semibold text-gray-900">{request.testName}</h4>
                                        {request.lifecycleStatus === 'requested' ? (
                                            <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                                                {request.status_display?.toUpperCase() || 'REQUESTED'}
                                            </Badge>
                                        ) : request.lifecycleStatus === 'verified' ? (
                                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                                {request.status_display?.toUpperCase() || 'VERIFIED'}
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-green-100 text-green-800 border-green-200">
                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                {request.status_display?.toUpperCase() || 'COMPLETED'}
                                            </Badge>
                                        )}
                                        {getPriorityBadge(request.priority)}
                                    </div>
                                    <div className="text-sm text-gray-600 space-y-1">
                                        <p><span className="font-medium">Test Code:</span> {request.testCode}</p>
                                        <p><span className="font-medium">Ordered by:</span> {request.orderedBy}</p>
                                        <p><span className="font-medium">Ordered at:</span> {new Date(request.orderedAt).toLocaleString()}</p>
                                        {request.completedAt && (
                                            <p><span className="font-medium">Completed at:</span> {new Date(request.completedAt).toLocaleString()}</p>
                                        )}
                                        {request.notes && <p><span className="font-medium">Notes:</span> {request.notes}</p>}
                                        {request.results && request.results.length > 0 && (
                                            <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
                                                <p className="font-medium text-green-900 mb-1">✓ Results Available</p>
                                                <p className="text-sm text-green-800">
                                                    View details to see full results
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="ml-4 flex flex-col gap-2">
                                    {/* Nurse Verification Action */}
                                    {currentRole === 'nurse' && request.lifecycleStatus === 'requested' && (
                                        <Button
                                            size="sm"
                                            className="bg-purple-600 hover:bg-purple-700 text-white"
                                            onClick={() => handleVerifyClick(request)}
                                        >
                                            Request Lab Test
                                        </Button>
                                    )}

                                    <button
                                        onClick={() => {
                                            setSelectedRequest(request);
                                            setIsResultModalOpen(true);
                                        }}
                                        className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors flex items-center gap-2 font-medium text-sm border border-purple-200"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye">
                                            <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                        </svg>
                                        View
                                    </button>



                                    {/* Delete Action - Only for requested items */}
                                    {(currentRole === 'doctor' || currentRole === 'nurse') && request.lifecycleStatus === 'requested' && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleDeleteClick(request)}
                                            title="Delete Request"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Order Lab Test Modal */}
            <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Request Laboratory Test</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="test">Select Test</Label>
                            <Select
                                value={orderForm.testCode}
                                onValueChange={(value) => {
                                    // Cast value to LabTestType - we know it's valid because it comes from COMMON_LAB_TESTS
                                    const code = value as LabTestType;
                                    const test = COMMON_LAB_TESTS.find(t => t.code === code);
                                    setOrderForm({ ...orderForm, testCode: code, testName: test?.name || '' });
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a test" />
                                </SelectTrigger>
                                <SelectContent>
                                    {COMMON_LAB_TESTS.map((test) => (
                                        <SelectItem key={test.code} value={test.code}>
                                            {test.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="priority">Priority</Label>
                            <Select
                                value={orderForm.priority}
                                onValueChange={(value) =>
                                    setOrderForm({ ...orderForm, priority: value as LabPriority })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="routine">Routine</SelectItem>
                                    <SelectItem value="urgent">Urgent</SelectItem>
                                    <SelectItem value="stat">STAT</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="notes">Clinical Notes</Label>
                            <Textarea
                                id="notes"
                                value={orderForm.notes}
                                onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                                placeholder="Add any relevant clinical information..."
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsOrderModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleOrderSubmit} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {currentRole === 'doctor' ? 'Order Lab Test' : 'Request Lab Test'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Lab Result Modal */}
            <LabResultViewModal
                isOpen={isResultModalOpen}
                onClose={() => setIsResultModalOpen(false)}
                request={selectedRequest as any}
            />
        </div>
    );
};
