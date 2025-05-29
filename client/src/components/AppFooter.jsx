import React from 'react';

const AppFooter = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="sticky bottom-0 text-center py-4 mt-auto text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 z-40">
      <p>
        Carte Senza Umanità &copy; {currentYear} - 
        <a 
          href="https://falker47.github.io/Nexus-portfolio/"
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:underline ml-1 text-cah-accent-dark dark:text-cah-accent-light"
        >
          Maurizio Falconi @falker47
        </a>
      </p>
    </footer>
  );
};

export default AppFooter;