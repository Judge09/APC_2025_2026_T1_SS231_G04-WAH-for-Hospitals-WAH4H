import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, PlusCircle } from 'lucide-react';
import billingService from '@/services/billingService';

interface ManualFeeModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoiceId: number | null;
    identifier: string | null;
    onSuccess: () => void;
}

export const ManualFeeModal: React.FC<ManualFeeModalProps> = ({ isOpen, onClose, invoiceId, identifier, onSuccess }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('pf');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!invoiceId || !description || !amount) return;

        setLoading(true);
        setError(null);

        try {
            await billingService.addManualItem(invoiceId, {
                description,
                amount: parseFloat(amount),
                category
            });
            onSuccess();
            handleClose();
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to add item. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setDescription('');
        setAmount('');
        setCategory('pf');
        setError(null);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PlusCircle className="w-5 h-5 text-primary" />
                        Add Extra Fee
                    </DialogTitle>
                    <DialogDescription>
                        Add a manual charge to Invoice {identifier}.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {error && (
                        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="category">Fee Category</Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger id="category">
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pf">Professional Fee (PF)</SelectItem>
                                <SelectItem value="room">Room & Board</SelectItem>
                                <SelectItem value="supplies">Medical Supplies</SelectItem>
                                <SelectItem value="service">Nursing / Service Fee</SelectItem>
                                <SelectItem value="misc">Miscellaneous</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Input
                            id="description"
                            placeholder="e.g. Consultation - Dr. Reyes"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount (PHP)</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                        />
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading || !description || !amount}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Adding...
                                </>
                            ) : (
                                'Add Item'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
