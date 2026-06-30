// PatientRegistration.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { History, Network, Search, UserPlus } from 'lucide-react';
import { PatientDetailsModal } from '@/components/patients/PatientDetailsModal';
import { PatientRegistrationModal } from '@/components/patients/PatientRegistrationModal';
import { PatientTable } from '@/components/patients/PatientTable';
import { PatientFilters } from '@/components/patients/PatientFilters';
import { EditPatientModal } from '@/components/patients/EditPatientModal';
import { DeletePatientModal } from '@/components/patients/DeletePatientModal';
import { NetworkSearchModal } from '@/components/patients/NetworkSearchModal';
import { InteropLogsModal } from '@/components/patients/InteropLogsModal';
import type { Patient, PatientFormData } from '../types/patient';
import axios from 'axios';

// NOTE: Ensure trailing slash for Django
const API_URL = import.meta.env.BACKEND_PATIENTS;

// How long (ms) to wait after the user stops typing before firing the search.
const SEARCH_DEBOUNCE_MS = 350;

export const PatientRegistration: React.FC = () => {
  // Patient list state
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal visibility state
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showNetworkSearch, setShowNetworkSearch] = useState(false);
  const [showInteropLogs, setShowInteropLogs] = useState(false);

  // Patient selection state
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [deletePatient, setDeletePatient] = useState<Patient | null>(null);

  // Registration form state
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  /**
   * Pre-fill data passed from NetworkSearchModal after a successful gateway
   * query. Handed into PatientRegistrationModal as `prefillData`.
   */
  const [prefillData, setPrefillData] = useState<Partial<PatientFormData> | undefined>();

  // Logs refresh counter — incremented after a network search completes so
  // the InteropLogsModal shows the latest record when opened.
  const [interopRefreshTrigger, setInteropRefreshTrigger] = useState(0);

  // Filters
  const [activeFilters, setActiveFilters] = useState({
    status: [] as string[],
    gender: [] as string[],
    department: [] as string[],
    civilStatus: [] as string[],
  });

  // Debounce ref for search
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  useEffect(() => { fetchPatients(); }, []);

  const fetchPatients = async () => {
    try {
      const res = await axios.get<Patient[]>(API_URL);
      const data = Array.isArray(res.data) ? res.data : [];
      setPatients(data);
      setFilteredPatients(data);
    } catch (err) {
      console.error('Error fetching patients:', err);
      setPatients([]);
      setFilteredPatients([]);
    }
  };

  const runServerSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        applyLocalFilters(patients, activeFilters);
        return;
      }
      try {
        const res = await axios.get<Patient[]>(`${API_URL}search/`, {
          params: { q: query, limit: 100 },
        });
        applyLocalFilters(Array.isArray(res.data) ? res.data : [], activeFilters);
      } catch (err) {
        console.error('Search error:', err);
      }
    },
    [patients, activeFilters] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const applyLocalFilters = (source: Patient[], filters: typeof activeFilters) => {
    let temp = [...source];
    if (filters.status.length)
      temp = temp.filter((p) => filters.status.includes(p.active ? 'Active' : 'Inactive'));
    if (filters.gender.length)
      temp = temp.filter((p) => filters.gender.includes(p.gender));
    if (filters.civilStatus.length)
      temp = temp.filter((p) => filters.civilStatus.includes(p.civil_status));
    setFilteredPatients(temp);
  };

  useEffect(() => {
    if (searchQuery.trim()) runServerSearch(searchQuery);
    else applyLocalFilters(patients, activeFilters);
  }, [activeFilters, patients]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => runServerSearch(value), SEARCH_DEBOUNCE_MS);
  };

  // -------------------------------------------------------------------------
  // Registration
  // -------------------------------------------------------------------------

  const handleRegisterPatient = async (patientData: PatientFormData) => {
    setFormLoading(true);
    setFormError('');
    try {
      await axios.post(API_URL, patientData);
      fetchPatients();
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.response) {
        const messages =
          typeof err.response.data === 'object'
            ? Object.entries(err.response.data)
                .map(([f, m]) =>
                  Array.isArray(m) ? `${f}: ${m.join(', ')}` : `${f}: ${m}`
                )
                .join('\n')
            : err.response.data;
        setFormError(messages);
      } else {
        setFormError(err.message || 'Failed to register patient');
      }
      throw err;
    } finally {
      setFormLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // WAH4PC callbacks
  // -------------------------------------------------------------------------

  /**
   * Called by NetworkSearchModal when a patient is found on the network.
   * The modal closes itself; we pre-fill and open the registration form.
   */
  const handlePatientFound = (data: Partial<PatientFormData>) => {
    setPrefillData(data);
    setShowRegistrationModal(true);
  };

  /**
   * Called by NetworkSearchModal when any search completes (found or not)
   * so the log list is fresh if the user opens it next.
   */
  const handleSearchComplete = () => {
    setInteropRefreshTrigger((n) => n + 1);
  };

  // -------------------------------------------------------------------------
  // Filter / detail handlers
  // -------------------------------------------------------------------------

  const handleFilterChange = (filterType: string, value: string) => {
    setActiveFilters((prev) => {
      const prevValues = prev[filterType as keyof typeof prev];
      return {
        ...prev,
        [filterType]: prevValues.includes(value)
          ? prevValues.filter((v) => v !== value)
          : [...prevValues, value],
      };
    });
  };

  const clearFilters = () =>
    setActiveFilters({ status: [], gender: [], department: [], civilStatus: [] });

  const handleViewDetails = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowDetailsModal(true);
  };

  const handleEditPatient = (patient: Patient) => setEditPatient(patient);
  const handleDeletePatient = (patient: Patient) => setDeletePatient(patient);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Patients</CardTitle></CardHeader>
        <CardContent>
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search patients..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-8 max-w-sm"
              />
            </div>

            {/* Action buttons — right side */}
            <div className="flex items-center gap-2">
              {/* Search Network — primary action */}
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => setShowNetworkSearch(true)}
              >
                <Network className="w-4 h-4" />
                Search Network
              </Button>

              {/* Interop Logs — icon-only history button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowInteropLogs(true)}
                aria-label="View interop logs"
                title="View interop transaction logs"
              >
                <History className="w-5 h-5 text-muted-foreground" />
              </Button>

              {/* Register Patient */}
              <Button
                onClick={() => {
                  setPrefillData(undefined);
                  setShowRegistrationModal(true);
                }}
                className="flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Register Patient
              </Button>
            </div>
          </div>

          <PatientFilters
            activeFilters={activeFilters}
            handleFilterChange={handleFilterChange}
            clearFilters={clearFilters}
            hasActiveFilters={Object.values(activeFilters).flat().length > 0}
          />

          <PatientTable
            patients={filteredPatients}
            handleViewDetails={handleViewDetails}
            handleEdit={handleEditPatient}
            handleDelete={handleDeletePatient}
          />
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Modals                                                               */}
      {/* ------------------------------------------------------------------ */}

      {/* Register / pre-filled form */}
      <PatientRegistrationModal
        isOpen={showRegistrationModal}
        onClose={() => {
          setShowRegistrationModal(false);
          setPrefillData(undefined);
          setFormError('');
        }}
        onSuccess={handleRegisterPatient}
        isLoading={formLoading}
        error={formError}
        prefillData={prefillData}
      />

      {/* WAH4PC network search */}
      <NetworkSearchModal
        open={showNetworkSearch}
        onClose={() => setShowNetworkSearch(false)}
        onPatientFound={handlePatientFound}
        onSearchComplete={handleSearchComplete}
      />

      {/* Interop transaction logs (hidden until icon clicked) */}
      <InteropLogsModal
        open={showInteropLogs}
        onClose={() => setShowInteropLogs(false)}
        refreshTrigger={interopRefreshTrigger}
      />

      {/* Patient details */}
      {selectedPatient && (
        <PatientDetailsModal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          patient={selectedPatient}
        />
      )}

      {/* Edit patient */}
      {editPatient && (
        <EditPatientModal
          patient={editPatient}
          isOpen={!!editPatient}
          onClose={() => setEditPatient(null)}
          fetchPatients={fetchPatients}
        />
      )}

      {/* Delete patient */}
      {deletePatient && (
        <DeletePatientModal
          patient={deletePatient}
          isOpen={!!deletePatient}
          onClose={() => setDeletePatient(null)}
          fetchPatients={fetchPatients}
        />
      )}
    </div>
  );
};
