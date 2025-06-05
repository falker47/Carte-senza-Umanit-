import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Home from './components/Home';
import Lobby from './components/Lobby';
import Game from './components/Game';
import { SocketProvider } from './hooks/useSocket';
import { ThemeProvider } from './hooks/useTheme';
import AppFooter from './components/AppFooter';

const App = () => {
  // Recupera lo stato dal localStorage al caricamento
  const [gameState, setGameState] = useState(() => {
    const savedState = localStorage.getItem('gameState');
    return savedState || 'home';
  });
  
  const [nickname, setNickname] = useState(() => {
    return localStorage.getItem('nickname') || '';
  });
  
  const [roomCode, setRoomCode] = useState(() => {
    return localStorage.getItem('roomCode') || '';
  });

  // Salva lo stato nel localStorage quando cambia
  useEffect(() => {
    if (gameState !== 'home') {
      localStorage.setItem('gameState', gameState);
      localStorage.setItem('nickname', nickname);
      localStorage.setItem('roomCode', roomCode);
    } else {
      // Pulisci il localStorage quando si torna alla home
      localStorage.removeItem('gameState');
      localStorage.removeItem('nickname');
      localStorage.removeItem('roomCode');
    }
  }, [gameState, nickname, roomCode]);

  // Funzione per pulire lo stato (da chiamare quando si esce volontariamente)
  const clearGameState = () => {
    localStorage.removeItem('gameState');
    localStorage.removeItem('nickname');
    localStorage.removeItem('roomCode');
    setGameState('home');
    setNickname('');
    setRoomCode('');
  };
  
  const [socket, setSocket] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDarkMode = localStorage.getItem('darkMode') === 'true' || 
                      window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Modifica la gestione del socket
  useEffect(() => {
    const serverUrl = import.meta.env.PROD 
      ? import.meta.env.VITE_APP_SERVER_URL || 'https://carte-senza-umanita-server.onrender.com'
      : 'http://localhost:3001';
    
    console.log('Ambiente:', import.meta.env.PROD ? 'PRODUZIONE' : 'SVILUPPO');
    console.log('VITE_APP_SERVER_URL:', import.meta.env.VITE_APP_SERVER_URL);
    console.log('URL finale del server:', serverUrl);

    const newSocket = io(serverUrl, {
      transports: ['polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('✅ Connesso al server Socket.io! ID:', newSocket.id);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Errore di connessione Socket.io:', error.message, 'URL:', serverUrl);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Disconnesso dal server:', reason);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('Riconnesso dopo', attemptNumber, 'tentativi');
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('Errore di riconnessione:', error);
    });

    return () => {
      console.log('App.jsx: Disconnessione socket...');
      newSocket.disconnect();
    };
  }, []);

  // SPOSTATO QUI DENTRO IL COMPONENTE - Tentativo di riconnessione
  useEffect(() => {
    if (gameState !== 'home' && nickname && roomCode && socket?.connected) {
      console.log('Tentativo di riconnessione a:', roomCode, 'con nickname:', nickname);
      
      socket.emit('rejoin-room', { nickname, roomCode });
      
      socket.on('rejoin-success', (data) => {
        console.log('Riconnessione riuscita:', data);
        if (data.gameStarted) {
          setGameState('game');
        } else {
          setGameState('lobby');
        }
      });
      
      socket.on('rejoin-failed', (error) => {
        console.log('Riconnessione fallita:', error);
        clearGameState();
      });
    }
  }, [socket, gameState, nickname, roomCode]);

  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    localStorage.setItem('darkMode', newDarkMode.toString());
  };

  const renderContent = () => {
    switch (gameState) {
      case 'home':
        return (
          <Home 
            setGameState={setGameState} 
            setNickname={setNickname} 
            setRoomCode={setRoomCode}
            nickname={nickname}
          />
        );
      case 'lobby':
        return (
          <Lobby 
            roomCode={roomCode} 
            nickname={nickname} 
            setGameState={setGameState} 
            setRoomCode={setRoomCode}
          />
        );
      case 'game':
        return (
          <Game 
            roomCode={roomCode} 
            nickname={nickname} 
            setGameState={setGameState} 
          />
        );
      default:
        return <Home setGameState={setGameState} />;
    }
  };

  return (
    <ThemeProvider value={{ darkMode, toggleTheme }}>
      <SocketProvider value={socket}>
        <div className="min-h-screen bg-texture text-gray-900 dark:text-white transition-colors duration-200 flex flex-col">
          <main className="flex-grow pb-0">
            {renderContent()}
          </main>
          <AppFooter />
        </div>
      </SocketProvider>
    </ThemeProvider>
  );
};

export default App;