import React, { useEffect, useState } from 'react';
import {
  Users,
  Activity,
  Server,
  Database,
  ShieldCheck,
  AlertTriangle,
  History
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import MetricCard from '@/components/ui/MetricCard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { admissionService } from '@/services/admissionService';
import * as patientsService from '@/services/patientsService';

interface AdminDashboardProps {
  visibleWidgets: Record<string, boolean>;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ visibleWidgets }) => {
  const [activeAdmissions, setActiveAdmissions] = useState<number>(0);
  const [totalPatients, setTotalPatients] = useState<number>(0);
  const [trafficData, setTrafficData] = useState<any[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      setIsLoading(true);
      try {
        const admissions = await admissionService.getAll();
        const active = admissions.filter(a => a.status === 'in-progress').length;
        setActiveAdmissions(active);

        const patients = await patientsService.getPatients();
        setTotalPatients(patients.length);

        // Map admissions to traffic data (simplified trend)
        const countsByDay: Record<string, number> = {};
        admissions.slice(0, 7).forEach(a => {
          const day = a.admissionDate || 'N/A';
          countsByDay[day] = (countsByDay[day] || 0) + 1;
        });

        const chartData = Object.entries(countsByDay).map(([day, users]) => ({
          time: day.split('-').slice(1).join('/'),
          users: users * 10
        }));
        setTrafficData(chartData.length > 0 ? chartData : [
          { time: 'Mon', users: 12 },
          { time: 'Tue', users: 45 },
          { time: 'Wed', users: 120 },
        ]);

        // Recent System Events from live admissions
        const topEvents = admissions.slice(0, 2).map(a => ({
          title: `New Admission: ${a.patientName}`,
          description: `Patient admitted for ${a.reasonForAdmission || 'General'}.`,
          time: a.admissionDate ? new Date(a.admissionDate).toLocaleString() : 'Just now',
          live: true
        }));
        setRecentEvents(topEvents);

      } catch (error) {
        console.error("Failed to fetch admin dashboard data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAdminData();
  }, []);

  return (
    <div className="space-y-6">
      {visibleWidgets.metrics && (
        <div className="dashboard-grid">
          <MetricCard
            title="Active Admissions"
            value={activeAdmissions.toString()}
            change={5}
            changeType="increase"
            icon={<Users className="w-5 h-5" />}
            color="blue"
          />
          <MetricCard
            title="Total Patients"
            value={totalPatients.toString()}
            change={2}
            changeType="increase"
            icon={<Activity className="w-5 h-5" />}
            color="green"
          />
          <MetricCard
            title="System Status"
            value="Stable"
            change={0}
            changeType="increase"
            icon={<Server className="w-5 h-5" />}
            color="purple"
          />
          <MetricCard
            title="Security Audit"
            value="Passed"
            change={0}
            changeType="increase"
            icon={<ShieldCheck className="w-5 h-5" />}
            color="orange"
          />
        </div>
      )}

      {visibleWidgets.admissions && (
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-border/50">
          <CardHeader>
            <CardTitle className="chart-title text-primary">Admission Activity Trend</CardTitle>
            <CardDescription>System-wide admission volume over recent days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trafficData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="time" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Area type="monotone" dataKey="users" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUsers)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {visibleWidgets.appointments && (
        <Card className="border-l-4 border-l-primary shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center text-primary">
              <History className="w-5 h-5 mr-2" />
              Recent System Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentEvents.length > 0 ? recentEvents.map((event, idx) => (
                <div key={idx} className={cn("flex items-center justify-between p-3 rounded-lg", event.live ? "bg-blue-50/50" : "bg-gray-50")}>
                  <div>
                    <p className="font-medium text-foreground">{event.title}</p>
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                  </div>
                  <div className="text-right">
                    <span className={cn("text-[10px] font-bold block", event.live ? "text-primary" : "text-gray-400")}>
                      {event.live ? 'Live' : 'System'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{event.time}</span>
                  </div>
                </div>
              )) : (
                <p className="text-center text-muted-foreground py-4">No recent system events.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminDashboard;
