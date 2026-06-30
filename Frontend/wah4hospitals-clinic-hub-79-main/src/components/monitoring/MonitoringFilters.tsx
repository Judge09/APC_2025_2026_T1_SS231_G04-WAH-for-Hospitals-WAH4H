import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface MonitoringFiltersProps {
    activeFilters: {
        ward: string;
        status: string;
        doctor: string;
    };
    handleFilterChange: (key: string, value: string) => void;
    clearFilters: () => void;
    hasActiveFilters: boolean;
}

export const MonitoringFilters: React.FC<MonitoringFiltersProps> = ({
    activeFilters,
    handleFilterChange,
    clearFilters,
    hasActiveFilters,
}) => {
    return (
        <div className="flex flex-wrap gap-2 items-center">
            <Select
                value={activeFilters.ward}
                onValueChange={(value) => handleFilterChange('ward', value)}
            >
                <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Ward" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="General Ward">General Ward</SelectItem>
                    <SelectItem value="ICU">ICU</SelectItem>
                    <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                    <SelectItem value="Surgery">Surgery</SelectItem>
                </SelectContent>
            </Select>

            <Select
                value={activeFilters.status}
                onValueChange={(value) => handleFilterChange('status', value)}
            >
                <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Stable">Stable</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="Observation">Observation</SelectItem>
                    <SelectItem value="Recovering">Recovering</SelectItem>
                </SelectContent>
            </Select>

            <Select
                value={activeFilters.doctor}
                onValueChange={(value) => handleFilterChange('doctor', value)}
            >
                <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Assigned Doctor" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Dr. Smith">Dr. Smith</SelectItem>
                    <SelectItem value="Dr. Johnson">Dr. Johnson</SelectItem>
                    <SelectItem value="Dr. Williams">Dr. Williams</SelectItem>
                </SelectContent>
            </Select>

            {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10 px-2 text-gray-500">
                    <X className="w-4 h-4 mr-1" />
                    Clear
                </Button>
            )}
        </div>
    );
};
