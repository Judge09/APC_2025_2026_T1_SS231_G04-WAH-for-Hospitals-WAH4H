import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';

interface LocationSelectorProps {
  locations: any;
  value: {
    building: string;
    ward: string;
    room?: string;
    bed?: string;
  };
  onChange: (level: string, value: string) => void;
  showRoom?: boolean;
  showBed?: boolean;
  layout?: 'grid' | 'flex';
  className?: string;
  admissions?: any[]; // For occupancy decorators
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  locations,
  value,
  onChange,
  showRoom = true,
  showBed = false,
  layout = 'grid',
  className = '',
  admissions = []
}) => {

  const buildings = useMemo(() => locations?.buildings || [], [locations]);

  const wards = useMemo(() => {
    if (!value?.building || !locations) return [];
    const wings = locations.wings[value.building] || [];
    return wings.flatMap((wing: any) => locations.wards[wing.code] || []);
  }, [value?.building, locations]);

  const rooms = useMemo(() => {
    if (!value?.ward || !locations) return [];
    const corridors = locations.corridors[value.ward] || [];
    return corridors.flatMap((c: any) => locations.rooms[c.code] || []);
  }, [value?.ward, locations]);

  const beds = useMemo(() => {
    if (!value?.room || !locations) return [];
    const roomObj = rooms.find(r => r.code === value.room);
    if (!roomObj) return [];

    return Array.from({ length: roomObj.beds }, (_, i) => {
      const code = String.fromCharCode(65 + i);
      const isOccupied = admissions?.some(a =>
        a.status === 'in-progress' &&
        a.location?.room === value.room &&
        a.location?.bed === code
      );
      return { code, status: isOccupied ? 'occupied' : 'available' };
    });
  }, [value?.room, rooms, admissions]);

  const containerClass = layout === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'flex flex-col md:flex-row gap-4';

  const selectClass = "w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all";
  const labelClass = "text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block";

  return (
    <div className={`${containerClass} ${className}`}>
      {/* Building */}
      <div className="flex-1">
        <label className={labelClass}>Building</label>
        <select
          className={selectClass}
          value={value.building}
          onChange={(e) => onChange('building', e.target.value)}
        >
          <option value="">Select Building...</option>
          {buildings.map((b: any) => (
            <option key={b.code} value={b.code}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* Ward */}
      <div className="flex-1">
        <label className={labelClass}>Ward</label>
        <select
          className={selectClass}
          value={value.ward}
          onChange={(e) => onChange('ward', e.target.value)}
          disabled={!value.building}
        >
          <option value="">Select Ward...</option>
          {wards.map((w: any) => (
            <option key={w.code} value={w.code}>{w.name}</option>
          ))}
        </select>
      </div>

      {/* Room */}
      {showRoom && (
        <div className={layout === 'grid' ? 'col-span-full' : 'flex-1'}>
          <label className={labelClass}>Room</label>
          <select
            className={selectClass}
            value={value.room}
            onChange={(e) => onChange('room', e.target.value)}
            disabled={!value.ward}
          >
            <option value="">Select Room...</option>
            {rooms.map((r: any) => {
              // Calculate real occupancy for decorator
              const occCount = admissions?.filter(a => a.status === 'in-progress' && a.location?.room === r.code).length || 0;
              return (
                <option key={r.code} value={r.code}>
                  {r.name} ({occCount}/{r.beds} Occupied)
                </option>
              );
            })}
          </select>
        </div>
      )}

      {/* Bed Select (Buttons) */}
      {showBed && value.room && (
        <div className="col-span-full space-y-2 mt-2">
          <label className={labelClass}>Select Bed</label>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
            {beds.map((bed) => (
              <button
                key={bed.code}
                type="button"
                disabled={bed.status === 'occupied'}
                onClick={() => onChange('bed', bed.code)}
                className={`p-3 rounded-lg border flex flex-col items-center justify-center transition-all ${value.bed === bed.code
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                    : bed.status === 'occupied'
                      ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400'
                  }`}
              >
                <span className="font-bold">{bed.code}</span>
                <span className="text-[9px] uppercase font-medium">{bed.status}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
