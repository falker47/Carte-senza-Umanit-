import React, { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import ThemeToggle from './ThemeToggle';
import Card from './Card';
import PlayerList from './PlayerList';
import Leaderboard from './Leaderboard';

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
  
  // Aggiungi uno stato di loading
  const [isLoading, setIsLoading] = useState(true);
  
  // Stato per la selezione del giudice
  const [judgeSelection, setJudgeSelection] = useState({
    selectedIndex: null,
    isConfirming: false
  });
  
  // Nuovo stato per la selezione delle carte della mano
  const [handSelection, setHandSelection] = useState({
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
      
      // Imposta loading a false quando riceviamo i primi dati
      setIsLoading(false);
      
      // Reset delle selezioni quando cambia lo stato del round
      if (data.roundStatus !== 'judging') {
        setJudgeSelection({ selectedIndex: null, isConfirming: false });
      }
      if (data.roundStatus !== 'playing') {
        setHandSelection({ selectedIndex: null, isConfirming: false });
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
    setHandSelection({
      selectedIndex: cardIndex,
      isConfirming: false
    });
  };
  
  // Nuova funzione per confermare la selezione della carta
  const handleCardConfirm = () => {
    if (handSelection.selectedIndex === null || handSelection.isConfirming) {
      return;
    }
    
    setHandSelection(prev => ({ ...prev, isConfirming: true }));
    
    socket.emit('play-card', {
      roomCode,
      cardIndex: handSelection.selectedIndex
    });
    
    setGameData(prev => ({
      ...prev,
      selectedCard: handSelection.selectedIndex,
      hasPlayed: true
    }));
    
    // Reset della selezione dopo aver giocato
    setTimeout(() => {
      setHandSelection({ selectedIndex: null, isConfirming: false });
    }, 500);
  };
  
  // Funzione per annullare la selezione della carta
  const handleCardCancel = () => {
    setHandSelection({ selectedIndex: null, isConfirming: false });
  };
  
  // FUNZIONE MANCANTE - Gestione selezione carta del giudice
  const handleJudgeCardSelect = (cardIndex) => {
    console.log('handleJudgeCardSelect chiamata con cardIndex:', cardIndex);
    console.log('gameData.roundStatus:', gameData.roundStatus);
    console.log('isCurrentPlayerJudge():', isCurrentPlayerJudge());
    
    if (gameData.roundStatus !== 'judging') {
      console.log('Non è il momento di giudicare');
      return;
    }
    
    if (!isCurrentPlayerJudge()) {
      console.log('Il giocatore non è il giudice');
      return;
    }
    
    console.log('Carta del giudice selezionata:', cardIndex);
    setJudgeSelection({
      selectedIndex: cardIndex,
      isConfirming: false
    });
  };
  
  // Funzione per confermare la selezione del giudice
  const handleJudgeConfirm = () => {
    if (judgeSelection.selectedIndex === null || judgeSelection.isConfirming) {
      return;
    }
    
    setJudgeSelection(prev => ({ ...prev, isConfirming: true }));
    
    socket.emit('judge-select', {
      roomCode,
      cardIndex: judgeSelection.selectedIndex
    });
  };
  
  // Funzione per annullare la selezione del giudice
  const handleJudgeCancel = () => {
    setJudgeSelection({ selectedIndex: null, isConfirming: false });
  };
  
  const handleCardPlay = () => {
    console.log('handleCardPlay chiamata');
    console.log('gameData.selectedCard:', gameData.selectedCard);
    
    if (gameData.selectedCard === null || gameData.selectedCard === undefined) {
      console.log('Nessuna carta selezionata, uscita dalla funzione');
      return;
    }
    
    console.log('Invio play-card al server con cardIndex:', gameData.selectedCard);
    socket.emit('play-card', {
      roomCode,
      cardIndex: gameData.selectedCard
    });
    
    setGameData(prev => ({
      ...prev,
      hasPlayed: true
    }));
  };
  
  // Aggiungi questo useEffect per salvare lo stato
  useEffect(() => {
    if (roomCode && gameData?.players) {
      const currentPlayer = gameData.players.find(p => p.id === socket?.id);
      if (currentPlayer) {
        localStorage.setItem('currentRoomCode', roomCode);
        localStorage.setItem('currentNickname', currentPlayer.nickname);
        localStorage.setItem('isInGame', 'true');
      }
    }
  }, [roomCode, gameData, socket]);
  
  // Pulisci il localStorage quando si esce dal gioco
  const handleLeaveGame = () => {
    localStorage.removeItem('currentRoomCode');
    localStorage.removeItem('currentNickname');
    localStorage.removeItem('isInGame');
    socket.emit('leave-room', { roomCode });
    onLeave();
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
          
          <Leaderboard 
            players={gameData.players} 
            currentJudge={gameData.currentJudge}
            nickname={nickname}
          />
          
          {/* RIMUOVI QUESTA INTERNA SEZIONE */}
          {/* <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-lg font-medium mb-2">Stato del gioco</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              <strong>Giudice:</strong> {getJudgeName()}
            </p>
            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded">
              <p className="text-blue-800 dark:text-blue-200">{getStatusMessage()}</p>
            </div>
          </div> */}
        </div>
        
        {/* Colonna centrale - Carta nera e carte giocate */}
        <div className="lg:col-span-2">
          {/* Schermata di vittoria elaborata */}
          {gameData.gameWinner ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center relative overflow-hidden">
              {/* Effetto confetti con CSS - ottimizzato per mobile */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="confetti-container">
                  {[...Array(window.innerWidth < 768 ? 25 : 50)].map((_, i) => (
                    <div 
                      key={i} 
                      className="confetti" 
                      style={{
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 3}s`,
                        backgroundColor: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'][Math.floor(Math.random() * 6)],
                        width: window.innerWidth < 768 ? '6px' : '8px',
                        height: window.innerWidth < 768 ? '6px' : '8px'
                      }}
                    />
                  ))}
                </div>
              </div>
              
              {/* Contenuto principale della vittoria */}
              <div className="relative z-10 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md mx-auto border-4 border-yellow-400">
                {/* Corona o trofeo */}
                <div className="text-6xl mb-4 animate-bounce">
                  🏆
                </div>
                
                {/* Messaggio di vittoria */}
                <h1 className="text-4xl font-bold mb-4 text-yellow-600 dark:text-yellow-400 animate-pulse">
                  {gameData.gameWinner.nickname === nickname ? 'VITTORIA!' : 'PARTITA FINITA!'}
                </h1>
                
                <div className="mb-6">
                  {gameData.gameWinner.nickname === nickname ? (
                    <div>
                      <p className="text-xl font-semibold text-green-600 dark:text-green-400 mb-2">
                        Complimenti! Hai vinto la partita!
                      </p>
                      <p className="text-gray-600 dark:text-gray-300">
                        Hai raggiunto {gameData.gameWinner.score} punti
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-2">
                        {gameData.gameWinner.nickname} ha vinto!
                      </p>
                      <p className="text-gray-600 dark:text-gray-300">
                        Con {gameData.gameWinner.score} punti
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Classifica finale */}
                <div className="mb-6 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">Classifica Finale</h3>
                  <div className="space-y-2">
                    {gameData.players
                      .sort((a, b) => b.score - a.score)
                      .map((player, index) => (
                        <div 
                          key={player.id} 
                          className={`flex justify-between items-center p-2 rounded ${
                            index === 0 
                              ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' 
                              : 'bg-white dark:bg-gray-600'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="font-bold">
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                            </span>
                            <span className={player.nickname === nickname ? 'font-bold' : ''}>
                              {player.nickname}
                            </span>
                          </div>
                          <span className="font-semibold">{player.score} punti</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
                
                {/* Pulsanti di azione */}
                <div className="space-y-3">
                  <button 
                    onClick={handleLeaveGame}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105"
                  >
                    Torna alla Home
                  </button>
                  
                  {/* Solo l'host può iniziare una nuova partita */}
                  {gameData.hostId === nickname && (
                    <button 
                      onClick={() => {
                        // Qui potresti aggiungere la logica per iniziare una nuova partita
                        // Per ora mostra solo un messaggio
                        alert('Funzionalità in arrivo: Nuova Partita!');
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-all"
                    >
                      Nuova Partita
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Mostra la carta nera solo se il gioco non è finito */}
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
              
              {/* Resto del contenuto esistente per le fasi di gioco normali */}
              {gameData.roundStatus === 'judging' && (
                <div>
                  <h2 className="text-lg font-medium mb-2">Carte Giocate</h2>
                  {console.log('[CLIENT] Rendering playedCards for judge:', JSON.stringify(gameData.playedCards))}
                  
                  {/* Pannello di controllo per il giudice - SPOSTATO IN ALTO CON DIMENSIONI FISSE */}
                  {isCurrentPlayerJudge() && (
                    <div className="mb-4 bg-gray-100 dark:bg-gray-700 p-4 rounded-lg control-panel-fixed !hidden lg:!block" style={{ minHeight: '120px' }}>
                      <div className="flex flex-col items-center justify-center h-full space-y-3">
                        {judgeSelection.selectedIndex !== null ? (
                          <>
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
                          </>
                        ) : (
                          <p className="text-center text-gray-600 dark:text-gray-300">
                            Clicca su una carta per selezionarla
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </>
          )}
        </div>
        
        {/* Colonna destra - Mano del giocatore con contenitore scrollabile */}
        <div className="lg:col-span-1 flex flex-col">
          {!isCurrentPlayerJudge() && gameData.roundStatus === 'playing' && (
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-medium">La tua mano</h2>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {gameData.hand?.length || 0} carte
                </div>
              </div>
              
              {/* Pannello di controllo per la selezione della carta - SEMPRE VISIBILE SU PC/TABLET CON DIMENSIONI FISSE */}
              <div className="mb-4 bg-gray-100 dark:bg-gray-700 p-4 rounded-lg control-panel-fixed !hidden lg:!block" style={{ minHeight: '120px' }}>
                <div className="flex flex-col items-center justify-center h-full space-y-3">
                  {handSelection.selectedIndex !== null && !gameData.hasPlayed ? (
                    <>
                      <p className="text-center font-medium text-sm">
                        Carta #{handSelection.selectedIndex + 1} selezionata
                      </p>
                      <div className="flex space-x-2">
                        <button 
                          onClick={handleCardConfirm}
                          disabled={handSelection.isConfirming}
                          className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                            handSelection.isConfirming 
                              ? 'bg-gray-400 cursor-not-allowed text-gray-600' 
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          {handSelection.isConfirming ? 'Giocando...' : 'Gioca Carta'}
                        </button>
                        <button 
                          onClick={handleCardCancel}
                          disabled={handSelection.isConfirming}
                          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 text-sm"
                        >
                          Annulla
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      {gameData.hasPlayed ? (
                        <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                          ✓ Carta giocata! Attendi gli altri giocatori
                        </p>
                      ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Seleziona una carta dalla tua mano
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Indicatore di scroll */}
              <div className="text-xs text-gray-400 dark:text-gray-500 mb-2 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v12a2 2 0 002 2z" />
                </svg>
                Scorri per vedere tutte le carte
              </div>
              
              {/* Contenitore scrollabile per le carte */}
              <div className="flex-1 relative">
                <div className="h-full overflow-y-auto custom-scrollbar pb-4" style={{ maxHeight: 'calc(100vh - 400px)' }}>
                  <div className="space-y-3 pr-2">
                    {gameData.hand && gameData.hand.length > 0 ? (
                      gameData.hand.map((card, index) => (
                        <Card 
                          key={index}
                          type="white" 
                          text={card}
                          onClick={!gameData.hasPlayed ? () => handleCardSelect(index) : undefined}
                          isSelectable={!gameData.hasPlayed}
                          isSelected={handSelection.selectedIndex === index}
                          isPending={handSelection.selectedIndex === index && handSelection.isConfirming}
                        />
                      ))
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400">
                        Nessuna carta in mano. Attendi la distribuzione.
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Gradiente corretto - allineato con il contenuto delle carte */}
                {gameData.hand && gameData.hand.length > 3 && (
                  <div className="absolute bottom-4 left-0 right-2 h-8 card-container-gradient pointer-events-none opacity-75"></div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer sticky per mobile - pannello di controllo carte */}
      {!isCurrentPlayerJudge() && gameData.roundStatus === 'playing' && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 z-50">
          <div className="control-panel-fixed" style={{ minHeight: '80px' }}>
            <div className="flex flex-col items-center justify-center h-full space-y-2">
              {handSelection.selectedIndex !== null && !gameData.hasPlayed ? (
                <>
                  <p className="text-center font-medium text-sm">
                    Carta #{handSelection.selectedIndex + 1} selezionata
                  </p>
                  <div className="flex space-x-2">
                    <button 
                      onClick={handleCardConfirm}
                      disabled={handSelection.isConfirming}
                      className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                        handSelection.isConfirming 
                          ? 'bg-gray-400 cursor-not-allowed text-gray-600' 
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {handSelection.isConfirming ? 'Giocando...' : 'Gioca Carta'}
                    </button>
                    <button 
                      onClick={handleCardCancel}
                      disabled={handSelection.isConfirming}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 text-sm"
                    >
                      Annulla
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  {gameData.hasPlayed ? (
                    <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                      ✓ Carta giocata! Attendi gli altri giocatori
                    </p>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Seleziona una carta dalla tua mano
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Footer sticky per mobile - pannello di controllo giudice */}
      {isCurrentPlayerJudge() && gameData.roundStatus === 'judging' && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 z-50">
          <div className="control-panel-fixed" style={{ minHeight: '80px' }}>
            <div className="flex flex-col items-center justify-center h-full space-y-2">
              {judgeSelection.selectedIndex !== null ? (
                <>
                  <p className="text-center font-medium text-sm">
                    Carta #{judgeSelection.selectedIndex + 1} selezionata
                  </p>
                  <div className="flex space-x-2">
                    <button 
                      onClick={handleJudgeConfirm}
                      disabled={judgeSelection.isConfirming}
                      className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
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
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 text-sm"
                    >
                      Annulla
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Seleziona la carta vincente
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Aggiungi una condizione di loading prima del return principale
  if (isLoading || !gameData.players.length) {
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
        
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-lg">Caricamento del gioco...</p>
          </div>
        </div>
      </div>
    );
  }

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
          
          <Leaderboard 
            players={gameData.players} 
            currentJudge={gameData.currentJudge}
            nickname={nickname}
          />
          
          {/* RIMUOVI QUESTA INTERNA SEZIONE */}
          {/* <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-lg font-medium mb-2">Stato del gioco</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              <strong>Giudice:</strong> {getJudgeName()}
            </p>
            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded">
              <p className="text-blue-800 dark:text-blue-200">{getStatusMessage()}</p>
            </div>
          </div> */}
        </div>
        
        {/* Colonna centrale - Carta nera e carte giocate */}
        <div className="lg:col-span-2">
          {/* Schermata di vittoria elaborata */}
          {gameData.gameWinner ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center relative overflow-hidden">
              {/* Effetto confetti con CSS - ottimizzato per mobile */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="confetti-container">
                  {[...Array(window.innerWidth < 768 ? 25 : 50)].map((_, i) => (
                    <div 
                      key={i} 
                      className="confetti" 
                      style={{
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 3}s`,
                        backgroundColor: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'][Math.floor(Math.random() * 6)],
                        width: window.innerWidth < 768 ? '6px' : '8px',
                        height: window.innerWidth < 768 ? '6px' : '8px'
                      }}
                    />
                  ))}
                </div>
              </div>
              
              {/* Contenuto principale della vittoria */}
              <div className="relative z-10 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md mx-auto border-4 border-yellow-400">
                {/* Corona o trofeo */}
                <div className="text-6xl mb-4 animate-bounce">
                  🏆
                </div>
                
                {/* Messaggio di vittoria */}
                <h1 className="text-4xl font-bold mb-4 text-yellow-600 dark:text-yellow-400 animate-pulse">
                  {gameData.gameWinner.nickname === nickname ? 'VITTORIA!' : 'PARTITA FINITA!'}
                </h1>
                
                <div className="mb-6">
                  {gameData.gameWinner.nickname === nickname ? (
                    <div>
                      <p className="text-xl font-semibold text-green-600 dark:text-green-400 mb-2">
                        Complimenti! Hai vinto la partita!
                      </p>
                      <p className="text-gray-600 dark:text-gray-300">
                        Hai raggiunto {gameData.gameWinner.score} punti
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-2">
                        {gameData.gameWinner.nickname} ha vinto!
                      </p>
                      <p className="text-gray-600 dark:text-gray-300">
                        Con {gameData.gameWinner.score} punti
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Classifica finale */}
                <div className="mb-6 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">Classifica Finale</h3>
                  <div className="space-y-2">
                    {gameData.players
                      .sort((a, b) => b.score - a.score)
                      .map((player, index) => (
                        <div 
                          key={player.id} 
                          className={`flex justify-between items-center p-2 rounded ${
                            index === 0 
                              ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' 
                              : 'bg-white dark:bg-gray-600'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="font-bold">
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                            </span>
                            <span className={player.nickname === nickname ? 'font-bold' : ''}>
                              {player.nickname}
                            </span>
                          </div>
                          <span className="font-semibold">{player.score} punti</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
                
                {/* Pulsanti di azione */}
                <div className="space-y-3">
                  <button 
                    onClick={handleLeaveGame}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105"
                  >
                    Torna alla Home
                  </button>
                  
                  {/* Solo l'host può iniziare una nuova partita */}
                  {gameData.hostId === nickname && (
                    <button 
                      onClick={() => {
                        // Qui potresti aggiungere la logica per iniziare una nuova partita
                        // Per ora mostra solo un messaggio
                        alert('Funzionalità in arrivo: Nuova Partita!');
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-all"
                    >
                      Nuova Partita
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Mostra la carta nera solo se il gioco non è finito */}
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
              
              {/* Resto del contenuto esistente per le fasi di gioco normali */}
              {gameData.roundStatus === 'judging' && (
                <div>
                  <h2 className="text-lg font-medium mb-2">Carte Giocate</h2>
                  {console.log('[CLIENT] Rendering playedCards for judge:', JSON.stringify(gameData.playedCards))}
                  
                  {/* Pannello di controllo per il giudice - SPOSTATO IN ALTO CON DIMENSIONI FISSE */}
                  {isCurrentPlayerJudge() && (
                    <div className="mb-4 bg-gray-100 dark:bg-gray-700 p-4 rounded-lg control-panel-fixed !hidden lg:!block" style={{ minHeight: '120px' }}>
                      <div className="flex flex-col items-center justify-center h-full space-y-3">
                        {judgeSelection.selectedIndex !== null ? (
                          <>
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
                          </>
                        ) : (
                          <p className="text-center text-gray-600 dark:text-gray-300">
                            Clicca su una carta per selezionarla
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </>
          )}
        </div>
        
        {/* Colonna destra - Mano del giocatore con contenitore scrollabile */}
        <div className="lg:col-span-1 flex flex-col">
          {!isCurrentPlayerJudge() && gameData.roundStatus === 'playing' && (
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-medium">La tua mano</h2>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {gameData.hand?.length || 0} carte
                </div>
              </div>
              
              {/* Pannello di controllo per la selezione della carta - SEMPRE VISIBILE SU PC/TABLET CON DIMENSIONI FISSE */}
              <div className="mb-4 bg-gray-100 dark:bg-gray-700 p-4 rounded-lg control-panel-fixed !hidden lg:!block" style={{ minHeight: '120px' }}>
                <div className="flex flex-col items-center justify-center h-full space-y-3">
                  {handSelection.selectedIndex !== null && !gameData.hasPlayed ? (
                    <>
                      <p className="text-center font-medium text-sm">
                        Carta #{handSelection.selectedIndex + 1} selezionata
                      </p>
                      <div className="flex space-x-2">
                        <button 
                          onClick={handleCardConfirm}
                          disabled={handSelection.isConfirming}
                          className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                            handSelection.isConfirming 
                              ? 'bg-gray-400 cursor-not-allowed text-gray-600' 
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          {handSelection.isConfirming ? 'Giocando...' : 'Gioca Carta'}
                        </button>
                        <button 
                          onClick={handleCardCancel}
                          disabled={handSelection.isConfirming}
                          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 text-sm"
                        >
                          Annulla
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      {gameData.hasPlayed ? (
                        <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                          ✓ Carta giocata! Attendi gli altri giocatori
                        </p>
                      ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Seleziona una carta dalla tua mano
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Indicatore di scroll */}
              <div className="text-xs text-gray-400 dark:text-gray-500 mb-2 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v12a2 2 0 002 2z" />
                </svg>
                Scorri per vedere tutte le carte
              </div>
              
              {/* Contenitore scrollabile per le carte */}
              <div className="flex-1 relative">
                <div className="h-full overflow-y-auto custom-scrollbar pb-4" style={{ maxHeight: 'calc(100vh - 400px)' }}>
                  <div className="space-y-3 pr-2">
                    {gameData.hand && gameData.hand.length > 0 ? (
                      gameData.hand.map((card, index) => (
                        <Card 
                          key={index}
                          type="white" 
                          text={card}
                          onClick={!gameData.hasPlayed ? () => handleCardSelect(index) : undefined}
                          isSelectable={!gameData.hasPlayed}
                          isSelected={handSelection.selectedIndex === index}
                          isPending={handSelection.selectedIndex === index && handSelection.isConfirming}
                        />
                      ))
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400">
                        Nessuna carta in mano. Attendi la distribuzione.
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Gradiente corretto - allineato con il contenuto delle carte */}
                {gameData.hand && gameData.hand.length > 3 && (
                  <div className="absolute bottom-4 left-0 right-2 h-8 card-container-gradient pointer-events-none opacity-75"></div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer sticky per mobile - pannello di controllo carte */}
      {!isCurrentPlayerJudge() && gameData.roundStatus === 'playing' && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 z-50">
          <div className="control-panel-fixed" style={{ minHeight: '80px' }}>
            <div className="flex flex-col items-center justify-center h-full space-y-2">
              {handSelection.selectedIndex !== null && !gameData.hasPlayed ? (
                <>
                  <p className="text-center font-medium text-sm">
                    Carta #{handSelection.selectedIndex + 1} selezionata
                  </p>
                  <div className="flex space-x-2">
                    <button 
                      onClick={handleCardConfirm}
                      disabled={handSelection.isConfirming}
                      className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                        handSelection.isConfirming 
                          ? 'bg-gray-400 cursor-not-allowed text-gray-600' 
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {handSelection.isConfirming ? 'Giocando...' : 'Gioca Carta'}
                    </button>
                    <button 
                      onClick={handleCardCancel}
                      disabled={handSelection.isConfirming}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 text-sm"
                    >
                      Annulla
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  {gameData.hasPlayed ? (
                    <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                      ✓ Carta giocata! Attendi gli altri giocatori
                    </p>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Seleziona una carta dalla tua mano
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Footer sticky per mobile - pannello di controllo giudice */}
      {isCurrentPlayerJudge() && gameData.roundStatus === 'judging' && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 z-50">
          <div className="control-panel-fixed" style={{ minHeight: '80px' }}>
            <div className="flex flex-col items-center justify-center h-full space-y-2">
              {judgeSelection.selectedIndex !== null ? (
                <>
                  <p className="text-center font-medium text-sm">
                    Carta #{judgeSelection.selectedIndex + 1} selezionata
                  </p>
                  <div className="flex space-x-2">
                    <button 
                      onClick={handleJudgeConfirm}
                      disabled={judgeSelection.isConfirming}
                      className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
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
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 text-sm"
                    >
                      Annulla
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Seleziona la carta vincente
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game;