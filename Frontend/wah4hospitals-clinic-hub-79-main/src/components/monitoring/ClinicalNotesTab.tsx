import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Lock, Paperclip, FileText, Clock, User, Trash2 } from 'lucide-react';
import { ClinicalNote } from '../../types/monitoring';
import monitoringService from '../../services/monitoringService';
import { toast } from 'sonner';

interface ClinicalNotesTabProps {
    notes: ClinicalNote[];
    admissionId: string;
    patientId: number;
    onAddNote: (note: ClinicalNote) => Promise<void>;
    onDeleteNote: (noteId: string) => Promise<void>;
}

export const ClinicalNotesTab: React.FC<ClinicalNotesTabProps> = ({
    notes,
    admissionId,
    patientId,
    onAddNote,
    onDeleteNote,
}) => {
    const { user } = useAuth();
    const { currentRole } = useRole();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [type, setType] = useState<'SOAP' | 'Progress'>('SOAP');
    const [subjective, setSubjective] = useState('');
    const [objective, setObjective] = useState('');
    const [assessment, setAssessment] = useState('');
    const [plan, setPlan] = useState('');

    const resetForm = () => {
        setSubjective('');
        setObjective('');
        setAssessment('');
        setPlan('');
    };

    const handleSave = async () => {
        setIsSaving(true);
        const newNote: ClinicalNote = {
            id: Date.now().toString(), // Temporary ID for frontend rendering
            admissionId,
            dateTime: new Date().toISOString(),
            type,
            subjective,
            objective,
            assessment,
            plan,
            providerName: user ? `${user.firstName} ${user.lastName}` : 'Unknown Provider', 
        };

        try {
            // Updated: Delegate save operation to parent via onAddNote to avoid duplicate API calls
            await onAddNote(newNote); 
            toast.success('Clinical note added successfully');
            setIsModalOpen(false);
            resetForm();
        } catch (err: any) {
            console.error('Failed to save note', err);
            toast.error('Failed to save note. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (noteId: string) => {
        if (!confirm('Are you sure you want to delete this clinical note? This action cannot be undone.')) return;
        
        setIsDeleting(noteId);
        try {
            await onDeleteNote(noteId);
            toast.success('Clinical note deleted successfully');
        } catch (err) {
            console.error('Failed to delete note', err);
            toast.error('Failed to delete note');
        } finally {
            setIsDeleting(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                {(currentRole === 'doctor' || currentRole === 'nurse') && (
                    <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" /> Add Clinical Note
                    </Button>
                )}
            </div>

            <div className="space-y-4">
                {notes.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 px-4">
                        <div className="bg-blue-50 rounded-full p-6 mb-4">
                            <FileText className="w-12 h-12 text-blue-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Clinical Notes</h3>
                        <p className="text-sm text-gray-500 text-center max-w-md">
                            No clinical notes have been recorded for this patient yet. Click "Add Clinical Note" to begin documentation.
                        </p>
                    </div>
                )}

                {notes.map((note) => (
                    <Card key={note.id} className="border-l-4 border-l-blue-600 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3 bg-gradient-to-r from-blue-50/50 to-transparent">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <FileText className="w-5 h-5 text-blue-600" />
                                        <CardTitle className="text-lg font-bold text-gray-900">
                                            {note.type} Note
                                        </CardTitle>
                                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-semibold">
                                            {note.type === 'SOAP' ? 'Clinical' : 'Progress'}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {new Date(note.dateTime).toLocaleString('en-PH', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                     {(currentRole === 'doctor' || currentRole === 'nurse') && (
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => handleDelete(note.id)}
                                            disabled={isDeleting === note.id}
                                            className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1 h-auto"
                                        >
                                            {isDeleting === note.id ? (
                                                <Clock className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </Button>
                                    )}
                                    <Lock className="w-4 h-4 text-gray-400" />
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-4 text-sm mt-2">
                            {note.type === 'SOAP' ? (
                                <div className="space-y-3">
                                    <div className="bg-green-50 rounded-lg p-3 border-l-4 border-green-500">
                                        <div className="font-bold text-green-800 mb-1 text-xs uppercase tracking-wide">Subjective</div>
                                        <p className="text-gray-700">{note.subjective || '—'}</p>
                                    </div>
                                    <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-500">
                                        <div className="font-bold text-blue-800 mb-1 text-xs uppercase tracking-wide">Objective</div>
                                        <p className="text-gray-700">{note.objective || '—'}</p>
                                    </div>
                                    <div className="bg-yellow-50 rounded-lg p-3 border-l-4 border-yellow-500">
                                        <div className="font-bold text-yellow-800 mb-1 text-xs uppercase tracking-wide">Assessment</div>
                                        <p className="text-gray-700">{note.assessment || '—'}</p>
                                    </div>
                                    <div className="bg-purple-50 rounded-lg p-3 border-l-4 border-purple-500">
                                        <div className="font-bold text-purple-800 mb-1 text-xs uppercase tracking-wide">Plan</div>
                                        <p className="text-gray-700">{note.plan || '—'}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                        {note.assessment || '—'}
                                    </p>
                                </div>
                            )}
                        </CardContent>

                        <CardFooter className="pt-3 border-t bg-gray-50/50 text-xs text-gray-500 flex items-center gap-2">
                            <Lock className="w-3 h-3" />
                            Electronically signed by <span className="font-semibold text-gray-700">{note.providerName || 'Unknown'}</span>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <FileText className="w-6 h-6 text-blue-600" />
                            New Clinical Note
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-gray-700">Note Type</Label>
                            <Select
                                value={type}
                                onValueChange={(val) =>
                                    setType(val as 'SOAP' | 'Progress')
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="SOAP">SOAP Note (Structured Clinical Documentation)</SelectItem>
                                    <SelectItem value="Progress">Progress Note (General Update)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {type === 'SOAP' && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-green-700 flex items-center gap-1">
                                        <span className="bg-green-100 px-2 py-0.5 rounded text-xs">S</span>
                                        Subjective (Patient's Complaints)
                                    </Label>
                                    <Textarea
                                        value={subjective}
                                        onChange={(e) => setSubjective(e.target.value)}
                                        placeholder="What the patient reports..."
                                        className="min-h-[80px] border-green-200 focus:border-green-400"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-blue-700 flex items-center gap-1">
                                        <span className="bg-blue-100 px-2 py-0.5 rounded text-xs">O</span>
                                        Objective (Clinical Findings)
                                    </Label>
                                    <Textarea
                                        value={objective}
                                        onChange={(e) => setObjective(e.target.value)}
                                        placeholder="Vital signs, physical exam findings, lab results..."
                                        className="min-h-[80px] border-blue-200 focus:border-blue-400"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-yellow-700 flex items-center gap-1">
                                        <span className="bg-yellow-100 px-2 py-0.5 rounded text-xs">A</span>
                                        Assessment (Diagnosis/Impression)
                                    </Label>
                                    <Textarea
                                        value={assessment}
                                        onChange={(e) => setAssessment(e.target.value)}
                                        placeholder="Clinical impression, diagnosis, problem list..."
                                        className="min-h-[80px] border-yellow-200 focus:border-yellow-400"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-purple-700 flex items-center gap-1">
                                        <span className="bg-purple-100 px-2 py-0.5 rounded text-xs">P</span>
                                        Plan (Treatment Plan)
                                    </Label>
                                    <Textarea
                                        value={plan}
                                        onChange={(e) => setPlan(e.target.value)}
                                        placeholder="Treatment orders, medications, follow-up plans..."
                                        className="min-h-[80px] border-purple-200 focus:border-purple-400"
                                    />
                                </div>
                            </div>
                        )}

                        {type === 'Progress' && (
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700">Progress Note</Label>
                                <Textarea
                                    value={assessment}
                                    onChange={(e) => setAssessment(e.target.value)}
                                    placeholder="Document patient's progress, changes in condition, ongoing care..."
                                    className="min-h-[200px]"
                                />
                            </div>
                        )}

                        <div className="border-2 border-dashed rounded-lg p-6 bg-gray-50 text-gray-400 flex flex-col items-center justify-center">
                            <Paperclip className="w-6 h-6 mb-2" />
                            <p className="text-sm">Attachments (coming soon)</p>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                            {isSaving ? 'Signing...' : 'Finalize & Sign Note'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
