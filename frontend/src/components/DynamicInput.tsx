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
  currentValue?: any;
  currentDocument?: any;
}

export function DynamicInput({ label, type, name, register, options, required, readOnly, isInvalid, currentValue, currentDocument }: DynamicInputProps) {
  const [isUnlocked, setIsUnlocked] = React.useState(false);

  // Se for inválido, só libera edição se clicar no botão. Se for readOnly normal, nunca libera.
  const isActuallyReadOnly = readOnly || (isInvalid && !isUnlocked);
  const hasExistingValue = currentValue || currentDocument;

  // Lógica de Obrigatoriedade:
  // 1. Se for Correção (isInvalid) -> OBRIGATÓRIO (precisa enviar novo arquivo/valor)
  // 2. Se já tem valor e não é correção -> NÃO OBRIGATÓRIO (já está salvo)
  // 3. Caso contrário -> Segue a configuração do campo (required)
  const effectiveRequired = isInvalid ? true : (hasExistingValue ? false : required);

  // Base CSS para ficar bonitinho
  // Se inválido (correção), borda vermelha. Se readOnly, fundo cinza.
  const inputStyle = `w-full p-2 border rounded focus:outline-none ${
    isInvalid 
      ? 'border-red-500 ring-1 ring-red-500 bg-red-50' 
      : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
  } ${isActuallyReadOnly ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`;

  let validationRules: any = (effectiveRequired && !isActuallyReadOnly) ? { required: "Este campo é obrigatório" } : {};

  // Validação de Idade (apenas para campos de Data de Nascimento)
  if (type === 'DATE' && label.toLowerCase().includes('nascimento')) {
      validationRules.validate = {
          ...validationRules.validate,
          isAdult: (value: string) => {
              if (!value) return true;
              const today = new Date();
              const birthDate = new Date(value);
              let age = today.getFullYear() - birthDate.getFullYear();
              const m = today.getMonth() - birthDate.getMonth();
              if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                  age--;
              }
              return age >= 18 || "É necessário ser maior de 18 anos.";
          }
      };
  }

  const CorrectionButton = () => (
    isInvalid && !isUnlocked && (
      <button 
        type="button"
        onClick={(e) => { e.preventDefault(); setIsUnlocked(true); }}
        className="ml-2 text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 shadow-sm"
      >
        Corrigir ✏️
      </button>
    )
  );

  switch (type) {
    case 'TEXT':
    case 'NUMBER':
    case 'DATE':
      return (
        <div className="mb-4">
          <label className="block mb-1 font-bold text-gray-700 flex items-center">
            {label} {required && <span className="text-red-500 ml-1">*</span>}
            <CorrectionButton />
          </label>
          <input 
            type={type.toLowerCase()} 
            {...register(name, validationRules)}
            className={inputStyle}
            readOnly={isActuallyReadOnly}
          />
        </div>
      );

    case 'SELECT':
      return (
        <div className="mb-4">
          <label className="block mb-1 font-bold text-gray-700 flex items-center">
            {label} {required && <span className="text-red-500 ml-1">*</span>}
            <CorrectionButton />
          </label>
          <select 
            {...register(name, validationRules)} 
            className={inputStyle}
            disabled={isActuallyReadOnly}
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
            if (isActuallyReadOnly) return true;
            if (!files || files.length === 0) return true;
            const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
            return validTypes.includes(files[0]?.type) || "Apenas arquivos PDF, PNG ou JPG são permitidos.";
          },
          fileSize: (files: any) => {
            if (isActuallyReadOnly) return true;
            if (!files || files.length === 0) return true;
            return files[0]?.size <= 50 * 1024 * 1024 || "O arquivo deve ter no máximo 50MB.";
          }
        }
      };

      return (
        <div className={`mb-4 p-4 border-2 border-dashed rounded ${isInvalid ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-gray-50'}`}>
          <label className="block mb-1 font-bold text-gray-700 flex items-center">
            {label} {required && <span className="text-red-500 ml-1">*</span>}
            <span className="text-xs font-normal text-gray-500 ml-2">(Máx: 50MB)</span>
            <CorrectionButton />
          </label>
          
          {hasExistingValue && (
             <div className={`flex items-center gap-2 mb-2 text-sm p-2 rounded border ${isInvalid ? 'text-red-700 bg-red-100 border-red-200' : 'text-green-700 bg-green-100 border-green-200'}`}>
                <span>{isInvalid ? '⚠️ Arquivo Anterior:' : '✅ Arquivo já enviado:'}</span>
                <span className="font-bold">{currentDocument?.fileName || "Anexo"}</span>
             </div>
          )}

          <input 
            type="file" 
            {...register(name, fileRules)}
            accept=".pdf,.png,.jpg,.jpeg"
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            disabled={isActuallyReadOnly}
          />
        </div>
      );

    default:
      return <p className="text-red-500">Tipo não suportado: {type}</p>;
  }
}