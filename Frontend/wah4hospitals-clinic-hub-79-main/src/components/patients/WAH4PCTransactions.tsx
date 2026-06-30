import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, ArrowUpRight, ArrowDownLeft, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface WAH4PCTransaction {
  id: string;
  type: 'fetch' | 'send';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'RECEIVED';
  patientId?: number;
  targetProviderId?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

interface WAH4PCTransactionsProps {
  patientId?: number;
}

export const WAH4PCTransactions: React.FC<WAH4PCTransactionsProps> = ({ patientId }) => {
  const [transactions, setTransactions] = useState<WAH4PCTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (patientId) {
        params.append('patient_id', patientId.toString());
      }

      const response = await fetch(`/api/patients/wah4pc/transactions/?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching WAH4PC transactions:', error);
      toast.error('Failed to load WAH4PC transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [patientId]);

  const handleRetry = async (transaction: WAH4PCTransaction) => {
    setRetrying(transaction.id);
    try {
      // Retry the transaction by making the same request
      if (transaction.type === 'fetch') {
        const response = await fetch('/api/patients/wah4pc/fetch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetProviderId: transaction.targetProviderId,
            // Note: Would need to store original philHealthId to retry properly
          }),
        });

        if (!response.ok) {
          throw new Error('Retry failed');
        }

        toast.success('Transaction retry initiated');
        fetchTransactions();
      } else if (transaction.type === 'send' && transaction.patientId) {
        const response = await fetch('/api/patients/wah4pc/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId: transaction.patientId,
            targetProviderId: transaction.targetProviderId,
          }),
        });

        if (!response.ok) {
          throw new Error('Retry failed');
        }

        toast.success('Transaction retry initiated');
        fetchTransactions();
      }
    } catch (error) {
      console.error('Error retrying transaction:', error);
      toast.error('Failed to retry transaction');
    } finally {
      setRetrying(null);
    }
  };

  const getStatusBadge = (status: WAH4PCTransaction['status']) => {
    const variants = {
      PENDING: { variant: 'secondary' as const, label: 'Pending' },
      COMPLETED: { variant: 'default' as const, label: 'Completed' },
      FAILED: { variant: 'destructive' as const, label: 'Failed' },
      RECEIVED: { variant: 'default' as const, label: 'Received' },
    };

    const config = variants[status] || variants.PENDING;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeIcon = (type: 'fetch' | 'send') => {
    return type === 'fetch' ? (
      <ArrowDownLeft className="w-4 h-4 text-blue-600" />
    ) : (
      <ArrowUpRight className="w-4 h-4 text-green-600" />
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            WAH4PC Transactions
            <Badge variant="outline" className="ml-auto">Loading...</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading transactions...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          WAH4PC Transactions
          <Badge variant="outline" className="ml-auto">{transactions.length} Total</Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchTransactions}
            className="ml-2"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No WAH4PC transactions found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Target Provider</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(transaction.type)}
                        <span className="capitalize">{transaction.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {transaction.id.substring(0, 16)}...
                      </code>
                    </TableCell>
                    <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                    <TableCell>
                      <code className="text-xs">
                        {transaction.targetProviderId?.substring(0, 8)}...
                      </code>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(transaction.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(transaction.updatedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {transaction.error && (
                          <div className="flex items-center gap-1 text-destructive text-xs">
                            <AlertCircle className="w-3 h-3" />
                            <span className="max-w-[200px] truncate" title={transaction.error}>
                              {transaction.error}
                            </span>
                          </div>
                        )}
                        {transaction.status === 'FAILED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRetry(transaction)}
                            disabled={retrying === transaction.id}
                          >
                            {retrying === transaction.id ? (
                              <>
                                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                Retrying...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="w-3 h-3 mr-1" />
                                Retry
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
