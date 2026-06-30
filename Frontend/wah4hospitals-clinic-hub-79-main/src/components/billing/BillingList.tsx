import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditCard, Trash2, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BillingDashboardItem {
    id: number;
    patientName: string;
    encounterId: string;
    runningBalance: number;
    paymentStatus: 'Paid' | 'Pending' | 'Partial';
    lastORDate: string | null;
    room: string;
}

interface BillingListProps {
    patients: BillingDashboardItem[];
    onSelectPatient: (id: number) => void;
    onQuickPay: (patient: BillingDashboardItem) => void;
    onDeletePatient: (id: number) => void;
}

export const BillingList: React.FC<BillingListProps> = ({
    patients,
    onSelectPatient,
    onQuickPay,
    onDeletePatient
}) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Active Billing Records</CardTitle>
            </CardHeader>
            <CardContent>
                {patients.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No active billing records found.
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Patient Name</TableHead>
                                <TableHead>Encounter ID</TableHead>
                                <TableHead>Room/Ward</TableHead>
                                <TableHead>Running Balance</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {patients.map((patient) => (
                                <TableRow key={patient.id}>
                                    <TableCell className="font-medium">{patient.patientName}</TableCell>
                                    <TableCell>{patient.encounterId}</TableCell>
                                    <TableCell>{patient.room}</TableCell>
                                    <TableCell>₱{patient.runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                    <TableCell>
                                        <Badge variant={
                                            patient.paymentStatus === 'Paid' ? 'default' :
                                                patient.paymentStatus === 'Partial' ? 'secondary' : 'destructive'
                                        }>
                                            {patient.paymentStatus}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onSelectPatient(patient.id)}
                                                title="View Details"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onQuickPay(patient)}
                                                title="Quick Pay"
                                            >
                                                <CreditCard className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    if (window.confirm('Are you sure you want to delete this billing record?')) {
                                                        onDeletePatient(patient.id);
                                                    }
                                                }}
                                                title="Delete"
                                                className="text-destructive hover:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
};
