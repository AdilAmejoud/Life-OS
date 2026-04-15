import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { PomodoroProvider } from './state';
import TimerPanel from './TimerPanel';
import FocusTodayList from './FocusTodayList';
import TaskSelector from './TaskSelector';
import ToolAccessCard from './ToolAccessCard';
import { GlobalSearchModal } from './GlobalSearchModal';

const FocusLayout: React.FC = () => (
  <div className="app-root">
    <main className="app-main">
      <div className="left-panel">
        <div className="left-panel-card">
          <TimerPanel />
          <div className="spotify-embed">
            <iframe data-testid="embed-iframe" style={{ borderRadius: '12px' }} src="https://open.spotify.com/embed/playlist/4avmMYFeFQA0w4GvuGn5wl?utm_source=generator" width="100%" height="352" frameBorder="0" allowFullScreen={false} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
          </div>
        </div>
        <TaskSelector />
        <ToolAccessCard />
      </div>
      <div className="focus-today-list-card">
        <FocusTodayList />
      </div>
    </main>
    <GlobalSearchModal />
  </div>
);

const App: React.FC = () => {
  return (
    <PomodoroProvider>
      <Routes>
        <Route path="/" element={<FocusLayout />} />
      </Routes>
    </PomodoroProvider>
  );
};

export default App;
