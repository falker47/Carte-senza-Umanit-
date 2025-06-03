import React from 'react';
import ThemeToggle from './ThemeToggle';

const Rules = ({ onBack }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-gray-800 shadow-2xl rounded-2xl border border-gray-200 dark:border-gray-700 backdrop-blur-sm relative" style={{padding: '27px'}}>
        {/* Container sticky per i controlli in alto */}
        <div className="sticky top-0 flex justify-between items-center mb-4 bg-white dark:bg-gray-800 py-2 z-10">
          <ThemeToggle />
          <button
            onClick={onBack}
            className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
        
        {/* Titolo centrato */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white">
            📋 REGOLE DEL GIOCO
          </h1>
        </div>

        <div className="space-y-8 text-gray-700 dark:text-gray-300">
          {/* Avvertenze - SPOSTATO ALL'INIZIO */}
          <section className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <h2 className="text-2xl font-bold text-yellow-800 dark:text-yellow-200 mb-4 flex items-center">
              ⚠️ <span className="ml-2">Avvertenze</span>
            </h2>
            <p className="text-yellow-700 dark:text-yellow-300 leading-relaxed">
              Questo gioco contiene contenuti per adulti e umorismo nero. È destinato a un pubblico 
              maturo e dovrebbe essere giocato solo tra persone che si conoscono bene e condividono 
              lo stesso senso dell'umorismo. Rispettate sempre i limiti degli altri giocatori.
            </p>
          </section>
          
          {/* Obiettivo del gioco */}
          <section>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
              🎯 <span className="ml-2">Obiettivo del Gioco</span>
            </h2>
            <p className="text-lg leading-relaxed">
              Carte Senza Umanità è un gioco di carte per persone orribili. Il gioco consiste nel creare 
              le combinazioni più divertenti, assurde o inappropriate possibili abbinando le carte nere 
              (domande o frasi con spazi vuoti) alle carte bianche (risposte).
            </p>
          </section>

          {/* Setup */}
          <section>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
              ⚙️ <span className="ml-2">Preparazione</span>
            </h2>
            <ul className="space-y-2 text-lg">
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                Ogni giocatore riceve un delle carte bianche (di default 10)
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                Un giocatore viene scelto casualmente come primo giudice
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                Il gioco può essere giocato da 3 a 10 giocatori
              </li>
            </ul>
          </section>

          {/* Come si gioca */}
          <section>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
              🎮 <span className="ml-2">Come si Gioca</span>
            </h2>
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="font-bold text-lg mb-2">1. Fase di Gioco</h3>
                <ul className="space-y-1">
                  <li>• Il giudice pesca una carta nera e la legge ad alta voce</li>
                  <li>• Gli altri giocatori scelgono una (o più) carte bianche dalla loro mano</li>
                  <li>• Le carte scelte vengono inviate al giudice in modo anonimo</li>
                </ul>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="font-bold text-lg mb-2">2. Fase di Giudizio</h3>
                <ul className="space-y-1">
                  <li>• Il giudice legge tutte le combinazioni create</li>
                  <li>• Il giudice sceglie la combinazione più divertente</li>
                  <li>• Il giocatore che ha giocato la carta vincente ottiene 1 punto</li>
                </ul>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="font-bold text-lg mb-2">3. Nuovo Round</h3>
                <ul className="space-y-1">
                  <li>• Tutti i giocatori pescano nuove carte bianche fino ad averne 10</li>
                  <li>• Il giocatore successivo diventa il nuovo giudice</li>
                  <li>• Si ripete il processo</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Vittoria */}
          <section>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
              🏆 <span className="ml-2">Come si Vince</span>
            </h2>
            <p className="text-lg leading-relaxed">
              Il primo giocatore a raggiungere il numero di punti stabilito (di default 5 punti) 
              vince la partita. Il numero di punti necessari per vincere può essere modificato 
              nelle impostazioni della stanza.
            </p>
          </section>

          {/* Consigli */}
          <section>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
              💡 <span className="ml-2">Consigli per Giocare</span>
            </h2>
            <ul className="space-y-2 text-lg list-disc list-inside">
              <li>Non sempre la risposta più ovvia è quella vincente</li>
              <li>Conosci il tuo pubblico: adatta le tue scelte al senso dell'umorismo del giudice</li>
              <li>A volte le combinazioni più assurde sono quelle che fanno ridere di più</li>
              <li>Ricorda: è solo un gioco, divertitevi!</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Rules;