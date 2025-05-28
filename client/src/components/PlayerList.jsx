import React from 'react';

const PlayerList = ({ players, currentJudge, nickname }) => {
  if (!players || players.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
        <h2 className="text-lg font-medium mb-2">Giocatori</h2>
        <p className="text-gray-500 dark:text-gray-400">Nessun giocatore</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
      <h2 className="text-lg font-medium mb-2">Giocatori ({players.length})</h2>
      <ul className="space-y-2">
        {players.map((player) => {
          const isCurrentPlayer = player.nickname === nickname;
          const isJudge = player.id === currentJudge;
          
          return (
            <li 
              key={player.id} 
              className={`flex items-center justify-between p-2 rounded ${isCurrentPlayer ? 'bg-blue-100 dark:bg-blue-900' : ''}`}
            >
              <div className="flex items-center">
                <span className="font-medium">{player.nickname}</span>
                {isCurrentPlayer && (
                  <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded">
                    Tu
                  </span>
                )}
              </div>
              <div className="flex items-center">
                <span className="text-sm font-medium">{player.score || 0} pt</span>
                {isJudge && (
                  <span className="ml-2 text-xs bg-yellow-500 text-white px-2 py-0.5 rounded">
                    Giudice
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default PlayerList;