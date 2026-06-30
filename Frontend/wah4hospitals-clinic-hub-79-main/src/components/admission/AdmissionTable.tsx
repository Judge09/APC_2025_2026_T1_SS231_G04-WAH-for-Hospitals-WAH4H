import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import type { Admission } from '../../types/admission';

interface AdmissionTableProps {
  admissions: Admission[];
  onDetailsClick?: (admission: Admission) => void; // optional callback
}

// Helper to get badge class based on status
const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'Active':
      return 'bg-green-100 text-green-800';
    case 'Discharged':
      return 'bg-gray-100 text-gray-800';
    case 'Transferred':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const AdmissionTable: React.FC<AdmissionTableProps> = ({
  admissions,
  onDetailsClick,
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-4 font-medium">Patient Name</th>
            <th className="text-left py-3 px-4 font-medium">Admission No.</th>
            <th className="text-left py-3 px-4 font-medium">Date/Time</th>
            <th className="text-left py-3 px-4 font-medium">Physician</th>
            <th className="text-left py-3 px-4 font-medium">Room/Bed</th>
            <th className="text-left py-3 px-4 font-medium">Status</th>
            <th className="text-left py-3 px-4 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {admissions.length === 0 && (
            <tr>
              <td colSpan={7} className="text-center py-8 text-gray-500">
                No admissions found matching your search criteria.
              </td>
            </tr>
          )}

          {admissions.map((admission) => (
            <tr key={admission.encounter_id} className="border-b hover:bg-gray-50">
              <td className="py-4 px-4 font-medium">
                {admission.patient_summary
                  ? (admission.patient_summary.full_name || `${admission.patient_summary.last_name}, ${admission.patient_summary.first_name}`)
                  : 'Unknown Patient'}
              </td>
              {/* Display backend identifier */}
              <td className="py-4 px-4">{admission.identifier}</td>
              <td className="py-4 px-4">
                {admission.period_start ? new Date(admission.period_start).toLocaleString() : 'N/A'}
              </td>
              <td className="py-4 px-4">
                {admission.practitioner_summary?.full_name || admission.practitioner_summary?.name || 'N/A'}
              </td>
              <td className="py-4 px-4">
                {admission.location_summary?.name || 'N/A'}
              </td>
              <td className="py-4 px-4">
                <Badge className={getStatusBadgeClass(admission.status)}>
                  {admission.status.toUpperCase()}
                </Badge>
              </td>
              <td className="py-4 px-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDetailsClick?.(admission)}
                >
                  <FileText className="w-4 h-4 mr-1" />
                  Details
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
