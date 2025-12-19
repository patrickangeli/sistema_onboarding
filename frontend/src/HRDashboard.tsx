// frontend/src/HRDashboard.tsx
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

export function HRDashboard() {
  // Estados de Autenticação
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Estados do Dashboard
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [feedback, setFeedback] = useState("");
  const [selectedCorrections, setSelectedCorrections] = useState<string[]>([]);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const loadCandidates = useCallback(() => {
    setLoading(true);
    axios.get('/employees')
      .then(response => {
        setCandidates(response.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Erro ao buscar candidatos:", err);
        setLoading(false);
      });
  }, []);

  // Busca os dados assim que a tela abre (se estiver autenticado)
  useEffect(() => {
    if (isAuthenticated) {
      loadCandidates();
    }
  }, [isAuthenticated, loadCandidates]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin') {
      setIsAuthenticated(true);
      setLoginError("");
    } else {
      setLoginError("Credenciais inválidas. Tente novamente.");
    }
  };

  const fetchDetails = async (id: string) => {
    try {
        const res = await axios.get(`/employee/${id}/details`);
        setSelectedCandidate(res.data);
        setFeedback(res.data.feedback || "");
        setSelectedCorrections(res.data.corrections || []);
    } catch (error) {
        alert("Erro ao carregar detalhes do candidato.");
    }
  };

  const toggleCorrection = (id: string) => {
    setSelectedCorrections(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const addressFields = ['address_cep', 'address_street', 'address_number', 'address_complement', 'address_neighborhood', 'address_city', 'address_state'];
  const isAddressCorrection = addressFields.some(f => selectedCorrections.includes(f));

  const toggleAddressCorrection = () => {
    if (isAddressCorrection) {
        setSelectedCorrections(prev => prev.filter(x => !addressFields.includes(x)));
    } else {
        setSelectedCorrections(prev => [...new Set([...prev, ...addressFields])]);
    }
  };

  const sendFeedback = async () => {
    if (!selectedCandidate) return;
    try {
        await axios.post(`/employee/${selectedCandidate.id}/feedback`, { 
            feedback, 
            corrections: selectedCorrections 
        });
        alert("Feedback enviado com sucesso!");
        setSelectedCandidate(null);
        setFeedback("");
        setSelectedCorrections([]);
        loadCandidates();
    } catch (error) {
        alert("Erro ao enviar feedback.");
    }
  };

  const approveCandidate = async () => {
    if (!selectedCandidate) return;
    if (!confirm("Tem certeza que deseja aprovar este candidato?")) return;

    try {
        await axios.post(`/employee/${selectedCandidate.id}/approve`);
        alert("Candidato aprovado com sucesso!");
        setSelectedCandidate(null);
        loadCandidates();
    } catch (error) {
        alert("Erro ao aprovar candidato.");
    }
  };

  const deleteCandidate = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o candidato ${name}? Esta ação não pode ser desfeita.`)) return;

    try {
        await axios.delete(`/employee/${id}`);
        alert("Candidato removido com sucesso!");
        if (selectedCandidate?.id === id) setSelectedCandidate(null);
        loadCandidates();
    } catch (error) {
        alert("Erro ao remover candidato.");
    }
  };

  // --- TELA DE LOGIN ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white shadow-xl rounded-lg overflow-hidden">
          
          {/* Cabeçalho Azul (Igual ao Candidato) */}
          <div className="bg-blue-600 p-6 text-white text-center">
            <h1 className="text-2xl font-bold">Portal do RH</h1>
            <p className="opacity-90">Gerenciamento de Admissões</p>
          </div>

          <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Usuário</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-3 border rounded focus:ring-2 focus:ring-blue-500 outline-none transition"
                  placeholder="Digite seu usuário"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Senha</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 border rounded focus:ring-2 focus:ring-blue-500 outline-none transition"
                  placeholder="Digite sua senha"
                />
              </div>

              {loginError && (
                <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded border border-red-200">
                  {loginError}
                </div>
              )}

              <button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded transition-colors shadow-md"
              >
                Acessar Painel
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // --- MODAL DE DETALHES ---
  if (selectedCandidate) {
    return (
        <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
            <div className="w-full max-w-2xl bg-white shadow-xl rounded-lg overflow-hidden">
                <div className="bg-blue-600 p-6 text-white text-center relative">
                    <h1 className="text-2xl font-bold mb-1">{selectedCandidate.name}</h1>
                    <p className="opacity-90 text-sm">{selectedCandidate.email} | {selectedCandidate.cpf}</p>
                    <button 
                        onClick={() => setSelectedCandidate(null)}
                        className="absolute top-4 right-4 text-white/80 hover:text-white font-bold"
                        title="Fechar"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    
                    {/* Endereço */}
                    {selectedCandidate.address && (
                        <div>
                            <div className="flex justify-between items-center border-b pb-2 mb-3">
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">📍 Endereço</h3>
                                <button 
                                    onClick={toggleAddressCorrection}
                                    className={`text-xs font-bold px-3 py-1 rounded border transition flex items-center gap-1 ${
                                        isAddressCorrection 
                                            ? 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200' 
                                            : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                                    }`}
                                >
                                    {isAddressCorrection ? '❌ Cancelar Correção' : '✏️ Solicitar Correção'}
                                </button>
                            </div>
                            
                            <div className={`text-sm space-y-1 p-3 rounded transition-colors ${isAddressCorrection ? 'bg-red-50 border border-red-100' : 'bg-gray-50 border border-gray-100'}`}>
                                <div className="font-medium text-gray-800">
                                    {selectedCandidate.address.street}, {selectedCandidate.address.number} {selectedCandidate.address.complement && `- ${selectedCandidate.address.complement}`}
                                </div>
                                <div className="text-gray-600">
                                    {selectedCandidate.address.neighborhood} - {selectedCandidate.address.city}/{selectedCandidate.address.state}
                                </div>
                                <div className="text-gray-500 text-xs mt-1">
                                    CEP: {selectedCandidate.address.cep}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Respostas */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider border-b pb-2 mb-3">📝 Respostas do Formulário</h3>
                        {selectedCandidate.answers.length === 0 ? (
                            <p className="text-gray-500 text-sm italic">Nenhuma resposta registrada.</p>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {selectedCandidate.answers.map((ans: any) => (
                                    <div key={ans.id} className={`flex justify-between items-center p-3 rounded border text-sm ${selectedCorrections.includes(ans.questionId) ? 'border-red-500 bg-red-50' : 'border-gray-100 bg-gray-50'}`}>
                                        <div className="flex-1">
                                            <span className="font-medium text-gray-600 block mb-1">
                                                {ans.question?.label || "Questão"}
                                            </span>
                                            
                                            {ans.value === 'ARQUIVO' && ans.document ? (
                                                <a 
                                                    href={`/file/${ans.id}`} 
                                                    target="_blank"
                                                    className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
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
                                        <input 
                                            type="checkbox" 
                                            checked={selectedCorrections.includes(ans.questionId)} 
                                            onChange={() => toggleCorrection(ans.questionId)}
                                            className="ml-3 w-5 h-5 text-red-600 cursor-pointer"
                                            title="Marcar para correção"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Feedback */}
                    <div className="pt-4 border-t">
                        <h3 className="text-sm font-bold text-gray-800 mb-2">⚠️ Ações do RH</h3>
                        <textarea
                            className="w-full p-3 border rounded focus:ring-2 focus:ring-red-500 outline-none text-sm"
                            rows={3}
                            placeholder="Descreva o que precisa ser corrigido (se houver)..."
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                        />
                        <div className="flex gap-3 mt-3">
                            <button
                                onClick={sendFeedback}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors shadow text-sm"
                            >
                                Solicitar Correção
                            </button>
                            <button
                                onClick={approveCandidate}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors shadow text-sm"
                            >
                                ✅ Aprovar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
  }

  // --- TELA DO DASHBOARD ---
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Carregando painel...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Painel de Recrutamento</h1>
            <p className="text-gray-500">Gerencie as admissões e acompanhe as fases.</p>
          </div>
          <div className="flex gap-4 items-center">
            <button
                onClick={() => setShowHelpModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition-colors shadow-md"
                title="Como funciona?"
            >
                <span className="text-xl">❓</span>
            </button>
            <button 
                onClick={() => setIsAuthenticated(false)}
                className="text-gray-600 hover:text-red-500 font-semibold px-4 py-2"
            >
                Sair
            </button>
          </div>
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

        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="p-4 text-sm font-semibold text-gray-600">Nome do Candidato</th>
                <th className="p-4 text-sm font-semibold text-gray-600">CPF</th>
                <th className="p-4 text-sm font-semibold text-gray-600">Fase Atual</th>
                <th className="p-4 text-sm font-semibold text-gray-600">Status</th>
                <th className="p-4 text-sm font-semibold text-gray-600 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {candidates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    Nenhum candidato encontrado.
                  </td>
                </tr>
              ) : (
                candidates.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="p-4">
                      <p className="font-bold text-gray-800">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.email}</p>
                    </td>
                    <td className="p-4 text-gray-600 text-sm">
                      {c.cpf}
                    </td>
                    <td className="p-4">
                      <span className="bg-blue-100 text-blue-800 py-1 px-3 rounded-full text-xs font-bold uppercase">
                        {c.currentPhase?.title || "Fase Desconhecida"}
                      </span>
                    </td>
                    <td className="p-4">
                        {/* Simulação de status baseada na fase */}
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                                c.status === 'APPROVED' ? 'bg-green-500' :
                                c.corrections?.length > 0 ? 'bg-red-500' : 'bg-yellow-400'
                            }`}></span>
                            <span className="text-sm text-gray-600">
                                {c.status === 'APPROVED' ? 'Aprovado' :
                                 c.corrections?.length > 0 ? 'Correção Solicitada' : 'Em Análise'}
                            </span>
                        </div>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => fetchDetails(c.id)}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-sm border border-blue-200 px-3 py-1 rounded hover:bg-blue-50 mr-2"
                      >
                        Ver Detalhes
                      </button>
                      <button 
                        onClick={() => deleteCandidate(c.id, c.name)}
                        className="text-red-600 hover:text-red-800 font-semibold text-sm border border-red-200 px-3 py-1 rounded hover:bg-red-50"
                        title="Excluir Candidato"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
