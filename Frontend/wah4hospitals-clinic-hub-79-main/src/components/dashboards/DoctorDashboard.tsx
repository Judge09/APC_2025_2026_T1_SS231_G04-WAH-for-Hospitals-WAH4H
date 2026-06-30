import React, { useEffect, useState } from 'react';
import {
  Users,
  FileText,
  Activity,
  Stethoscope,
  Bed,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import MetricCard from '@/components/ui/MetricCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { admissionService } from '@/services/admissionService';
import { laboratoryService } from '@/services/laboratoryService';
import { dischargeService } from '@/services/dischargeService';

// Props for customization
interface DoctorDashboardProps {
  visibleWidgets: Record<string, boolean>;
}

const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ visibleWidgets }) => {
  const [admittedCount, setAdmittedCount] = useState<number>(0);
  const [pendingLabsCount, setPendingLabsCount] = useState<number>(0);
  const [readyForDischargeCount, setReadyForDischargeCount] = useState<number>(0);
  const [recentPatients, setRecentPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        // Fetch Admissions
        const admissions = await admissionService.getAll();
        const activeAdmissions = admissions.filter(a => a.status === 'in-progress');
        setAdmittedCount(activeAdmissions.length);

        // Take top 3 for "My Current Patients"
        setRecentPatients(activeAdmissions.slice(0, 3).map(a => ({
          id: a.encounter_id,
          name: a.patientName || "Unknown Patient",
          condition: a.reasonForAdmission || 'General',
          room: a.location?.room ? `Room ${a.location.room}` : 'Unassigned',
          status: a.priority === 'urgent' ? 'critical' : 'stable'
        })));

        // Fetch Lab Reviews
        const labs = await laboratoryService.getLabRequests({ status: 'requested' });
        setPendingLabsCount(labs.count || 0);

        // Fetch Ready for Discharge
        const discharges = await dischargeService.getPending();
        setReadyForDischargeCount(discharges.length);

        // Aggregate trend data (Last 6 months)
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonth = new Date().getMonth();
        const last6Months = [];
        for (let i = 5; i >= 0; i--) {
          const m = (currentMonth - i + 12) % 12;
          last6Months.push({ month: months[m], admissions: 0, discharges: 0, monthIdx: m });
        }

        admissions.forEach(a => {
          if (a.admissionDate) {
            const date = new Date(a.admissionDate);
            const mName = months[date.getMonth()];
            const dataPoint = last6Months.find(d => d.month === mName);
            if (dataPoint) dataPoint.admissions += 1;
          }
        });

        const completedDischarges = await dischargeService.getDischarged();
        completedDischarges.forEach(d => {
          if (d.discharge_date) {
            const date = new Date(d.discharge_date);
            const mName = months[date.getMonth()];
            const dataPoint = last6Months.find(d => d.month === mName);
            if (dataPoint) dataPoint.discharges += 1;
          }
        });

        setChartData(last6Months);

      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const tasks = [
    { id: 1, title: 'Review Lab Results', count: pendingLabsCount, urgent: pendingLabsCount > 0, icon: <Activity className="w-4 h-4" /> },
    { id: 2, title: 'Discharge Summaries Pending', count: readyForDischargeCount, urgent: false, icon: <FileText className="w-4 h-4" /> },
    { id: 3, title: 'Consultation Requests', count: 0, urgent: false, icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics - tailored for Doctor */}
      {visibleWidgets.metrics && (
        <div className="dashboard-grid">
          <MetricCard
            title="Admitted Patients"
            value={admittedCount.toString()}
            change={2}
            changeType="increase"
            icon={<Users className="w-5 h-5" />}
            color="blue"
          />
          <MetricCard
            title="Consultations Today"
            value="0"
            change={0}
            changeType="increase"
            icon={<Stethoscope className="w-5 h-5" />}
            color="purple"
          />
          <MetricCard
            title="Pending Lab Reviews"
            value={pendingLabsCount.toString()}
            change={pendingLabsCount > 0 ? 1 : 0}
            changeType="increase"
            icon={<Activity className="w-5 h-5" />}
            color="orange"
          />
          <MetricCard
            title="Ready for Discharge"
            value={readyForDischargeCount.toString()}
            change={0}
            changeType="increase"
            icon={<FileText className="w-5 h-5" />}
            color="green"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Trends Chart */}
        {visibleWidgets.admissions && (
          <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-border/50">
            <CardHeader>
              <CardTitle className="chart-title text-primary">Outcome Trends</CardTitle>
              <CardDescription>Historical Admissions vs Discharges</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Line type="monotone" dataKey="admissions" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="discharges" stroke="#10b981" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Priority Actions */}
        {visibleWidgets.appointments && (
          <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center text-primary">
                <FileText className="w-5 h-5 mr-2" />
                Priority Action Items
              </CardTitle>
              <CardDescription>Clinical tasks requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tasks.map((task, index) => (
                  <div key={index} className="flex items-center space-x-4 p-3 border border-border/40 rounded-lg hover:border-primary/30 hover:bg-accent/5 transition-all group cursor-pointer">
                    <div className={cn("p-2 rounded-md", task.urgent ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600")}>
                      {task.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{task.title}</p>
                      <p className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                        {task.count > 0 ? `${task.count} items pending` : 'No pending items'}
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
            </CardContent>
          </Card>
        )}
      </div>

      {/* My Patients List */}
      {visibleWidgets.patients && (
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center text-primary">
              <Stethoscope className="w-5 h-5 mr-2" />
              My Current Patients
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentPatients.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentPatients.map((patient) => (
                  <div key={patient.id} className="flex items-center p-4 rounded-xl hover:bg-muted/50 transition-colors border border-border/50 hover:border-primary/20 bg-card/50">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md mr-4 text-white font-bold text-lg">
                      {patient.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{patient.name}</p>
                      <p className="text-xs text-muted-foreground mb-2">{patient.room} • {patient.condition}</p>
                      <StatusBadge
                        status={patient.status === 'critical' ? 'error' : patient.status === 'stable' ? 'success' : 'warning'}
                        className="text-xs py-0.5"
                      >
                        {patient.status}
                      </StatusBadge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No active admissions found.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DoctorDashboard;
