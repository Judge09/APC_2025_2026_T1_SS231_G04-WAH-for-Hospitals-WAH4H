import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Plus, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { VitalSign } from '../../types/monitoring';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';

interface VitalSignsTabProps {
    vitals: VitalSign[];  // Already formatted VitalSign objects from service
    onAddVital: (vital: Omit<VitalSign, 'id'>) => void;
    patientId: string;
}

export const VitalSignsTab: React.FC<VitalSignsTabProps> = ({ vitals, onAddVital, patientId }) => {
    const { user } = useAuth();
    const { currentRole } = useRole();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'table' | 'graph'>('graph');
    const [showErrors, setShowErrors] = useState(false);

    const [bpSys, setBpSys] = useState('');
    const [bpDia, setBpDia] = useState('');
    const [hr, setHr] = useState('');
    const [rr, setRr] = useState('');
    const [temp, setTemp] = useState('');
    const [o2, setO2] = useState('');

    // Vitals are already properly formatted from the service, just filter by patient
    const mappedVitals: VitalSign[] = useMemo(() => {
        return vitals
            .filter(v => v.admissionId === patientId)
            .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
    }, [vitals, patientId]);

    const handleSave = () => {
        if (!bpSys || !bpDia || !hr || !rr || !temp || !o2) {
            setShowErrors(true);
            return;
        }

        const staffName = user ? `${user.firstName} ${user.lastName}` : 'Unknown Staff';

        const newVital: Omit<VitalSign, 'id'> = {
            admissionId: patientId,
            dateTime: new Date().toISOString(),
            bloodPressure: `${bpSys}/${bpDia}`,
            heartRate: Number(hr),
            respiratoryRate: Number(rr),
            temperature: Number(temp),
            oxygenSaturation: Number(o2),
            staffName: staffName
        };

        onAddVital(newVital);
        setIsModalOpen(false);
        resetForm();
    };

    const resetForm = () => {
        setBpSys(''); setBpDia(''); setHr(''); setRr(''); setTemp(''); setO2('');
        setShowErrors(false);
    };

    const checkAlerts = (v: VitalSign) => {
        const alerts: string[] = [];
        if (!v.bloodPressure) return alerts;
        const [sys, dia] = v.bloodPressure.split('/').map(Number);
        if (sys > 140 || sys < 90) alerts.push('Abnormal BP');
        if (v.heartRate > 100 || v.heartRate < 60) alerts.push('Abnormal HR');
        if (v.oxygenSaturation < 95) alerts.push('Low O2');
        return alerts;
    };

    const chartData = mappedVitals.map(v => ({
        time: new Date(v.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        hr: v.heartRate || 0,
        temp: v.temperature || 0,
        sys: v.bloodPressure ? Number(v.bloodPressure.split('/')[0]) : 0,
        dia: v.bloodPressure ? Number(v.bloodPressure.split('/')[1]) : 0,
        o2: v.oxygenSaturation || 0
    })).slice(-10);

    return (
        <div className="space-y-6">
            {/* Controls */}
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div className="flex gap-2">
                    <Button 
                        variant={viewMode === 'graph' ? 'default' : 'outline'} 
                        onClick={() => setViewMode('graph')}
                        className={viewMode === 'graph' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                    >
                        Graph View
                    </Button>
                    <Button 
                        variant={viewMode === 'table' ? 'default' : 'outline'} 
                        onClick={() => setViewMode('table')}
                        className={viewMode === 'table' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                    >
                        Table View
                    </Button>
                </div>
                <div className="flex gap-2">

                    {(currentRole === 'nurse' || currentRole === 'doctor') && (
                        <Button onClick={() => setIsModalOpen(true)} className="bg-green-600 hover:bg-green-700">
                            <Plus className="w-4 h-4 mr-2" />
                            Record Vitals
                        </Button>
                    )}
                </div>
            </div>

            {/* No Data Alert */}
            {mappedVitals.length === 0 && (
                <Alert className="border-blue-200 bg-blue-50">
                    <AlertTriangle className="h-5 w-5 text-blue-600" />
                    <AlertTitle className="text-blue-900 font-semibold">No Vital Signs Recorded</AlertTitle>
                    <AlertDescription className="text-blue-700">
                        No vital signs have been recorded for this patient yet. Click "Record Vitals" to begin monitoring.
                    </AlertDescription>
                </Alert>
            )}

            {/* Critical Alert */}
            {mappedVitals.length > 0 && checkAlerts(mappedVitals[mappedVitals.length - 1]).length > 0 && (
                <Alert variant="destructive" className="border-l-4 border-l-red-600">
                    <AlertTriangle className="h-5 w-5 animate-pulse" />
                    <AlertTitle className="font-bold text-lg">Critical Vital Signs Alert</AlertTitle>
                    <AlertDescription className="text-base">
                        Latest vitals indicate: <strong>{checkAlerts(mappedVitals[mappedVitals.length - 1]).join(', ')}</strong>. 
                        Immediate attention required.
                    </AlertDescription>
                </Alert>
            )}

            {/* Latest Vitals Summary Cards */}
            {mappedVitals.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {(() => {
                        const latest = mappedVitals[mappedVitals.length - 1];
                        const [sys, dia] = latest.bloodPressure?.split('/').map(Number) || [0, 0];
                        const bpNormal = sys >= 90 && sys <= 140 && dia >= 60 && dia <= 90;
                        const hrNormal = latest.heartRate >= 60 && latest.heartRate <= 100;
                        const tempNormal = latest.temperature >= 36.5 && latest.temperature <= 37.5;
                        const o2Normal = latest.oxygenSaturation >= 95;
                        const rrNormal = latest.respiratoryRate >= 12 && latest.respiratoryRate <= 20;

                        return (
                            <>
                                <Card className={`${!bpNormal ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}`}>
                                    <CardContent className="p-4">
                                        <div className="text-xs font-medium text-gray-600 mb-1">Blood Pressure</div>
                                        <div className={`text-2xl font-bold ${!bpNormal ? 'text-red-600' : 'text-green-600'}`}>
                                            {latest.bloodPressure}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">mmHg</div>
                                    </CardContent>
                                </Card>

                                <Card className={`${!hrNormal ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}`}>
                                    <CardContent className="p-4">
                                        <div className="text-xs font-medium text-gray-600 mb-1">Heart Rate</div>
                                        <div className={`text-2xl font-bold ${!hrNormal ? 'text-red-600' : 'text-green-600'}`}>
                                            {latest.heartRate}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">bpm</div>
                                    </CardContent>
                                </Card>

                                <Card className={`${!rrNormal ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}`}>
                                    <CardContent className="p-4">
                                        <div className="text-xs font-medium text-gray-600 mb-1">Respiratory Rate</div>
                                        <div className={`text-2xl font-bold ${!rrNormal ? 'text-red-600' : 'text-green-600'}`}>
                                            {latest.respiratoryRate}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">breaths/min</div>
                                    </CardContent>
                                </Card>

                                <Card className={`${!tempNormal ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}`}>
                                    <CardContent className="p-4">
                                        <div className="text-xs font-medium text-gray-600 mb-1">Temperature</div>
                                        <div className={`text-2xl font-bold ${!tempNormal ? 'text-red-600' : 'text-green-600'}`}>
                                            {latest.temperature}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">°C</div>
                                    </CardContent>
                                </Card>

                                <Card className={`${!o2Normal ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}`}>
                                    <CardContent className="p-4">
                                        <div className="text-xs font-medium text-gray-600 mb-1">O₂ Saturation</div>
                                        <div className={`text-2xl font-bold ${!o2Normal ? 'text-red-600' : 'text-green-600'}`}>
                                            {latest.oxygenSaturation}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">%</div>
                                    </CardContent>
                                </Card>
                            </>
                        );
                    })()}
                </div>
            )}

            {/* Graph or Table View */}
            {viewMode === 'graph' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="shadow-md">
                        <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50">
                            <CardTitle className="text-lg font-semibold text-gray-800">Blood Pressure & Heart Rate</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px] pt-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="sys" stroke="#ef4444" strokeWidth={2} name="Systolic" />
                                    <Line type="monotone" dataKey="dia" stroke="#f97316" strokeWidth={2} name="Diastolic" />
                                    <Line type="monotone" dataKey="hr" stroke="#dc2626" strokeWidth={2} name="Heart Rate" />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="shadow-md">
                        <CardHeader className="bg-gradient-to-r from-yellow-50 to-green-50">
                            <CardTitle className="text-lg font-semibold text-gray-800">Temperature & O₂ Saturation</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px] pt-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                                    <YAxis yAxisId="left" orientation="left" domain={[34, 42]} tick={{ fontSize: 12 }} />
                                    <YAxis yAxisId="right" orientation="right" domain={[80, 100]} tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Legend />
                                    <Line yAxisId="left" type="monotone" dataKey="temp" stroke="#f59e0b" strokeWidth={2} name="Temp (°C)" />
                                    <Line yAxisId="right" type="monotone" dataKey="o2" stroke="#10b981" strokeWidth={2} name="O₂ Sat (%)" />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <Card className="shadow-md">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                        <CardTitle className="text-lg font-semibold text-gray-800">Vital Signs History</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50">
                                        <TableHead className="font-semibold">Date/Time</TableHead>
                                        <TableHead className="font-semibold">BP (mmHg)</TableHead>
                                        <TableHead className="font-semibold">HR (bpm)</TableHead>
                                        <TableHead className="font-semibold">RR</TableHead>
                                        <TableHead className="font-semibold">Temp (°C)</TableHead>
                                        <TableHead className="font-semibold">O₂ (%)</TableHead>
                                        <TableHead className="font-semibold">Recorded By</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {[...mappedVitals].reverse().map(v => {
                                        const alerts = checkAlerts(v);
                                        return (
                                            <TableRow key={v.id} className={alerts.length > 0 ? 'bg-red-50' : ''}>
                                                <TableCell className="font-medium">
                                                    {new Date(v.dateTime).toLocaleString('en-PH', { 
                                                        month: 'short', 
                                                        day: 'numeric', 
                                                        hour: '2-digit', 
                                                        minute: '2-digit' 
                                                    })}
                                                </TableCell>
                                                <TableCell className="font-semibold">{v.bloodPressure}</TableCell>
                                                <TableCell>{v.heartRate}</TableCell>
                                                <TableCell>{v.respiratoryRate}</TableCell>
                                                <TableCell>{v.temperature}</TableCell>
                                                <TableCell>{v.oxygenSaturation}%</TableCell>
                                                <TableCell className="text-sm text-gray-600">{v.staffName}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Recording Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-gray-900">Record Vital Signs</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-6 py-6">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-gray-700">Systolic BP (mmHg)</Label>
                            <Input 
                                type="number" 
                                value={bpSys} 
                                onChange={e => setBpSys(e.target.value)}
                                placeholder="120"
                                className={`text-lg ${showErrors && !bpSys ? 'border-red-500' : ''}`}
                            />
                            {showErrors && !bpSys && <p className="text-red-500 text-xs mt-1">Required field</p>}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-gray-700">Diastolic BP (mmHg)</Label>
                            <Input 
                                type="number" 
                                value={bpDia} 
                                onChange={e => setBpDia(e.target.value)}
                                placeholder="80"
                                className={`text-lg ${showErrors && !bpDia ? 'border-red-500' : ''}`}
                            />
                            {showErrors && !bpDia && <p className="text-red-500 text-xs mt-1">Required field</p>}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-gray-700">Heart Rate (bpm)</Label>
                            <Input 
                                type="number" 
                                value={hr} 
                                onChange={e => setHr(e.target.value)}
                                placeholder="72"
                                className={`text-lg ${showErrors && !hr ? 'border-red-500' : ''}`}
                            />
                            {showErrors && !hr && <p className="text-red-500 text-xs mt-1">Required field</p>}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-gray-700">Respiratory Rate</Label>
                            <Input 
                                type="number" 
                                value={rr} 
                                onChange={e => setRr(e.target.value)}
                                placeholder="16"
                                className={`text-lg ${showErrors && !rr ? 'border-red-500' : ''}`}
                            />
                            {showErrors && !rr && <p className="text-red-500 text-xs mt-1">Required field</p>}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-gray-700">Temperature (°C)</Label>
                            <Input 
                                type="number" 
                                step="0.1" 
                                value={temp} 
                                onChange={e => setTemp(e.target.value)}
                                placeholder="36.5"
                                className={`text-lg ${showErrors && !temp ? 'border-red-500' : ''}`}
                            />
                            {showErrors && !temp && <p className="text-red-500 text-xs mt-1">Required field</p>}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-gray-700">O₂ Saturation (%)</Label>
                            <Input 
                                type="number" 
                                value={o2} 
                                onChange={e => setO2(e.target.value)}
                                placeholder="98"
                                className={`text-lg ${showErrors && !o2 ? 'border-red-500' : ''}`}
                            />
                            {showErrors && !o2 && <p className="text-red-500 text-xs mt-1">Required field</p>}
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                            Save Vital Signs
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};   
 