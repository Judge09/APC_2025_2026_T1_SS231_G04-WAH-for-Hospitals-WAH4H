import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface PendingItem {
  id: string;
  name: string;
  status: boolean;
  description: string;
  required: boolean;
}

interface DischargeRequirements {
  finalDiagnosis: boolean;
  physicianSignature: boolean;
  medicationReconciliation: boolean;
  dischargeSummary: boolean;
  billingClearance: boolean;
  nursingNotes: boolean;
  followUpScheduled: boolean;
}

interface PendingItemsSectionProps {
  requirements: DischargeRequirements;
  className?: string;
  onRequirementChange?: (requirementKey: keyof DischargeRequirements, value: boolean) => void;
  readOnly?: boolean;
}

export const PendingItemsSection: React.FC<PendingItemsSectionProps> = ({
  requirements,
  className = "",
  onRequirementChange,
  readOnly = false
}) => {
  const pendingItems: PendingItem[] = [
    {
      id: 'finalDiagnosis',
      name: 'Final Diagnosis',
      status: requirements.finalDiagnosis,
      description: 'Complete final diagnosis documentation required',
      required: true
    },
    {
      id: 'physicianSignature',
      name: 'Physician Signature',
      status: requirements.physicianSignature,
      description: 'Attending physician signature on discharge orders',
      required: true
    },
    {
      id: 'medicationReconciliation',
      name: 'Medication Reconciliation',
      status: requirements.medicationReconciliation,
      description: 'Complete medication reconciliation and discharge prescriptions',
      required: true
    },
    {
      id: 'dischargeSummary',
      name: 'Discharge Summary',
      status: requirements.dischargeSummary,
      description: 'Complete discharge summary with treatment details',
      required: true
    },
    {
      id: 'billingClearance',
      name: 'Billing Clearance',
      status: requirements.billingClearance,
      description: 'Billing department clearance for discharge',
      required: true
    },
    {
      id: 'nursingNotes',
      name: 'Nursing Notes',
      status: requirements.nursingNotes,
      description: 'Final nursing assessment and care notes',
      required: false
    },
    {
      id: 'followUpScheduled',
      name: 'Follow-up Scheduled',
      status: requirements.followUpScheduled,
      description: 'Follow-up appointments scheduled if required',
      required: false
    }
  ];

  const missingRequired = pendingItems.filter(item => item.required && !item.status);
  const completedItems = pendingItems.filter(item => item.status);

  const handleCheckboxChange = (itemId: string, checked: boolean) => {
    if (onRequirementChange && !readOnly) {
      onRequirementChange(itemId as keyof DischargeRequirements, checked);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          Discharge Checklist
          <Badge variant="outline" className="ml-auto">
            {completedItems.length} / {pendingItems.length} Complete
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {missingRequired.length > 0 && (
          <Alert className="border-destructive/20 bg-destructive/5">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive font-medium">
              {missingRequired.length} critical item(s) must be completed before discharge
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {pendingItems.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${!item.status && item.required
                ? 'border-destructive/20 bg-destructive/5'
                : item.status
                  ? 'border-green-200 bg-green-50'
                  : 'border-muted bg-muted/30'
                }`}
            >
              <Checkbox
                id={item.id}
                checked={item.status}
                onCheckedChange={(checked) => handleCheckboxChange(item.id, checked as boolean)}
                disabled={readOnly}
                className="mt-1"
              />
              <div className="flex-1">
                <label
                  htmlFor={item.id}
                  className={`flex items-center gap-2 cursor-pointer ${readOnly ? 'cursor-default' : ''}`}
                >
                  <span className={`font-medium ${item.required ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {item.name}
                    {item.required && <span className="text-destructive">*</span>}
                  </span>
                  {item.status && <CheckCircle className="w-4 h-4 text-green-600" />}
                </label>
                <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        {missingRequired.length === 0 && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 font-medium">
              All required items completed. Patient is ready for discharge.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};