
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Shield, Lock } from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';
import { useAuth } from '@/contexts/AuthContext';

const AdminAccess = () => {
  const { currentRole, availableTabs } = useRole();
  const { user } = useAuth();

  const getRoleDisplayName = () => {
    const roleMap: Record<string, string> = {
      'admin': 'Administrator',
      'doctor': 'Doctor',
      'nurse': 'Nurse',
      'pharmacist': 'Pharmacist',
      'lab_technician': 'Lab Technician',
      'billing_clerk': 'Billing Clerk',
    };
    return roleMap[currentRole] || currentRole;
  };

  const isAdmin = currentRole === 'admin';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="w-5 h-5" />
          Access Control
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current User Role */}
        <div className="p-4 border rounded-lg bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">Current Account</h3>
            <Badge variant="outline">{getRoleDisplayName()}</Badge>
          </div>
          <p className="text-sm text-gray-600">
            {user ? `${user.firstName} ${user.lastName}` : 'Unknown User'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Role: {getRoleDisplayName()}
          </p>
        </div>

        {/* Admin indicator */}
        {isAdmin && (
          <div className="flex items-center gap-2 p-3 border rounded-lg bg-purple-50">
            <Shield className="w-4 h-4 text-purple-600" />
            <div>
              <p className="font-medium text-purple-800">Administrator</p>
              <p className="text-sm text-purple-600">Full system access enabled</p>
            </div>
          </div>
        )}

        {/* Role Restrictions Notice */}
        {!isAdmin && (
          <div className="flex items-center gap-2 p-3 border rounded-lg bg-blue-50">
            <Lock className="w-4 h-4 text-blue-600" />
            <div>
              <p className="font-medium text-blue-800">Role-Based Access</p>
              <p className="text-sm text-blue-600">
                Your access is limited to modules relevant to your role as a {getRoleDisplayName()}
              </p>
            </div>
          </div>
        )}

        {/* Available Modules */}
        <div className="space-y-4">
          <h3 className="font-medium">Available Modules</h3>
          <div className="grid grid-cols-2 gap-2">
            {availableTabs.map(module => (
              <div
                key={module}
                className="flex items-center gap-2 p-2 bg-green-50 text-green-800 rounded-md text-sm"
              >
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                {module.charAt(0).toUpperCase() + module.slice(1).replace('_', ' ')}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            {availableTabs.length} module(s) available for your role
          </p>
        </div>

        {/* Role Change Notice */}
        <div className="p-3 border rounded-lg bg-yellow-50">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Your role is determined by your account and cannot be changed from this interface.
            Contact an administrator to modify your role permissions.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminAccess;
