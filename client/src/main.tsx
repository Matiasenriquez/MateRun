/**
 * ==============================================================================
 * PUNTO DE ENTRADA DEL CLIENTE REACT (MateRun)
 * ==============================================================================
 * Monta el árbol de componentes de React en el elemento `#root` del DOM.
 * Utiliza React 18 `createRoot` con `StrictMode` activado para garantizar
 * buenas prácticas en desarrollo.
 * ==============================================================================
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
