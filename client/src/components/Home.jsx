import React, { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useTheme } from '../hooks/useTheme';
import ThemeToggle from './ThemeToggle';
import Rules from './Rules';

const Home = ({ setNickname, setRoomCode, setGameState, nickname }) => {
  const [localNickname, setLocalNickname] = useState(nickname || '');
  const [localRoomCode, setLocalRoomCode] = useState('');
  const [error, setError] = useState('');
  const [isConnecting, setIsConnecting] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const socket = useSocket();
  
  // Aggiungi questo useEffect per monitorare lo stato della connessione
  useEffect(() => {
    if (socket) {
      const updateConnectionStatus = () => {
        setIsConnecting(!socket.connected);
        if (socket.connected) {
          setError('');
        }
      };
      
      const handleConnectError = (error) => {
        console.error('Errore connessione:', error);
        setIsConnecting(false);
        setError('Errore di connessione al server');
      };
      
      // Aggiorna lo stato ogni volta che cambia la connessione
      socket.on('connect', updateConnectionStatus);
      socket.on('disconnect', updateConnectionStatus);
      socket.on('reconnect', updateConnectionStatus);
      socket.on('connect_error', handleConnectError);
      
      // Imposta lo stato iniziale
      updateConnectionStatus();
      
      return () => {
        socket.off('connect', updateConnectionStatus);
        socket.off('disconnect', updateConnectionStatus);
        socket.off('reconnect', updateConnectionStatus);
        socket.off('connect_error', handleConnectError);
      };
    }
  }, [socket]);
  
  const handleCreateRoom = () => {
    if (!localNickname.trim()) {
      setError('Inserisci un nickname per continuare');
      return;
    }
    
    if (!socket) {
      setError('Connessione al server non disponibile. Riprova.');
      return;
    }
    
    if (!socket.connected) {
      setError('Connessione al server in corso. Attendi un momento e riprova.');
      return;
    }
    
    setNickname(localNickname);
    setError(''); // Pulisci errori precedenti
    
    console.log('Emetto create-room con nickname:', localNickname);
    
    // Timeout per gestire mancate risposte del server
    const timeout = setTimeout(() => {
      socket.off('room-players', handleRoomCreated);
      socket.off('error', handleError);
      setError('Timeout nella creazione della stanza. Riprova.');
    }, 10000); // 10 secondi di timeout
    
    // Gestisci la creazione della stanza
    const handleRoomCreated = ({ players, host, code }) => {
      console.log('Stanza creata con codice:', code);
      clearTimeout(timeout);
      setRoomCode(code);
      setGameState('lobby');
      socket.off('room-players', handleRoomCreated);
      socket.off('error', handleError);
    };
    
    // Gestisci errori del server
    const handleError = ({ message }) => {
      console.error('Errore dal server:', message);
      clearTimeout(timeout);
      setError(message);
      socket.off('room-players', handleRoomCreated);
      socket.off('error', handleError);
    };
    
    socket.on('room-players', handleRoomCreated);
    socket.on('error', handleError);
    socket.emit('create-room', { nickname: localNickname });
  };
  
  const handleJoinRoom = () => {
    if (!localNickname.trim()) {
      setError('Inserisci un nickname per continuare');
      return;
    }
  
    const upperCaseLocalRoomCode = localRoomCode.toUpperCase();
  
    if (!upperCaseLocalRoomCode.trim()) {
      setError('Inserisci un codice stanza per continuare');
      return;
    }
  
    if (!socket) {
      setError('Connessione al server non disponibile. Riprova.');
      return;
    }
  
    if (!socket.connected) {
      setError('Connessione al server in corso. Attendi un momento e riprova.');
      return;
    }
  
    setError(''); // Pulisci errori precedenti
    
    console.log('Emetto join-room con nickname:', localNickname, 'e codice:', upperCaseLocalRoomCode);
    
    // Timeout per gestire mancate risposte del server
    const timeout = setTimeout(() => {
      socket.off('room-players', handleRoomJoined);
      socket.off('error', handleJoinError);
      setError('Timeout nell\'accesso alla stanza. Riprova.');
    }, 10000); // 10 secondi di timeout
    
    // Gestisci l'accesso riuscito alla stanza
    const handleRoomJoined = ({ players, host, code }) => {
      console.log('Accesso riuscito alla stanza:', code);
      clearTimeout(timeout);
      setNickname(localNickname);
      setRoomCode(upperCaseLocalRoomCode);
      setGameState('lobby');
      socket.off('room-players', handleRoomJoined);
      socket.off('error', handleJoinError);
    };
    
    // Gestisci errori del server (incluso stanza non trovata)
    const handleJoinError = ({ message }) => {
      console.error('Errore dal server:', message);
      clearTimeout(timeout);
      setError(message);
      socket.off('room-players', handleRoomJoined);
      socket.off('error', handleJoinError);
    };
    
    socket.on('room-players', handleRoomJoined);
    socket.on('error', handleJoinError);
    socket.emit('join-room', { nickname: localNickname, roomCode: upperCaseLocalRoomCode });
  };
  
  // Nuova funzione per gestire la pressione del tasto invio
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Se il nickname è compilato ma non il codice stanza, crea una stanza
      if (localNickname.trim() && !localRoomCode.trim()) {
        handleCreateRoom();
      }
      // Se sia nickname che codice stanza sono compilati, prova a collegarsi
      else if (localNickname.trim() && localRoomCode.trim()) {
        handleJoinRoom();
      }
      // Se il nickname non è compilato, mostra errore
      else if (!localNickname.trim()) {
        setError('Inserisci un nickname per continuare');
      }
    }
  };

  // Aggiungi questa condizione di rendering all'inizio del return
  if (showRules) {
    return <Rules onBack={() => setShowRules(false)} />;
  }
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-8 border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
        <h1 className="text-5xl font-extrabold text-center mb-2 text-gray-800 dark:text-white tracking-tight">
          CARTE SENZA UMANITÀ
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-6 text-lg font-medium">
          Un gioco per persone orribili
        </p>
        
        {/* Pulsante Regole */}
        <div className="text-center mb-8">
          <button
            onClick={() => setShowRules(true)}
            className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Come si gioca</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
            <strong className="font-bold">Errore: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <div className="mb-6">
          <label htmlFor="nickname" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
            👤 NICKNAME
          </label>
          <input
            type="text"
            id="nickname"
            value={localNickname}
            onChange={(e) => setLocalNickname(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Il tuo soprannome"
            className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:border-gray-600 transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500"
          />
        </div>

        <button
          className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl ${
            isConnecting || !socket?.connected
              ? 'bg-gray-400 cursor-not-allowed text-gray-700'
              : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-blue-500/25'
          }`}
          onClick={handleCreateRoom}
          disabled={isConnecting || !socket?.connected}
        >
          {isConnecting ? 'CONNESSIONE IN CORSO...' : 'CREA NUOVA STANZA'}
        </button>

        <div className="my-8 flex items-center">
          <hr className="flex-grow border-t-2 border-gray-300 dark:border-gray-600" />
          <span className="mx-6 text-gray-500 dark:text-gray-400 font-semibold bg-white dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-300 dark:border-gray-600">oppure</span>
          <hr className="flex-grow border-t-2 border-gray-300 dark:border-gray-600" />
        </div>

        <div>
          <label htmlFor="roomCode" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
            🔑 CODICE STANZA
          </label>
          <input
            type="text"
            id="roomCode"
            value={localRoomCode}
            onChange={(e) => setLocalRoomCode(e.target.value.toUpperCase())}
            onKeyPress={handleKeyPress}
            placeholder="INSERISCI IL CODICE"
            className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900 placeholder-gray-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:border-gray-600 mb-4 transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500 text-center font-mono text-lg tracking-widest"
            maxLength={6}
            style={{ textTransform: 'uppercase' }}
          />
          <button
             className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl ${
              isConnecting || !socket?.connected
                ? 'bg-gray-400 cursor-not-allowed text-gray-700'
                : 'bg-green-600 hover:bg-green-700 text-white hover:shadow-green-500/25'
            }`}
            onClick={handleJoinRoom}
            disabled={isConnecting || !socket?.connected}
          >
            ENTRA NELLA STANZA
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;