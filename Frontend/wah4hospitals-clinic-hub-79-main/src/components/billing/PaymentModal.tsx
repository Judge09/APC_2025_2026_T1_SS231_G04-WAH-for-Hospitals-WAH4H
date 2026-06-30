import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Printer } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    patientName: string;
    totalBalance: number;
    onPaymentSuccess: (paymentData: any) => Promise<any>;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
    isOpen,
    onClose,
    patientName,
    totalBalance,
    onPaymentSuccess
}) => {
    const { user } = useAuth();
    const [amount, setAmount] = useState('');
    const [method] = useState('Cash');
    const [orNumber, setOrNumber] = useState('System Generated');
    const [cashier, setCashier] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (user) {
            setCashier(`${user.firstName} ${user.lastName}`);
        }
    }, [user]);

    // Auto-fill amount with total balance (pay-all-or-nothing workflow)
    useEffect(() => {
        if (isOpen && totalBalance > 0) {
            setAmount(totalBalance.toFixed(2));
        }
    }, [isOpen, totalBalance]);
    const [error, setError] = useState('');
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastPayment, setLastPayment] = useState<any>(null);

    const resetForm = () => {
        setAmount('');
        setOrNumber('System Generated');
        setError('');
        setShowReceipt(false);
        setLastPayment(null);
    };

    const handleProcessPayment = async () => {
        const payAmount = Number(amount);

        if (!payAmount || payAmount <= 0) {
            setError('Please enter a valid amount.');
            return;
        }

        setError('');

        // Calculate change if payment exceeds balance
        const change = payAmount > totalBalance ? payAmount - totalBalance : 0;
        const remainingBalance = payAmount >= totalBalance ? 0 : totalBalance - payAmount;

        // The actual amount to record in the system (capped at balance)
        const amountToRecord = Math.min(payAmount, totalBalance);

        // Prepare data for backend (reference/OR is auto-generated there)
        const payload = {
            amount: amountToRecord,
            method,
            // reference: orNumber, // Don't send reference, let backend generate it
        };

        try {
            // We pass the payload to the parent
            // The parent calls the API and returns the response (which includes payment_identifier)
            const result = await onPaymentSuccess(payload);

            // If the parent didn't throw, we assume success.
            // Check if result has payment_identifier
            const backendOR = result?.payment_identifier || "PENDING";

            const paymentData = {
                amount: amountToRecord,  // Amount recorded in system
                amountReceived: payAmount,  // Actual cash received
                method,
                orNumber: backendOR, // Use the one from backend
                cashier,
                date,
                patientName,
                remainingBalance,
                change
            };

            setLastPayment(paymentData);
            setShowReceipt(true);

        } catch (err) {
            console.error(err);
            setError("Payment failed. Please try again.");
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleCloseReceipt = () => {
        resetForm();
        onClose();
    };

    if (showReceipt && lastPayment) {
        return (
            <Dialog open={isOpen} onOpenChange={() => { }}>
                <DialogContent className="max-w-md print:shadow-none print:border-none" onInteractOutside={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle className="text-center print:hidden">Payment Successful</DialogTitle>
                    </DialogHeader>

                    <div className="p-4 border rounded-md bg-white print:border-none print:p-0" id="printable-receipt">
                        <div className="text-center mb-4 border-b pb-2">
                            <h3 className="font-bold text-lg uppercase">Official Receipt</h3>
                            <p className="text-sm text-gray-500">WAH 4 Hospital</p>
                            <p className="text-xs text-gray-400">{lastPayment.date}</p>
                        </div>

                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">O.R. No:</span>
                                <span className="font-bold">{lastPayment.orNumber}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Received From:</span>
                                <span className="font-medium">{lastPayment.patientName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Cashier:</span>
                                <span>{lastPayment.cashier}</span>
                            </div>
                            <div className="my-2 border-t border-dashed pt-2">
                                {lastPayment.change > 0 && (
                                    <div className="flex justify-between text-sm text-gray-500 mb-1">
                                        <span>Amount Received:</span>
                                        <span>₱{lastPayment.amountReceived.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold text-lg">
                                    <span>Amount Paid:</span>
                                    <span>₱{lastPayment.amount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-gray-500 text-xs mt-1">
                                    <span>Payment Method:</span>
                                    <span className="uppercase">{lastPayment.method}</span>
                                </div>
                            </div>
                            {lastPayment.change > 0 && (
                                <div className="flex justify-between text-green-600 font-bold border-t pt-2">
                                    <span>Change:</span>
                                    <span>₱{lastPayment.change.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-gray-600 border-t pt-2">
                                <span>Remaining Balance:</span>
                                <span className={lastPayment.remainingBalance === 0 ? 'text-green-600 font-bold' : ''}>₱{lastPayment.remainingBalance.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="mt-8 text-center text-xs text-gray-400">
                            <p>Thank you for your payment.</p>
                            <p>This is a computer generated receipt.</p>
                        </div>
                    </div>

                    <DialogFooter className="print:hidden gap-2 sm:justify-center">
                        <Button variant="outline" onClick={handlePrint}>
                            <Printer className="w-4 h-4 mr-2" /> Print Receipt
                        </Button>
                        <Button onClick={handleCloseReceipt}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Process Payment</DialogTitle>
                </DialogHeader>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <div className="grid gap-4 py-4">
                    <div className="bg-slate-100 p-3 rounded-md mb-2">
                        <p className="text-sm text-gray-500">Total Amount Due</p>
                        <p className="text-2xl font-bold text-slate-900">₱{totalBalance.toFixed(2)}</p>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right">Amount Tendered</Label>
                        <div className="col-span-3">
                            <Input
                                id="amount"
                                type="number"
                                className="bg-gray-50 font-semibold"
                                value={amount}
                                disabled
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Full payment required — amount matches total due.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="method" className="text-right">Method</Label>
                        <Input
                            id="method"
                            className="col-span-3 bg-gray-50"
                            value={method}
                            disabled
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="or" className="text-right">O.R. No.</Label>
                        <Input
                            id="or"
                            className="col-span-3 bg-gray-50"
                            placeholder="Auto-generated"
                            value={orNumber}
                            disabled
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">Date</Label>
                        <Input
                            id="date"
                            type="date"
                            className="col-span-3"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="cashier" className="text-right">Cashier</Label>
                        <Input
                            id="cashier"
                            className="col-span-3"
                            value={cashier}
                            onChange={(e) => setCashier(e.target.value)}
                            disabled
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" onClick={handleProcessPayment}>Process Payment</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
