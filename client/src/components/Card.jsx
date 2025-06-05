import React from 'react';

function Card({ type, text, onClick, isSelected, isWinner, isSelectable, isPending, isJudging, cards, isPlayed, isNew }) {
  // Se abbiamo un array di carte (per il giudizio), mostralo come gruppo
  if (cards && Array.isArray(cards)) {
    return (
      <div 
        className={`
          ${isSelected ? 'border-4 border-blue-500 shadow-blue-500/50 shadow-lg' : 'border-2 border-gray-300'}
          ${isPending ? 'border-4 border-yellow-500 shadow-yellow-500/50 shadow-lg animate-pulse' : ''}
          ${isSelectable ? 'cursor-pointer hover:border-blue-400 hover:shadow-lg transition-all duration-200 ease-in-out' : ''}
          p-3 rounded-lg shadow-lg min-h-[140px] flex flex-col justify-between relative ${isJudging ? 'w-80 max-w-sm mx-auto' : 'w-full'}
        `}
        onClick={onClick}
      >
        <div className="space-y-2">
          {cards.map((card, index) => (
            <div key={index} className="bg-gray-50 dark:bg-gray-700 p-2 rounded text-sm font-medium">
              {card}
            </div>
          ))}
        </div>
        
        {/* Indicatori di stato */}
        {isSelected && !isPending && (
          <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
            ✓
          </div>
        )}
        
        {isPending && (
          <div className="absolute top-2 right-2 bg-yellow-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
            ⏳
          </div>
        )}
        
        {isWinner && (
          <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
            👑
          </div>
        )}
      </div>
    );
  }

  // Logica esistente per carte singole
  console.log(`Card component received text:`, text);

  const formatText = (text) => {
    if (!text) return '';
    console.log(`formatText input:`, text);
    const formatted = text.replace(/_/g, '<span class="underline">_____</span>');
    console.log(`formatText output:`, formatted);
    return formatted;
  };

  const cardClasses = `
    ${type === 'black' ? 'bg-black text-white' : 'bg-white text-gray-800'}
    ${isWinner ? 'border-4 border-green-500 shadow-green-500/50 shadow-xl' : 'border-2 border-gray-300'}
    ${isSelected ? 'border-4 border-blue-500 shadow-blue-500/50 shadow-lg' : ''}
    ${isPending ? 'border-4 border-yellow-500 shadow-yellow-500/50 shadow-lg animate-pulse' : ''}
    ${isPlayed ? 'opacity-75 bg-gray-100 dark:bg-gray-600' : ''}
    ${isSelectable && type === 'white' && !isPlayed ? 'cursor-pointer hover:border-blue-400 hover:shadow-lg transition-all duration-200 ease-in-out' : ''}
    p-3 rounded-lg shadow-lg min-h-[140px] max-h-[200px] flex flex-col justify-between relative text-left ${isJudging ? 'w-80 max-w-sm mx-auto' : 'w-full'} break-words whitespace-pre-wrap
  `;

  const textClasses = `
    text-sm md:text-base font-semibold leading-tight
    ${type === 'black' ? 'leading-relaxed' : ''}
    ${isPlayed ? 'text-gray-500 dark:text-gray-400' : ''}
  `;

  const displayText = formatText(text);

  return (
    <div className={cardClasses} onClick={!isPlayed ? onClick : undefined}>
      <div className="flex-grow flex items-center">
        <div className={textClasses} dangerouslySetInnerHTML={{ __html: displayText }} />
      </div>
      
      {/* Badge per carta giocata */}
      {isPlayed && (
        <div className="absolute top-2 left-2 bg-green-600 text-white rounded-full px-2 py-1 text-xs font-bold shadow-lg">
          ✓ Giocata
        </div>
      )}
      
      {/* Badge per carta nuova */}
      {isNew && !isPlayed && (
        <div className="absolute top-2 left-2 bg-blue-600 text-white rounded-full px-2 py-1 text-xs font-bold shadow-lg animate-pulse">
          ✨ Nuova
        </div>
      )}
      
      {/* Indicatore di stato per le carte selezionate */}
      {isSelected && !isPending && !isPlayed && (
        <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
          ✓
        </div>
      )}
      
      {isPending && (
        <div className="absolute top-2 right-2 bg-yellow-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
          ⏳
        </div>
      )}
      
      {isWinner && (
        <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
          🏆
        </div>
      )}
      
      {type === 'white' && (
        <div className="absolute bottom-1 right-2 text-xs text-gray-400 font-medium">
          Carte Senza Umanità ®
        </div>
      )}
    </div>
  );
}

export default Card;