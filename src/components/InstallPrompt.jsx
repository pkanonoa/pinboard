import React, { useState, useEffect } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      
      // Show our custom prompt immediately
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      // We've used the prompt, and can't use it again, throw it away
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-2xl z-50 flex flex-col gap-3 animate-fade-in-up">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[var(--text-primary)] font-semibold text-lg">Install Pinboard</h3>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Add Pinboard to your home screen for quick and easy offline access.</p>
        </div>
        <button onClick={handleDismiss} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      <div className="flex gap-2 justify-end mt-2">
        <button onClick={handleDismiss} className="px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors">
          Not now
        </button>
        <button onClick={handleInstallClick} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-[var(--text-primary)] rounded font-medium transition-colors">
          Install App
        </button>
      </div>
    </div>
  );
}
