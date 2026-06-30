import React, { useState, useEffect } from 'react';
import { useRole } from '@/contexts/RoleContext';
import DashboardHeader, { DashboardWidget } from '@/components/dashboards/DashboardHeader';

// Role-Specific Dashboard Imports
import DoctorDashboard from '@/components/dashboards/DoctorDashboard';
import NurseDashboard from '@/components/dashboards/NurseDashboard';
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import PharmacistDashboard from '@/components/dashboards/PharmacistDashboard';
import LabDashboard from '@/components/dashboards/LabDashboard';
import BillingDashboard from '@/components/dashboards/BillingDashboard';

const ModernDashboard = () => {
  const { currentRole } = useRole();

  // Widget Visibility State - Persisted in LocalStorage
  const [visibleWidgets, setVisibleWidgets] = useState<Record<DashboardWidget, boolean>>(() => {
    const saved = localStorage.getItem('dashboardWidgets');
    return saved ? JSON.parse(saved) : {
      metrics: true,
      admissions: true,
      appointments: true,
      patients: true
    };
  });

  // Save preferences when changed
  useEffect(() => {
    localStorage.setItem('dashboardWidgets', JSON.stringify(visibleWidgets));
  }, [visibleWidgets]);

  const toggleWidget = (widget: DashboardWidget) => {
    setVisibleWidgets(prev => ({
      ...prev,
      [widget]: !prev[widget]
    }));
  };

  // Widget Labels for Customization Menu
  const WIDGET_LABELS: Record<DashboardWidget, string> = {
    metrics: 'Key Metrics Cards',
    admissions: 'Analytics & Charts',
    appointments: 'Tasks & Actions',
    patients: 'Patient Lists / Queue'
  };

  /**
   * Dynamic Dashboard Renderer based on User Role
   * This keeps the main file clean and delegates logic to specialized components
   */
  const renderRoleBasedContent = () => {
    switch (currentRole) {
      case 'doctor':
        return <DoctorDashboard visibleWidgets={visibleWidgets} />;
      case 'nurse':
        return <NurseDashboard visibleWidgets={visibleWidgets} />;
      case 'lab_technician':
         return <LabDashboard visibleWidgets={visibleWidgets} />;
      case 'pharmacist':
         return <PharmacistDashboard visibleWidgets={visibleWidgets} />;
      case 'billing_clerk':
         return <BillingDashboard visibleWidgets={visibleWidgets} />;
      // Admin/Fallback
      default:
         return <AdminDashboard visibleWidgets={visibleWidgets} />;
    }
  };

  return (
    <div className="space-y-6">
      <DashboardHeader 
        visibleWidgets={visibleWidgets} 
        toggleWidget={toggleWidget} 
        widgetLabels={WIDGET_LABELS}
      />

      <div className="fade-in-up">
        {renderRoleBasedContent()}
      </div>
    </div>
  );
};

export default ModernDashboard;
