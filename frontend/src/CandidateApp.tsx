import { useEffect, useState } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { DynamicInput } from './components/DynamicInput';
import { validarCPF, mascaraCPF, mascaraCEP } from './utils/validators';


// ⚠️ ATENÇÃO: Confirme se este ID é o mesmo do seu banco (Prisma Studio)
const PROCESS_ID = "6a475050-ebdd-4b4f-8ef1-0753321992ec"; 

export default function CandidateApp() {
  // Estados da Aplicação
  const [process, setProcess] = useState<any>(null);    
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employeeName, setEmployeeName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [existingCandidate, setExistingCandidate] = useState<any>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [tempCandidateData, setTempCandidateData] = useState<any>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // FORM 1: Identificação (Tela Inicial)
  const { 
    register: registerAuth, 
    handleSubmit: handleSubmitAuth,
    formState: { errors: errorsAuth }
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
    axios.get(`/process/${PROCESS_ID}/structure`)
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

  // 3. Preenche dados se for correção
  useEffect(() => {
    if (existingCandidate && existingCandidate.corrections?.length > 0) {
        // Pre-fill address
        if (existingCandidate.address) {
            const addr = existingCandidate.address;
            setValue('cep', addr.cep);
            setValue('street', addr.street);
            setValue('number', addr.number);
            setValue('complement', addr.complement);
            setValue('neighborhood', addr.neighborhood);
            setValue('city', addr.city);
            setValue('state', addr.state);
        }
        
        // Pre-fill answers
        existingCandidate.answers?.forEach((ans: any) => {
            setValue(ans.questionId, ans.value);
        });
        
        // Set context for rendering
        setEmployeeId(existingCandidate.id);
        setEmployeeName(existingCandidate.name);
    }
  }, [existingCandidate, setValue]);

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
        const checkRes = await axios.get(`/employee/check-cpf/${data.cpf}`);
        
        // Se encontrou (200 OK), carrega detalhes
        if (checkRes.data?.id) {
            const detailsRes = await axios.get(`/employee/${checkRes.data.id}/details`);
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
    // Apenas salva no estado temporário e avança para as fases
    setTempCandidateData({
        name: data.name,
        email: data.email,
        cpf: data.cpf
    });
    setEmployeeName(data.name);
    // Não fazemos POST aqui. O POST será feito no final (onSubmitPhase).
  };

  // --- LÓGICA: ENVIO DAS FASES (TELA 2) ---
  const onSubmitPhase = async (data: any) => {
    try {
      setLoading(true);
      let currentEmployeeId = employeeId;

      // 1. Se não temos ID ainda (Novo Cadastro), cria o Employee agora
      if (!currentEmployeeId && tempCandidateData) {
          try {
            const createRes = await axios.post('/employee', {
                ...tempCandidateData,
                processId: PROCESS_ID
            });
            currentEmployeeId = createRes.data.id;
            setEmployeeId(currentEmployeeId);
          } catch (error: any) {
            if (error.response?.status === 400 && error.response?.data?.error?.includes("CPF")) {
                alert("Este CPF já foi cadastrado.");
                window.location.reload();
                return;
            }
            throw error; // Lança para o catch principal
          }
      }

      if (!currentEmployeeId) {
          alert("Erro: ID do candidato não encontrado.");
          return;
      }

      // A. Se tem dados de endereço (cep), salva na tabela Address
      if (data.cep) {
          await axios.post('/employee/address', {
              employeeId: currentEmployeeId,
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
            formData.append('employeeId', currentEmployeeId!);
            formData.append('questionId', key); 
            return axios.post('/upload', formData);
        } 
        // Se for Texto
        else if (typeof value === 'string') {
            return axios.post('/answer/text', {
                employeeId: currentEmployeeId, questionId: key, value
            });
        }
      });
      
      await Promise.all(promises);

      // C. Tenta avançar de fase
      const response = await axios.post('/next-step', { employeeId: currentEmployeeId });
      alert("✅ " + response.data.message);
      window.location.reload();

    } catch (error: any) {
      // Tratamento de Erros do Backend (ex: Campos obrigatórios faltando)
      if (error.response?.data?.missing) {
         alert(`Faltam preencher: ${error.response.data.missing.join(', ')}`);
      } else {
         alert("Erro ao salvar: " + (error.response?.data?.error || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  // --- RENDERIZAÇÃO ---
  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-600">Carregando...</div>;
  if (!process) return <div className="min-h-screen flex items-center justify-center text-red-500 font-bold">Erro: Processo não encontrado. Verifique o ID.</div>;

  const isCorrectionMode = existingCandidate?.corrections?.length > 0;
  const hasAddressCorrection = isCorrectionMode && existingCandidate.corrections.some((c: any) => c.startsWith('address_'));

  // --- MODAL DE CANDIDATO EXISTENTE ---
  if (existingCandidate && !isCorrectionMode) {
    
    // Se estiver APROVADO, mostra card verde
    if (existingCandidate.status === 'APPROVED') {
        return (
            <div className="min-h-screen bg-green-50 p-8 flex items-center justify-center">
                <div className="w-full max-w-2xl bg-white shadow-xl rounded-lg overflow-hidden text-center p-10">
                    <div className="text-6xl mb-4">🎉</div>
                    <h1 className="text-3xl font-bold text-green-600 mb-2">Parabéns!</h1>
                    <p className="text-xl text-gray-700 mb-6">Seu cadastro foi aprovado pelo RH.</p>
                    <p className="text-gray-500">Aguarde o contato da nossa equipe para os próximos passos.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
            <div className="w-full max-w-2xl bg-white shadow-xl rounded-lg overflow-hidden">
                <div className="bg-yellow-500 p-6 text-white text-center relative">
                    <h1 className="text-2xl font-bold mb-2">⚠️ Cadastro em Análise</h1>
                    <p className="opacity-90">Seus dados foram enviados e estão sob revisão do RH.</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="absolute top-4 right-4 text-white/80 hover:text-white font-bold"
                        title="Sair / Voltar"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="bg-yellow-50 p-4 rounded border border-yellow-200 text-yellow-800 text-sm text-center">
                        Você não precisa fazer nada agora. Assim que analisarmos, entraremos em contato ou solicitaremos correções por aqui.
                    </div>

                    {/* Dados Pessoais */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider border-b pb-2 mb-3">👤 Dados Pessoais</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="block text-gray-500 text-xs">Nome</span>
                                <span className="font-medium text-gray-800">{existingCandidate.name}</span>
                            </div>
                            <div>
                                <span className="block text-gray-500 text-xs">CPF</span>
                                <span className="font-medium text-gray-800">{existingCandidate.cpf}</span>
                            </div>
                            <div className="md:col-span-2">
                                <span className="block text-gray-500 text-xs">E-mail</span>
                                <span className="font-medium text-gray-800">{existingCandidate.email}</span>
                            </div>
                        </div>
                    </div>

                    {/* Endereço */}
                    {existingCandidate.address && (
                        <div>
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider border-b pb-2 mb-3">📍 Endereço</h3>
                            <div className="text-sm text-gray-700">
                                <p>{existingCandidate.address.street}, {existingCandidate.address.number} {existingCandidate.address.complement && `- ${existingCandidate.address.complement}`}</p>
                                <p>{existingCandidate.address.neighborhood} - {existingCandidate.address.city}/{existingCandidate.address.state}</p>
                                <p className="text-gray-500 text-xs mt-1">CEP: {existingCandidate.address.cep}</p>
                            </div>
                        </div>
                    )}

                    {/* Respostas */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider border-b pb-2 mb-3">📝 Respostas Enviadas</h3>
                        {existingCandidate.answers.length === 0 ? (
                            <p className="text-gray-500 text-sm italic">Nenhuma resposta registrada.</p>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {existingCandidate.answers.map((ans: any) => (
                                    <div key={ans.id} className="flex justify-between items-center bg-gray-50 p-3 rounded border border-gray-100 text-sm">
                                        <span className="font-medium text-gray-600">
                                            {ans.question?.label || "Questão"}
                                        </span>
                                        
                                        {ans.value === 'ARQUIVO' && ans.document ? (
                                            <a 
                                                href={`/file/${ans.id}`} 
                                                target="_blank"
                                                className="text-blue-600 hover:underline flex items-center gap-1"
                                            >
                                                📄 {ans.document.fileName}
                                            </a>
                                        ) : (
                                            <span className="text-gray-800 font-semibold">
                                                {ans.question?.type === 'DATE' 
                                                    ? ans.value.split('-').reverse().join('/') 
                                                    : ans.value}
                                            </span>
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
      <div className={`w-full bg-white shadow-xl rounded-lg overflow-hidden transition-all duration-500 ${!employeeId && !tempCandidateData ? 'max-w-md' : 'max-w-2xl'}`}>
        
        {/* Cabeçalho do Processo */}
        <div className="bg-blue-600 p-6 text-white text-center relative">
          <h1 className="text-2xl font-bold">{process.title}</h1>
          <p className="opacity-90">{process.description}</p>
          <button
            onClick={() => setShowHelpModal(true)}
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors"
            title="Como funciona?"
          >
            <span className="text-xl">❓</span>
          </button>
        </div>

        {/* Help Modal */}
        {showHelpModal && (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowHelpModal(false)}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl overflow-hidden relative" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800">Como funciona o sistema?</h2>
                    <button
                        onClick={() => setShowHelpModal(false)}
                        className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                    >
                        &times;
                    </button>
                </div>
                <div className="p-0 bg-black">
                    <div style={{ position: 'relative', paddingBottom: '52.65625%', height: 0 }}>
                        <iframe
                            src="https://www.loom.com/embed/3e177467ac9e41c3bab1857416a79b9b"
                            frameBorder="0"
                            allowFullScreen
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                        ></iframe>
                    </div>
                </div>
            </div>
            </div>
        )}

        {!employeeId && !tempCandidateData ? (
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

            {isCorrectionMode && (
                <div className="mb-6 bg-red-50 p-4 rounded border-l-4 border-red-500 text-red-800 shadow-sm">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        ⚠️ Atenção: Correção Necessária
                    </h3>
                    <p className="mt-1">
                        Alguns campos foram marcados pelo RH como incorretos. 
                        Procure pelos campos destacados em vermelho e clique no botão <strong>"Corrigir ✏️"</strong> para editar.
                    </p>
                    {existingCandidate.feedback && (
                        <div className="mt-3 p-3 bg-white/50 rounded border border-red-100 text-sm italic">
                            <strong>Mensagem do RH:</strong> "{existingCandidate.feedback}"
                        </div>
                    )}
                </div>
            )}

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
                            {/* CEP (Tratamento Especial por causa do onChange) */}
                            <div className="col-span-1">
                                <label className="text-xs font-bold block mb-1">CEP</label>
                                <input 
                                    {...register("cep", { required: true })} 
                                    onChange={handleCepChange} 
                                    className={`w-full p-2 border rounded transition ${
                                        isCorrectionMode && existingCandidate.corrections.includes('address_cep') 
                                            ? 'border-red-500 ring-1 ring-red-500 bg-red-50' 
                                            : 'border-blue-300 bg-blue-50 focus:bg-white'
                                    } ${isCorrectionMode && !hasAddressCorrection ? 'bg-gray-100 text-gray-500' : ''}`}
                                    placeholder="00000-000"
                                    maxLength={9}
                                    readOnly={isCorrectionMode && !hasAddressCorrection}
                                />
                                {errors.cep && <span className="text-red-500 text-xs">*</span>}
                            </div>
                            
                            {/* Campos Automáticos */}
                            <div className="col-span-3">
                                <label className="text-xs font-bold block mb-1">Rua</label>
                                <input 
                                    {...register("street")} 
                                    className={`w-full p-2 border rounded transition ${
                                        isCorrectionMode && existingCandidate.corrections.includes('address_street') 
                                            ? 'border-red-500 ring-1 ring-red-500 bg-red-50' 
                                            : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
                                    } ${!(isCorrectionMode && existingCandidate.corrections.includes('address_street')) ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                    readOnly={!(isCorrectionMode && existingCandidate.corrections.includes('address_street'))}
                                    tabIndex={!(isCorrectionMode && existingCandidate.corrections.includes('address_street')) ? -1 : 0}
                                />
                            </div>
                            
                            <div className="col-span-1">
                                <label className="text-xs font-bold block mb-1">Número</label>
                                <input 
                                    {...register("number", { required: true })} 
                                    className={`w-full p-2 border rounded transition ${
                                        isCorrectionMode && existingCandidate.corrections.includes('address_number') 
                                            ? 'border-red-500 ring-1 ring-red-500 bg-red-50' 
                                            : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
                                    } ${isCorrectionMode && !hasAddressCorrection ? 'bg-gray-100 text-gray-500' : ''}`}
                                    readOnly={isCorrectionMode && !hasAddressCorrection}
                                />
                                {errors.number && <span className="text-red-500 text-xs">*</span>}
                            </div>
                            
                            <div className="col-span-3">
                                <label className="text-xs font-bold block mb-1">Complemento</label>
                                <input 
                                    {...register("complement")} 
                                    className={`w-full p-2 border rounded transition ${
                                        isCorrectionMode && existingCandidate.corrections.includes('address_complement') 
                                            ? 'border-red-500 ring-1 ring-red-500 bg-red-50' 
                                            : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
                                    } ${isCorrectionMode && !hasAddressCorrection ? 'bg-gray-100 text-gray-500' : ''}`}
                                    placeholder="Apto, Bloco..."
                                    readOnly={isCorrectionMode && !hasAddressCorrection}
                                />
                            </div>
                            
                            <div className="col-span-2">
                                <label className="text-xs font-bold block mb-1">Bairro</label>
                                <input 
                                    {...register("neighborhood")} 
                                    className={`w-full p-2 border rounded transition ${
                                        isCorrectionMode && existingCandidate.corrections.includes('address_neighborhood') 
                                            ? 'border-red-500 ring-1 ring-red-500 bg-red-50' 
                                            : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
                                    } ${!(isCorrectionMode && existingCandidate.corrections.includes('address_neighborhood')) ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                    readOnly={!(isCorrectionMode && existingCandidate.corrections.includes('address_neighborhood'))}
                                    tabIndex={!(isCorrectionMode && existingCandidate.corrections.includes('address_neighborhood')) ? -1 : 0}
                                />
                            </div>
                            
                            <div className="col-span-1">
                                <label className="text-xs font-bold block mb-1">Cidade</label>
                                <input 
                                    {...register("city")} 
                                    className={`w-full p-2 border rounded transition ${
                                        isCorrectionMode && existingCandidate.corrections.includes('address_city') 
                                            ? 'border-red-500 ring-1 ring-red-500 bg-red-50' 
                                            : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
                                    } ${!(isCorrectionMode && existingCandidate.corrections.includes('address_city')) ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                    readOnly={!(isCorrectionMode && existingCandidate.corrections.includes('address_city'))}
                                    tabIndex={!(isCorrectionMode && existingCandidate.corrections.includes('address_city')) ? -1 : 0}
                                />
                            </div>
                            
                            <div className="col-span-1">
                                <label className="text-xs font-bold block mb-1">UF</label>
                                <input 
                                    {...register("state")} 
                                    className={`w-full p-2 border rounded transition ${
                                        isCorrectionMode && (existingCandidate.corrections.includes('address_city') || existingCandidate.corrections.includes('address_state'))
                                            ? 'border-red-500 ring-1 ring-red-500 bg-red-50' 
                                            : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
                                    } ${!(isCorrectionMode && (existingCandidate.corrections.includes('address_city') || existingCandidate.corrections.includes('address_state'))) ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                    readOnly={!(isCorrectionMode && (existingCandidate.corrections.includes('address_city') || existingCandidate.corrections.includes('address_state')))}
                                    tabIndex={!(isCorrectionMode && (existingCandidate.corrections.includes('address_city') || existingCandidate.corrections.includes('address_state'))) ? -1 : 0}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* --- PERGUNTAS DINÂMICAS --- */}
                <div className="space-y-4">
                  {phase.questions.map((q: any) => {
                    // Se for pergunta de Nome, esconde pois já temos
                    if (q.label.toLowerCase().includes("nome")) return <input key={q.id} type="hidden" {...register(q.id)} />;
                    
                    const existingAnswer = existingCandidate?.answers?.find((a: any) => a.questionId === q.id);

                    return (
                        <div key={q.id}>
                            <DynamicInput 
                                label={q.label} 
                                type={q.type} 
                                name={q.id} 
                                register={register} 
                                options={q.options} 
                                required={q.required}
                                readOnly={isCorrectionMode && !existingCandidate.corrections.includes(q.id)}
                                isInvalid={isCorrectionMode && existingCandidate.corrections.includes(q.id)}
                                currentValue={existingAnswer?.value}
                                currentDocument={existingAnswer?.document}
                            />
                            {errors[q.id] && <span className="text-red-500 text-sm font-semibold">{errors[q.id]?.message as string || "Campo obrigatório"}</span>}
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
