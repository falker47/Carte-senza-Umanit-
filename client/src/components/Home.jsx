import React, { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useTheme } from '../hooks/useTheme';
import ThemeToggle from './ThemeToggle';

const Home = ({ setNickname, setRoomCode, setGameState, nickname }) => {
  const [localNickname, setLocalNickname] = useState(nickname || '');
  const [localRoomCode, setLocalRoomCode] = useState('');
  const [error, setError] = useState('');
  const [isConnecting, setIsConnecting] = useState(true);
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
    
    if (!localRoomCode.trim()) {
      setError('Inserisci un codice stanza per continuare');
      return;
    }
    
    setNickname(localNickname);
    setRoomCode(localRoomCode);
    setGameState('lobby');
    
    // Il socket verrà creato in App.jsx e gestirà l'ingresso nella stanza
    setTimeout(() => {
      if (socket) {
        socket.emit('join-room', { nickname: localNickname, roomCode: localRoomCode });
      }
    }, 100);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md bg-white dark:bg-gray-800 shadow-xl rounded-xl p-8">
        <h1 className="text-5xl font-extrabold text-center mb-2 text-gray-800 dark:text-white">
          CARTE SENZA UMANITÀ
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-10">
          Un gioco per persone orribili
        </p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
            <strong className="font-bold">Errore: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <div className="mb-6">
          <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            NICKNAME
          </label>
          <input
            type="text"
            id="nickname"
            value={localNickname}
            onChange={(e) => setLocalNickname(e.target.value)}
            placeholder="Il tuo soprannome"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:border-gray-600"
          />
        </div>

        <button
          className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-all duration-200 ${
            isConnecting || !socket?.connected
              ? 'bg-gray-400 cursor-not-allowed text-gray-700'
              : 'bg-blue-600 hover:bg-blue-700 text-white' // MODIFICATO QUI
          }`}
          onClick={handleCreateRoom}
          disabled={isConnecting || !socket?.connected}
        >
          {isConnecting ? 'CONNESSIONE IN CORSO...' : 'CREA NUOVA STANZA'}
        </button>

        <div className="my-8 flex items-center">
          <hr className="flex-grow border-t border-gray-300 dark:border-gray-600" />
          <span className="mx-4 text-gray-500 dark:text-gray-400">oppure</span>
          <hr className="flex-grow border-t border-gray-300 dark:border-gray-600" />
        </div>

        <div>
          <label htmlFor="roomCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            CODICE STANZA
          </label>
          <input
            type="text"
            id="roomCode"
            value={localRoomCode}
            onChange={(e) => setLocalRoomCode(e.target.value)}
            placeholder="Inserisci il codice"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:border-gray-600 mb-4"
          />
          <button
             className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-all duration-200 ${
              isConnecting || !socket?.connected
                ? 'bg-gray-400 cursor-not-allowed text-gray-700'
                : 'bg-green-600 hover:bg-green-700 text-white'
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