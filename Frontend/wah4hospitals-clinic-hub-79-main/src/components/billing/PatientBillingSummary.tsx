import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, DollarSign, FileText, FlaskConical, Pill, Printer, PlusCircle, Trash2 } from 'lucide-react';
import { PaymentModal } from './PaymentModal';
import { ManualFeeModal } from './ManualFeeModal';
import billingService, { Invoice } from '@/services/billingService';

interface BillingDashboardProps {
    subjectId: number | null;
    patientName?: string;
    onInvoiceGenerated?: () => void;
    onPrintInvoice?: (invoice: Invoice) => void;
}

interface PatientSummary {
    subject_id: number;
    billed_total: number;
    unbilled_lab_total: number;
    unbilled_pharmacy_total: number;
    unbilled_total: number;
    grand_total: number;
}

import { useRef } from 'react';
import { InvoiceDetailModal } from './InvoiceDetailModal';


interface SummaryCardProps {
    title: string;
    icon: React.ElementType;
    amount: number;
    subtitle: string;
    className?: string;
    iconClassName?: string;
    textClassName?: string;
    subtitleClassName?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
    title,
    icon: Icon,
    amount,
    subtitle,
    className,
    iconClassName = "text-muted-foreground",
    textClassName,
    subtitleClassName = "text-muted-foreground"
}) => (
    <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${textClassName || ''}`}>{title}</CardTitle>
            <Icon className={`h-4 w-4 ${iconClassName}`} />
        </CardHeader>
        <CardContent>
            <div className={`text-2xl font-bold ${textClassName || ''}`}>
                ₱{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className={`text-xs ${subtitleClassName}`}>{subtitle}</p>
        </CardContent>
    </Card>
);

export const PatientBillingSummary: React.FC<BillingDashboardProps> = ({ subjectId, patientName, onInvoiceGenerated, onPrintInvoice }) => {
    const [summary, setSummary] = useState<PatientSummary | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null); // For Viewing Details
    const [feeInvoice, setFeeInvoice] = useState<Invoice | null>(null); // For Adding Manual Fees

    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // ... (useEffect and fetch logic remains same) ...
    useEffect(() => {
        if (subjectId) {
            fetchData(subjectId);
        } else {
            setSummary(null);
            setInvoices([]);
        }
    }, [subjectId]);

    const fetchData = async (id: number) => {
        setLoading(true);
        setError(null);
        try {
            const [summaryData, invoicesData] = await Promise.all([
                billingService.getPatientSummary(id),
                billingService.getInvoices(id)
            ]);
            setSummary(summaryData);
            setInvoices(invoicesData);
        } catch (err) {
            console.error(err);
            setError("Failed to load billing data.");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenPayment = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
    };

    const handleViewDetails = (invoice: Invoice) => {
        setViewInvoice(invoice);
    };

    const handleAddFee = (invoice: Invoice) => {
        setFeeInvoice(invoice);
    };

    const handleDeleteInvoice = async (invoice: Invoice) => {
        if (!window.confirm(`Delete invoice ${invoice.identifier}? This cannot be undone.`)) return;
        try {
            await billingService.deleteInvoice(invoice.invoice_id);
            setSuccessMsg(`Invoice ${invoice.identifier} deleted.`);
            if (subjectId) fetchData(subjectId);
        } catch (err) {
            console.error(err);
            setError('Failed to delete invoice. Please try again.');
        }
    };

    const handlePaymentSuccess = async (paymentData: any) => {
        if (!selectedInvoice) return;

        try {
            await billingService.recordPayment(selectedInvoice.invoice_id, paymentData);
            setSuccessMsg("Payment processed successfully.");
            setSelectedInvoice(null);
            // Refresh data to update summary cards and invoice list
            if (subjectId) {
                await fetchData(subjectId);
            }
        } catch (err) {
            console.error("Payment recording failed:", err);
            setError("Failed to record payment. Please try again.");
        }
    };

    const handleGenerateInvoice = async () => {
        if (!subjectId) return;

        setGenerating(true);
        setError(null);
        setSuccessMsg(null);

        try {
            await billingService.generateInvoice(subjectId);
            setSuccessMsg("Invoice successfully generated from pending orders.");
            await fetchData(subjectId);
            if (onInvoiceGenerated) {
                onInvoiceGenerated();
            }
        } catch (err: any) {
            console.error(err);
            if (err.response && err.response.status === 400 && err.response.data?.message === "No pending orders found") {
                setError("No pending orders found to bill.");
            } else {
                setError("Failed to generate invoice. Please try again.");
            }
        } finally {
            setGenerating(false);
        }
    };

    const generateManualInvoice = async () => {
        if (!subjectId) return;
        setGenerating(true);
        setError(null);
        setSuccessMsg(null);
        try {
            const newInvoice = await billingService.createManualInvoice(subjectId);
            setSuccessMsg(`Manual Invoice ${newInvoice.identifier} created.`);
            await fetchData(subjectId);
            if (onInvoiceGenerated) onInvoiceGenerated();
        } catch (err) {
            console.error(err);
            setError("Failed to create manual invoice.");
        } finally {
            setGenerating(false);
        }
    };

    if (!subjectId) {
        return (
            <div className="text-center p-8 text-gray-500">
                <h3 className="text-lg font-medium">Select a patient to view billing summary</h3>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!summary) return null;

    const totalPaid = invoices
        .filter(inv => inv.status === 'balanced')
        .reduce((sum, inv) => sum + Number(inv.total_net_value), 0);

    const remainingBalance = summary.grand_total - totalPaid;

    return (
        <div className="space-y-6">
            {error && (
                <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {successMsg && (
                <Alert className="bg-green-50 text-green-800 border-green-200">
                    <FlaskConical className="h-4 w-4 text-green-600" />
                    <AlertTitle>Success</AlertTitle>
                    <AlertDescription>{successMsg}</AlertDescription>
                </Alert>
            )}

            {/* STATUS CARDS */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Payment Completed */}
                <SummaryCard
                    title="Payment Completed"
                    icon={FileText}
                    amount={totalPaid}
                    subtitle="Total Paid"
                />

                {/* Remaining Balance */}
                <SummaryCard
                    title="To Pay"
                    icon={DollarSign}
                    amount={remainingBalance}
                    subtitle="Total Outstanding"
                    className="bg-primary/5 border-primary/20"
                    textClassName="text-primary"
                    iconClassName="text-primary"
                    subtitleClassName="text-primary/80"
                />
            </div>

            {/* GENERATE BUTTON */}
            <div className="flex justify-end gap-2">
                {summary?.unbilled_total <= 0 && (
                    <Button
                        size="lg"
                        variant="outline"
                        onClick={generateManualInvoice}
                        disabled={generating}
                    >
                        {generating ? "Creating..." : "Create Manual Invoice (PF Only)"}
                    </Button>
                )}

                <Button
                    size="lg"
                    onClick={handleGenerateInvoice}
                    disabled={generating || (summary?.unbilled_total || 0) <= 0}
                    className="bg-primary hover:bg-primary/90"
                >
                    {generating ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating Invoice...
                        </>
                    ) : (
                        <>
                            <FileText className="mr-2 h-4 w-4" />
                            Generate Invoice from Pending Orders
                        </>
                    )}
                </Button>
            </div>

            {/* INVOICES LIST */}
            <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Invoices</h3>
                {invoices.length === 0 ? (
                    <div className="text-center p-6 bg-gray-50 rounded-lg text-gray-500">
                        No invoices found for this patient.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {invoices.map((inv) => {
                            const total = Number(inv.total_net_value);
                            const isPaid = inv.status === 'balanced';

                            return (
                                <Card key={inv.invoice_id} className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-full ${isPaid ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-900">{inv.identifier}</div>
                                                <div className="text-sm text-gray-500">{new Date(inv.invoice_datetime).toLocaleDateString()}</div>
                                                {inv.processed_by && (
                                                    <div className="text-xs text-gray-400 mt-1">Billing Clerk: {inv.processed_by}</div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <div className="font-bold text-gray-900">₱{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                                <div className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block ${inv.status === 'balanced' ? 'bg-green-100 text-green-700' :
                                                    inv.status === 'issued' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {inv.status ? inv.status.toUpperCase() : 'UNKNOWN'}
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleViewDetails(inv)}
                                                >
                                                    View Details
                                                </Button>

                                                {!isPaid && inv.status !== 'cancelled' && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleAddFee(inv)}
                                                        className="text-primary border-primary/20 hover:bg-primary/5"
                                                    >
                                                        <PlusCircle className="w-4 h-4 mr-1" />
                                                        Add Fee
                                                    </Button>
                                                )}

                                                {!isPaid && inv.status !== 'cancelled' && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleOpenPayment(inv)}
                                                        className="bg-green-600 hover:bg-green-700 text-white"
                                                    >
                                                        <DollarSign className="w-4 h-4 mr-1" />
                                                        Pay
                                                    </Button>
                                                )}



                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteInvoice(inv)}
                                                    className="text-red-400 hover:text-red-600 hover:bg-red-50"
                                                    title="Delete Invoice"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {selectedInvoice && (
                <PaymentModal
                    isOpen={!!selectedInvoice}
                    onClose={() => setSelectedInvoice(null)}
                    patientName={patientName || "Unknown Patient"}
                    totalBalance={selectedInvoice ? Number(selectedInvoice.total_net_value) : 0}
                    onPaymentSuccess={handlePaymentSuccess}
                />
            )}

            {viewInvoice && (
                <InvoiceDetailModal
                    invoice={viewInvoice}
                    isOpen={!!viewInvoice}
                    onClose={() => setViewInvoice(null)}
                />
            )}

            {feeInvoice && (
                <ManualFeeModal
                    isOpen={!!feeInvoice}
                    onClose={() => setFeeInvoice(null)}
                    invoiceId={feeInvoice.invoice_id}
                    identifier={feeInvoice.identifier}
                    onSuccess={() => {
                        setSuccessMsg(`Extra fee added to ${feeInvoice.identifier}`);
                        if (subjectId) fetchData(subjectId);
                    }}
                />
            )}


        </div>
    );
};

