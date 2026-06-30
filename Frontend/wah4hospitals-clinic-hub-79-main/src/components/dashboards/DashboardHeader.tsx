import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { Layout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Define the widget types for type safety
export type DashboardWidget = 'metrics' | 'admissions' | 'appointments' | 'patients';

interface DashboardHeaderProps {
  visibleWidgets: Record<DashboardWidget, boolean>;
  toggleWidget: (widget: DashboardWidget) => void;
  widgetLabels: Record<DashboardWidget, string>;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ 
  visibleWidgets, 
  toggleWidget, 
  widgetLabels 
}) => {
  const { user } = useAuth();
  const { currentRole } = useRole();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getRoleLabel = (role: string) => {
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-6 rounded-2xl border border-blue-100/50 backdrop-blur-sm shadow-sm grid grid-cols-1 md:grid-cols-3 items-center gap-4">
      {/* Greeting Section */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {getGreeting()}, {user?.lastName || 'User'}!
        </h1>
        <div className="flex items-center mt-1 space-x-2">
           <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200 uppercase tracking-wide">
             {getRoleLabel(currentRole)} Workspace
           </span>
           <p className="text-gray-600 text-sm">Here's your daily overview.</p>
        </div>
      </div>

      {/* Date Display */}
      <div className="bg-white/80 dark:bg-card/80 backdrop-blur-md px-8 py-3 rounded-2xl shadow-sm border border-blue-100/50 flex flex-col items-center justify-self-center">
         <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none mb-1">Today is</p>
         <p className="text-lg font-bold text-foreground leading-none">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
         </p>
      </div>

      {/* Actions / Customization */}
      <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 text-blue-600/70 hover:text-blue-700 hover:bg-blue-200/30 rounded-full">
                <Layout className="w-5 h-5" />
                <span className="sr-only">Customize Dashboard</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Dashboard Widgets</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.entries(widgetLabels).map(([key, label]) => (
                  <DropdownMenuCheckboxItem
                    key={key}
                    checked={visibleWidgets[key as DashboardWidget]}
                    onCheckedChange={() => toggleWidget(key as DashboardWidget)}
                  >
                    {label}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
      </div>
    </div>
  );
};

export default DashboardHeader;
