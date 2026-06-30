/**
 * Patient Details Modal - 6-Card Grid Layout
 * Displays comprehensive patient information using detail cards
 */
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, X } from 'lucide-react';
import type { Patient } from '../../types/patient';
import {
  PersonalInfoCard,
  ContactInfoCard,
  OccupationCard,
  HealthInsuranceCard,
  EmergencyContactCard,
  PWDAndIndigenousCard,
} from './PatientDetailSections';
import { ClinicalDataTabs } from './ClinicalDataTabs';
import { GENDER_MAP } from '../../constants/patientConstants';

interface PatientDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  onEditClick?: () => void;
}

export const PatientDetailsModal: React.FC<PatientDetailsModalProps> = ({
  isOpen,
  onClose,
  patient,
  onEditClick,
}) => {
  const [showClinicalData, setShowClinicalData] = useState(false);

  if (!patient) return null;

  const initials = `${patient.first_name[0] || ''}${patient.last_name[0] || ''}`.toUpperCase();
  const genderDisplay = patient.gender ? GENDER_MAP[patient.gender] : 'Unknown';
  const fullName = `${patient.last_name}, ${patient.first_name} ${patient.middle_name ?? ''} ${patient.suffix_name ?? ''}`.trim();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto p-0">
        {/* Header with close button */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <DialogHeader>
            <DialogTitle className="text-2xl">Patient Details</DialogTitle>
          </DialogHeader>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Patient Header Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-2xl">{initials}</span>
                </div>
              </div>

              {/* Patient Info */}
              <div className="flex-grow">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {fullName}
                </h2>
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <Badge variant="secondary" className="text-sm">
                    ID: {patient.patient_id}
                  </Badge>
                  <Badge variant="outline" className="text-sm">
                    {genderDisplay}
                  </Badge>
                  {patient.active !== false && (
                    <Badge variant="default" className="bg-green-600 text-sm">
                      Active
                    </Badge>
                  )}
                </div>

                {/* Quick Info Row */}
                <div className="flex flex-wrap gap-6 text-sm text-gray-700">
                  {patient.birthdate && (
                    <div>
                      <span className="font-medium">DOB:</span> {patient.birthdate}
                    </div>
                  )}
                  {patient.mobile_number && (
                    <div>
                      <span className="font-medium">Phone:</span> {patient.mobile_number}
                    </div>
                  )}
                  {patient.philhealth_id && (
                    <div>
                      <span className="font-medium">PhilHealth:</span>{' '}
                      {patient.philhealth_id}
                    </div>
                  )}
                </div>
              </div>

              {/* Edit Button */}
              {onEditClick && (
                <Button
                  onClick={onEditClick}
                  className="bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  Edit Patient
                </Button>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 border-b mb-4">
            <button
              onClick={() => setShowClinicalData(false)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                !showClinicalData
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              Patient Information
            </button>
            <button
              onClick={() => setShowClinicalData(true)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                showClinicalData
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              Clinical Data
            </button>
          </div>

          {/* Content based on active tab */}
          {!showClinicalData ? (
            <>
              {/* 6-Card Grid Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Card 1: Personal Information */}
                <PersonalInfoCard patient={patient} />

                {/* Card 2: Contact Information */}
                <ContactInfoCard patient={patient} />

                {/* Card 3: Occupation & Education */}
                <OccupationCard patient={patient} />

                {/* Card 4: Health Insurance & Identifiers */}
                <HealthInsuranceCard patient={patient} />

                {/* Card 5: Emergency Contact */}
                <EmergencyContactCard patient={patient} />

                {/* Card 6: PWD & Indigenous Status */}
                <PWDAndIndigenousCard patient={patient} />
              </div>
            </>
          ) : (
            <ClinicalDataTabs patientId={patient.id} />
          )}

          {/* Footer Info */}
          <div className="border-t pt-4 text-xs text-gray-500 flex justify-between">
            <div>
              {patient.created_at && (
                <span>
                  Created: {new Date(patient.created_at).toLocaleDateString()}
                </span>
              )}
            </div>
            <div>
              {patient.updated_at && (
                <span>
                  Updated: {new Date(patient.updated_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
