// frontend/src/HRDashboard.tsx
import { useEffect, useState } from 'react';
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

  // Busca os dados assim que a tela abre (se estiver autenticado)
  useEffect(() => {
    if (isAuthenticated) {
      axios.get('http://localhost:3000/employees')
        .then(response => {
          setCandidates(response.data);
          setLoading(false);
        })
        .catch(err => {
          console.error("Erro ao buscar candidatos:", err);
          setLoading(false);
        });
    }
  }, [isAuthenticated]);

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
        const res = await axios.get(`http://localhost:3000/employee/${id}/details`);
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

  const sendFeedback = async () => {
    if (!selectedCandidate) return;
    try {
        await axios.post(`http://localhost:3000/employee/${selectedCandidate.id}/feedback`, { 
            feedback, 
            corrections: selectedCorrections 
        });
        alert("Feedback enviado com sucesso!");
    } catch (error) {
        alert("Erro ao enviar feedback.");
    }
  };

  // --- TELA DE LOGIN ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-sm">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Acesso Restrito RH</h2>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Usuário</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder=" "
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Senha</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder=""
              />
            </div>

            {loginError && (
              <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">
                {loginError}
              </div>
            )}

            <button 
              type="submit" 
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded transition-colors"
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- MODAL DE DETALHES ---
  if (selectedCandidate) {
    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
                <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">{selectedCandidate.name}</h1>
                        <p className="opacity-90">{selectedCandidate.email} | {selectedCandidate.cpf}</p>
                    </div>
                    <button 
                        onClick={() => setSelectedCandidate(null)}
                        className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded"
                    >
                        Fechar
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Endereço */}
                    {selectedCandidate.address && selectedCandidate.address.length > 0 && (
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">📍 Endereço</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" checked={selectedCorrections.includes('address_street')} onChange={() => toggleCorrection('address_street')} />
                                    <p><strong>Rua:</strong> {selectedCandidate.address[0].street}, {selectedCandidate.address[0].number}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" checked={selectedCorrections.includes('address_neighborhood')} onChange={() => toggleCorrection('address_neighborhood')} />
                                    <p><strong>Bairro:</strong> {selectedCandidate.address[0].neighborhood}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" checked={selectedCorrections.includes('address_city')} onChange={() => toggleCorrection('address_city')} />
                                    <p><strong>Cidade/UF:</strong> {selectedCandidate.address[0].city}/{selectedCandidate.address[0].state}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" checked={selectedCorrections.includes('address_cep')} onChange={() => toggleCorrection('address_cep')} />
                                    <p><strong>CEP:</strong> {selectedCandidate.address[0].cep}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Respostas */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">📝 Respostas do Formulário</h3>
                        {selectedCandidate.answers.length === 0 ? (
                            <p className="text-gray-500">Nenhuma resposta registrada ainda.</p>
                        ) : (
                            <div className="space-y-4">
                                {selectedCandidate.answers.map((ans: any) => (
                                    <div key={ans.id} className={`bg-gray-50 p-4 rounded border ${selectedCorrections.includes(ans.questionId) ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
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
                                            <input 
                                                type="checkbox" 
                                                checked={selectedCorrections.includes(ans.questionId)} 
                                                onChange={() => toggleCorrection(ans.questionId)}
                                                className="ml-4 w-5 h-5 text-red-600"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Feedback */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">⚠️ Solicitar Correção / Feedback</h3>
                        <textarea
                            className="w-full p-3 border rounded focus:ring-2 focus:ring-red-500 outline-none"
                            rows={4}
                            placeholder="Descreva o que precisa ser corrigido..."
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                        />
                        <button
                            onClick={sendFeedback}
                            className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
                        >
                            Enviar Feedback
                        </button>
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
          <div className="flex gap-4">
            <button 
                onClick={() => setIsAuthenticated(false)}
                className="text-gray-600 hover:text-red-500 font-semibold px-4 py-2"
            >
                Sair
            </button>
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 shadow">
                + Novo Processo
            </button>
          </div>
        </div>

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
                            <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                            <span className="text-sm text-gray-600">Em andamento</span>
                        </div>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => fetchDetails(c.id)}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-sm border border-blue-200 px-3 py-1 rounded hover:bg-blue-50"
                      >
                        Ver Detalhes
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
