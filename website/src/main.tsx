import React from 'react';
import ReactDOM from 'react-dom/client';
import { BRAND_CONFIG } from '@shared/branding';
import App from './App';

document.title = BRAND_CONFIG.products.website.documentTitle;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
