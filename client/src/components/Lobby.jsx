import React, { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import ThemeToggle from './ThemeToggle';

const Lobby = ({ roomCode, nickname, setGameState, setRoomCode }) => {
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [gameSettings, setGameSettings] = useState({
    maxPoints: 5,
    maxPlayers: 10,
    handSize: 7
  });
  const [customPoints, setCustomPoints] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const socket = useSocket();

  useEffect(() => {
    if (!socket) {
      console.error('Socket non disponibile in Lobby');
      setError('Connessione non disponibile');
      return;
    }

    console.log('Lobby montata - Socket ID:', socket.id);
    console.log('Codice stanza ricevuto:', roomCode);
    
    // Se non abbiamo un roomCode, torna alla home
    if (!roomCode) {
      console.error('Nessun codice stanza disponibile');
      setError('Codice stanza non disponibile');
      setTimeout(() => setGameState('home'), 2000);
      return;
    }

    // Ascolta gli aggiornamenti dei giocatori nella stanza
    socket.on('room-players', ({ players, host, code }) => {
      console.log('Evento room-players ricevuto:', { players, host, code });
      setPlayers(players || []);
      setIsHost(host === socket.id);
      // Se il server invia il codice, aggiornalo
      if (code && code !== roomCode) {
        console.log('Codice stanza aggiornato dal server:', code);
        setRoomCode(code);
      }
    });

    // Ascolta gli errori
    socket.on('error', ({ message }) => {
      setError(message);
    });

    // Ascolta l'inizio del gioco
    socket.on('game-started', () => {
      setGameState('game');
    });

    // Cleanup
    return () => {
      socket.off('room-players');
      socket.off('error');
      socket.off('game-started');
    };
  }, [socket, setGameState, roomCode, setRoomCode]); // Aggiungi setRoomCode alle dipendenze

  // Modifica la funzione handleCopyCode per aggiungere fallback
  const handleCopyCode = () => {
    if (!roomCode) {
      setError('Codice stanza non disponibile');
      return;
    }
    
    try {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      console.log('Codice copiato:', roomCode);
    } catch (err) {
      console.error('Errore durante la copia:', err);
      // Fallback per browser che non supportano clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = roomCode;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {
        setError('Impossibile copiare il codice. Copialo manualmente: ' + roomCode);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleStartGame = () => {
    if (players.length < 3) {
      setError('Sono necessari almeno 3 giocatori per iniziare');
      return;
    }

    socket.emit('start-game', { roomCode, settings: gameSettings });
  };

  const handleLeaveRoom = () => {
    socket.emit('leave-room', { roomCode });
    setGameState('home');
  };

  const handleSettingChange = (setting, value) => {
    if (setting === 'maxPoints' && value === 'custom') {
      setShowCustomInput(true);
      return;
    }
    
    setGameSettings(prev => ({
      ...prev,
      [setting]: parseInt(value, 10)
    }));
    
    if (setting === 'maxPoints' && value !== 'custom') {
      setShowCustomInput(false);
      setCustomPoints('');
    }
  };

  const handleCustomPointsSubmit = () => {
    const points = parseInt(customPoints, 10);
    if (points && points > 0 && points <= 50) {
      setGameSettings(prev => ({
        ...prev,
        maxPoints: points
      }));
      setShowCustomInput(false);
      setCustomPoints('');
    } else {
      setError('Inserisci un numero valido tra 1 e 50');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col items-center min-h-screen">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 animate-fade-in">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">CARTE SENZA UMANITÀ</h1>
          <div className="flex items-center space-x-2">
            {roomCode ? (
              <>
                <span className="text-sm font-medium">Codice: {roomCode}</span>
                <button
                  onClick={handleCopyCode}
                  className="btn btn-secondary py-1 px-2 text-sm"
                >
                  {copied ? 'Copiato!' : 'Copia'}
                </button>
              </>
            ) : (
              <span className="text-sm font-medium text-red-500">Codice non disponibile</span>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 dark:bg-red-900 dark:text-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-lg font-medium mb-3">Giocatori ({players.length}/10)</h2>
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
            {players.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center">In attesa di giocatori...</p>
            ) : (
              <ul className="space-y-2">
                {players.map((player, index) => (
                  <li key={index} className="flex items-center">
                    <span className="w-8 h-8 flex items-center justify-center bg-blue-500 text-white rounded-full mr-3">
                      {index + 1}
                    </span>
                    <span>{player.nickname}</span>
                    {player.isHost && (
                      <span className="ml-2 text-xs bg-yellow-500 text-white px-2 py-1 rounded">Host</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {isHost && (
          <div className="mb-6">
            <h2 className="text-lg font-medium mb-3">Impostazioni</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="maxPoints" className="block text-sm font-medium mb-2">Punti per vincere</label>
                {!showCustomInput ? (
                  <select
                    id="maxPoints"
                    className="input w-full"
                    value={[3, 5, 7, 10].includes(gameSettings.maxPoints) ? gameSettings.maxPoints : 'custom'}
                    onChange={(e) => handleSettingChange('maxPoints', e.target.value)}
                  >
                    {[3, 5, 7, 10].map(value => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                    <option value="custom">
                      {[3, 5, 7, 10].includes(gameSettings.maxPoints) ? 'Custom' : `Custom (${gameSettings.maxPoints})`}
                    </option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      className="input flex-1"
                      placeholder="Inserisci punti"
                      value={customPoints}
                      onChange={(e) => setCustomPoints(e.target.value)}
                      min="1"
                      max="50"
                    />
                    <button
                      onClick={handleCustomPointsSubmit}
                      className="btn btn-primary px-3"
                    >
                      OK
                    </button>
                    <button
                      onClick={() => {
                        setShowCustomInput(false);
                        setCustomPoints('');
                      }}
                      className="btn btn-secondary px-3"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="handSize" className="block text-sm font-medium mb-2">Carte in mano</label>
                <select
                  id="handSize"
                  className="input w-full"
                  value={gameSettings.handSize}
                  onChange={(e) => handleSettingChange('handSize', e.target.value)}
                >
                  {[5, 7, 10].map(value => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <button
            onClick={handleLeaveRoom}
            className="btn btn-secondary"
          >
            ESCI DALLA STANZA
          </button>
          {isHost && (
            <button
              onClick={handleStartGame}
              className="btn btn-primary"
              disabled={players.length < 3}
            >
              INIZIA PARTITA
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Lobby;