import React from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Eye } from 'lucide-react';
import type { Patient } from '../../types/patient';

interface PatientTableProps {
  patients: Patient[];
  handleViewDetails: (patient: Patient) => void;
  handleEdit: (patient: Patient) => void;
  handleDelete: (patient: Patient) => void;
}

export const PatientTable: React.FC<PatientTableProps> = ({
  patients,
  handleViewDetails,
  handleEdit,
  handleDelete,
}) => {
  if (!patients.length) {
    return (
      <div className="text-center text-gray-500 py-6">
        No patients found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left">Patient ID</th>
            <th className="px-4 py-2 text-left">Name</th>
            <th className="px-4 py-2 text-left">Sex</th>
            <th className="px-4 py-2 text-left">Status</th>
            <th className="px-4 py-2 text-center">Actions</th>
          </tr>
        </thead>

        <tbody>
          {patients.map(patient => (
            <tr key={patient.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-2 font-mono">{patient.patient_id}</td>
              <td className="px-4 py-2">
                {patient.last_name}, {patient.first_name}
              </td>
              <td className="px-4 py-2">{patient.gender}</td>
              <td className="px-4 py-2">{patient.active ? 'Active' : 'Inactive'}</td>

              <td className="px-4 py-2">
                <div className="flex justify-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewDetails(patient)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(patient)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(patient)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
