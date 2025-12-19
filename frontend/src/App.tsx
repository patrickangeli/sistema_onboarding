import { useState } from 'react';
import CandidateApp from './CandidateApp';
import { HRDashboard } from './HRDashboard';

export default function App() {
  const [view, setView] = useState<'CANDIDATE' | 'RH'>('RH'); 

  return (
    <div>
      {/* Barra de Navegação Provisória (Só para desenvolvimento) */}
      <div className="bg-gray-800 text-white p-2 flex justify-center gap-4 text-sm">
        <span className="opacity-50 uppercase tracking-widest pt-1">Modo de Visualização:</span>
        <button 
          onClick={() => setView('CANDIDATE')}
          className={`px-3 py-1 rounded ${view === 'CANDIDATE' ? 'bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'}`}
        >
          👨‍💻 Sou Candidato
        </button>
        <button 
          onClick={() => setView('RH')}
          className={`px-3 py-1 rounded ${view === 'RH' ? 'bg-purple-500' : 'bg-gray-700 hover:bg-gray-600'}`}
        >
          🕵️‍♀️ Sou RH
        </button>
      </div>

      {/* Renderiza a tela escolhida */}
      {view === 'CANDIDATE' ? <CandidateApp /> : <HRDashboard />}
    </div>
  );
}
