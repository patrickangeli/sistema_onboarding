import React from 'react';

// Tipos baseados no nosso Prisma
interface Option {
  label: string;
  value: string;
}

interface DynamicInputProps {
  label: string;
  type: 'TEXT' | 'NUMBER' | 'DATE' | 'FILE' | 'SELECT' | 'CHECKBOX';
  name: string;
  register: any; // Função do React Hook Form
  options?: Option[];
  required?: boolean;
}

export function DynamicInput({ label, type, name, register, options, required }: DynamicInputProps) {
  
  // Base CSS para ficar bonitinho
  const labelStyle = "block text-sm font-medium text-gray-700 mb-1";
  const inputStyle = "w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none";

  const validationRules = required ? { required: "Este campo é obrigatório" } : {};

  switch (type) {
    case 'TEXT':
    case 'NUMBER':
    case 'DATE':
      return (
        <div className="mb-4">
          <label className="block mb-1 font-bold text-gray-700">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <input 
            type={type.toLowerCase()} 
            {...register(name, validationRules)}
            className={inputStyle}
          />
        </div>
      );

    case 'SELECT':
      return (
        <div className="mb-4">
          <label className="block mb-1 font-bold text-gray-700">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <select {...register(name, validationRules)} className={inputStyle}>
            <option value="">Selecione...</option>
            {options?.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      );

    case 'FILE':
      return (
        <div className="mb-4 p-4 border-2 border-dashed border-gray-300 rounded bg-gray-50">
          <label className="block mb-1 font-bold text-gray-700">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <input 
            type="file" 
            {...register(name, validationRules)}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
      );

    default:
      return <p className="text-red-500">Tipo não suportado: {type}</p>;
  }
}