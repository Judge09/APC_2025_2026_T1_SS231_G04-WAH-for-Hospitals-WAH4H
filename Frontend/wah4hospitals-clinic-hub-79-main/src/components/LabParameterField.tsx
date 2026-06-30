import React from 'react';
import { LabParameterConfig } from '@/config/labParameters';

interface LabParameterFieldProps {
    parameter: LabParameterConfig;
    value: string;
    onChange: (value: string) => void;
}

/**
 * Reusable component for rendering a single lab parameter input field
 */
export const LabParameterField: React.FC<LabParameterFieldProps> = ({
    parameter,
    value,
    onChange,
}) => {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {parameter.label} ({parameter.unit})
            </label>
            <div className="flex items-center gap-2">
                <input
                    type={parameter.refLow !== 0 || parameter.refHigh !== 0 ? "number" : "text"}
                    step={parameter.step || "any"}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder={`e.g., ${parameter.placeholder}`}
                />
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
                Ref: {parameter.refLow}-{parameter.refHigh} {parameter.unit}
            </p>
        </div>
    );
};

interface LabPanelFormProps {
    panelId: string;
    title: string;
    color: string;
    parameters: LabParameterConfig[];
    formData: any;
    onFieldChange: (fieldKey: string, value: string) => void;
}

/**
 * Reusable component for rendering an entire lab panel (e.g., CBC, CMP)
 * with all its parameters in a grid layout
 */
export const LabPanelForm: React.FC<LabPanelFormProps> = ({
    title,
    color,
    parameters,
    formData,
    onFieldChange,
}) => {
    const bgColor = `bg-${color}-50`;
    const borderColor = `border-${color}-200`;
    const textColor = `text-${color}-900`;

    return (
        <div className={`${bgColor} border ${borderColor} rounded-lg p-4`}>
            <h5 className={`font-semibold ${textColor} mb-4`}>{title}</h5>
            <div className="grid grid-cols-3 gap-4">
                {parameters.map((param) => (
                    <LabParameterField
                        key={param.formKey}
                        parameter={param}
                        value={formData[param.formKey]}
                        onChange={(value) => onFieldChange(param.formKey, value)}
                    />
                ))}
            </div>
        </div>
    );
};
