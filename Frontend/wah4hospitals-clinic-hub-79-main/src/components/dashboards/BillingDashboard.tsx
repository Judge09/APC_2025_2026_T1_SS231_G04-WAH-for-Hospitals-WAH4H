import React, { useEffect, useState } from 'react';
import {
  FileText,
  DollarSign,
  CreditCard,
  Briefcase,
  History
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import MetricCard from '@/components/ui/MetricCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import { billingService, Invoice, DashboardSummary } from '@/services/billingService';

interface BillingDashboardProps {
  visibleWidgets: Record<string, boolean>;
}

const BillingDashboard: React.FC<BillingDashboardProps> = ({ visibleWidgets }) => {
  const [revenueToday, setRevenueToday] = useState<number>(0);
  const [pendingClaimsCount, setPendingClaimsCount] = useState<number>(0);
  const [outstandingBalance, setOutstandingBalance] = useState<number>(0);
  const [insuredPatientsPercentage, setInsuredPatientsPercentage] = useState<number>(0);
  const [recentClaims, setRecentClaims] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchBillingData = async () => {
      setIsLoading(true);
      try {
        const summary = await billingService.getDashboardSummary();

        setRevenueToday(summary.revenue_today);
        setPendingClaimsCount(summary.pending_claims);
        setOutstandingBalance(summary.outstanding_balance);
        setRevenueData(summary.weekly_revenue);
        // We can add a state for insuredPercentage if we want to display it, 
        // effectively replacing the hardcoded 85%

        // Fetch Claims for the list
        const claimsResponse = await billingService.getClaims();
        const claims = Array.isArray(claimsResponse) ? claimsResponse : (claimsResponse.results || []);

        setRecentClaims(claims.slice(0, 3).map((c: any) => ({
          id: c.identifier || `CLM-${c.claim_id}`,
          patient: `Patient #${c.subject_id}`,
          amount: `₱${parseFloat(c.total_amount_value || '0').toLocaleString()}`,
          status: c.status
        })));

      } catch (error) {
        console.error("Failed to fetch billing dashboard data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBillingData();
  }, []);

  return (
    <div className="space-y-6">
      {visibleWidgets.metrics && (
        <div className="dashboard-grid">
          <MetricCard
            title="Revenue Today"
            value={`₱${revenueToday.toLocaleString()}`}
            change={8}
            changeType="increase"
            icon={<DollarSign className="w-5 h-5" />}
            color="green"
          />
          <MetricCard
            title="Pending Claims"
            value={pendingClaimsCount.toString()}
            change={pendingClaimsCount > 10 ? 2 : 0}
            changeType="increase"
            icon={<FileText className="w-5 h-5" />}
            color="orange"
          />
          <MetricCard
            title="Outstanding Balance"
            value={`₱${(outstandingBalance / 1000).toFixed(1)}k`}
            change={0}
            changeType="decrease"
            icon={<CreditCard className="w-5 h-5" />}
            color="red"
          />
          <MetricCard
            title="Insured Patients"
            value={`${insuredPatientsPercentage}%`}
            change={0}
            changeType="increase"
            icon={<Briefcase className="w-5 h-5" />}
            color="blue"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {visibleWidgets.admissions && (
          <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-border/50">
            <CardHeader>
              <CardTitle className="chart-title text-primary">Revenue Overview</CardTitle>
              <CardDescription>Daily revenue for the current week</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="day" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {visibleWidgets.appointments && (
          <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center text-primary">
                <FileText className="w-5 h-5 mr-2" />
                Claims Processing
              </CardTitle>
              <CardDescription>Recent insurance claims and status</CardDescription>
            </CardHeader>
            <CardContent>
              {recentClaims.length > 0 ? (
                <div className="space-y-4">
                  {recentClaims.map((claim, index) => (
                    <div key={index} className="flex items-center space-x-4 p-3 border border-border/40 rounded-lg hover:border-primary/30 hover:bg-accent/5 transition-all group cursor-pointer">
                      <div className="p-2 rounded-md bg-green-50 text-green-600">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{claim.id}</p>
                        <p className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                          {claim.patient} • {claim.amount}
                        </p>
                      </div>
                      <StatusBadge status={claim.status === 'review' || claim.status === 'active' ? 'warning' : 'info'} size="sm">
                        {claim.status}
                      </StatusBadge>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-4 h-4" >→</div>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No recent claims found.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BillingDashboard;
