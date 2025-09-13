import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import { DateSim } from './components/DateSim';

export const RootRouter: React.FC = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/date" element={<DateSim />} />
    </Routes>
  </BrowserRouter>
);
