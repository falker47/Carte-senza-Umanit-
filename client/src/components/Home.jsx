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
    <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-screen bg-texture">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-md shadow-cah p-6 animate-slide-in">
        <h1 className="text-4xl font-black text-center mb-2 uppercase tracking-tight">Carte Senza Umanità</h1>
        <p className="text-center mb-8 text-gray-600 dark:text-gray-400 italic">Un gioco per persone orribili</p>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded mb-4 dark:bg-red-900 dark:text-red-200 dark:border-red-800">
            {error}
          </div>
        )}
        
        <div className="mb-4">
          <label htmlFor="nickname" className="block text-sm font-bold mb-2 uppercase">Nickname</label>
          <input
            type="text"
            id="nickname"
            className="input w-full"
            value={localNickname}
            onChange={(e) => setLocalNickname(e.target.value)}
            placeholder="Il tuo nickname"
            maxLength={20}
          />
        </div>
        
        <div className="grid grid-cols-1 gap-4 mb-6">
          <button
            className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-all duration-200 ${
              isConnecting || !socket?.connected
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
            onClick={handleCreateRoom}
            disabled={isConnecting || !socket?.connected}
          >
            {isConnecting ? 'CONNESSIONE IN CORSO...' : 'CREA NUOVA STANZA'}
          </button>
          
          <div className="flex items-center">
            <hr className="flex-grow border-gray-300 dark:border-gray-600" />
            <span className="px-2 text-gray-500 dark:text-gray-400 font-bold">oppure</span>
            <hr className="flex-grow border-gray-300 dark:border-gray-600" />
          </div>
          
          <div className="mb-4">
            <label htmlFor="roomCode" className="block text-sm font-bold mb-2 uppercase">Codice Stanza</label>
            <input
              type="text"
              id="roomCode"
              className="input w-full"
              value={localRoomCode}
              onChange={(e) => setLocalRoomCode(e.target.value.toUpperCase())}
              placeholder="Inserisci il codice"
              maxLength={6}
            />
          </div>
          
          <button
            className="btn btn-secondary"
            onClick={handleJoinRoom}
          >
            Unisciti a Stanza
          </button>
        </div>
      </div>
      
      <footer className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400 font-bold">
        &copy; {new Date().getFullYear()} Carte Senza Umanità - Versione italiana di Cards Against Humanity
      </footer>
    </div>
  );
};

export default Home;