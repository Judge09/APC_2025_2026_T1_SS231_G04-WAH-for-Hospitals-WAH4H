import React, { useState, useEffect } from 'react';
import { BedDouble } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { LocationSelector } from './LocationSelector';

interface RoomManagementProps { locations: any; admissions?: any[]; }

const RoomManagementView: React.FC<RoomManagementProps> = ({ locations, admissions = [] }) => {
  const [location, setLocation] = useState({ building: '', ward: '' });

  // Initial Load
  useEffect(() => {
    if (locations?.buildings?.length > 0 && !location.building) {
      const firstBldg = locations.buildings[0].code;
      const wings = locations.wings[firstBldg] || [];
      const firstWard = wings.length > 0 ? (locations.wards[wings[0].code]?.[0]?.code || '') : '';
      setLocation({ building: firstBldg, ward: firstWard });
    }
  }, [locations, location.building]);

  const handleLocationChange = (level: string, value: string) => {
    if (level === 'building') {
      const wings = locations.wings[value] || [];
      const firstWard = wings.length > 0 ? (locations.wards[wings[0].code]?.[0]?.code || '') : '';
      setLocation({ building: value, ward: firstWard });
    } else {
      setLocation(prev => ({ ...prev, [level]: value }));
    }
  };

  if (!locations) return <div>Loading...</div>;

  const currentRooms = (() => {
    if (!location.ward) return [];
    return (locations.corridors[location.ward] || []).flatMap((c: any) => locations.rooms[c.code] || []);
  })();

  const getPatientInBed = (room: any, bedCode: string) => {
    return admissions.find(a => {
      if (a.status !== 'in-progress') return false;

      // Normalize Admission Data
      const admitRoom = (a.location?.room || '').toString().toLowerCase().replace('room', '').trim();
      const admitBed = (a.location?.bed || '').toString().toLowerCase().replace('bed', '').trim();

      // Normalize Room Data
      const roomNameCodes = [
        (room.name || '').toString().toLowerCase().replace('room', '').trim(),
        (room.code || '').toString().toLowerCase()
      ];

      const targetBed = bedCode.toLowerCase().trim();

      // 1. Check Bed Match
      if (admitBed !== targetBed) return false;

      // 2. Check Room Match (Check if admission room matches any of the room identifiers)
      return roomNameCodes.some(code => code && (admitRoom === code || admitRoom.includes(code) || code.includes(admitRoom)));
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card className="border-0 shadow-sm ring-1 ring-slate-100">
        <CardContent className="p-6">
          <LocationSelector
            locations={locations}
            value={location}
            onChange={handleLocationChange}
            showRoom={false}
            layout="flex"
            admissions={admissions}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {currentRooms.length > 0 ? currentRooms.map((room: any) => {
          const occupiedCount = Array.from({ length: room.beds }).filter((_, i) => getPatientInBed(room, String.fromCharCode(65 + i))).length;

          return (
            <div key={room.code} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded border border-slate-200"><BedDouble className="w-4 h-4 text-slate-500" /></div>
                  <div><h4 className="font-bold text-slate-900">{room.name}</h4><p className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">Standard Room</p></div>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-bold ${occupiedCount >= room.beds ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>{occupiedCount}/{room.beds}</div>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: room.beds }).map((_, i) => {
                  const bedCode = String.fromCharCode(65 + i);
                  const patient = getPatientInBed(room, bedCode);
                  const isOcc = !!patient;

                  return (
                    <div key={i} className={`p-4 rounded-xl border flex flex-col gap-3 transition-all ${isOcc ? 'bg-blue-50/50 border-blue-200 shadow-sm' : 'bg-slate-50 border-slate-100 border-dashed'}`}>

                      {/* Header: Bed Label */}
                      <div className="flex items-center gap-2 mb-1">
                        <BedDouble className={`w-4 h-4 ${isOcc ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span className={`text-sm font-bold ${isOcc ? 'text-blue-900' : 'text-slate-500'}`}>Bed {bedCode}</span>
                      </div>

                      {isOcc ? (
                        <>
                          {/* Patient Info */}
                          <div className="space-y-1">
                            <div className="font-bold text-slate-800 text-sm leading-tight">{patient.patientName}</div>
                            <div className="text-xs text-slate-500 font-mono">{patient.patientId}</div>
                            <div className="text-xs text-slate-600 font-medium">
                              {patient.admissionDate ? formatDistanceToNow(new Date(patient.admissionDate + 'T' + (patient.admissionTime || '00:00')), { addSuffix: true }) : 'Just now'}
                            </div>
                          </div>

                        </>
                      ) : (
                        <div className="py-4 text-center">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Available</span>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            </div>
          );
        }) : <div className="col-span-full py-20 text-center text-slate-400">No rooms found in this ward.</div>}
      </div>
    </div>
  );
};
export default RoomManagementView;
