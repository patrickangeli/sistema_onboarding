import { useEffect, useState } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { DynamicInput } from './components/DynamicInput';
// Importamos a nova máscara aqui
import { validarCPF, mascaraCPF, mascaraCEP } from './utils/validators';

const PROCESS_ID = "fb1634dc-7d5b-437d-95ba-4ff3032ae099"; // SEU ID DO PRISMA

export default function App() {
  const [process, setProcess] = useState<any>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employeeName, setEmployeeName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm();

  const { 
    register: registerAuth, 
    handleSubmit: handleSubmitAuth,
    setValue: setValueAuth,
    setFocus: setFocusAuth,
    formState: { errors: errorsAuth }
  } = useForm();

  useEffect(() => {
    axios.get(`http://localhost:3000/process/${PROCESS_ID}/structure`)
      .then(res => { setProcess(res.data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  useEffect(() => {
    if (process && employeeName) {
      process.phases.forEach((phase: any) => {
        phase.questions.forEach((q: any) => {
          if (q.label.toLowerCase().includes("nome")) setValue(q.id, employeeName);
        });
      });
    }
  }, [process, employeeName, setValue]);

  // --- BUSCA DE CEP COM MÁSCARA ---
  const handleCepChange = async (e: any) => {
    // 1. Aplica a máscara visual (coloca o traço)
    const valorMascarado = mascaraCEP(e.target.value);
    e.target.value = valorMascarado; // Atualiza o input visualmente

    // 2. Limpa para verificar se tem 8 números para buscar na API
    const cepLimpo = valorMascarado.replace(/\D/g, '');
    
    if (cepLimpo.length === 8) {
      try {
        const res = await axios.get(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        
        if (res.data.erro) {
            alert("CEP não encontrado!");
            return;
        }

        setValueAuth('street', res.data.logradouro);
        setValueAuth('neighborhood', res.data.bairro);
        setValueAuth('city', res.data.localidade);
        setValueAuth('state', res.data.uf);
        setFocusAuth('number'); 

      } catch (error) {
        console.error("Erro ao buscar CEP");
      }
    }
  };

  const onRegister = async (data: any) => {
    try {
      setLoading(true);
      // Removemos formatação de CPF e CEP antes de enviar pro banco (opcional, mas recomendado)
      const cleanData = {
        ...data,
        cep: data.cep.replace(/\D/g, ''),
        cpf: data.cpf.replace(/\D/g, ''),
        processId: PROCESS_ID
      };

      const response = await axios.post('http://localhost:3000/employee', cleanData);

      setEmployeeId(response.data.id);
      setEmployeeName(data.name);
      setLoading(false);
    } catch (error: any) {
      alert("Erro ao cadastrar: " + (error.response?.data?.error || error.message));
      setLoading(false);
    }
  };

  const onSubmitAnswers = async (data: any) => {
    if (!employeeId) return;
    try {
      setLoading(true);
      const promises = Object.keys(data).map(async (questionId) => {
        const value = data[questionId];
        if (value instanceof FileList && value.length > 0) {
            const formData = new FormData();
            formData.append('file', value[0]);
            formData.append('employeeId', employeeId);
            formData.append('questionId', questionId);
            return axios.post('http://localhost:3000/upload', formData);
        } else if (typeof value === 'string') {
            return axios.post('http://localhost:3000/answer/text', {
                employeeId, questionId, value
            });
        }
      });
      await Promise.all(promises);
      const response = await axios.post('http://localhost:3000/next-step', { employeeId });
      alert("✅ " + response.data.message);
      window.location.reload();
    } catch (error: any) {
      if (error.response?.data?.missing) alert(`⚠️ Faltam: ${error.response.data.missing.join(', ')}`);
      else alert("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-600">Carregando...</div>;
  if (!process) return <div className="min-h-screen flex items-center justify-center text-red-500">Erro ao carregar sistema.</div>;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white shadow-xl rounded-lg overflow-hidden">
        
        <div className="bg-blue-600 p-6 text-white">
          <h1 className="text-2xl font-bold">{process.title}</h1>
          <p className="opacity-90">{process.description}</p>
        </div>

        {!employeeId ? (
          <form onSubmit={handleSubmitAuth(onRegister)} className="p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-700 border-b pb-2">Identificação & Endereço</h2>
            
            {/* GRID UNIFICADO: DADOS PESSOAIS + ENDEREÇO */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                
                {/* --- DADOS PESSOAIS --- */}
                <div className="md:col-span-4">
                    <label className="block text-sm font-bold mb-1">Nome Completo</label>
                    <input {...registerAuth("name", { required: "Nome obrigatório" })} className="w-full p-2 border rounded" placeholder="Seu nome" />
                    {errorsAuth.name && <span className="text-red-500 text-xs">{errorsAuth.name.message as string}</span>}
                </div>
                
                <div className="md:col-span-2">
                    <label className="block text-sm font-bold mb-1">E-mail</label>
                    <input {...registerAuth("email", { required: "E-mail obrigatório" })} className="w-full p-2 border rounded" placeholder="email@exemplo.com" />
                </div>
                
                <div className="md:col-span-2">
                    <label className="block text-sm font-bold mb-1">CPF</label>
                    <input 
                        {...registerAuth("cpf", { 
                            required: "CPF obrigatório", 
                            validate: validarCPF, 
                            onChange: (e) => e.target.value = mascaraCPF(e.target.value) 
                        })} 
                        className="w-full p-2 border rounded" placeholder="000.000.000-00" maxLength={14} 
                    />
                    {errorsAuth.cpf && <span className="text-red-500 text-xs">CPF inválido</span>}
                </div>

                {/* --- ENDEREÇO (Agora flui direto, sem separação visual brusca) --- */}
                
                <div className="md:col-span-1">
                    <label className="block text-sm font-bold mb-1">CEP</label>
                    <input 
                        {...registerAuth("cep", { required: true })}
                        onChange={handleCepChange} // Busca + Máscara
                        className="w-full p-2 border rounded border-blue-300 bg-blue-50 focus:bg-white transition" 
                        placeholder="00000-000"
                        maxLength={9}
                    />
                </div>

                <div className="md:col-span-3">
                    <label className="block text-sm font-bold mb-1">Rua</label>
                    <input {...registerAuth("street")} className="w-full p-2 border rounded bg-gray-100" readOnly />
                </div>

                <div className="md:col-span-1">
                    <label className="block text-sm font-bold mb-1">Número</label>
                    <input {...registerAuth("number", { required: true })} className="w-full p-2 border rounded" />
                </div>

                <div className="md:col-span-3">
                    <label className="block text-sm font-bold mb-1">Complemento</label>
                    <input {...registerAuth("complement")} className="w-full p-2 border rounded" placeholder="Apto, Bloco..." />
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-bold mb-1">Bairro</label>
                    <input {...registerAuth("neighborhood")} className="w-full p-2 border rounded bg-gray-100" readOnly />
                </div>

                <div className="md:col-span-1">
                    <label className="block text-sm font-bold mb-1">Cidade</label>
                    <input {...registerAuth("city")} className="w-full p-2 border rounded bg-gray-100" readOnly />
                </div>

                <div className="md:col-span-1">
                    <label className="block text-sm font-bold mb-1">UF</label>
                    <input {...registerAuth("state")} className="w-full p-2 border rounded bg-gray-100" readOnly />
                </div>
            </div>

            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded hover:bg-blue-700 mt-6 transition">
              Iniciar Processo
            </button>
          </form>
        ) : (
          /* TELA 2: PERGUNTAS */
          <form onSubmit={handleSubmit(onSubmitAnswers)} className="p-6">
            <div className="mb-6 bg-green-50 p-4 rounded-lg border border-green-200 flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-full text-green-600">👤</div>
              <div>
                <p className="text-xs text-green-800 uppercase font-bold">Identificado como</p>
                <p className="text-lg font-semibold text-green-900">{employeeName}</p>
              </div>
            </div>

            {process.phases && process.phases.map((phase: any) => (
              <div key={phase.id} className="mb-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">{phase.order}. {phase.title}</h2>
                <div className="space-y-4">
                  {phase.questions.map((q: any) => {
                    const isNameField = q.label.toLowerCase().includes("nome");
                    if (isNameField) return <input key={q.id} type="hidden" {...register(q.id)} />;
                    return (
                      <div key={q.id}>
                        <DynamicInput label={q.label} type={q.type} name={q.id} register={register} options={q.options} required={q.required} />
                        {errors[q.id] && <span className="text-red-500 text-sm">Obrigatório</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            <button type="submit" className="w-full bg-green-600 text-white font-bold py-3 rounded hover:bg-green-700 transition">Enviar e Avançar</button>
          </form>
        )}
      </div>
    </div>
  );
}