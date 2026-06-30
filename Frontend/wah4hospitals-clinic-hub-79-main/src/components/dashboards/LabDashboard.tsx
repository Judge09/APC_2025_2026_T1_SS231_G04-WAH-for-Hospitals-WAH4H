import React, { useEffect, useState } from 'react';
import {
  FileText,
  Activity,
  FlaskConical,
  Microscope,
  AlertOctagon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import MetricCard from '@/components/ui/MetricCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import { laboratoryService } from '@/services/laboratoryService';

interface LabDashboardProps {
  visibleWidgets: Record<string, boolean>;
}

const LabDashboard: React.FC<LabDashboardProps> = ({ visibleWidgets }) => {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [criticalCount, setCriticalCount] = useState<number>(0);
  const [recentTests, setRecentTests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchLabData = async () => {
      setIsLoading(true);
      try {
        // Fetch Active Tests
        const activeReqs = await laboratoryService.getLabRequests({ status: 'active' });
        setPendingCount(activeReqs.count);

        // Fetch Recent tests for the queue (top 3)
        setRecentTests(activeReqs.results.slice(0, 3).map(r => ({
          id: r.id,
          type: r.test_type_display,
          patient: r.patient_name,
          priority: r.priority,
          status: r.status
        })));

        // Fetch Completed Tests (for "Results Ready" metric)
        const completedReqs = await laboratoryService.getLabRequests({ status: 'completed' });
        setCompletedCount(completedReqs.count);

        // Calculate Critical Values from completed tests
        let criticals = 0;
        completedReqs.results.forEach(report => {
          if (report.results && Array.isArray(report.results)) {
            const hasCritical = report.results.some((res: any) => res.flag === 'H' || res.flag === 'L' || res.flag === 'High' || res.flag === 'Low');
            if (hasCritical) criticals++;
          }
        });
        setCriticalCount(criticals);

      } catch (error) {
        console.error("Failed to fetch lab dashboard data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLabData();
  }, []);

  return (
    <div className="space-y-6">
      {visibleWidgets.metrics && (
        <div className="dashboard-grid">
          <MetricCard
            title="Pending Tests"
            value={pendingCount.toString()}
            change={pendingCount > 10 ? 5 : 0}
            changeType="increase"
            icon={<FlaskConical className="w-5 h-5" />}
            color="blue"
          />
          <MetricCard
            title="Results Ready"
            value={completedCount.toString()}
            change={2}
            changeType="increase"
            icon={<FileText className="w-5 h-5" />}
            color="green"
          />
          <MetricCard
            title="Critical Values"
            value={criticalCount.toString()}
            change={criticalCount > 0 ? 1 : 0}
            changeType="increase"
            icon={<AlertOctagon className="w-5 h-5" />}
            color="red"
          />
          <MetricCard
            title="Equipment Status"
            value="100%"
            change={0}
            changeType="increase"
            icon={<Microscope className="w-5 h-5" />}
            color="purple"
          />
        </div>
      )}

      {visibleWidgets.appointments && (
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center text-primary">
              <FlaskConical className="w-5 h-5 mr-2" />
              Laboratory Queue
            </CardTitle>
            <CardDescription>Specimens processing and pending analysis</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTests.length > 0 ? (
              <div className="space-y-4">
                {recentTests.map((test, index) => (
                  <div key={index} className="flex items-center space-x-4 p-3 border border-border/40 rounded-lg hover:border-primary/30 hover:bg-accent/5 transition-all group cursor-pointer">
                    <div className={cn("p-2 rounded-md", test.priority === 'stat' || test.priority === 'urgent' ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600")}>
                      <Activity className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{test.type}</p>
                      <p className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                        Patient: {test.patient}
                      </p>
                    </div>
                    <StatusBadge status={test.status === 'processing' || test.status === 'verified' ? 'info' : 'pending'} size="sm">
                      {test.status}
                    </StatusBadge>

                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FlaskConical className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No pending laboratory requests.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LabDashboard;
