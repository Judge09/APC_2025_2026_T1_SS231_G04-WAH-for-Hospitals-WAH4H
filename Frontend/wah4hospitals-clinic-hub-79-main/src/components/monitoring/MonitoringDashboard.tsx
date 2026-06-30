import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Bed } from 'lucide-react';
import { MonitoringAdmission, PatientStatus } from '../../types/monitoring';

interface MonitoringDashboardProps {
  admissions: MonitoringAdmission[];
  onSelectAdmission: (adm: MonitoringAdmission) => void;
}

const getStatusBadgeClass = (status: PatientStatus) => {
  switch (status) {
    case 'Stable':
      return 'bg-green-100 text-green-800';
    case 'Critical':
      return 'bg-red-100 text-red-800';
    case 'Observation':
      return 'bg-yellow-100 text-yellow-800';
    case 'Recovering':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({
  admissions = [],
  onSelectAdmission,
}) => {
  if (!admissions.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="bg-blue-50 rounded-full p-6 mb-4">
          <Eye className="w-12 h-12 text-blue-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Patients</h3>
        <p className="text-sm text-gray-500 text-center max-w-md">
          No patients are currently under monitoring. New admissions will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Patient Information
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Room
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Attending Physician
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Assigned Nurse
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-100">
            {admissions.map((adm) => {
              const patientName = adm.patientName || 'Unknown';
              const doctorName = adm.attendingPhysician || 'Unknown';
              const nurseName = adm.assignedNurse || 'Unassigned';
              const room = adm.room || '—';
              const status: PatientStatus = adm.status || 'Stable';

              return (
                <tr 
                  key={adm.id} 
                  className="hover:bg-blue-50/50 transition-colors duration-150"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {patientName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-semibold text-gray-900">{patientName}</div>
                        <div className="text-xs text-gray-500">ID: {adm.patientId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Bed className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">{room}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">Dr. {doctorName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{nurseName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {status === 'Critical' ? (
                      <Badge className="bg-red-100 text-red-800 border-red-200 font-semibold px-3 py-1">
                        <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
                        Critical
                      </Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-800 border-green-200 font-semibold px-3 py-1">
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        Stable
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                      onClick={() => onSelectAdmission(adm)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
