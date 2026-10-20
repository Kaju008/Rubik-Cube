import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { warmUpSolver } from './cube/solverClient';
import './styles.css';

// start building the solver tables right away, in the background
warmUpSolver();

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
