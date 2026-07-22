import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import SplashScreen from '@/components/SplashScreen'

function Root() {
  const [showSplash, setShowSplash] = useState(true);
  return (
    <>
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      <App />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />)

// Register service worker for offline support & instant PWA loads
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}