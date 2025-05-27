import React from 'react';

const Card = ({ type, text, onClick, selected, blanks }) => {
  const cardClasses = `
    relative w-full h-40 rounded-md shadow-cah p-5 flex items-center justify-center text-center
    ${type === 'black' ? 'bg-cah-black text-white' : 'bg-white text-cah-black border-2 border-gray-300'}
    ${selected ? 'ring-4 ring-cah-accent' : ''}
    ${onClick ? 'cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105' : ''}
  `;

  // Sostituisce gli spazi vuoti con linee sottili
  const formatText = (text) => {
    if (!text) return '';
    return text.replace(/_____/g, '<span class="inline-block w-16 h-0.5 bg-current mx-1 align-middle"></span>');
  };

  return (
    <div 
      className={cardClasses}
      onClick={onClick}
      data-blanks={blanks}
    >
      <div 
        className={`text-lg font-bold ${type === 'black' ? 'uppercase tracking-wide' : ''}`}
        dangerouslySetInnerHTML={{ __html: formatText(text) }}
      />
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