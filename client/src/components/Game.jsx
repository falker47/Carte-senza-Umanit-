import React, { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import ThemeToggle from './ThemeToggle';
import Card from './Card';
import PlayerList from './PlayerList';

const Game = ({ roomCode, nickname, setGameState }) => {
  const [gameData, setGameData] = useState({
    players: [],
    currentJudge: null,
    blackCard: null,
    hand: [],
    playedCards: [],
    roundWinner: null,
    gameWinner: null,
    roundStatus: 'waiting',
    selectedCard: null,
    hasPlayed: false
  });
  
  // Nuovo stato per la selezione del giudice
  const [judgeSelection, setJudgeSelection] = useState({
    selectedIndex: null,
    isConfirming: false
  });
  
  const socket = useSocket();
  
  useEffect(() => {
    if (!socket) return;
    
    socket.on('game-update', (data) => {
      console.log('Received game-update:', data); 
      setGameData(prev => ({
        ...prev,
        ...data, 
        hasPlayed: data.roundStatus === 'playing' && prev.roundStatus === 'playing' 
          ? prev.hasPlayed 
          : false,
        selectedCard: data.roundStatus === 'playing' && prev.roundStatus === 'playing' 
          ? prev.selectedCard 
          : null
      }));
      
      // Reset judge selection when round status changes
      if (data.roundStatus !== 'judging') {
        setJudgeSelection({ selectedIndex: null, isConfirming: false });
      }
    });

    socket.on('update-hand', (hand) => {
      console.log('Received update-hand (inspect card text here):', hand);
      setGameData(prev => ({
        ...prev,
        hand: hand
      }));
    });
    
    socket.on('game-over', ({ winner }) => {
      setGameData(prev => ({
        ...prev,
        gameWinner: winner
      }));
    });
    
    return () => {
      socket.off('game-update');
      socket.off('update-hand');
      socket.off('game-over');
    };
  }, [socket]);
  
  const handleCardSelect = (cardIndex) => {
    console.log('handleCardSelect chiamata con cardIndex:', cardIndex);
    console.log('gameData.roundStatus:', gameData.roundStatus);
    console.log('gameData.hasPlayed:', gameData.hasPlayed);
    console.log('isCurrentPlayerJudge():', isCurrentPlayerJudge());
    
    if (gameData.roundStatus !== 'playing' || gameData.hasPlayed) {
      console.log('Condizioni non soddisfatte per selezionare carta');
      return;
    }
    if (isCurrentPlayerJudge()) {
      console.log('Il giocatore è il giudice, non può selezionare carte');
      return;
    }
    
    console.log('Carta selezionata:', cardIndex);
    setGameData(prev => ({
      ...prev,
      selectedCard: cardIndex
    }));
  };
  
  const handleCardPlay = () => {
    console.log('handleCardPlay chiamata');
    console.log('gameData.selectedCard:', gameData.selectedCard);
    
    if (gameData.selectedCard === null || gameData.selectedCard === undefined) {
      console.log('Nessuna carta selezionata, uscita dalla funzione');
      return;
    }
    
    console.log('Emissione evento play-card con:', {
      roomCode,
      cardIndex: gameData.selectedCard
    });
    
    socket.emit('play-card', {
      roomCode,
      cardIndex: gameData.selectedCard
    });
    
    setGameData(prev => ({
      ...prev,
      hasPlayed: true
    }));
    
    console.log('hasPlayed impostato a true');
  };
  
  // Nuova funzione per la selezione del giudice con conferma
  const handleJudgeCardSelect = (cardIndex) => {
    console.log('[CLIENT] handleJudgeCardSelect called with cardIndex:', cardIndex);
    
    if (gameData.roundStatus !== 'judging' || !isCurrentPlayerJudge()) {
      console.log('[CLIENT] handleJudgeCardSelect: Conditions not met, exiting.');
      return;
    }
    
    // Se la stessa carta è già selezionata, deseleziona
    if (judgeSelection.selectedIndex === cardIndex) {
      setJudgeSelection({ selectedIndex: null, isConfirming: false });
      return;
    }
    
    // Seleziona la nuova carta
    setJudgeSelection({ selectedIndex: cardIndex, isConfirming: false });
    console.log('[CLIENT] Card selected for judge review:', cardIndex);
  };
  
  // Funzione per confermare la selezione del giudice
  const handleJudgeConfirm = () => {
    if (judgeSelection.selectedIndex === null) return;
    
    console.log('[CLIENT] Judge confirming selection of cardIndex:', judgeSelection.selectedIndex);
    console.log('[CLIENT] Current gameData.playedCards for judge:', JSON.stringify(gameData.playedCards));
    
    if (gameData.playedCards && gameData.playedCards[judgeSelection.selectedIndex]) {
      console.log('[CLIENT] Selected card content:', JSON.stringify(gameData.playedCards[judgeSelection.selectedIndex]));
    }
    
    setJudgeSelection(prev => ({ ...prev, isConfirming: true }));
    
    socket.emit('judge-select', {
      roomCode,
      cardIndex: judgeSelection.selectedIndex
    });
  };
  
  // Funzione per annullare la selezione
  const handleJudgeCancel = () => {
    setJudgeSelection({ selectedIndex: null, isConfirming: false });
  };
  
  const handleLeaveGame = () => {
    socket.emit('leave-room', { roomCode });
    setGameState('home');
  };
  
  const handleNextRound = () => {
    if (gameData.roundStatus !== 'roundEnd' || !isCurrentPlayerJudge()) return;
    
    socket.emit('start-new-round', { roomCode });
  };
  
  const isCurrentPlayerJudge = () => {
    const currentPlayer = gameData.players.find(p => p.nickname === nickname);
    return currentPlayer && currentPlayer.id === gameData.currentJudge;
  };
  
  const getStatusMessage = () => {
    if (gameData.gameWinner) {
      return `${gameData.gameWinner.nickname} ha vinto la partita!`;
    }
    
    if (gameData.roundStatus === 'waiting') {
      return 'In attesa dell\'inizio del round...';
    }
    
    if (gameData.roundStatus === 'playing') {
      if (isCurrentPlayerJudge()) {
        return 'Sei il giudice di questo round. Attendi che gli altri giocatori scelgano le loro carte.';
      }
      return gameData.hasPlayed 
        ? 'Hai giocato la tua carta. Attendi che gli altri giocatori scelgano.' 
        : 'Scegli una carta bianca dalla tua mano.';
    }
    
    if (gameData.roundStatus === 'judging') {
      if (isCurrentPlayerJudge()) {
        if (judgeSelection.selectedIndex !== null) {
          return 'Carta selezionata! Conferma la tua scelta o seleziona un\'altra carta.';
        }
        return 'Sei il giudice. Scegli la carta bianca più divertente.';
      }
      return 'Il giudice sta scegliendo la carta vincente...';
    }
    
    if (gameData.roundStatus === 'roundEnd') {
      if (gameData.roundWinner) {
        const winnerPlayer = gameData.players.find(p => p.id === gameData.roundWinner);
        const winnerNickname = winnerPlayer ? winnerPlayer.nickname : 'Giocatore Sconosciuto';
        return `${winnerNickname} ha vinto questo round!`;
      }
      return 'Fine del round.';
    }
    
    return '';
  };
  
  const getJudgeName = () => {
    const judge = gameData.players.find(p => p.id === gameData.currentJudge);
    return judge ? judge.nickname : '';
  };

  return (
    <div className="container mx-auto px-4 py-6 flex flex-col min-h-screen relative">
      <div className="absolute top-4 right-4 flex items-center space-x-2">
        <ThemeToggle />
        <button 
          onClick={handleLeaveGame}
          className="btn btn-secondary py-1 px-3 text-sm"
        >
          Esci
        </button>
      </div>
      
      <div className="flex justify-between items-center mb-4 pt-16">
        <h1 className="text-2xl font-bold">Carte Senza Umanità</h1>
        <div>
          <span className="mr-4">Stanza: {roomCode}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-grow">
        {/* Colonna sinistra - Giocatori e stato */}
        <div className="lg:col-span-1">
          <PlayerList 
            players={gameData.players} 
            currentJudge={gameData.currentJudge}
            nickname={nickname}
          />
          
          <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-lg font-medium mb-2">Stato del gioco</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              <strong>Giudice:</strong> {getJudgeName()}
            </p>
            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded">
              <p className="text-blue-800 dark:text-blue-200">{getStatusMessage()}</p>
            </div>
          </div>
        </div>
        
        {/* Colonna centrale - Carta nera e carte giocate */}
        <div className="lg:col-span-2">
          {gameData.blackCard && (
            <div className="mb-6">
              <h2 className="text-lg font-medium mb-2">Carta Nera</h2>
              <Card 
                type="black" 
                text={gameData.blackCard.text} 
                blanks={gameData.blackCard.blanks}
              />
            </div>
          )}
          
          {gameData.roundStatus === 'judging' && (
            <div>
              <h2 className="text-lg font-medium mb-2">Carte Giocate</h2>
              {console.log('[CLIENT] Rendering playedCards for judge:', JSON.stringify(gameData.playedCards))}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {gameData.playedCards.map((playedCardObject, index) => (
                  <Card 
                    key={index}
                    type="white" 
                    text={playedCardObject.card}
                    onClick={isCurrentPlayerJudge() ? () => handleJudgeCardSelect(index) : undefined}
                    isSelectable={isCurrentPlayerJudge()}
                    isSelected={judgeSelection.selectedIndex === index}
                    isPending={judgeSelection.selectedIndex === index && judgeSelection.isConfirming}
                  />
                ))}
              </div>
              
              {/* Pannello di controllo per il giudice */}
              {isCurrentPlayerJudge() && (
                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                  {judgeSelection.selectedIndex !== null ? (
                    <div className="flex flex-col items-center space-y-3">
                      <p className="text-center font-medium">
                        Hai selezionato la carta #{judgeSelection.selectedIndex + 1}
                      </p>
                      <div className="flex space-x-3">
                        <button 
                          onClick={handleJudgeConfirm}
                          disabled={judgeSelection.isConfirming}
                          className={`px-6 py-2 rounded-lg font-medium transition-all ${
                            judgeSelection.isConfirming 
                              ? 'bg-gray-400 cursor-not-allowed text-gray-600' 
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          {judgeSelection.isConfirming ? 'Confermando...' : 'Conferma Scelta'}
                        </button>
                        <button 
                          onClick={handleJudgeCancel}
                          disabled={judgeSelection.isConfirming}
                          className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all disabled:opacity-50"
                        >
                          Annulla
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-gray-600 dark:text-gray-300">
                      Clicca su una carta per selezionarla
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          
          {gameData.roundStatus === 'roundEnd' && gameData.roundWinner && gameData.winningCardText && (
            <div className="mt-6">
              <h2 className="text-lg font-medium mb-2">Carta Vincente</h2>
              <div className="flex flex-col items-center">
                <p className="mb-2 text-center">
                  <span className="font-bold">
                    {gameData.players.find(p => p.id === gameData.roundWinner)?.nickname || 'Giocatore Sconosciuto'}
                  </span> ha vinto questo round!
                </p>
                <Card 
                  type="white" 
                  text={gameData.winningCardText}
                  isWinner={true}
                />
                
                {isCurrentPlayerJudge() && (
                  <button 
                    onClick={handleNextRound}
                    className="mt-4 btn btn-primary"
                  >
                    Prossimo Round
                  </button>
                )}
              </div>
            </div>
          )}
          
          {gameData.gameWinner && (
            <div className="mt-6 text-center">
              <h2 className="text-2xl font-bold mb-4">
                {gameData.gameWinner.nickname === nickname 
                  ? 'Hai vinto la partita!' 
                  : `${gameData.gameWinner.nickname} ha vinto la partita!`}
              </h2>
              <button 
                onClick={handleLeaveGame}
                className="btn btn-primary"
              >
                Torna alla Home
              </button>
            </div>
          )}
        </div>
        
        {/* Colonna destra - Mano del giocatore */}
        <div className="lg:col-span-1">
          {!isCurrentPlayerJudge() && gameData.roundStatus === 'playing' && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-medium">La tua mano</h2>
                {gameData.selectedCard !== null && !gameData.hasPlayed && (
                  <button 
                    onClick={handleCardPlay}
                    className="btn btn-primary py-1 px-3 text-sm"
                  >
                    Gioca Carta
                  </button>
                )}
              </div>
              {gameData.hand && gameData.hand.length > 0 ? (
                <div className="space-y-3">
                  {gameData.hand.map((card, index) => (
                    <Card 
                      key={index}
                      type="white" 
                      text={card}
                      onClick={!gameData.hasPlayed ? () => handleCardSelect(index) : undefined}
                      selected={gameData.selectedCard === index}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  Nessuna carta in mano. Attendi la distribuzione.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Game;