import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface PrintButtonProps {
  onPrint?: () => void;
  children?: React.ReactNode;
  className?: string;
  printData?: any;
  printType?: 'report' | 'discharge-packet' | 'lab-result';
}

export const PrintButton: React.FC<PrintButtonProps> = ({
  onPrint,
  children = "Print Report",
  className = "",
  printData,
  printType = 'report'
}) => {
  const handlePrint = () => {
    if (printType === 'lab-result' && printData?.id) {
      // Open Backend PDF URL in new tab
      // NOTE: Ensure your backend URL is correct. Assuming /api/laboratory/reports/{id}/pdf/
      // If the backend is on a different port (e.g., 8000), you might need the full URL or a proxy.
      // For now, we use a relative path assuming proxy or same origin.
      const pdfUrl = `http://localhost:8000/api/laboratory/reports/${printData.id}/pdf/`;
      window.open(pdfUrl, '_blank');
    } else if (printType === 'discharge-packet' && printData?.id) {
      // Open Backend PDF URL in new tab (same pattern as lab-result)
      const pdfUrl = `http://localhost:8000/api/discharge/discharges/${printData.id}/pdf/`;
      window.open(pdfUrl, '_blank');
    } else {
      // Regular window print
      window.print();
    }

    if (onPrint) onPrint();
  };

  return (
    <Button onClick={handlePrint} className={`no-print ${className}`}>
      <Printer className="w-4 h-4 mr-2" />
      {children}
    </Button>
  );
};