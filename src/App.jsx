import React, { useState, useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import SetupPage from './pages/SetupPage';
import FavoritesPage from './pages/FavoritesPage';
import SharedFavoritesPage from './pages/SharedFavoritesPage';
import AutoScanPage from './pages/AutoScanPage';
import RecurringScanPage from './pages/RecurringScanPage';
import GitHubPage from './pages/GitHubPage';
import FarcasterPage from './pages/FarcasterPage';
import TwitterPage from './pages/TwitterPage';
import SuperSearchPage from './pages/SuperSearchPage';
import ProductHuntPage from './pages/ProductHuntPage';
import ChatPage from './pages/ChatPage';
import HomePage from './pages/HomePage';
import CompanyDetail from './pages/CompanyDetail';
import TopPicksPage from './pages/TopPicksPage';
import AirtablePage from './pages/AirtablePage';
import PortcosPage from './pages/PortcosPage';
import NavBar from './components/NavBar';
import Trollbox from './components/Trollbox';
import { ScanProvider } from './components/ScanContext';
import { CrmHistory } from './components/CrmButton';
import { isAuthenticated, clearKeys, addSharedFavorite, removeSharedFavorite } from './utils/api';

// Generate or retrieve persistent user ID
function getUserId() {
  let id = localStorage.getItem('pigeon_user_id');
  if (!id) {
    id = 'pigeon-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('pigeon_user_id', id);
  }
  return id;
}

// Fun default nicknames
const PIGEON_NAMES = [
  'Sneaky Pigeon', 'Turbo Pigeon', 'Mega Pigeon', 'Shadow Pigeon',
  'Cosmic Pigeon', 'Neon Pigeon', 'Ghost Pigeon', 'Rebel Pigeon',
  'Laser Pigeon', 'Hyper Pigeon', 'Stealth Pigeon', 'Crypto Pigeon',
  'Alpha Pigeon', 'Rogue Pigeon', 'Pixel Pigeon', 'Thunder Pigeon',
];

function getDefaultNickname() {
  return PIGEON_NAMES[Math.floor(Math.random() * PIGEON_NAMES.length)];
}

function AppContent({ ready, setReady }) {
  const location = useLocation();
  const [userId] = useState(getUserId);
  const [nickname, setNickname] = useState(() => {
    return localStorage.getItem('pigeon_nickname') || getDefaultNickname();
  });

  // Save nickname to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('pigeon_nickname', nickname);
  }, [nickname]);

  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('scout_favorites') || '[]');
    } catch {
      return [];
    }
  });

  const addFavorite = useCallback((company) => {
    setFavorites((prev) => {
      if (prev.some((f) => f.name === company.name)) return prev;
      const updated = [...prev, { ...company, added_at: new Date().toISOString() }];
      sessionStorage.setItem('scout_favorites', JSON.stringify(updated));

      // Also share to community
      addSharedFavorite(userId, nickname, company).catch((e) =>
        console.warn('Failed to share:', e.message)
      );

      return updated;
    });
  }, [userId, nickname]);

  const removeFavorite = useCallback((companyName) => {
    setFavorites((prev) => {
      const updated = prev.filter((f) => f.name !== companyName);
      sessionStorage.setItem('scout_favorites', JSON.stringify(updated));
      return updated;
    });
    // Also remove from community
    removeSharedFavorite(userId, companyName).catch((e) =>
      console.warn('Failed to unshare:', e.message)
    );
  }, [userId]);

  const isFavorited = useCallback((companyName) => {
    return favorites.some((f) => f.name === companyName);
  }, [favorites]);

  const handleLogout = () => {
    clearKeys();
    setReady(false);
  };

  if (!ready) {
    return (
      <Routes>
        <Route path="/setup" element={<SetupPage onComplete={() => setReady(true)} />} />
        <Route path="*" element={<Navigate to="/setup" />} />
      </Routes>
    );
  }

  return (
    <>
      <NavBar
        onLogout={handleLogout}
        favCount={favorites.length}
        nickname={nickname}
        setNickname={setNickname}
        userId={userId}
        addFavorite={addFavorite}
        isFavorited={isFavorited}
      />
      <Trollbox userId={userId} nickname={nickname} />
      {/* CRM History — floating top right */}
      <div className="fixed top-3 right-3 z-40">
        <CrmHistory />
      </div>
      <main className="pb-16">
        {/* ChatPage always mounted so searches keep running */}
        <div style={{ display: location.pathname === '/chat' ? 'block' : 'none' }}>
          <ChatPage addFavorite={addFavorite} isFavorited={isFavorited} />
        </div>

        <Routes>
          <Route path="/" element={<HomePage addFavorite={addFavorite} isFavorited={isFavorited} />} />
          <Route path="/chat" element={null} />
          <Route
            path="/favorites"
            element={<FavoritesPage favorites={favorites} removeFavorite={removeFavorite} addFavorite={addFavorite} isFavorited={isFavorited} />}
          />
          <Route
            path="/community"
            element={
              <SharedFavoritesPage
                userId={userId}
                addFavorite={addFavorite}
                isFavorited={isFavorited}
              />
            }
          />
          <Route path="/company/:id" element={<CompanyDetail addFavorite={addFavorite} isFavorited={isFavorited} />} />
          <Route path="/autoscan" element={<AutoScanPage addFavorite={addFavorite} isFavorited={isFavorited} />} />
          <Route path="/github" element={<GitHubPage addFavorite={addFavorite} isFavorited={isFavorited} />} />
          <Route path="/farcaster" element={<FarcasterPage addFavorite={addFavorite} isFavorited={isFavorited} />} />
          <Route path="/twitter" element={<TwitterPage addFavorite={addFavorite} isFavorited={isFavorited} />} />
          <Route path="/super" element={<SuperSearchPage addFavorite={addFavorite} isFavorited={isFavorited} />} />
          <Route path="/toppicks" element={<TopPicksPage addFavorite={addFavorite} isFavorited={isFavorited} />} />
          <Route path="/producthunt" element={<ProductHuntPage addFavorite={addFavorite} isFavorited={isFavorited} />} />
          <Route path="/airtable" element={<AirtablePage />} />
          <Route path="/portcos" element={<PortcosPage addFavorite={addFavorite} isFavorited={isFavorited} />} />
          <Route path="/recurring" element={<RecurringScanPage addFavorite={addFavorite} isFavorited={isFavorited} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  const [ready, setReady] = useState(isAuthenticated());

  return (
    <BrowserRouter>
      <style>{`
        ::placeholder {
          color: rgba(255, 255, 255, 0.15) !important;
          opacity: 1 !important;
          -webkit-text-fill-color: rgba(255, 255, 255, 0.15) !important;
        }
        ::-webkit-input-placeholder {
          color: rgba(255, 255, 255, 0.15) !important;
          opacity: 1 !important;
          -webkit-text-fill-color: rgba(255, 255, 255, 0.15) !important;
        }
        ::-moz-placeholder {
          color: rgba(255, 255, 255, 0.15) !important;
          opacity: 1 !important;
        }
        :-ms-input-placeholder {
          color: rgba(255, 255, 255, 0.15) !important;
        }
      `}</style>
      <ScanProvider>
        <AppContent ready={ready} setReady={setReady} />
      </ScanProvider>
    </BrowserRouter>
  );
}
