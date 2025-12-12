import { useEffect, useState } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { DynamicInput } from './components/DynamicInput';
import { validarCPF, mascaraCPF, mascaraCEP } from './utils/validators';


// ⚠️ ATENÇÃO: Confirme se este ID é o mesmo do seu banco (Prisma Studio)
const PROCESS_ID = "120a1573-2a9b-4075-a827-46451920d9b6"; 

export default function CandidateApp() {
  // Estados da Aplicação
  const [process, setProcess] = useState<any>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employeeName, setEmployeeName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [existingCandidate, setExistingCandidate] = useState<any>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  // FORM 1: Identificação (Tela Inicial)
  const { 
    register: registerAuth, 
    handleSubmit: handleSubmitAuth,
    formState: { errors: errorsAuth },
    setValue: setValueAuth
  } = useForm();

  // FORM 2: Perguntas Dinâmicas + Endereço (Telas Seguintes)
  const { 
    register, 
    handleSubmit, 
    setValue, 
    setFocus, 
    formState: { errors } 
  } = useForm();

  // 1. Carrega a estrutura do processo ao iniciar
  useEffect(() => {
    axios.get(`http://localhost:3000/process/${PROCESS_ID}/structure`)
      .then(res => { 
        setProcess(res.data); 
        setLoading(false); 
      })
      .catch(err => { 
        console.error("Erro ao carregar processo:", err); 
        setLoading(false); 
      });
  }, []);

  // 2. Preenche automaticamente o nome na Fase 2 se houver campo "Nome"
  useEffect(() => {
    if (process && employeeName) {
      process.phases.forEach((phase: any) => {
        phase.questions.forEach((q: any) => {
          if (q.label.toLowerCase().includes("nome")) {
            setValue(q.id, employeeName);
          }
        });
      });
    }
  }, [process, employeeName, setValue]);

  // --- LÓGICA: BUSCA DE CEP ---
  const handleCepChange = async (e: any) => {
    const valorMascarado = mascaraCEP(e.target.value);
    e.target.value = valorMascarado; // Aplica máscara visual
    
    const cepLimpo = valorMascarado.replace(/\D/g, '');
    
    if (cepLimpo.length === 8) {
      try {
        const res = await axios.get(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        if (!res.data.erro) {
            setValue('street', res.data.logradouro);
            setValue('neighborhood', res.data.bairro);
            setValue('city', res.data.localidade);
            setValue('state', res.data.uf);
            setFocus('number'); // Pula cursor para o número
        }
      } catch (error) { 
        console.error("Erro ao buscar CEP", error); 
      }
    }
  };

  // --- LÓGICA: VERIFICAR CPF (TELA 1 - PASSO A) ---
  const onCheckCpf = async (data: any) => {
    try {
        setLoading(true);
        // Tenta buscar o CPF
        const checkRes = await axios.get(`http://localhost:3000/employee/check-cpf/${data.cpf}`);
        
        // Se encontrou (200 OK), carrega detalhes
        if (checkRes.data?.id) {
            const detailsRes = await axios.get(`http://localhost:3000/employee/${checkRes.data.id}/details`);
            setExistingCandidate(detailsRes.data);
        }
    } catch (error: any) {
        // Se não encontrou (404), libera o cadastro
        if (error.response?.status === 404) {
            setIsRegistering(true);
        } else {
            alert("Erro ao verificar CPF: " + (error.response?.data?.error || error.message));
        }
    } finally {
        setLoading(false);
    }
  };

  // --- LÓGICA: REGISTRO FINAL (TELA 1 - PASSO B) ---
  const onRegister = async (data: any) => {
    try {
      setLoading(true);
      const response = await axios.post('http://localhost:3000/employee', {
        name: data.name,
        email: data.email,
        cpf: data.cpf,
        processId: PROCESS_ID
      });

      setEmployeeId(response.data.id);
      setEmployeeName(data.name);
      setLoading(false);
    } catch (error: any) {
      if (error.response?.status === 400 && error.response?.data?.error?.includes("CPF")) {
          alert("Este CPF já foi cadastrado.");
          window.location.reload();
          return;
      }
      alert(error.response?.data?.error || "Erro ao iniciar cadastro.");
      setLoading(false);
    }
  };

  // --- LÓGICA: ENVIO DAS FASES (TELA 2) ---
  const onSubmitPhase = async (data: any) => {
    if (!employeeId) return;
    
    try {
      setLoading(true);

      // A. Se tem dados de endereço (cep), salva na tabela Address
      if (data.cep) {
          await axios.post('http://localhost:3000/employee/address', {
              employeeId,
              cep: data.cep, street: data.street, number: data.number,
              complement: data.complement, neighborhood: data.neighborhood,
              city: data.city, state: data.state
          });
      }

      // B. Salva as respostas dinâmicas (Texto ou Arquivo)
      const promises = Object.keys(data).map(async (key) => {
        // Ignora campos que são do endereço
        if (['cep','street','number','complement','neighborhood','city','state'].includes(key)) return;

        const value = data[key];
        
        // Se for Arquivo
        if (value instanceof FileList && value.length > 0) {
            const formData = new FormData();
            formData.append('file', value[0]);
            formData.append('employeeId', employeeId);
            formData.append('questionId', key); 
            return axios.post('http://localhost:3000/upload', formData);
        } 
        // Se for Texto
        else if (typeof value === 'string') {
            return axios.post('http://localhost:3000/answer/text', {
                employeeId, questionId: key, value
            });
        }
      });
      
      await Promise.all(promises);

      // C. Tenta avançar de fase
      const response = await axios.post('http://localhost:3000/next-step', { employeeId });
      alert("✅ " + response.data.message);
      window.location.reload();

    } catch (error: any) {
      // Tratamento de Erros do Backend (ex: Campos obrigatórios faltando)
      if (error.response?.data?.missing) {
         alert(`Faltam preencher: ${error.response.data.missing.join(', ')}`);
      } else {
         alert("Erro ao salvar: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // --- RENDERIZAÇÃO ---
  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-600">Carregando...</div>;
  if (!process) return <div className="min-h-screen flex items-center justify-center text-red-500 font-bold">Erro: Processo não encontrado. Verifique o ID.</div>;

  // --- MODAL DE CANDIDATO EXISTENTE ---
  if (existingCandidate) {
    return (
        <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
            <div className="w-full max-w-4xl bg-white shadow-lg rounded-lg overflow-hidden">
                <div className="bg-yellow-500 p-6 text-white flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">⚠️ Cadastro Já Existente</h1>
                        <p className="opacity-90">Encontramos seus dados no sistema.</p>
                    </div>
                    <button 
                        onClick={() => window.location.reload()}
                        className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded"
                    >
                        Voltar
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    <div className="bg-yellow-50 p-4 rounded border border-yellow-200 text-yellow-800 mb-4">
                        Você já iniciou este processo. Abaixo estão os dados que temos registrados.
                    </div>

                    {/* Dados Pessoais */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">👤 Dados Pessoais</h3>
                        <p><strong>Nome:</strong> {existingCandidate.name}</p>
                        <p><strong>Email:</strong> {existingCandidate.email}</p>
                        <p><strong>CPF:</strong> {existingCandidate.cpf}</p>
                    </div>

                    {/* Endereço */}
                    {existingCandidate.address && existingCandidate.address.length > 0 && (
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">📍 Endereço</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                <p><strong>Rua:</strong> {existingCandidate.address[0].street}, {existingCandidate.address[0].number}</p>
                                <p><strong>Bairro:</strong> {existingCandidate.address[0].neighborhood}</p>
                                <p><strong>Cidade/UF:</strong> {existingCandidate.address[0].city}/{existingCandidate.address[0].state}</p>
                                <p><strong>CEP:</strong> {existingCandidate.address[0].cep}</p>
                            </div>
                        </div>
                    )}

                    {/* Respostas */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">📝 Respostas do Formulário</h3>
                        {existingCandidate.answers.length === 0 ? (
                            <p className="text-gray-500">Nenhuma resposta registrada ainda.</p>
                        ) : (
                            <div className="space-y-4">
                                {existingCandidate.answers.map((ans: any) => (
                                    <div key={ans.id} className="bg-gray-50 p-4 rounded border border-gray-200">
                                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">
                                            {ans.question?.label || "Pergunta Removida"}
                                        </p>
                                        
                                        {ans.value === 'ARQUIVO' && ans.document ? (
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">📄</span>
                                                <div>
                                                    <p className="font-bold text-gray-800">{ans.document.fileName}</p>
                                                    <a 
                                                        href={`http://localhost:3000/file/${ans.id}`} 
                                                        target="_blank"
                                                        className="text-blue-600 hover:underline text-sm"
                                                    >
                                                        Baixar / Visualizar
                                                    </a>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-gray-800 font-medium">
                                                {ans.question?.type === 'DATE' 
                                                    ? ans.value.split('-').reverse().join('/') 
                                                    : ans.value}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white shadow-xl rounded-lg overflow-hidden">
        
        {/* Cabeçalho do Processo */}
        <div className="bg-blue-600 p-6 text-white">
          <h1 className="text-2xl font-bold">{process.title}</h1>
          <p className="opacity-90">{process.description}</p>
        </div>

        {!employeeId ? (
          // ============================================================
          // TELA 1: IDENTIFICAÇÃO (CPF -> Nome/Email)
          // ============================================================
          !isRegistering ? (
            // PASSO A: APENAS CPF
            <form onSubmit={handleSubmitAuth(onCheckCpf)} className="p-6 space-y-4">
                <h2 className="text-xl font-bold text-gray-700 border-b pb-2">Identificação</h2>
                <p className="text-gray-600 text-sm">Informe seu CPF para acessar ou iniciar o cadastro.</p>
                
                <div>
                    <label className="block text-sm font-bold mb-1">CPF</label>
                    <input 
                        {...registerAuth("cpf", { 
                            required: "CPF é obrigatório", 
                            validate: (v) => validarCPF(v) || "CPF inválido",
                            onChange: (e) => e.target.value = mascaraCPF(e.target.value) 
                        })} 
                        className="w-full p-2 border rounded" 
                        placeholder="000.000.000-00" 
                        maxLength={14} 
                    />
                    {errorsAuth.cpf && <span className="text-red-500 text-xs block mt-1">{errorsAuth.cpf.message as string}</span>}
                </div>

                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded mt-4 transition-colors">
                    Continuar
                </button>
            </form>
          ) : (
            // PASSO B: COMPLETAR CADASTRO
            <form onSubmit={handleSubmitAuth(onRegister)} className="p-6 space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                    <h2 className="text-xl font-bold text-gray-700">Novo Cadastro</h2>
                    <button type="button" onClick={() => setIsRegistering(false)} className="text-sm text-blue-600 hover:underline">Voltar</button>
                </div>
                
                <div className="grid gap-4">
                    {/* CPF (ReadOnly) */}
                    <div>
                        <label className="block text-sm font-bold mb-1">CPF</label>
                        <input 
                            {...registerAuth("cpf")} 
                            className="w-full p-2 border rounded bg-gray-100 text-gray-500" 
                            readOnly
                        />
                    </div>

                    {/* Nome */}
                    <div>
                        <label className="block text-sm font-bold mb-1">Nome Completo</label>
                        <input 
                            {...registerAuth("name", { required: "Nome é obrigatório" })} 
                            className="w-full p-2 border rounded" 
                            placeholder="Ex: Patrick de Angeli" 
                            autoFocus
                        />
                        {errorsAuth.name && <span className="text-red-500 text-xs">{errorsAuth.name.message as string}</span>}
                    </div>

                    {/* Email */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold mb-1">E-mail</label>
                        <input 
                            {...registerAuth("email", { 
                                required: "E-mail é obrigatório",
                                pattern: {
                                    value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                                    message: "Formato de e-mail inválido"
                                }
                            })} 
                            className="w-full p-2 border rounded" 
                            placeholder="seu@email.com" 
                        />
                        {errorsAuth.email && <span className="text-red-500 text-xs block mt-1">{errorsAuth.email.message as string}</span>}
                    </div>
                </div>

                <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded mt-4 transition-colors">
                    Cadastrar e Iniciar
                </button>
            </form>
          )

        ) : (
          // ============================================================
          // TELA 2: FASES DINÂMICAS + ENDEREÇO
          // ============================================================
          <form onSubmit={handleSubmit(onSubmitPhase)} className="p-6">
            <div className="mb-6 bg-green-50 p-4 rounded border border-green-200 text-green-800 font-bold flex items-center gap-2">
               <span>👤</span> Identificado como: {employeeName}
            </div>

            {process.phases && process.phases.map((phase: any) => (
              <div key={phase.id} className="mb-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
                    {phase.order}. {phase.title}
                </h2>
                
                {/* --- BLOCO DE ENDEREÇO (Aparece apenas na Fase 1) --- */}
                {phase.order === 1 && (
                    <div className="bg-gray-50 p-4 rounded mb-6 border border-gray-200">
                        <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                            <span>📍</span> Endereço Residencial
                        </h3>
                        <div className="grid grid-cols-4 gap-3">
                            {/* CEP */}
                            <div className="col-span-1">
                                <label className="text-xs font-bold block mb-1">CEP</label>
                                <input 
                                    {...register("cep", { required: true })} 
                                    onChange={handleCepChange} 
                                    className="w-full p-2 border rounded border-blue-300 bg-blue-50 focus:bg-white transition" 
                                    placeholder="00000-000"
                                    maxLength={9}
                                />
                                {errors.cep && <span className="text-red-500 text-xs">*</span>}
                            </div>
                            
                            {/* Campos Automáticos (Read Only) */}
                            <div className="col-span-3">
                                <label className="text-xs font-bold block mb-1">Rua</label>
                                <input {...register("street")} className="w-full p-2 border rounded bg-gray-200 text-gray-600" readOnly tabIndex={-1} />
                            </div>
                            
                            <div className="col-span-1">
                                <label className="text-xs font-bold block mb-1">Número</label>
                                <input {...register("number", { required: true })} className="w-full p-2 border rounded" />
                                {errors.number && <span className="text-red-500 text-xs">*</span>}
                            </div>
                            
                            <div className="col-span-3">
                                <label className="text-xs font-bold block mb-1">Complemento</label>
                                <input {...register("complement")} className="w-full p-2 border rounded" placeholder="Apto, Bloco..." />
                            </div>
                            
                            <div className="col-span-2">
                                <label className="text-xs font-bold block mb-1">Bairro</label>
                                <input {...register("neighborhood")} className="w-full p-2 border rounded bg-gray-200 text-gray-600" readOnly tabIndex={-1} />
                            </div>
                            
                            <div className="col-span-1">
                                <label className="text-xs font-bold block mb-1">Cidade</label>
                                <input {...register("city")} className="w-full p-2 border rounded bg-gray-200 text-gray-600" readOnly tabIndex={-1} />
                            </div>
                            
                            <div className="col-span-1">
                                <label className="text-xs font-bold block mb-1">UF</label>
                                <input {...register("state")} className="w-full p-2 border rounded bg-gray-200 text-gray-600" readOnly tabIndex={-1} />
                            </div>
                        </div>
                    </div>
                )}

                {/* --- PERGUNTAS DINÂMICAS --- */}
                <div className="space-y-4">
                  {phase.questions.map((q: any) => {
                    // Se for pergunta de Nome, esconde pois já temos
                    if (q.label.toLowerCase().includes("nome")) return <input key={q.id} type="hidden" {...register(q.id)} />;
                    
                    return (
                        <div key={q.id}>
                            <DynamicInput 
                                label={q.label} 
                                type={q.type} 
                                name={q.id} 
                                register={register} 
                                options={q.options} 
                                required={q.required} 
                            />
                            {errors[q.id] && <span className="text-red-500 text-sm font-semibold">Este campo é obrigatório</span>}
                        </div>
                    )
                  })}
                </div>
              </div>
            ))}

            <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded transition-colors shadow-md">
                Salvar e Continuar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
