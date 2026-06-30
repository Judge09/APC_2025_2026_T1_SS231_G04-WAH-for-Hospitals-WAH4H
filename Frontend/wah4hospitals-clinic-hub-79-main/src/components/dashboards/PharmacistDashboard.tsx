import React, { useEffect, useState } from 'react';
import {
  FileText,
  Activity,
  AlertTriangle,
  Pill,
  Package
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import MetricCard from '@/components/ui/MetricCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import pharmacyService from '@/services/pharmacyService';

interface PharmacistDashboardProps {
  visibleWidgets: Record<string, boolean>;
}

const PharmacistDashboard: React.FC<PharmacistDashboardProps> = ({ visibleWidgets }) => {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [activeCount, setActiveCount] = useState<number>(0);
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchPharmacyData = async () => {
      setIsLoading(true);
      try {
        const prescribed = await pharmacyService.getRequests('prescribed');
        const active = await pharmacyService.getRequests('active');

        setPendingCount(prescribed.length);
        setActiveCount(active.length);

        // Fetch Inventory for Low Stock count
        const inventory = await pharmacyService.getInventory();
        const lowStock = inventory.filter(item => item.is_low_stock).length;
        setLowStockCount(lowStock);

        // Combine for a task list
        const combined = [...prescribed, ...active].slice(0, 3).map((req, idx) => ({
          id: req.id || idx,
          title: req.inventory_item_detail?.generic_name || 'Medication Request',
          count: 1,
          urgent: req.status === 'prescribed',
          icon: req.status === 'prescribed' ? <FileText className="w-4 h-4" /> : <Activity className="w-4 h-4" />
        }));

        setRecentTasks(combined);

      } catch (error) {
        console.error("Failed to fetch pharmacy dashboard data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPharmacyData();
  }, []);

  return (
    <div className="space-y-6">
      {visibleWidgets.metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            title="Prescriptions Pending"
            value={pendingCount.toString()}
            change={pendingCount > 5 ? 2 : 0}
            changeType="increase"
            icon={<FileText className="w-5 h-5" />}
            color="blue"
          />
          <MetricCard
            title="Dispensing Queue"
            value={activeCount.toString()}
            change={0}
            changeType="decrease"
            icon={<Pill className="w-5 h-5" />}
            color="orange"
          />
          <MetricCard
            title="Low Stock Items"
            value={lowStockCount.toString()}
            change={lowStockCount > 0 ? 1 : 0}
            changeType="increase"
            icon={<Package className="w-5 h-5" />}
            color="red"
          />
        </div>
      )}

      {visibleWidgets.appointments && (
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center text-primary">
              <Pill className="w-5 h-5 mr-2" />
              Pharmacy Queue
            </CardTitle>
            <CardDescription>Items ready for dispensing or verification</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTasks.length > 0 ? (
              <div className="space-y-4">
                {recentTasks.map((task, index) => (
                  <div key={index} className="flex items-center space-x-4 p-3 border border-border/40 rounded-lg">
                    <div className={cn("p-2 rounded-md", task.urgent ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600")}>
                      {task.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{task.title}</p>
                      <p className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                        {task.urgent ? 'High Priority' : 'Routine'}
                      </p>
                    </div>
                    <div className={cn(
                      "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                      task.urgent ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                    )}>
                      {task.count}
                    </div>

                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Pill className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No active pharmacy requests.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PharmacistDashboard;
