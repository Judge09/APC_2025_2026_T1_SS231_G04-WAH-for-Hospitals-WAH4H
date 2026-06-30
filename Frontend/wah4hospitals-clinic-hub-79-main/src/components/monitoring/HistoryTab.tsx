import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  FileText,
  Pill,
  FlaskConical,
  Stethoscope,
  Bed,
  Clock,
} from 'lucide-react';
import { HistoryEvent } from '../../types/monitoring';

interface HistoryTabProps {
  events: HistoryEvent[];
}

/** Safe date parser + formatter */
const formatDateTime = (value?: string) => {
  if (!value) return '—';

  const date = new Date(value);
  if (isNaN(date.getTime())) return '—';

  return date.toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export const HistoryTab: React.FC<HistoryTabProps> = ({ events }) => {
  /** Sort safely */
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const da = new Date(a.dateTime ?? '').getTime();
      const db = new Date(b.dateTime ?? '').getTime();
      return (isNaN(db) ? 0 : db) - (isNaN(da) ? 0 : da);
    });
  }, [events]);

  const getIcon = (category: HistoryEvent['category']) => {
    switch (category) {
      case 'Vitals':
        return <Activity className="w-5 h-5 text-blue-500" />;
      case 'Note':
        return <FileText className="w-5 h-5 text-gray-500" />;
      case 'Medication':
        return <Pill className="w-5 h-5 text-green-500" />;
      case 'Lab':
        return <FlaskConical className="w-5 h-5 text-purple-500" />;
      case 'Procedure':
        return <Stethoscope className="w-5 h-5 text-red-500" />;
      case 'Admission':
        return <Bed className="w-5 h-5 text-orange-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getCategoryColor = (category: HistoryEvent['category']) => {
    switch (category) {
      case 'Vitals': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Note': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Medication': return 'bg-green-100 text-green-800 border-green-200';
      case 'Lab': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Procedure': return 'bg-red-100 text-red-800 border-red-200';
      case 'Admission': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50">
          <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-indigo-600" />
            Patient History & Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {sortedEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="bg-indigo-50 rounded-full p-6 mb-4">
                <Clock className="w-12 h-12 text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No History Events</h3>
              <p className="text-sm text-gray-500 text-center max-w-md">
                No events have been recorded in the patient's timeline yet. Activities will appear here as they occur.
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-200 via-blue-200 to-transparent"></div>
              
              <div className="space-y-6">
                {sortedEvents.map((event, index) => (
                  <div key={event.id} className="relative pl-16 pb-6 last:pb-0">
                    {/* Timeline dot */}
                    <div className="absolute left-0 top-0 w-12 h-12 bg-white border-2 border-indigo-200 rounded-full flex items-center justify-center shadow-sm z-10">
                      {getIcon(event.category)}
                    </div>

                    {/* Event card */}
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Badge className={`${getCategoryColor(event.category)} font-semibold px-3 py-1`}>
                              {event.category}
                            </Badge>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDateTime(event.dateTime)}
                            </span>
                          </div>
                          {index === 0 && (
                            <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                              Latest
                            </Badge>
                          )}
                        </div>

                        <h4 className="text-base font-semibold text-gray-900 mb-2">
                          {event.description}
                        </h4>

                        {event.details && (
                          <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded p-3 border-l-4 border-indigo-300">
                            {event.details}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
