import React from 'react';

const PlayerList = ({ players, currentJudge, nickname, maxPoints }) => {
  if (!players || players.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 mb-4 h-64">
        <h2 className="text-base font-medium mb-2">🏆 Classifica</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Nessun giocatore</p>
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 mb-4 h-64 flex flex-col">
      <h2 className="text-base font-medium mb-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center">
          🏆 <span className="ml-2">Classifica ({players.length})</span>
        </div>
        {maxPoints && (
          <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full font-medium">
            Per vincere: {maxPoints} pt
          </span>
        )}
      </h2>
      
      {/* Container scrollabile con padding su tutti i lati per evitare taglio */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent px-1">
        <div className="space-y-2 px-1 py-1">
          {sortedPlayers.map((player, index) => {
            const position = index + 1;
            const isCurrentPlayer = player.nickname === nickname;
            const isJudge = player.id === currentJudge;
            const score = player.score || 0;
            
            return (
              <div 
                key={player.id} 
                className={`
                  relative flex items-center p-2 rounded-lg transition-all duration-200
                  ${isCurrentPlayer ? 'ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}
                  ${position <= 3 ? 'shadow-md' : 'shadow-sm'}
                `}
              >
                {/* Posizione - solo emoji/numero senza sfondo */}
                <div className="flex items-center justify-center w-8 h-8 mr-2 text-lg font-bold flex-shrink-0">
                  {position <= 3 ? getPositionIcon(position) : (
                    <span className="text-sm text-gray-600 dark:text-gray-400">{position}°</span>
                  )}
                </div>
                
                {/* Informazioni giocatore */}
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <div className="flex items-center min-w-0 flex-1">
                    <span className={`font-medium text-sm truncate ${position === 1 ? 'text-yellow-600 dark:text-yellow-400' : ''}`}>
                      {player.nickname}
                    </span>
                    {/* Tag "Tu" */}
                    {isCurrentPlayer && (
                      <span className="ml-1 text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                        Tu
                      </span>
                    )}
                    {/* Tag "Giudice" - dopo il tag "Tu" se entrambi presenti */}
                    {isJudge && (
                      <span className="ml-1 text-xs text-white px-1.5 py-0.5 rounded-full font-medium flex-shrink-0" style={{backgroundColor: '#db571a'}}>
                        Giudice
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center flex-shrink-0 ml-2">
                    {/* Punteggio */}
                    <div className={`
                      flex items-center px-2 py-0.5 rounded-full text-xs font-bold
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
    </div>
  );
};

export default PlayerList;