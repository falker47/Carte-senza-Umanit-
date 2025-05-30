import React from 'react';

const PlayerList = ({ players, currentJudge, nickname }) => {
  if (!players || players.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
        <h2 className="text-lg font-medium mb-2">🏆 Classifica</h2>
        <p className="text-gray-500 dark:text-gray-400">Nessun giocatore</p>
      </div>
    );
  }

  // Ordina i giocatori per punteggio (dal più alto al più basso)
  const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));

  // Funzione per ottenere l'icona della posizione
  const getPositionIcon = (position) => {
    switch (position) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `${position}°`;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
      <h2 className="text-lg font-medium mb-4 flex items-center">
        🏆 <span className="ml-2">Classifica ({players.length})</span>
      </h2>
      <div className="space-y-3">
        {sortedPlayers.map((player, index) => {
          const position = index + 1;
          const isCurrentPlayer = player.nickname === nickname;
          const isJudge = player.id === currentJudge;
          const score = player.score || 0;
          
          return (
            <div 
              key={player.id} 
              className={`
                relative flex items-center p-3 rounded-lg transition-all duration-200
                ${isCurrentPlayer ? 'ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}
                ${position <= 3 ? 'shadow-md' : 'shadow-sm'}
              `}
            >
              {/* Posizione - solo emoji/numero senza sfondo */}
              <div className="flex items-center justify-center w-10 h-10 mr-3 text-2xl font-bold">
                {position <= 3 ? getPositionIcon(position) : (
                  <span className="text-lg text-gray-600 dark:text-gray-400">{position}°</span>
                )}
              </div>
              
              {/* Informazioni giocatore */}
              <div className="flex-1 flex items-center justify-between">
                <div className="flex items-center">
                  <span className={`font-medium ${position === 1 ? 'text-yellow-600 dark:text-yellow-400' : ''}`}>
                    {player.nickname}
                  </span>
                  {/* Tag "Tu" */}
                  {isCurrentPlayer && (
                    <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded-full font-medium">
                      Tu
                    </span>
                  )}
                  {/* Tag "Giudice" - dopo il tag "Tu" se entrambi presenti */}
                  {isJudge && (
                    <span className="ml-2 text-xs text-white px-2 py-1 rounded-full font-medium" style={{backgroundColor: '#db571a'}}>
                      Giudice
                    </span>
                  )}
                </div>
                
                <div className="flex items-center">
                  {/* Punteggio */}
                  <div className={`
                    flex items-center px-3 py-1 rounded-full text-sm font-bold
                    ${position === 1 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 
                      position === 2 ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' :
                      position === 3 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                      'bg-gray-50 text-gray-700 dark:bg-gray-600 dark:text-gray-300'}
                  `}>
                    {score} pt
                  </div>
                </div>
              </div>
              
              {/* Effetto brillante per il primo posto */}
              {position === 1 && score > 0 && (
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-yellow-400/10 to-transparent pointer-events-none" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlayerList;