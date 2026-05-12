import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import AIDAN from './AIDAN.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AIDAN />
  </StrictMode>,
);
