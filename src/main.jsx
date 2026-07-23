import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import './index.scss'
import App from './App.jsx'
import Tips from './MIDSECTION/section_of_each_tips.jsx';
import Footer from './footer.jsx';
import Hall_of_fame from './MIDSECTION/HALL_of_fame.jsx';
import Table from './MIDSECTION/TABLE.jsx';
import AIRecommendation from './MIDSECTION/AIRecomendation.jsx';

createRoot(document.getElementById('root-render')).render(
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <Tips/>
  </BrowserRouter>
)
createRoot(document.getElementById('footer-render')).render(
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    
    <Table/>
    <Hall_of_fame/>
    <Footer/>
  </BrowserRouter>
)

