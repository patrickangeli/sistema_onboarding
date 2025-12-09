// frontend/src/App.tsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { DynamicInput } from './components/DynamicInput';

// O ID que você me passou (Hardcoded para teste)
const PROCESS_ID = "fb1634dc-7d5b-437d-95ba-4ff3032ae099";

export default function App() {
  const [process, setProcess] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // React Hook Form gerencia o estado do formulário
  const { register, handleSubmit, formState: { errors } } = useForm();

  // 1. Busca a estrutura ao carregar a página
  useEffect(() => {
    axios.get(`http://localhost:3000/process/${PROCESS_ID}/structure`)
      .then(response => {
        setProcess(response.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Erro ao buscar API:", err);
        setLoading(false);
      });
  }, []);

  const onSubmit = (data: any) => {
    console.log("Dados preenchidos:", data);
    alert("Dados capturados! Abra o console (F12) para ver o JSON.");
    // Amanhã faremos o envio real para o backend aqui
  };

  if (loading) return <div className="p-10">Carregando formulário...</div>;
  if (!process) return <div className="p-10 text-red-500">Erro ao carregar processo. Backend está rodando?</div>;

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden">
        
        {/* Cabeçalho */}
        <div className="bg-blue-600 p-6 text-white">
          <h1 className="text-2xl font-bold">{process.title}</h1>
          <p className="opacity-90">{process.description}</p>
        </div>

        {/* Formulário Dinâmico */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          
          {process.phases.map((phase: any) => (
            <div key={phase.id} className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
                {phase.order}. {phase.title}
              </h2>
              
              <div className="space-y-4">
                {phase.questions.map((q: any) => (
                  <div key={q.id}>
                    <DynamicInput 
                      label={q.label}
                      type={q.type}
                      name={q.id} // O nome do input é o ID da pergunta
                      register={register}
                      options={q.options}
                      required={q.required}
                    />
                    {/* Exibe erro de validação se houver */}
                    {errors[q.id] && (
                      <span className="text-red-500 text-sm">Campo obrigatório</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button 
            type="submit" 
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded transition"
          >
            Enviar Admissão
          </button>
        </form>

      </div>
    </div>
  );
}