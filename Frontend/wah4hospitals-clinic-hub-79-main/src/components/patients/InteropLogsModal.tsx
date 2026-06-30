/**
 * InteropLogsModal
 *
 * Hidden behind a small "History" icon button — never visible on the main
 * screen. Opens a Dialog that shows WAH4PC transaction logs with pagination.
 * Clicking a row expands the raw FHIR payload for debugging.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Wifi,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InteropTransaction {
  id: string;
  type: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'RECEIVED';
  targetProviderId?: string;
  requesterId?: string;
  senderId?: string;
  rawPayload?: Record<string, unknown> | null;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

interface PagedResponse {
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
  results: InteropTransaction[];
}

export interface InteropLogsModalProps {
  open: boolean;
  onClose: () => void;
  /** Incrementing this number triggers a silent data refresh. */
  refreshTrigger?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<string, { variant: 'secondary' | 'default' | 'destructive'; label: string }> = {
  PENDING:   { variant: 'secondary',    label: 'Pending'   },
  COMPLETED: { variant: 'default',      label: 'Completed' },
  RECEIVED:  { variant: 'default',      label: 'Received'  },
  FAILED:    { variant: 'destructive',  label: 'Failed'    },
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  fetch:         <ArrowDownLeft className="w-3.5 h-3.5 text-blue-500"   />,
  send:          <ArrowUpRight  className="w-3.5 h-3.5 text-green-600"  />,
  receive_push:  <ArrowDownLeft className="w-3.5 h-3.5 text-purple-500" />,
  process_query: <Wifi          className="w-3.5 h-3.5 text-orange-500" />,
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function TypeBadge({ type }: { type: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {TYPE_ICONS[type] ?? <Wifi className="w-3.5 h-3.5 text-gray-400" />}
      <span className="text-xs capitalize">{type.replace(/_/g, ' ')}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: InteropTransaction['status'] }) {
  const cfg = STATUS_STYLES[status] ?? STATUS_STYLES.PENDING;
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

// ---------------------------------------------------------------------------
// Payload viewer sub-dialog
// ---------------------------------------------------------------------------

function PayloadDialog({
  txn,
  onClose,
}: {
  txn: InteropTransaction | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!txn} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-sm font-mono truncate">
            {txn?.id}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto">
          <pre className="text-xs bg-muted rounded p-4 whitespace-pre-wrap break-all leading-relaxed">
            {txn?.rawPayload
              ? JSON.stringify(txn.rawPayload, null, 2)
              : 'No raw payload recorded for this transaction.'}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

export const InteropLogsModal: React.FC<InteropLogsModalProps> = ({
  open,
  onClose,
  refreshTrigger,
}) => {
  const [data, setData] = useState<PagedResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<InteropTransaction | null>(null);

  const fetchPage = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const res = await api.get('/api/patients/wah4pc/transactions/', {
          params: { page: p, page_size: PAGE_SIZE },
        });
        setData(res.data as PagedResponse);
      } catch {
        toast.error('Failed to load interop logs');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Fetch whenever modal opens, page changes, or parent triggers a refresh
  useEffect(() => {
    if (!open) return;
    fetchPage(page);
  }, [open, page, fetchPage, refreshTrigger]);

  // Reset to page 1 when modal is reopened
  useEffect(() => {
    if (open) setPage(1);
  }, [open]);

  const transactions = data?.results ?? [];
  const totalPages   = data?.totalPages ?? 1;
  const count        = data?.count ?? 0;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-3 shrink-0 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base">Interop Transaction Logs</DialogTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{count} total</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchPage(page)}
                  disabled={loading}
                  aria-label="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            {loading && transactions.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                <Loader />
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                No transactions found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-36">Time</TableHead>
                    <TableHead className="w-36">Type</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead>Target Provider</TableHead>
                    <TableHead className="text-right text-xs text-muted-foreground pr-6">
                      Click row to view payload
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn) => (
                    <TableRow
                      key={txn.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedTxn(txn)}
                    >
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(txn.createdAt)}
                      </TableCell>
                      <TableCell>
                        <TypeBadge type={txn.type} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={txn.status} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {txn.targetProviderId ? (
                          <code>{txn.targetProviderId.substring(0, 20)}{txn.targetProviderId.length > 20 ? '…' : ''}</code>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        {txn.rawPayload ? (
                          <span className="text-xs text-primary underline-offset-2 hover:underline">
                            View JSON
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">no payload</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pagination footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t shrink-0">
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payload viewer (nested dialog) */}
      <PayloadDialog txn={selectedTxn} onClose={() => setSelectedTxn(null)} />
    </>
  );
};

// Tiny inline spinner (avoids a separate import)
function Loader() {
  return (
    <div className="flex items-center gap-2">
      <RefreshCw className="w-4 h-4 animate-spin" />
      <span>Loading…</span>
    </div>
  );
}
