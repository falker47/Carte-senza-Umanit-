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
    roundStatus: 'waiting', // waiting, playing, judging, roundEnd
    selectedCard: null,
    hasPlayed: false
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
    });

    socket.on('update-hand', (hand) => {
      console.log('Received update-hand (inspect card text here):', hand); // Added for debugging card text
      setGameData(prev => ({
        ...prev,
        hand: hand
      }));
    });
    
    // Ascolta la fine del gioco
    socket.on('game-over', ({ winner }) => {
      setGameData(prev => ({
        ...prev,
        gameWinner: winner
      }));
    });
    
    // Cleanup
    return () => {
      socket.off('game-update');
      socket.off('update-hand'); // Add this line
      socket.off('game-over');
    };
  }, [socket]);
  
  const handleCardSelect = (cardIndex) => {
    if (gameData.roundStatus !== 'playing' || gameData.hasPlayed) return;
    if (isCurrentPlayerJudge()) return;
    
    setGameData(prev => ({
      ...prev,
      selectedCard: cardIndex
    }));
  };
  
  const handleCardPlay = () => {
    if (!gameData.selectedCard && gameData.selectedCard !== 0) return;
    
    socket.emit('play-card', {
      roomCode,
      cardIndex: gameData.selectedCard
    });
    
    setGameData(prev => ({
      ...prev,
      hasPlayed: true
    }));
  };
  
  const handleJudgeSelect = (cardIndex) => {
    if (gameData.roundStatus !== 'judging' || !isCurrentPlayerJudge()) return;
    
    socket.emit('judge-select', {
      roomCode,
      cardIndex
    });
  };
  
  const handleLeaveGame = () => {
    socket.emit('leave-room', { roomCode });
    setGameState('home');
  };
  
  const handleNextRound = () => {
    if (gameData.roundStatus !== 'roundEnd' || !isCurrentPlayerJudge()) return;
    
    socket.emit('next-round', { roomCode });
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
        return 'Sei il giudice. Scegli la carta bianca più divertente.';
      }
      return 'Il giudice sta scegliendo la carta vincente...';
    }
    
    if (gameData.roundStatus === 'roundEnd') {
      if (gameData.roundWinner) {
        return `${gameData.roundWinner.nickname} ha vinto questo round!`;
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
      {/* Adjusted positioning for ThemeToggle and Esci button */}
      <div className="absolute top-4 right-4 flex items-center space-x-2">
        <ThemeToggle />
        <button 
          onClick={handleLeaveGame}
          className="btn btn-secondary py-1 px-3 text-sm"
        >
          Esci
        </button>
      </div>
      
      <div className="flex justify-between items-center mb-4 pt-16"> {/* Added pt-16 to prevent overlap with absolute positioned elements */}
        <h1 className="text-2xl font-bold">Carte Senza Umanità</h1>
        <div>
          <span className="mr-4">Stanza: {roomCode}</span>
          {/* Esci button moved to top right with ThemeToggle */}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {gameData.playedCards.map((card, index) => (
                  <Card 
                    key={index}
                    type="white" 
                    text={card.text}
                    onClick={isCurrentPlayerJudge() ? () => handleJudgeSelect(index) : undefined}
                    selected={gameData.roundWinner && gameData.roundWinner.cardIndex === index}
                  />
                ))}
              </div>
            </div>
          )}
          
          {gameData.roundStatus === 'roundEnd' && gameData.roundWinner && (
            <div className="mt-6">
              <h2 className="text-lg font-medium mb-2">Carta Vincente</h2>
              <div className="flex flex-col items-center">
                <p className="mb-2 text-center">
                  <span className="font-bold">{gameData.roundWinner.nickname}</span> ha vinto questo round!
                </p>
                <Card 
                  type="white" 
                  text={gameData.playedCards[gameData.roundWinner.cardIndex].text}
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
                      text={card} // MODIFICATO DA card.text A card
                      onClick={!gameData.hasPlayed ? () => handleCardSelect(index) : undefined}
                      selected={gameData.selectedCard === index}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  {/* Message when hand is empty */}
                  Nessuna carta in mano. Attendi la distribuzione.
                </p>
              )}
            </div>
          )}
          {/* REMOVED DUPLICATE HAND RENDERING BLOCK */}
        </div>
      </div>
    </div>
  );
};

export default Game;