import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Printer } from 'lucide-react';
import { Invoice } from '@/services/billingService';

interface InvoiceDetailModalProps {
    invoice: Invoice | null;
    isOpen: boolean;
    onClose: () => void;
    onPrint?: () => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({ invoice, isOpen, onClose }) => {
    if (!isOpen || !invoice) return null;

    const handlePrint = () => {
        window.print();
    };

    const total = Number(invoice.total_net_value);
    const invoiceDate = new Date(invoice.invoice_datetime).toLocaleDateString('en-PH', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    const statusColor =
        invoice.status === 'balanced' ? 'bg-green-100 text-green-700' :
            invoice.status === 'issued' ? 'bg-blue-100 text-blue-700' :
                invoice.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700';

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
                    #printable-invoice, #printable-invoice * {
                        visibility: visible;
                    }
                    #printable-invoice {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: 100%;
                        margin: 0;
                        padding: 10mm !important;
                        background: white;
                        box-shadow: none;
                    }
                    .no-print {
                        display: none !important;
                    }
                    h2 { font-size: 1.2rem !important; margin-bottom: 0.5rem !important; }
                    p, td, th, span { font-size: 0.85rem !important; }
                    .bg-blue-900 { background-color: #1e3a8a !important; color: white !important; -webkit-print-color-adjust: exact; }
                }
            `}</style>

            <div
                id="printable-invoice"
                className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto print:max-h-none print:rounded-none"
            >
                {/* Print-only Header */}
                <div className="hidden print:block mb-6">
                    <div className="flex justify-between items-start border-b-2 border-blue-900 pb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-900 flex items-center justify-center text-white font-bold text-xl rounded">W</div>
                            <div>
                                <h1 className="text-2xl font-bold text-blue-900 leading-none">WAH Medical Center</h1>
                                <p className="text-sm text-gray-600">Billing &amp; Finance Department</p>
                            </div>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                            <p>123 Hospital Drive, Medical City</p>
                            <p>Tel: (02) 8123-4567</p>
                            <p>billing@wah-hospital.com</p>
                        </div>
                    </div>
                </div>

                {/* Modal Chrome — hidden on print */}
                <div className="flex justify-between items-center p-6 border-b no-print">
                    <h2 className="text-xl font-bold text-gray-900">Invoice Details</h2>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                            <Printer size={16} />
                            Print Invoice
                        </Button>
                        <Button variant="ghost" size="sm" onClick={onClose}>
                            <X size={16} />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8">
                    {/* Invoice Header Info */}
                    <div className="mb-6 bg-gray-50 print:bg-white print:border print:border-gray-200 p-4 rounded">
                        <h4 className="font-semibold text-lg mb-4 text-gray-800 print:text-blue-900">Invoice Information</h4>
                        <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
                            <div className="flex">
                                <span className="font-semibold text-gray-700 w-36">Invoice No.:</span>
                                <span className="font-mono font-medium flex-1">{invoice.identifier}</span>
                            </div>
                            <div className="flex">
                                <span className="font-semibold text-gray-700 w-36">Date Issued:</span>
                                <span className="font-medium flex-1">{invoiceDate}</span>
                            </div>
                            <div className="flex">
                                <span className="font-semibold text-gray-700 w-36">Status:</span>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block ${statusColor}`}>
                                    {invoice.status ? invoice.status.toUpperCase() : 'UNKNOWN'}
                                </span>
                            </div>
                            <div className="flex">
                                <span className="font-semibold text-gray-700 w-36">Patient ID:</span>
                                <span className="font-medium flex-1">{invoice.subject_id}</span>
                            </div>
                        </div>
                    </div>

                    {/* Line Items Table */}
                    <div className="mb-8">
                        <h4 className="font-semibold text-lg mb-4 text-gray-800 print:text-blue-900">Charges Breakdown</h4>
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-gray-100 text-gray-700 print:bg-blue-900 print:text-white">
                                    <th className="text-left py-2 px-3 font-semibold w-1/2">Description</th>
                                    <th className="text-center py-2 px-3 font-semibold">Type</th>
                                    <th className="text-right py-2 px-3 font-semibold">Qty</th>
                                    <th className="text-right py-2 px-3 font-semibold">Unit Price</th>
                                    <th className="text-right py-2 px-3 font-semibold">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoice.line_items && invoice.line_items.length > 0 ? (
                                    invoice.line_items.map((item, i) => (
                                        <tr
                                            key={item.id}
                                            className={`border-b border-gray-200 ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                                        >
                                            <td className="py-2.5 px-3 font-medium text-gray-800 text-left">{item.description}</td>
                                            <td className="py-2.5 px-3 text-center">
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${item.sequence === 'LAB'
                                                    ? 'bg-purple-100 text-purple-700'
                                                    : item.sequence === 'PHARMACY'
                                                        ? 'bg-orange-100 text-orange-700'
                                                        : 'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {item.sequence || 'MISC'}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-right text-gray-700">{item.quantity}</td>
                                            <td className="py-2.5 px-3 text-right text-gray-700">
                                                ₱{Number(item.unit_price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                                                ₱{Number(item.net_value).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-gray-500 italic">
                                            No line items on this invoice.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end">
                        <div className="w-full max-w-xs space-y-2 text-sm">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal:</span>
                                <span>₱{total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Discount:</span>
                                <span>₱0.00</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg text-gray-900 border-t pt-2 mt-2">
                                <span>TOTAL DUE:</span>
                                <span>₱{total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>

                    {/* Print Footer */}
                    <div className="hidden print:block mt-12 pt-4 border-t border-gray-300 text-xs text-gray-500 text-center">
                        <p>This is a computer-generated invoice. No signature required.</p>
                        <p>WAH Medical Center • 123 Hospital Drive, Medical City • Tel: (02) 8123-4567</p>
                        <p>Printed on: {new Date().toLocaleString('en-PH')}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
