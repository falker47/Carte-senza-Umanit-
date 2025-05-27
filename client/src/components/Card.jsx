import React from 'react';

function Card({ type, text, onClick, isSelected, isWinner, isSelectable }) {
  console.log(`Card component received text:`, text); // Log del prop text ricevuto

  const formatText = (text) => {
    if (!text) return '';
    console.log(`formatText input:`, text); // Log dell'input di formatText
    const formatted = text.replace(/_/g, '<span class="underline">_____</span>');
    console.log(`formatText output:`, formatted); // Log dell'output di formatText
    return formatted;
  };

  const cardClasses = `
    ${type === 'black' ? 'bg-black text-white' : 'bg-white text-gray-800'}
    ${isWinner ? 'border-4 border-yellow-400 shadow-yellow-500/50' : 'border-2 border-gray-300'}
    ${isSelected ? 'ring-4 ring-blue-500 shadow-blue-500/50' : ''}
    ${isSelectable && type === 'white' ? 'cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all duration-150 ease-in-out' : ''}
    p-4 rounded-lg shadow-lg h-64 flex flex-col justify-between relative text-left w-full break-words whitespace-pre-wrap
  `;

  const textClasses = `
    text-lg font-bold
    ${type === 'black' ? 'leading-relaxed' : ''}
  `;

  // Rimuovi il testo statico qui e usa formatText(text)
  const displayText = formatText(text);

  return (
    <div className={cardClasses} onClick={onClick}>
      <div className="flex-grow">
        <div className={textClasses} dangerouslySetInnerHTML={{ __html: displayText }} />
      </div>
      {type === 'white' && (
        <div className="absolute bottom-2 right-2 text-xs text-gray-500 font-bold">
          Carte Senza Umanità ®
        </div>
      )}
      {type === 'black' && (
        <div className="absolute top-2 left-2 text-xs text-gray-400 font-bold">
          Carte Senza Umanità
        </div>
      )}
    </div>
  );
};

export default Card;