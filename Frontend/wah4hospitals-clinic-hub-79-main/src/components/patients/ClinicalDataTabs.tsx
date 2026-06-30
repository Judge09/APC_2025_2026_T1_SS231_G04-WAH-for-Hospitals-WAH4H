/**
 * Clinical Data Tabs Component
 * Tabbed interface for viewing/managing Conditions, Allergies, and Immunizations
 */
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, AlertCircle } from 'lucide-react';
import type { Condition, Allergy, Immunization } from '../../types/patient';
import { ConditionModal } from './ConditionModal';
import { AllergyModal } from './AllergyModal';
import { ImmunizationModal } from './ImmunizationModal';
import {
  getPatientConditions,
  getPatientAllergies,
  getPatientImmunizations,
  deleteCondition,
  deleteAllergy,
  deleteImmunization,
} from '../../services/patientsService';

interface ClinicalDataTabsProps {
  patientId: number;
  encounterId?: number;
}

type TabType = 'conditions' | 'allergies' | 'immunizations';

export const ClinicalDataTabs: React.FC<ClinicalDataTabsProps> = ({ patientId, encounterId = 1 }) => {
  const [activeTab, setActiveTab] = useState<TabType>('conditions');
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [immunizations, setImmunizations] = useState<Immunization[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [showAllergyModal, setShowAllergyModal] = useState(false);
  const [showImmunizationModal, setShowImmunizationModal] = useState(false);
  const [editingCondition, setEditingCondition] = useState<Condition | null>(null);
  const [editingAllergy, setEditingAllergy] = useState<Allergy | null>(null);
  const [editingImmunization, setEditingImmunization] = useState<Immunization | null>(null);

  // Fetch data
  useEffect(() => {
    loadClinicalData();
  }, [patientId]);

  const loadClinicalData = async () => {
    setLoading(true);
    try {
      const [conditionsData, allergiesData, immunizationsData] = await Promise.all([
        getPatientConditions(patientId),
        getPatientAllergies(patientId),
        getPatientImmunizations(patientId),
      ]);
      setConditions(conditionsData);
      setAllergies(allergiesData);
      setImmunizations(immunizationsData);
    } catch (error) {
      console.error('Error loading clinical data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCondition = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this condition?')) {
      try {
        await deleteCondition(id);
        loadClinicalData();
      } catch (error) {
        console.error('Error deleting condition:', error);
      }
    }
  };

  const handleDeleteAllergy = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this allergy?')) {
      try {
        await deleteAllergy(id);
        loadClinicalData();
      } catch (error) {
        console.error('Error deleting allergy:', error);
      }
    }
  };

  const handleDeleteImmunization = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this immunization?')) {
      try {
        await deleteImmunization(id);
        loadClinicalData();
      } catch (error) {
        console.error('Error deleting immunization:', error);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b">
        <TabButton
          active={activeTab === 'conditions'}
          onClick={() => setActiveTab('conditions')}
          label="Conditions"
          count={conditions.length}
        />
        <TabButton
          active={activeTab === 'allergies'}
          onClick={() => setActiveTab('allergies')}
          label="Allergies"
          count={allergies.length}
        />
        <TabButton
          active={activeTab === 'immunizations'}
          onClick={() => setActiveTab('immunizations')}
          label="Immunizations"
          count={immunizations.length}
        />
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Loading clinical data...</p>
          </div>
        ) : (
          <>
            {activeTab === 'conditions' && (
              <ConditionsTab
                conditions={conditions}
                onAdd={() => {
                  setEditingCondition(null);
                  setShowConditionModal(true);
                }}
                onEdit={(condition) => {
                  setEditingCondition(condition);
                  setShowConditionModal(true);
                }}
                onDelete={handleDeleteCondition}
              />
            )}
            {activeTab === 'allergies' && (
              <AllergiesTab
                allergies={allergies}
                onAdd={() => {
                  setEditingAllergy(null);
                  setShowAllergyModal(true);
                }}
                onEdit={(allergy) => {
                  setEditingAllergy(allergy);
                  setShowAllergyModal(true);
                }}
                onDelete={handleDeleteAllergy}
              />
            )}
            {activeTab === 'immunizations' && (
              <ImmunizationsTab
                immunizations={immunizations}
                onAdd={() => {
                  setEditingImmunization(null);
                  setShowImmunizationModal(true);
                }}
                onEdit={(immunization) => {
                  setEditingImmunization(immunization);
                  setShowImmunizationModal(true);
                }}
                onDelete={handleDeleteImmunization}
              />
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <ConditionModal
        isOpen={showConditionModal}
        onClose={() => {
          setShowConditionModal(false);
          setEditingCondition(null);
        }}
        onSuccess={loadClinicalData}
        condition={editingCondition}
        patientId={patientId}
        encounterId={encounterId}
      />

      <AllergyModal
        isOpen={showAllergyModal}
        onClose={() => {
          setShowAllergyModal(false);
          setEditingAllergy(null);
        }}
        onSuccess={loadClinicalData}
        allergy={editingAllergy}
        patientId={patientId}
        encounterId={encounterId}
      />

      <ImmunizationModal
        isOpen={showImmunizationModal}
        onClose={() => {
          setShowImmunizationModal(false);
          setEditingImmunization(null);
        }}
        onSuccess={loadClinicalData}
        immunization={editingImmunization}
        patientId={patientId}
        encounterId={encounterId}
      />
    </div>
  );
};

// ============================================================================
// TAB BUTTON
// ============================================================================

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}> = ({ active, onClick, label, count }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      active
        ? 'border-blue-600 text-blue-600'
        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
    }`}
  >
    {label} <Badge variant="secondary" className="ml-2">{count}</Badge>
  </button>
);

// ============================================================================
// CONDITIONS TAB
// ============================================================================

const ConditionsTab: React.FC<{
  conditions: Condition[];
  onAdd: () => void;
  onEdit: (condition: Condition) => void;
  onDelete: (id: number) => void;
}> = ({ conditions, onAdd, onEdit, onDelete }) => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <h3 className="text-lg font-semibold">Conditions</h3>
      <Button onClick={onAdd} size="sm" className="bg-blue-600 hover:bg-blue-700">
        <Plus className="w-4 h-4 mr-2" /> Add Condition
      </Button>
    </div>
    {conditions.length === 0 ? (
      <div className="text-center py-12 text-gray-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No conditions recorded</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 gap-3">
        {conditions.map((condition) => (
          <div key={condition.condition_id} className="border rounded-lg p-4 hover:bg-gray-50">
            <div className="flex justify-between items-start">
              <div className="flex-grow">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold">{condition.code}</h4>
                  {condition.severity && (
                    <Badge variant={condition.severity === 'severe' ? 'destructive' : 'secondary'}>
                      {condition.severity}
                    </Badge>
                  )}
                  {condition.clinical_status && (
                    <Badge variant="outline">{condition.clinical_status}</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600">{condition.category}</p>
                {condition.note && <p className="text-sm text-gray-500 mt-2">{condition.note}</p>}
                <div className="text-xs text-gray-400 mt-2">
                  {condition.recorded_date && `Recorded: ${condition.recorded_date}`}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => onEdit(condition)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(condition.condition_id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

// ============================================================================
// ALLERGIES TAB
// ============================================================================

const AllergiesTab: React.FC<{
  allergies: Allergy[];
  onAdd: () => void;
  onEdit: (allergy: Allergy) => void;
  onDelete: (id: number) => void;
}> = ({ allergies, onAdd, onEdit, onDelete }) => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <h3 className="text-lg font-semibold">Allergies & Intolerances</h3>
      <Button onClick={onAdd} size="sm" className="bg-blue-600 hover:bg-blue-700">
        <Plus className="w-4 h-4 mr-2" /> Add Allergy
      </Button>
    </div>
    {allergies.length === 0 ? (
      <div className="text-center py-12 text-gray-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No allergies recorded</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 gap-3">
        {allergies.map((allergy) => (
          <div key={allergy.allergy_id} className="border rounded-lg p-4 hover:bg-gray-50">
            <div className="flex justify-between items-start">
              <div className="flex-grow">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold">{allergy.code}</h4>
                  {allergy.criticality && (
                    <Badge variant={allergy.criticality === 'high' ? 'destructive' : 'secondary'}>
                      {allergy.criticality}
                    </Badge>
                  )}
                  {allergy.type && <Badge variant="outline">{allergy.type}</Badge>}
                </div>
                <p className="text-sm text-gray-600">{allergy.category}</p>
                {allergy.reaction_description && (
                  <p className="text-sm text-gray-700 mt-2">
                    <span className="font-medium">Reaction:</span> {allergy.reaction_description}
                  </p>
                )}
                {allergy.note && <p className="text-sm text-gray-500 mt-2">{allergy.note}</p>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => onEdit(allergy)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(allergy.allergy_id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

// ============================================================================
// IMMUNIZATIONS TAB
// ============================================================================

const ImmunizationsTab: React.FC<{
  immunizations: Immunization[];
  onAdd: () => void;
  onEdit: (immunization: Immunization) => void;
  onDelete: (id: number) => void;
}> = ({ immunizations, onAdd, onEdit, onDelete }) => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <h3 className="text-lg font-semibold">Immunizations</h3>
      <Button onClick={onAdd} size="sm" className="bg-blue-600 hover:bg-blue-700">
        <Plus className="w-4 h-4 mr-2" /> Add Immunization
      </Button>
    </div>
    {immunizations.length === 0 ? (
      <div className="text-center py-12 text-gray-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No immunizations recorded</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 gap-3">
        {immunizations.map((immunization) => (
          <div key={immunization.immunization_id} className="border rounded-lg p-4 hover:bg-gray-50">
            <div className="flex justify-between items-start">
              <div className="flex-grow">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold">
                    {immunization.vaccine_display || immunization.vaccine_code}
                  </h4>
                  <Badge
                    variant={immunization.status === 'completed' ? 'default' : 'secondary'}
                  >
                    {immunization.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-x-6 text-sm text-gray-600">
                  {immunization.lot_number && (
                    <p>Lot: {immunization.lot_number}</p>
                  )}
                  {immunization.dose_quantity_value && (
                    <p>Dose: {immunization.dose_quantity_value} {immunization.dose_quantity_unit}</p>
                  )}
                  {immunization.site_code && (
                    <p>Site: {immunization.site_code}</p>
                  )}
                  {immunization.route_code && (
                    <p>Route: {immunization.route_code}</p>
                  )}
                  {immunization.performer_name && (
                    <p>By: {immunization.performer_name}</p>
                  )}
                </div>
                {immunization.occurrence_datetime && (
                  <p className="text-xs text-gray-400 mt-2">
                    Date: {new Date(immunization.occurrence_datetime).toLocaleDateString()}
                  </p>
                )}
                {immunization.note && <p className="text-sm text-gray-500 mt-2">{immunization.note}</p>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => onEdit(immunization)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(immunization.immunization_id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);
