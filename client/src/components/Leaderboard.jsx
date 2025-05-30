import React from 'react';

const Leaderboard = ({ players, currentJudge, nickname }) => {
  // Ordina i giocatori per punteggio (dal più alto al più basso)
  const sortedPlayers = [...players].sort((a, b) => b.points - a.points);

  return (
    <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h2 className="text-lg font-medium mb-3">Classifica</h2>
      <div className="space-y-2">
        {sortedPlayers.map((player, index) => (
          <div 
            key={player.id} 
            className={`flex justify-between items-center p-2 rounded ${
              player.nickname === nickname 
                ? 'bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700' 
                : 'bg-gray-50 dark:bg-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="font-medium text-sm">
                #{index + 1}
              </span>
              <span className={`${
                player.nickname === nickname 
                  ? 'font-bold text-blue-800 dark:text-blue-200' 
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                {player.nickname}
              </span>
              {player.id === currentJudge && (
                <span className="text-xs bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                  Giudice
                </span>
              )}
            </div>
            <span className="font-bold text-lg">
              {player.points}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Leaderboard;