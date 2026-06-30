import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  FileJson,
  Wifi,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';

interface InteropTransaction {
  id: string;
  type: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'RECEIVED';
  patientId?: number;
  relatedPatientId?: number;
  targetProviderId?: string;
  requesterId?: string;
  senderId?: string;
  rawPayload?: Record<string, unknown> | null;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

interface InteropLogsTableProps {
  patientId?: number;
  refreshTrigger?: number;
}

const STATUS_CONFIG = {
  PENDING: { variant: 'secondary' as const, label: 'Pending' },
  COMPLETED: { variant: 'default' as const, label: 'Completed' },
  FAILED: { variant: 'destructive' as const, label: 'Failed' },
  RECEIVED: { variant: 'default' as const, label: 'Received' },
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  fetch: <ArrowDownLeft className="w-4 h-4 text-blue-600" />,
  send: <ArrowUpRight className="w-4 h-4 text-green-600" />,
  receive_push: <ArrowDownLeft className="w-4 h-4 text-purple-600" />,
  process_query: <Wifi className="w-4 h-4 text-orange-500" />,
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const InteropLogsTable: React.FC<InteropLogsTableProps> = ({
  patientId,
  refreshTrigger,
}) => {
  const [transactions, setTransactions] = useState<InteropTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [payloadDialogTxn, setPayloadDialogTxn] = useState<InteropTransaction | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (patientId) params.patient_id = patientId.toString();

      const res = await api.get('/api/patients/wah4pc/transactions/', { params });
      setTransactions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching interop transactions:', err);
      toast.error('Failed to load interop transaction logs');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions, refreshTrigger]);

  const getStatusBadge = (status: InteropTransaction['status']) => {
    const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeIcon = (type: string) =>
    TYPE_ICONS[type] ?? <Wifi className="w-4 h-4 text-gray-400" />;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Interop Transaction Logs
            <Badge variant="outline" className="ml-auto">
              {loading ? 'Loading…' : `${transactions.length} entries`}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchTransactions}
              disabled={loading}
              aria-label="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!loading && transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No interop transactions found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requester / Sender</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead className="text-right">Payload</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(txn.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(txn.type)}
                          <span className="capitalize text-sm">{txn.type.replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(txn.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {txn.requesterId || txn.senderId ? (
                          <div className="flex flex-col gap-0.5">
                            {txn.requesterId && (
                              <span title={txn.requesterId}>
                                Req: {txn.requesterId.substring(0, 12)}…
                              </span>
                            )}
                            {txn.senderId && (
                              <span title={txn.senderId}>
                                Snd: {txn.senderId.substring(0, 12)}…
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {txn.id.substring(0, 16)}…
                        </code>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!txn.rawPayload}
                          onClick={() => setPayloadDialogTxn(txn)}
                          aria-label="View payload"
                        >
                          <FileJson className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Raw Payload Dialog */}
      <Dialog
        open={!!payloadDialogTxn}
        onOpenChange={(open) => { if (!open) setPayloadDialogTxn(null); }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Raw Payload —{' '}
              <code className="text-xs font-normal">
                {payloadDialogTxn?.id}
              </code>
            </DialogTitle>
          </DialogHeader>
          <pre className="text-xs bg-muted rounded p-4 overflow-x-auto whitespace-pre-wrap break-all">
            {payloadDialogTxn?.rawPayload
              ? JSON.stringify(payloadDialogTxn.rawPayload, null, 2)
              : 'No payload recorded'}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
};
