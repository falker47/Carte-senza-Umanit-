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
  
  // Nuovo stato per tracciare le carte giocate e nuove
  const [cardStates, setCardStates] = useState({
    playedCardIndices: [], // Indici delle carte giocate nel round corrente
    newCardIndices: [], // Indici delle carte nuove ricevute
    currentRound: 0 // Per tracciare i cambi di round
  });
  
  const [judgeSelection, setJudgeSelection] = useState({
    selectedIndex: null,
    isConfirming: false
  });
  
  const [handSelection, setHandSelection] = useState({ 
    selectedIndices: [],
    isConfirming: false 
  });
  
  const socket = useSocket();
  
  useEffect(() => {
    if (!socket) return;
    
    socket.on('game-update', (data) => {
      console.log('Received game-update:', data); 
      
      // Controlla se è iniziato un nuovo round
      const isNewRound = data.roundStatus === 'playing' && 
                        (gameData.roundStatus === 'roundEnd' || gameData.roundStatus === 'waiting');
      
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
      
      // Reset degli stati delle carte per nuovo round
      if (isNewRound) {
        setCardStates(prev => ({
          playedCardIndices: [],
          newCardIndices: prev.newCardIndices, // Mantieni le carte nuove per un round
          currentRound: prev.currentRound + 1
        }));
      }
      
      if (data.roundStatus !== 'judging') {
        setJudgeSelection({ selectedIndex: null, isConfirming: false });
      }
      if (data.roundStatus !== 'playing') {
        setHandSelection({ selectedIndices: [], isConfirming: false });
      }
    });

    socket.on('update-hand', (hand) => {
      console.log('Received update-hand (inspect card text here):', hand);
      
      setGameData(prev => {
        const oldHandLength = prev.hand.length;
        const newHandLength = hand.length;
        
        // Aggiorna gli stati delle carte
        setCardStates(prevStates => {
          // Se abbiamo ricevuto nuove carte E siamo almeno al round 2, identifica quali sono nuove
          let newCardIndices = [];
          if (newHandLength > oldHandLength && prevStates.currentRound >= 1) {
            // Le nuove carte sono quelle aggiunte alla fine
            for (let i = oldHandLength; i < newHandLength; i++) {
              newCardIndices.push(i);
            }
          }
          
          return {
            ...prevStates,
            newCardIndices: newCardIndices
          };
        });
        
        return {
          ...prev,
          hand: hand
        };
      });
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
  }, [socket, gameData.roundStatus]);

  useEffect(() => {
    // Prevenzione refresh accidentali
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Sei sicuro di voler uscire dalla partita? Perderai il progresso attuale.';
      return 'Sei sicuro di voler uscire dalla partita? Perderai il progresso attuale.';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []); // Array di dipendenze vuoto per eseguirlo solo al mount e smontaggio

  const handleCardSelect = (cardIndex) => {
    console.log('handleCardSelect chiamata con cardIndex:', cardIndex);
    console.log('gameData.roundStatus:', gameData.roundStatus);
    console.log('gameData.hasPlayed:', gameData.hasPlayed);
    console.log('isCurrentPlayerJudge():', isCurrentPlayerJudge());
    
    // Non permettere selezione di carte già giocate
    if (cardStates.playedCardIndices.includes(cardIndex)) {
      return;
    }
    
    if (gameData.roundStatus !== 'playing' || gameData.hasPlayed) {
      console.log('Condizioni non soddisfatte per selezionare carta');
      return;
    }
    if (isCurrentPlayerJudge()) {
      console.log('Il giocatore è il giudice, non può selezionare carte');
      return;
    }
    
    const requiredCards = gameData.blackCard ? gameData.blackCard.blanks : 1;
    
    setHandSelection(prev => {
      const currentSelected = [...prev.selectedIndices];
      const cardAlreadySelected = currentSelected.includes(cardIndex);
      
      if (cardAlreadySelected) {
        // Rimuovi la carta se già selezionata
        return {
          selectedIndices: currentSelected.filter(index => index !== cardIndex),
          isConfirming: false
        };
      } else if (currentSelected.length < requiredCards) {
        // Aggiungi la carta se non abbiamo raggiunto il limite
        return {
          selectedIndices: [...currentSelected, cardIndex],
          isConfirming: false
        };
      }
      
      // Se abbiamo già il numero massimo di carte, non fare nulla
      return prev;
    });
    
    console.log('Carte selezionate:', handSelection.selectedIndices);
  };
  
  // Nuova funzione per confermare la selezione della carta
  const handleCardConfirm = () => {
    const requiredCards = gameData.blackCard ? gameData.blackCard.blanks : 1;
    
    if (handSelection.selectedIndices.length !== requiredCards || handSelection.isConfirming) {
      return;
    }
    
    setHandSelection(prev => ({ ...prev, isConfirming: true }));
    
    // Marca le carte come giocate
    setCardStates(prev => ({
      ...prev,
      playedCardIndices: [...prev.playedCardIndices, ...handSelection.selectedIndices],
      newCardIndices: prev.newCardIndices.filter(index => !handSelection.selectedIndices.includes(index))
    }));
    
    socket.emit('play-card', {
      roomCode,
      cardIndices: handSelection.selectedIndices // Invia array di indici
    });
    
    setGameData(prev => ({
      ...prev,
      selectedCard: handSelection.selectedIndices,
      hasPlayed: true
    }));
    
    // Reset della selezione dopo aver giocato
    setTimeout(() => {
      setHandSelection({ selectedIndices: [], isConfirming: false });
    }, 500);
  };
  
  // Funzione per annullare la selezione della carta
  const handleCardCancel = () => {
    setHandSelection({ selectedIndices: [], isConfirming: false });
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
    <div className="container mx-auto px-4 py-6 flex flex-col relative">
      {/* Header unificato con tutti gli elementi sulla stessa riga */}
      <div className="flex items-center justify-between mb-4 py-2 gap-2">
        {/* Lato sinistro: Codice stanza */}
        <div className="flex items-center flex-shrink-0">
          <span className="text-xs sm:text-sm font-medium whitespace-nowrap">Stanza: {roomCode}</span>
        </div>
        
        {/* Centro: Titolo */}
        <div className="flex-1 flex justify-center min-w-0">
          <h1 className="text-base sm:text-xl lg:text-2xl font-bold text-center">
            <span className="hidden sm:inline">Carte Senza Umanità</span>
            <span className="sm:hidden">CSU</span>
          </h1>
        </div>
        
        {/* Lato destro: Theme toggle e Esci */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <ThemeToggle />
          <button 
            onClick={handleLeaveGame}
            className="btn btn-secondary py-1 px-2 sm:px-3 text-xs sm:text-sm whitespace-nowrap"
          >
            Esci
          </button>
        </div>
      </div>
      
      {/* Layout principale con griglia responsive ottimizzata */}
      <div className={`grid grid-cols-1 gap-4 lg:gap-6 h-full ${
        isCurrentPlayerJudge() 
          ? 'lg:grid-cols-3' 
          : 'lg:grid-cols-4'
      }`}>
        {/* Colonna sinistra - Lista giocatori (più compatta) */}
        <div className="lg:col-span-1 order-1 lg:order-1">
          <PlayerList 
            players={gameData.players} 
            currentJudge={gameData.currentJudge} 
            nickname={nickname}
            maxPoints={gameData.maxPoints}
          />
        </div>
        
        {/* Colonna centrale - Contenuto principale del gioco (più spazio) */}
        <div className={`order-2 lg:order-2 ${
          isCurrentPlayerJudge() 
            ? 'lg:col-span-2' 
            : 'lg:col-span-2'
        }`}>
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
              {/* Banner Giudice */}
              {isCurrentPlayerJudge() && (
                <div className="mb-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-2 rounded-lg shadow-lg border-2 border-yellow-400">
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-lg">⚖️</span>
                    <span className="font-bold text-sm lg:text-base">
                      Sei il GIUDICE di questo turno!
                    </span>
                    <span className="text-lg">⚖️</span>
                  </div>
                  <p className="text-center text-xs mt-1 opacity-90">
                    Attendi che tutti i giocatori giochino le loro carte, poi scegli quella vincente
                  </p>
                </div>
              )}
              
              {/* Mostra la carta nera solo se il gioco non è finito */}
              {gameData.blackCard && (
                <div className="mb-4">
                  <h2 className="text-lg font-medium mb-3">Carta Nera</h2>
                  <div className="max-w-md mx-auto">
                    <Card 
                      type="black" 
                      text={gameData.blackCard.text} 
                      blanks={gameData.blackCard.blanks}
                    />
                  </div>
                </div>
              )}
              
              {/* Resto del contenuto esistente per le fasi di gioco normali */}
              {gameData.roundStatus === 'judging' && (
                <div>
                  <h2 className="text-lg font-medium mb-2">Carte Giocate</h2>
                  {console.log('[CLIENT] Rendering playedCards for judge:', JSON.stringify(gameData.playedCards))}
                  
                  {/* Pannello di controllo per il giudice - SPOSTATO IN ALTO CON DIMENSIONI FISSE */}
                  {isCurrentPlayerJudge() && (
                    <div className="mb-4 bg-gray-100 dark:bg-gray-700 p-2 rounded-lg control-panel-fixed !hidden lg:!block">
                      <div className="flex items-center justify-center">
                        {judgeSelection.selectedIndex !== null ? (
                          <>
                            <div className="flex space-x-3">
                              <button 
                                onClick={handleJudgeConfirm}
                                disabled={judgeSelection.isConfirming}
                                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                                  judgeSelection.isConfirming 
                                    ? 'bg-gray-400 cursor-not-allowed text-gray-600' 
                                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                                }`}
                              >
                                {judgeSelection.isConfirming ? 'Confermando...' : 'Conferma'}
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
                          <p className="text-center text-gray-600 dark:text-gray-300 py-2">
                            Clicca su una carta per selezionarla
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap justify-center gap-4">
                    {gameData.playedCards.map((playedCardObject, index) => {
                      // Gestisci la struttura delle carte
                      let cardText = '';
                      if (Array.isArray(playedCardObject.cards)) {
                        // Carte multiple - ogni carta è una stringa
                        cardText = playedCardObject.cards.join(' / ');
                      } else if (playedCardObject.card) {
                        // Carta singola - può essere stringa o oggetto
                        cardText = typeof playedCardObject.card === 'string' ? playedCardObject.card : playedCardObject.card.text;
                      }
                      
                      return (
                        <Card 
                          key={index}
                          type="white" 
                          text={cardText}
                          onClick={isCurrentPlayerJudge() ? () => handleJudgeCardSelect(index) : undefined}
                          isSelectable={isCurrentPlayerJudge()}
                          isSelected={judgeSelection.selectedIndex === index}
                          isPending={judgeSelection.selectedIndex === index && judgeSelection.isConfirming}
                          isJudging={true}
                        />
                      );
                    })}
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
                      isJudging={true}
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
        
        {/* Colonna destra - Mano del giocatore ottimizzata */}
        {!isCurrentPlayerJudge() && (
          <div className="lg:col-span-1 order-3 flex flex-col">
            {gameData.roundStatus === 'playing' && (
              <div className="flex flex-col h-full">
                {/* Pannello di controllo aggiornato */}
                {!gameData.hasPlayed && (
                  <div className="control-panel-fixed" style={{ minHeight: '80px' }}>
                    <div className="flex flex-col items-center justify-center h-full">
                      {(() => {
                        const requiredCards = gameData.blackCard ? gameData.blackCard.blanks : 1;
                        const selectedCount = handSelection.selectedIndices.length;
                        
                        if (selectedCount === 0) {
                          return (
                            <p className="text-gray-600 dark:text-gray-400 text-sm text-center">
                              Seleziona {requiredCards} {requiredCards > 1 ? 'carte' : 'carta'} per giocare
                            </p>
                          );
                        } else if (selectedCount < requiredCards) {
                          return (
                            <div className="text-center">
                              <p className="text-blue-600 dark:text-blue-400 text-sm mb-2">
                                {selectedCount}/{requiredCards} carte selezionate
                              </p>
                              <button 
                                onClick={handleCardCancel}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all text-sm"
                              >
                                Annulla Selezione
                              </button>
                            </div>
                          );
                        } else {
                          return (
                            <div className="flex space-x-3">
                              <button 
                                onClick={handleCardConfirm}
                                disabled={handSelection.isConfirming}
                                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                                  handSelection.isConfirming 
                                    ? 'bg-gray-400 cursor-not-allowed text-gray-600' 
                                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                                }`}
                              >
                                {handSelection.isConfirming ? 'Confermando...' : 'Conferma'}
                              </button>
                              <button 
                                onClick={handleCardCancel}
                                disabled={handSelection.isConfirming}
                                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all disabled:opacity-50"
                              >
                                Annulla
                              </button>
                            </div>
                          );
                        }
                      })()} {/* Questa parentesi graffa era mancante */}
                    </div>
                  </div>
                )}
                
                {/* Contenitore carte ottimizzato */}
                <div className="flex-1 relative">
                  <div className="h-full overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 350px)' }}>
                    <div className="space-y-2 pr-1 pb-2">
                      {gameData.hand && gameData.hand.length > 0 ? (
                        gameData.hand.map((card, index) => {
                          const isSelected = handSelection.selectedIndices.includes(index);
                          const isPending = isSelected && handSelection.isConfirming;
                          const isPlayed = cardStates.playedCardIndices.includes(index);
                          const isNew = cardStates.newCardIndices.includes(index);
                          
                          return (
                            <Card 
                              key={index}
                              type="white" 
                              text={card}
                              onClick={!gameData.hasPlayed && !isPlayed ? () => handleCardSelect(index) : undefined}
                              isSelectable={!gameData.hasPlayed && !isPlayed}
                              isSelected={isSelected}
                              isPending={isPending}
                              isPlayed={isPlayed}
                              isNew={isNew}
                            />
                          );
                        })
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          Nessuna carta in mano. Attendi la distribuzione.
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Gradiente di fade ottimizzato - posizionato correttamente */}
                  {gameData.hand && gameData.hand.length > 4 && (
                    <div className="absolute bottom-0 left-0 right-1 h-4 card-container-gradient pointer-events-none"></div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Footer sticky per mobile - pannello di controllo carte
      {!isCurrentPlayerJudge() && gameData.roundStatus === 'playing' && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3 z-50">
          <div className="control-panel-fixed" style={{ minHeight: '50px' }}>
            <div className="flex flex-col items-center justify-center h-full">
              {handSelection.selectedIndex !== null && !gameData.hasPlayed ? (
                <div className="flex space-x-2">
                  <button 
                    onClick={handleCardConfirm}
                    disabled={handSelection.isConfirming}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                      handSelection.isConfirming 
                        ? 'bg-gray-400 cursor-not-allowed text-gray-600' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    {handSelection.isConfirming ? 'Confermando...' : 'Conferma'}
                  </button>
                  <button 
                    onClick={handleCardCancel}
                    disabled={handSelection.isConfirming}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 text-sm"
                  >
                    Annulla
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  {gameData.hasPlayed ? (
                    <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                      ✓ Carta giocata!
                    </p>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Seleziona una carta
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )} */}
      
      {/* Footer sticky per mobile - pannello di controllo giudice */}
      {isCurrentPlayerJudge() && gameData.roundStatus === 'judging' && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-2 z-50">
          <div className="control-panel-fixed" style={{ minHeight: '40px' }}>
            <div className="flex flex-col items-center justify-center h-full">
              {judgeSelection.selectedIndex !== null ? (
                <div className="flex space-x-2">
                  <button 
                    onClick={handleJudgeConfirm}
                    disabled={judgeSelection.isConfirming}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                      judgeSelection.isConfirming 
                        ? 'bg-gray-400 cursor-not-allowed text-gray-600' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    {judgeSelection.isConfirming ? 'Confermando...' : 'Conferma'}
                  </button>
                  <button 
                    onClick={handleJudgeCancel}
                    disabled={judgeSelection.isConfirming}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 text-sm"
                  >
                    Annulla
                  </button>
                </div>
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