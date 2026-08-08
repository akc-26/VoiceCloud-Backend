import React from 'react';
import ReactDOM from 'react-dom/client';
import { BRAND_CONFIG } from '@shared/branding';
import App from './App';
import './index.css';

document.title = BRAND_CONFIG.products.admin.documentTitle;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
