import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
// 1. BrowserRouter import qilinadi
import { BrowserRouter } from 'react-router-dom';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* 2. App komponenti BrowserRouter bilan o'rab qo'yiladi */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
