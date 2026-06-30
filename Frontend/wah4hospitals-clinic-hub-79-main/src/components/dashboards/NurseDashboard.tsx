import React, { useEffect, useState } from 'react';
import {
  Users,
  Activity,
  Clock,
  HeartPulse,
  Syringe,
  AlertCircle,
  FlaskConical,
  Pill,
  FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import MetricCard from '@/components/ui/MetricCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { admissionService } from '@/services/admissionService';
import { laboratoryService } from '@/services/laboratoryService';
import pharmacyService from '@/services/pharmacyService';
import { dischargeService } from '@/services/dischargeService';

interface NurseDashboardProps {
  visibleWidgets: Record<string, boolean>;
}

const NurseDashboard: React.FC<NurseDashboardProps> = ({ visibleWidgets }) => {
  const [admittedCount, setAdmittedCount] = useState<number>(0);
  const [labCount, setLabCount] = useState<number>(0);
  const [medsCount, setMedsCount] = useState<number>(0);
  const [dischargeCount, setDischargeCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [shiftActivity, setShiftActivity] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch Admissions
        const admissions = await admissionService.getAll();
        const activeAdmissions = admissions.filter(a => a.status === 'in-progress').length;
        setAdmittedCount(activeAdmissions);

        // Fetch Lab Requests (Requested + Verified/Pending)
        const labReqs = await laboratoryService.getLabRequests({ status: 'active' });
        setLabCount(labReqs.count);

        // Fetch Medication Requests (Pending/Active)
        const activeMeds = await pharmacyService.getRequests('active');
        const prescribedMeds = await pharmacyService.getRequests('prescribed');
        setMedsCount(activeMeds.length + prescribedMeds.length);

        // Fetch Discharges
        const discharges = await dischargeService.getPending();
        setDischargeCount(discharges.length);

        // Aggregate shift activity (Today's activity by hour block)
        const today = new Date().toISOString().split('T')[0];
        const activityMap: Record<string, number> = {
          '6am': 0, '8am': 0, '10am': 0, '12pm': 0, '2pm': 0, '4pm': 0, '6pm': 0
        };

        admissions.forEach(a => {
          if (a.admissionDate && a.admissionDate.startsWith(today)) {
            const hour = new Date(a.admissionDate).getHours();
            if (hour >= 6 && hour < 8) activityMap['6am']++;
            else if (hour >= 8 && hour < 10) activityMap['8am']++;
            else if (hour >= 10 && hour < 12) activityMap['10am']++;
            else if (hour >= 12 && hour < 14) activityMap['12pm']++;
            else if (hour >= 14 && hour < 16) activityMap['2pm']++;
            else if (hour >= 16 && hour < 18) activityMap['4pm']++;
            else if (hour >= 18) activityMap['6pm']++;
          }
        });

        const chartData = Object.entries(activityMap).map(([hour, checked]) => ({
          hour,
          checked
        }));
        setShiftActivity(chartData);

      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const dynamicTasks = [
    { id: 1, title: 'Pending Lab Specimens', value: labCount, urgent: labCount > 5, icon: <FlaskConical className="w-4 h-4" /> },
    { id: 2, title: 'Medication Dispensing', value: medsCount, urgent: medsCount > 0, icon: <Pill className="w-4 h-4" /> },
    { id: 3, title: 'Ready for Discharge', value: dischargeCount, urgent: false, icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {visibleWidgets.metrics && (
        <div className="dashboard-grid">
          <MetricCard
            title="Admitted Patients"
            value={admittedCount.toString()}
            change={0}
            changeType="increase"
            icon={<Users className="w-5 h-5" />}
            color="blue"
          />
          <MetricCard
            title="Lab Requests"
            value={labCount.toString()}
            change={labCount > 0 ? 1 : 0}
            changeType="increase"
            icon={<FlaskConical className="w-5 h-5" />}
            color="orange"
          />
          <MetricCard
            title="Medications Due"
            value={medsCount.toString()}
            change={medsCount > 5 ? 2 : 0}
            changeType="increase"
            icon={<Pill className="w-5 h-5" />}
            color="purple"
          />
          <MetricCard
            title="Ready for Discharge"
            value={dischargeCount.toString()}
            change={0}
            changeType="increase"
            icon={<FileText className="w-5 h-5" />}
            color="green"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {visibleWidgets.admissions && (
          <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-border/50">
            <CardHeader>
              <CardTitle className="chart-title text-primary">Shift Activity</CardTitle>
              <CardDescription>Estimated patient interactions per hour</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={shiftActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="hour" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar dataKey="checked" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {visibleWidgets.appointments && (
          <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center text-primary">
                <Clock className="w-5 h-5 mr-2" />
                Current Priorities
              </CardTitle>
              <CardDescription>System-wide tasks requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dynamicTasks.map((task, index) => (
                  <div key={index} className="flex items-center space-x-4 p-3 border border-border/40 rounded-lg hover:border-primary/30 hover:bg-accent/5 transition-all group cursor-pointer">
                    <div className={cn("p-2 rounded-md", task.urgent ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600")}>
                      {task.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{task.title}</p>
                      <p className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                        {task.value} items currently active
                      </p>
                    </div>
                    <StatusBadge status={task.urgent ? 'error' : 'info'} size="sm">
                      {task.urgent ? 'Action Needed' : 'Monitor'}
                    </StatusBadge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default NurseDashboard;
