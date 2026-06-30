import React from 'react';
import { Button } from '@/components/ui/button';
import { Invoice } from '@/services/billingService';

interface PatientBillPrintProps {
  invoice: Invoice;
  patientName: string;
  onClose?: () => void;
}

const PatientBillPrint: React.FC<PatientBillPrintProps> = ({ invoice, patientName, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(Number(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="p-8 max-w-4xl mx-auto bg-white min-h-screen">
      <div className="mb-8 print:hidden flex justify-between items-center bg-gray-50 p-4 rounded-lg">
        <div>
          <h1 className="text-xl font-bold">Print Preview</h1>
          <p className="text-sm text-gray-500">Invoice #{invoice.identifier}</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handlePrint} className="bg-primary hover:bg-primary/90">Print Bill</Button>
          {onClose && (
            <Button variant="outline" onClick={onClose}>Close</Button>
          )}
        </div>
      </div>

      <div className="print:p-0">
        {/* Hospital Header */}
        <div className="text-center mb-8 pb-6 border-b-2 border-gray-200">
          <h1 className="text-2xl font-bold mb-2">WELLNESS ADVANCED HOSPITAL</h1>
          <p className="text-sm mb-1">123 Healthcare Avenue, Medical District, Metro Manila, Philippines</p>
          <p className="text-sm mb-4">+63 (02) 8123-4567 | emergency@wah.ph</p>
          <h2 className="text-lg font-bold uppercase tracking-wide bg-gray-100 py-1">HOSPITAL BILL STATEMENT</h2>
        </div>

        {/* Patient and Invoice Info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Patient Information</h3>
            <div className="space-y-1">
              <p className="font-bold text-lg">{patientName}</p>
              <p className="text-sm text-gray-600">Patient ID: {invoice.subject_id}</p>
            </div>
          </div>
          <div className="text-right">
            <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Invoice Information</h3>
            <div className="space-y-1">
              <p className="font-bold text-lg">#{invoice.identifier}</p>
              <p className="text-sm text-gray-600">Date: {formatDate(invoice.invoice_datetime)}</p>
              <p className="text-sm text-gray-600 uppercase font-medium">Status: {invoice.status}</p>
            </div>
          </div>
        </div>

        {/* Billing Table */}
        <div className="mb-8">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="py-2 font-bold text-sm uppercase">Description</th>
                <th className="py-2 font-bold text-sm uppercase text-center">Type</th>
                <th className="py-2 font-bold text-sm uppercase text-right">Qty</th>
                <th className="py-2 font-bold text-sm uppercase text-right">Unit Price</th>
                <th className="py-2 font-bold text-sm uppercase text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.line_items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-3">{item.description}</td>
                  <td className="py-3 text-center">
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-gray-200 uppercase font-medium">
                      {item.sequence}
                    </span>
                  </td>
                  <td className="py-3 text-right">{item.quantity}</td>
                  <td className="py-3 text-right">{formatCurrency(item.unit_price)}</td>
                  <td className="py-3 text-right font-medium">{formatCurrency(item.net_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-full max-w-xs space-y-2">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Subtotal:</span>
              <span>{formatCurrency(invoice.total_gross_value)}</span>
            </div>
            {/* Logic for discounts can be added here if part of data model */}
            <div className="flex justify-between py-4 text-xl font-bold bg-gray-50 px-4 mt-4">
              <span>Total Due:</span>
              <span className="text-primary">{formatCurrency(invoice.total_net_value)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-20 grid grid-cols-2 gap-12">
          <div className="text-center">
            <div className="border-b border-gray-400 mb-2 mt-8"></div>
            <p className="text-xs text-gray-500 font-bold uppercase">Patient Signature</p>
          </div>
          <div className="text-center">
            <div className="border-b border-gray-400 mb-2 mt-8"></div>
            <p className="text-xs text-gray-500 font-bold uppercase">Cashier Signature</p>
          </div>
        </div>

        <div className="mt-12 text-center text-[10px] text-gray-400 space-y-1">
          <p>Thank you for choosing Wellness Advanced Hospital.</p>
          <p>This is an official hospital bill statement. For inquiries, please visit our billing department.</p>
          <p>© 2026 Wellness Advanced Hospital. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default PatientBillPrint;
