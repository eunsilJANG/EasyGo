import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import Login from './pages/Login';
import Contact from './pages/Contact';
import TravelSchedule from './pages/TravelSchedule';
import ContentInput from './pages/ContentInput';
import PlaceSelection from './pages/PlaceSelection';
import UserPreferences from './pages/UserPreferences';
import SignUp from './pages/SignUp';
import Community from './pages/Community';
import SetNickname from './pages/SetNickname';
import WriteArticle from './pages/WriteArticle';

import './App.scss'; // 글로벌 스타일링

const AppLayout = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/' || 
                    location.pathname === '/signup' || 
                    location.pathname === '/set-nickname';
  const showHeaderFooter = !isAuthPage;

  return (
    <div className="app-container">
      {showHeaderFooter && <Header />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/set-nickname" element={<SetNickname />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/travel-schedule" element={<TravelSchedule />} />
        <Route path="/content-input" element={<ContentInput />} />
        <Route path="/place-selection" element={<PlaceSelection />} />
        <Route path="/preferences" element={<UserPreferences />} />
        <Route path="/community" element={<Community />} />
        <Route path="/community/write" element={<WriteArticle />} />
        <Route path="/link" element={<div>Link Page</div>} />
        <Route path="/travel" element={<div>Travel Page</div>} />
        <Route path="/mypage" element={<div>MyPage</div>} />
        <Route path="/wish" element={<div>Wish Page</div>} />
      </Routes>
      {showHeaderFooter && <Footer />}
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
};

export default App;
