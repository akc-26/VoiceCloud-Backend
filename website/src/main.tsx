import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { installWebsiteBrand } from '@/branding';
import '@/styles/global.css';

installWebsiteBrand();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
