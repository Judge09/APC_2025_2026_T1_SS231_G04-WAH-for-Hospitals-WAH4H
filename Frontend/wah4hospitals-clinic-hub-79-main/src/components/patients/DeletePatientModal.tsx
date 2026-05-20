import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import type { Patient } from '../../types/patient';
import { deletePatient } from '../../services/patientsService';

interface DeletePatientModalProps {
  isOpen: boolean;
  patient: Patient;
  onClose: () => void;
  fetchPatients: () => Promise<void>;
}

export const DeletePatientModal: React.FC<DeletePatientModalProps> = ({
  isOpen,
  patient,
  onClose,
  fetchPatients,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const canDelete = confirmText === 'DELETE';

  const handleDelete = async () => {
    if (!canDelete) return;

    setLoading(true);
    setError('');

    try {
      await deletePatient(patient.id);
      await fetchPatients();
      handleClose();
    } catch (err: any) {
      console.error('Failed to delete patient:', err);
      setError(
        err.response?.data
          ? JSON.stringify(err.response.data)
          : 'Failed to delete patient'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setConfirmText('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-red-600">Delete Patient</h3>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {error && <p className="text-red-600 mb-2">{error}</p>}

        <p className="text-sm mb-4">
          Are you sure you want to delete <b>{patient.last_name}, {patient.first_name}</b>? This action cannot be undone.
        </p>

        <p className="text-sm mb-2">
          Type <b>DELETE</b> to confirm:
        </p>
        <Input
          value={confirmText}
          onChange={e => setConfirmText(e.target.value)}
          placeholder="Type DELETE"
        />

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!canDelete || loading}
            onClick={handleDelete}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  );
};
