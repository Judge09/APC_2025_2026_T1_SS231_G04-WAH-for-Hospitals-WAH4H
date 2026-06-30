import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Utensils, Activity, Edit } from 'lucide-react';
import { DietaryOrder } from '../../types/monitoring';
import monitoringService from '../../services/monitoringService';
import { toast } from 'sonner';

interface DietaryTabProps {
  admissionId: string;
  patientId: number; // Added for service call
  order?: DietaryOrder;
  onSaved?: (order: DietaryOrder) => void;
}

export const DietaryTab: React.FC<DietaryTabProps> = ({
  admissionId,
  patientId,
  order: initialOrder,
  onSaved,
}) => {
  const [currentOrder, setCurrentOrder] = useState<DietaryOrder | undefined>(initialOrder);
  const [isEditing, setIsEditing] = useState(!initialOrder);
  const [dietType, setDietType] = useState(initialOrder?.dietType ?? 'Regular');
  const [allergies, setAllergies] = useState(
    Array.isArray(initialOrder?.allergies) ? initialOrder!.allergies.join(', ') : ''
  );
  const [isNPO, setIsNPO] = useState(initialOrder?.npoResponse ?? false);
  const [activityLevel, setActivityLevel] = useState(
    initialOrder?.activityLevel ?? 'As Tolerated'
  );
  const [orderedBy, setOrderedBy] = useState(initialOrder?.orderedBy ?? '—');
  const [lastUpdated, setLastUpdated] = useState(initialOrder?.lastUpdated ?? '');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch latest order from backend using service
  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      try {
        const orderData = await monitoringService.getDietary(Number(admissionId));
        if (orderData) {
          setCurrentOrder(orderData);
          setDietType(orderData.dietType);
          setAllergies(orderData.allergies.join(', '));
          setIsNPO(orderData.npoResponse);
          setActivityLevel(orderData.activityLevel);
          setOrderedBy(orderData.orderedBy);
          setLastUpdated(orderData.lastUpdated);
          setIsEditing(false);
        } else {
          setIsEditing(true); // no order yet, allow creation
        }
      } catch (err) {
        console.error('Failed to fetch dietary order:', err);
        toast.error('Failed to load dietary order');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [admissionId]);

  const handleSave = async () => {
    const orderData: DietaryOrder = {
      id: currentOrder?.id,
      admissionId,
      dietType,
      allergies: allergies
        ? allergies.split(',').map(a => a.trim()).filter(Boolean)
        : [],
      npoResponse: isNPO,
      activityLevel,
      orderedBy: 'Dr. Current User', // TODO: Get from auth context
      lastUpdated: new Date().toISOString(),
    };

    try {
      setSaving(true);
      await monitoringService.saveDietary(orderData, patientId);
      
      setCurrentOrder(orderData);
      onSaved?.(orderData);
      setIsEditing(false);
      toast.success('Dietary order saved successfully');
    } catch (err: any) {
      console.error('Dietary save failed:', err);
      toast.error('Failed to save dietary order. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading dietary order...</span>
      </div>
    );
  }

  // Editing UI
  if (isEditing) {
    return (
      <Card className="shadow-md">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-yellow-50">
          <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Utensils className="w-6 h-6 text-orange-600" />
            Update Dietary & Activity Orders
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* NPO Alert */}
          <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <div>
                  <Label className="text-lg font-bold text-red-800 cursor-pointer">NPO (Nothing by Mouth)</Label>
                  <p className="text-sm text-red-600 mt-1">Patient should receive no oral food or fluids</p>
                </div>
              </div>
              <Switch checked={isNPO} onCheckedChange={setIsNPO} className="data-[state=checked]:bg-red-600" />
            </div>
          </div>

          {/* Diet Type */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Utensils className="w-4 h-4" />
              Diet Type
            </Label>
            <Select value={dietType} onValueChange={setDietType} disabled={isNPO}>
              <SelectTrigger className={isNPO ? 'opacity-50' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Regular">Regular Diet</SelectItem>
                <SelectItem value="Soft">Soft Diet</SelectItem>
                <SelectItem value="Low Salt">Low Salt/Sodium</SelectItem>
                <SelectItem value="Diabetic">Diabetic Diet</SelectItem>
                <SelectItem value="Clear Liquids">Clear Liquids Only</SelectItem>
                <SelectItem value="Full Liquids">Full Liquids</SelectItem>
              </SelectContent>
            </Select>
            {isNPO && (
              <p className="text-xs text-red-600">NPO status overrides diet selection</p>
            )}
          </div>

          {/* Allergies */}
          {!isNPO && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Food Allergies & Restrictions</Label>
              <Textarea
                value={allergies}
                onChange={e => setAllergies(e.target.value)}
                placeholder="Enter allergies separated by commas (e.g., Peanuts, Seafood, Dairy)"
                className="min-h-[80px]"
              />
              <p className="text-xs text-gray-500">Separate multiple allergies with commas</p>
            </div>
          )}

          {/* Activity Level */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Activity Level
            </Label>
            <Select value={activityLevel} onValueChange={setActivityLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Bed Rest">Bed Rest - No Activity</SelectItem>
                <SelectItem value="Bathroom Privileges">Bathroom Privileges Only</SelectItem>
                <SelectItem value="Ambulatory">Ambulatory - With Assistance</SelectItem>
                <SelectItem value="As Tolerated">As Tolerated - Independent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button 
              variant="outline" 
              onClick={() => setIsEditing(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                'Save & Notify Dietary'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Display UI
  return (
    <Card className="shadow-md">
      <CardHeader className="bg-gradient-to-r from-orange-50 to-yellow-50">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Utensils className="w-6 h-6 text-orange-600" />
            <CardTitle className="text-xl font-bold text-gray-900">Dietary Order Details</CardTitle>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setIsEditing(true)}
            className="hover:bg-orange-50"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Orders
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* NPO Status Alert */}
        {currentOrder?.npoResponse && (
          <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <div>
                <p className="font-bold text-red-800 text-lg">NPO Status Active</p>
                <p className="text-sm text-red-600">Patient should receive no oral food or fluids</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Diet Type</Label>
            <div className="flex items-center gap-2 bg-orange-50 rounded-lg p-3 border border-orange-200">
              <Utensils className="w-5 h-5 text-orange-600" />
              <span className="text-lg font-semibold text-gray-900">
                {currentOrder?.dietType || '—'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Activity Level</Label>
            <div className="flex items-center gap-2 bg-blue-50 rounded-lg p-3 border border-blue-200">
              <Activity className="w-5 h-5 text-blue-600" />
              <span className="text-lg font-semibold text-gray-900">
                {currentOrder?.activityLevel || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Allergies Section */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Food Allergies & Restrictions</Label>
          {Array.isArray(currentOrder?.allergies) && currentOrder.allergies.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {currentOrder.allergies.map((allergy, i) => (
                <span 
                  key={i} 
                  className="inline-flex items-center gap-1 px-3 py-2 bg-red-100 text-red-800 rounded-full text-sm font-medium border border-red-200"
                >
                  <AlertCircle className="w-3 h-3" />
                  {allergy}
                </span>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="text-sm text-gray-500 italic">No allergies recorded</p>
            </div>
          )}
        </div>

        {/* Order Metadata */}
        <div className="border-t pt-6 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Ordered By:</span>
            <span className="font-semibold text-gray-900">{currentOrder?.orderedBy || '—'}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Last Updated:</span>
            <span className="font-semibold text-gray-900">
              {currentOrder?.lastUpdated 
                ? new Date(currentOrder.lastUpdated).toLocaleString('en-PH', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : '—'
              }
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
