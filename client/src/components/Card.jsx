import React from 'react';

const Card = ({ type, text, onClick, selected, blanks }) => {
  const cardClasses = `
    relative w-full h-40 rounded-lg shadow-md p-4 flex items-center justify-center text-center
    ${type === 'black' ? 'bg-black text-white' : 'bg-white text-black border border-gray-300'}
    ${selected ? 'ring-4 ring-blue-500' : ''}
    ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}
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
        className="text-lg font-medium"
        dangerouslySetInnerHTML={{ __html: formatText(text) }}
      />
      {type === 'white' && (
        <div className="absolute bottom-2 right-2 text-xs text-gray-500">
          Carte Senza Umanità
        </div>
      )}
    </div>
  );
};

export default Card;