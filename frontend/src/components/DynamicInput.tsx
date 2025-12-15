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
  readOnly?: boolean;
  isInvalid?: boolean;
}

export function DynamicInput({ label, type, name, register, options, required, readOnly, isInvalid }: DynamicInputProps) {
  
  // Base CSS para ficar bonitinho
  const labelStyle = "block text-sm font-medium text-gray-700 mb-1";
  // Se inválido (correção), borda vermelha. Se readOnly, fundo cinza.
  const inputStyle = `w-full p-2 border rounded focus:outline-none ${
    isInvalid 
      ? 'border-red-500 ring-1 ring-red-500 bg-red-50' 
      : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
  } ${readOnly ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`;

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
            readOnly={readOnly}
          />
        </div>
      );

    case 'SELECT':
      return (
        <div className="mb-4">
          <label className="block mb-1 font-bold text-gray-700">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <select 
            {...register(name, validationRules)} 
            className={inputStyle}
            disabled={readOnly}
          >
            <option value="">Selecione...</option>
            {options?.map((opt, idx) => (
              <option key={idx} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      );

    case 'FILE':
      const fileRules = {
        ...validationRules,
        validate: {
          fileType: (files: any) => {
            if (!files || files.length === 0) return true;
            const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
            return validTypes.includes(files[0]?.type) || "Apenas arquivos PDF, PNG ou JPG são permitidos.";
          }
        }
      };

      return (
        <div className={`mb-4 p-4 border-2 border-dashed rounded ${isInvalid ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-gray-50'}`}>
          <label className="block mb-1 font-bold text-gray-700">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <input 
            type="file" 
            {...register(name, fileRules)}
            accept=".pdf,.png,.jpg,.jpeg"
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            disabled={readOnly}
          />
        </div>
      );

    default:
      return <p className="text-red-500">Tipo não suportado: {type}</p>;
  }
}