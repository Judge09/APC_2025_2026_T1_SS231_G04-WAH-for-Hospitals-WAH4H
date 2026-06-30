import React, { useState } from 'react';
import { Bell, User, Search, HelpCircle, X, Plus, Crown, Pencil, Grid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRole } from '@/contexts/RoleContext';
import { useAuth } from '@/contexts/AuthContext';
import CustomizationPanel from './CustomizationPanel';
import ModulesCategory from './ModulesCategory';
import ChatBot from '@/components/chatbot/ChatBot';
import HelpSupportModal from '@/components/help/HelpSupportModal';
import { useNavigate } from 'react-router-dom';

interface ModernLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  tabs: Array<{
    id: string;
    name: string;
    icon: React.ReactNode;
  }>;
  onTabChange: (tabId: string) => void;
}

const ModernLayout: React.FC<ModernLayoutProps> = ({
  children,
  activeTab,
  tabs,
  onTabChange
}) => {
  const { currentRole, availableTabs } = useRole();
  const { user, logout } = useAuth();
  const [openTabs, setOpenTabs] = useState(['dashboard']);
  const [showNewTabDashboard, setShowNewTabDashboard] = useState(false);
  const [showModulesCategory, setShowModulesCategory] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const navigate = useNavigate();

  // Filter tabs based on role permissions - ALWAYS filter based on available tabs
  const filteredTabs = tabs.filter(tab => availableTabs.includes(tab.id));

  const notifications = [
    { id: 1, title: "New patient admission", time: "2 min ago", type: "info" },
    { id: 2, title: "PhilHealth claim approved", time: "5 min ago", type: "success" },
    { id: 3, title: "Lab results ready", time: "10 min ago", type: "warning" },
  ];

  const handleTabClose = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newOpenTabs = openTabs.filter(id => id !== tabId);
    setOpenTabs(newOpenTabs);

    // If closing active tab, switch to another tab
    if (tabId === activeTab) {
      if (newOpenTabs.length > 0) {
        onTabChange(newOpenTabs[newOpenTabs.length - 1]);
      } else {
        setShowNewTabDashboard(true);
      }
    }
  };

  const handleTabClick = (tabId: string) => {
    // Check if tab is available in current role
    if (!availableTabs.includes(tabId)) {
      return;
    }

    if (!openTabs.includes(tabId)) {
      setOpenTabs([...openTabs, tabId]);
    }
    onTabChange(tabId);
    setShowNewTabDashboard(false);
    setShowModulesCategory(false);
  };

  const handleNewTab = () => {
    setShowNewTabDashboard(true);
    setShowModulesCategory(false);
  };

  const handleShowModules = () => {
    setShowModulesCategory(true);
    setShowNewTabDashboard(false);
  };

  const getRoleDisplayName = () => {
    const roleMap: Record<string, string> = {
      'doctor': 'Doctor',
      'nurse': 'Nurse',
      'pharmacist': 'Pharmacist',
      'lab-technician': 'Lab Technician',
      'administrator': 'Administrator',
      'radiologist': 'Radiologist',
      'billing-staff': 'Billing Staff'
    };
    return roleMap[currentRole] || currentRole;
  };

  const getRoleWelcomeMessage = () => {
    const messages: Record<string, string> = {
      'doctor': 'Welcome back, Doctor! Your patients are waiting.',
      'nurse': 'Welcome back! Ready to provide excellent patient care.',
      'pharmacist': 'Welcome back! Medication management is ready.',
      'lab-technician': 'Welcome back! Lab results and monitoring await.',
      'administrator': 'Welcome back, Admin! Full system access available.',
      'radiologist': 'Welcome back! Imaging and monitoring tools ready.',
      'billing-staff': 'Welcome back! Billing and financial tools available.'
    };
    return messages[currentRole] || 'Welcome back!';
  };

  const handleNavigateToAccountSettings = () => {
    navigate('/account-settings');
  };

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const NewTabDashboard = () => (
    <div className="space-y-6 p-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Open a New Tab</h2>
        <p className="text-gray-600">
          Choose from your available {getRoleDisplayName()} modules
        </p>
        <p className="text-sm text-purple-600 mt-2">
          {getRoleWelcomeMessage()}
        </p>
      </div>

      {/* <Button 
        variant="outline" 
        className="mx-auto flex items-center gap-2 mb-6" 
        onClick={handleShowModules}
      >
        <Grid className="w-4 h-4" />
        View All Modules by Category
      </Button> */}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredTabs.map((tab) => (
          <Card
            key={tab.id}
            className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
            onClick={() => handleTabClick(tab.id)}
          >
            <CardContent className="p-6 text-center relative">

              <div className="w-12 h-12 bg-gradient-to-r from-primary to-secondary rounded-lg mx-auto mb-3 flex items-center justify-center text-white">
                {tab.icon}
              </div>

              <h3 className="font-medium text-gray-900">{tab.name}</h3>

            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="glass-card border-b border-white/20 sticky top-0 z-40">
        {/* Grid Container: 3 columns on desktop, 2x2 on mobile */}
        <div className="px-6 py-4 grid grid-cols-2 gap-2.5 sm:grid-cols-[1fr_1fr_1fr] items-center">

          {/* Item 1: Logo + Title (grid area: one) */}
          <div className="col-start-1 col-end-2 row-start-1 row-end-2 sm:col-start-1 sm:col-end-2">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 gradient-primary rounded-full flex items-center justify-center">
                <img src="/wah_logo.png" alt="WAH4Hospitals Logo" className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gradient">WAH4H</h1>
                <div className="flex items-center space-x-2 hidden sm:flex">
                  <p className="text-sm text-gray-500">Healthcare Information System</p>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200 text-xs">
                    <Crown className="w-3 h-3 mr-1" />
                    {getRoleDisplayName()}
                  </Badge>
                </div>
              </div>
            </div>
          </div>


          {/* Item 2: Empty Spacer (was Search Bar) */}
          <div className="col-start-1 col-end-3 row-start-2 row-end-3 sm:col-start-2 sm:col-end-3 sm:row-start-1 sm:row-end-2">
            {/* Search bar removed */}
          </div>

          {/* Item 3: Right Actions (grid area: three) */}
          <div className="col-start-2 col-end-3 row-start-1 row-end-2 sm:col-start-3 sm:col-end-4 flex items-center justify-end">
            <div className="flex items-center space-x-4">

              {/* Help Only */}
              <HelpSupportModal>
                <Button variant="ghost" size="sm" className="hover-lift">
                  <HelpCircle className="w-5 h-5" />
                </Button>
              </HelpSupportModal>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center space-x-2 hover-lift"
                  >
                    <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center">
                      <span className="text-white font-medium">
                        {(() => {
                          const fName = ((user as any)?.firstName || (user as any)?.first_name || '').trim();
                          const lName = ((user as any)?.lastName || (user as any)?.last_name || '').trim();

                          if (fName && lName) {
                            return `${fName[0]}${lName[0]}`.toUpperCase();
                          }
                          if (fName) {
                            // If only first name, try to split it
                            const parts = fName.split(/\s+/);
                            if (parts.length > 1) {
                              return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
                            }
                            return fName.slice(0, 2).toUpperCase();
                          }
                          if (lName) {
                            return lName.slice(0, 2).toUpperCase();
                          }
                          return 'GU';
                        })()}
                      </span>
                    </div>
                    <div className="text-left hidden md:block">
                      <p className="text-sm font-medium">
                        {(() => {
                          if (!user) return 'Guest User';
                          const fName = ((user as any)?.firstName || (user as any)?.first_name || '').trim();
                          const lName = ((user as any)?.lastName || (user as any)?.last_name || '').trim();

                          if (fName && lName) return `${fName} ${lName}`;
                          return fName || lName || 'Unknown User';
                        })()}
                      </p>
                      <p className="text-xs text-gray-500">{getRoleDisplayName()}</p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="modal-content">
                  <DropdownMenuItem className="font-medium text-purple-700">
                    <Crown className="w-4 h-4 mr-2" />
                    {getRoleDisplayName()} Mode
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleNavigateToAccountSettings}>
                    <User className="w-4 h-4 mr-2" />
                    My Profile
                  </DropdownMenuItem>
                  <HelpSupportModal>
                    <DropdownMenuItem>
                      <HelpCircle className="w-4 h-4 mr-2" />
                      Help & Support
                    </DropdownMenuItem>
                  </HelpSupportModal>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600" onClick={handleSignOut}>
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Chrome-style Tab Navigation */}
        <div className="px-6 pb-0">
          <div className="flex items-center space-x-1 overflow-x-auto scrollbar-hide">
            {openTabs.map((tabId) => {
              const tab = filteredTabs.find(t => t.id === tabId);
              if (!tab) return null;

              return (
                <div
                  key={tabId}
                  className={`chrome-tab ${activeTab === tabId ? 'active' : ''} group `}
                  onClick={() => handleTabClick(tabId)}
                >
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      {tab.icon}
                    </div>
                    <span className="truncate">{tab.name}</span>
                  </div>
                  {openTabs.length > 1 && (
                    <button
                      onClick={(e) => handleTabClose(tabId, e)}
                      className="flex-shrink-0 w-4 h-4 rounded-full hover:bg-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center ml-2"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* New Tab Button */}
            <button
              onClick={handleNewTab}
              className="new-tab-btn flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-200 transition-colors ml-2"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="animate-fade-in">
          {showNewTabDashboard ? <NewTabDashboard /> :
            showModulesCategory ? <ModulesCategory /> :
              React.Children.map(children, child => {
                if (React.isValidElement(child)) {
                  return React.cloneElement(child, { onNavigate: handleTabClick } as any);
                }
                return child;
              })}
        </div>
      </main>

      {/* AI Chatbot - New bottom-right messaging style */}
      <ChatBot currentModule={activeTab} />
    </div>
  );
};

export default ModernLayout;
