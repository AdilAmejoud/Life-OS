import React from 'react';
import { usePomodoro } from './state';

const FULL_CIRCUMFERENCE = 2 * Math.PI * 54;

export const TimerPanel: React.FC = () => {
  const { timer, config, start, pause, resetCurrentMode, skipSession } = usePomodoro();

  const totalSeconds =
    timer.mode === 'work'
      ? config.work
      : timer.mode === 'shortBreak'
      ? config.shortBreak
      : config.longBreak;

  const progress = timer.timeLeft / totalSeconds;
  const offset = FULL_CIRCUMFERENCE * (1 - progress);

  const minutes = Math.floor(timer.timeLeft / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (timer.timeLeft % 60).toString().padStart(2, '0');

  const isBreak = timer.mode !== 'work';

  const handleStartPause = () => {
    if (timer.isRunning) pause();
    else start();
  };

  const modeLabel = timer.mode === 'work' ? 'Work' : timer.mode === 'shortBreak' ? 'Short Break' : 'Long Break';

  return (
    <section className="timer-panel">
      <div className="timer-ring-wrap">
        <svg viewBox="0 0 120 120" className="timer-ring-svg">
          <circle
            cx="60"
            cy="60"
            r="54"
            stroke="var(--border)"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx="60"
            cy="60"
            r="54"
            stroke={isBreak ? 'var(--positive)' : 'var(--primary)'}
            strokeWidth="8"
            fill="none"
            strokeDasharray={FULL_CIRCUMFERENCE}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="timer-ring-inner">
          <div className="timer-time">
            {minutes}:{seconds}
          </div>
          <div className="timer-focus-label">Focus Session</div>
          <div className={`timer-mode-label${isBreak ? ' break' : ''}`}>{modeLabel}</div>
        </div>
      </div>

      <div className="timer-controls">
        <button className="btn-secondary" onClick={skipSession}>
          Skip
        </button>
        <button className="btn-primary" onClick={handleStartPause}>
          {timer.isRunning ? 'Pause' : 'Start'}
        </button>
        <button className="btn-secondary" onClick={resetCurrentMode}>
          Reset
        </button>
      </div>

      <div className="timer-stats">
        <StatBlock label="Pomodoros" value={timer.pomodoros} />
        <StatBlock label="Sessions" value={timer.sessions} />
      </div>
    </section>
  );
};

const StatBlock: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="timer-stat-block">
    <div className="timer-stat-value">{value}</div>
    <div className="timer-stat-label">{label}</div>
  </div>
);

export default TimerPanel;

