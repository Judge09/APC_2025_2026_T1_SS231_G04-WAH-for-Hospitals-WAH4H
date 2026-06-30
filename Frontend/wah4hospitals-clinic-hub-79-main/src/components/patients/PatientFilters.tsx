import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Filter, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

interface PatientFiltersProps {
  activeFilters: {
    status: string[];
    gender: string[];
    civilStatus: string[];
  };
  handleFilterChange: (filterType: keyof PatientFiltersProps['activeFilters'], value: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

// Predefined options
const STATUS_OPTIONS = ['Active', 'Inactive'];
const GENDER_OPTIONS = ['male', 'female'];
const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Divorced', 'Widowed'];

export const PatientFilters: React.FC<PatientFiltersProps> = ({
  activeFilters,
  handleFilterChange,
  clearFilters,
  hasActiveFilters
}) => {
  const renderCheckboxItems = (
    filterType: keyof PatientFiltersProps['activeFilters'],
    options: string[]
  ) => {
    return options.map(option => (
      <DropdownMenuCheckboxItem
        key={option}
        checked={activeFilters[filterType].includes(option)}
        onCheckedChange={() => handleFilterChange(filterType, option)}
      >
        {filterType === 'gender' ? (option === 'male' ? 'Male' : 'Female') : option}
      </DropdownMenuCheckboxItem>
    ));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="w-full sm:w-auto">
          <Filter className="w-4 h-4 mr-2" />
          Filter
          {hasActiveFilters && (
            <Badge className="ml-2 bg-blue-100 text-blue-800 text-xs">
              {Object.values(activeFilters).flat().length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
        {renderCheckboxItems('status', STATUS_OPTIONS)}
        <DropdownMenuSeparator />

        <DropdownMenuLabel>Filter by Sex</DropdownMenuLabel>
        {renderCheckboxItems('gender', GENDER_OPTIONS)}
        <DropdownMenuSeparator />

        <DropdownMenuLabel>Filter by Civil Status</DropdownMenuLabel>
        {renderCheckboxItems('civilStatus', CIVIL_STATUS_OPTIONS)}

        {hasActiveFilters && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={clearFilters} className="text-red-600">
              <X className="w-4 h-4 mr-2" />
              Clear All Filters
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
