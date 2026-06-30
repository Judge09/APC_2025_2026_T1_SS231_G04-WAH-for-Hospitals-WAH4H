
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LayoutDashboard, 
  UserPlus, 
  FileText, 
  Calendar, 
  Activity, 
  UserX, 
  Package, 
  Shield, 
  BarChart3, 
  Building2, 
  Settings,
  Users,
  HeartPulse,
  Pill,
  Microscope,
  Landmark,
  Stethoscope,
  Syringe
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRole } from '@/contexts/RoleContext';
import { Link } from 'react-router-dom';

interface ModuleCardProps {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  onClick: () => void;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ id, name, icon, description, onClick }) => (
  <Card 
    className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
    onClick={onClick}
  >
    <CardContent className="p-6 text-center">
      <div className="w-12 h-12 bg-gradient-to-r from-primary to-secondary rounded-lg mx-auto mb-3 flex items-center justify-center text-white">
        {icon}
      </div>
      <h3 className="font-medium text-gray-900">{name}</h3>
      <p className="text-sm text-gray-500 mt-2">{description}</p>
    </CardContent>
  </Card>
);

const ModulesCategory = () => {
  const { availableTabs } = useRole();

  const handleNavigate = (tabId: string) => {
    window.location.href = `/${tabId}`;
  };

  const moduleCategories = [
    {
      name: "Patient Care",
      modules: [
        { id: 'dashboard', name: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, description: "Main overview of hospital" },
        { id: 'patients', name: 'Patients', icon: <UserPlus className="w-4 h-4" />, description: "Patient registration and info" },
        { id: 'monitoring', name: 'Monitoring', icon: <Activity className="w-4 h-4" />, description: "Patient vitals and status" },
        { id: 'discharge', name: 'Discharge', icon: <UserX className="w-4 h-4" />, description: "Patient discharge process" }
      ]
    },
    {
      name: "Administration",
      modules: [
        { id: 'statistics', name: 'Statistics', icon: <BarChart3 className="w-4 h-4" />, description: "Hospital performance" }
      ]
    },
    {
      name: "Inventory & Compliance",
      modules: [
        { id: 'inventory', name: 'Inventory', icon: <Package className="w-4 h-4" />, description: "Supplies management" },
        { id: 'compliance', name: 'Compliance', icon: <Shield className="w-4 h-4" />, description: "Regulatory compliance" },
        { id: 'billing', name: 'Billing', icon: <FileText className="w-4 h-4" />, description: "Financial management" }
      ]
    },
    {
      name: "System",
      modules: [
        { id: 'settings', name: 'Settings', icon: <Settings className="w-4 h-4" />, description: "System configuration" }
      ]
    }
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Hospital Modules</h2>
        <p className="text-gray-600 mt-2">
          Browse and access all available hospital management modules for your role
        </p>
      </div>

      <Tabs defaultValue="by-category" className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
          <TabsTrigger value="by-category">By Category</TabsTrigger>
          <TabsTrigger value="all-modules">All Modules</TabsTrigger>
        </TabsList>
        
        <TabsContent value="by-category" className="mt-6">
          <div className="space-y-8">
            {moduleCategories.map((category) => {
              const filteredModules = category.modules.filter(module => availableTabs.includes(module.id));
                
              if (filteredModules.length === 0) return null;
              
              return (
                <div key={category.name}>
                  <h3 className="text-lg font-semibold text-primary mb-4 flex items-center">
                    {category.name}
                    <Badge variant="outline" className="ml-2 text-sm">
                      {filteredModules.length} modules
                    </Badge>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredModules.map((module) => (
                      <ModuleCard
                        key={module.id}
                        id={module.id}
                        name={module.name}
                        icon={module.icon}
                        description={module.description}
                        onClick={() => handleNavigate(module.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
        
        <TabsContent value="all-modules" className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {moduleCategories.flatMap(category => {
              return category.modules
                .filter(module => availableTabs.includes(module.id))
                .map(module => (
                  <ModuleCard
                    key={module.id}
                    id={module.id}
                    name={module.name}
                    icon={module.icon}
                    description={module.description}
                    onClick={() => handleNavigate(module.id)}
                  />
                ));
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ModulesCategory;
