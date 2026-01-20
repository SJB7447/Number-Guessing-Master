
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { getGeminiCommentary } from './geminiService';
import { LeaderboardEntry, GuessRecord, GameStatus } from './types';

// 초기 버전의 깔끔한 스탯 카드 스타일
const StatCard = ({ label, value }: { label: string, value: string | number }) => (
  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
    <p className="text-2xl font-bold text-emerald-400">{value}</p>
  </div>
);

// 팩맨 애니메이션 컴포넌트
const PacmanAnimation = () => (
  <div className="relative w-full h-12 overflow-hidden bg-slate-900/30 border-t border-slate-800 mt-auto shrink-0">
    <div className="absolute inset-0 flex items-center justify-around px-8">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="w-1.5 h-1.5 bg-yellow-600/40 rounded-full" />
      ))}
    </div>
    <div className="absolute top-0 h-full flex items-center animate-pacman-move">
      <div className="relative w-8 h-8">
        <div className="absolute top-0 left-0 w-8 h-4 bg-yellow-400 rounded-t-full animate-pacman-mouth-top origin-bottom"></div>
        <div className="absolute bottom-0 left-0 w-8 h-4 bg-yellow-400 rounded-b-full animate-pacman-mouth-bottom origin-top"></div>
      </div>
    </div>
    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes pacman-move {
        0% { transform: translateX(-50px); }
        100% { transform: translateX(500px); }
      }
      @keyframes pacman-mouth-top {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(-35deg); }
      }
      @keyframes pacman-mouth-bottom {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(35deg); }
      }
      .animate-pacman-move { animation: pacman-move 6s linear infinite; }
      .animate-pacman-mouth-top { animation: pacman-mouth-top 0.3s ease-in-out infinite; }
      .animate-pacman-mouth-bottom { animation: pacman-mouth-bottom 0.3s ease-in-out infinite; }
    `}} />
  </div>
);

// 화려한 축하 파티클 애니메이션
const CelebrationParticles = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
    {[...Array(40)].map((_, i) => (
      <div
        key={i}
        className="absolute w-2 h-4 animate-confetti"
        style={{
          left: `${Math.random() * 100}%`,
          backgroundColor: ['#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#F472B6'][Math.floor(Math.random() * 6)],
          animationDelay: `${Math.random() * 4}s`,
          animationDuration: `${3 + Math.random() * 3}s`,
          transform: `rotate(${Math.random() * 360}deg)`,
        }}
      />
    ))}
    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes confetti {
        0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
        100% { transform: translateY(100vh) rotate(1080deg); opacity: 0; }
      }
      .animate-confetti { animation-name: confetti; animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94); animation-iteration-count: infinite; }
    `}} />
  </div>
);

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>('LOBBY');
  const [playerName, setPlayerName] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [targetNumber, setTargetNumber] = useState(0);
  const [currentGuess, setCurrentGuess] = useState('');
  const [history, setHistory] = useState<GuessRecord[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiMessage, setAiMessage] = useState('행운을 빌어요!');
  const [dbError, setDbError] = useState<string | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);

  const timerRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const bestRecord = leaderboard.length > 0 ? leaderboard[0] : null;

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('game_leaderboard')
        .select('*')
        .order('attempts', { ascending: true })
        .order('time_seconds', { ascending: true })
        .limit(10);

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('cache')) {
          setDbError("DB 설정이 필요합니다. SQL Editor에서 테이블을 생성해주세요.");
        }
        console.error("Leaderboard error:", error.message);
      } else {
        setDbError(null);
        setLeaderboard(data || []);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  };

  const startGame = () => {
    if (!playerName.trim()) {
      alert('이름을 입력해주세요!');
      return;
    }
    
    setTargetNumber(Math.floor(Math.random() * 100) + 1);
    setHistory([]);
    setCurrentGuess('');
    setElapsedTime(0);
    setIsNewRecord(false);
    setStatus('PLAYING');
    setAiMessage('도전이 시작되었습니다! 숫자를 입력하세요.');

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setElapsedTime(prev => prev + 0.1);
    }, 100);
  };

  const handleGuess = async (e: React.FormEvent) => {
    e.preventDefault();
    const guess = parseInt(currentGuess);
    if (isNaN(guess) || guess < 1 || guess > 100) {
      alert('1~100 사이의 숫자를 입력하세요.');
      return;
    }

    const currentAttemptCount = history.length + 1;
    let result: 'UP' | 'DOWN' | 'CORRECT' = 'CORRECT';
    let quickMsg = '정답입니다! 🎉';
    
    if (guess < targetNumber) {
      result = 'UP';
      quickMsg = '더 높은 숫자입니다! ⬆️';
    } else if (guess > targetNumber) {
      result = 'DOWN';
      quickMsg = '더 낮은 숫자입니다! ⬇️';
    }

    setAiMessage(quickMsg);
    const newRecord: GuessRecord = {
      value: guess,
      result,
      timestamp: new Date(),
      commentary: '...'
    };

    setHistory(prev => [newRecord, ...prev]);
    setCurrentGuess('');
    setTimeout(() => inputRef.current?.focus(), 0);

    const fetchCommentary = async () => {
      try {
        const commentary = await getGeminiCommentary(
          guess, 
          result === 'CORRECT' ? '정답' : result, 
          [...history.map(h => h.value), guess]
        );
        setHistory(prev => prev.map((item, idx) => 
          idx === 0 ? { ...item, commentary } : item
        ));
        if (result !== 'CORRECT') setAiMessage(commentary);
      } catch (err) {
        console.error("Gemini error:", err);
      }
    };
    
    fetchCommentary();
    if (result === 'CORRECT') endGame(currentAttemptCount);
  };

  const endGame = async (finalAttempts: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const finalTime = parseFloat(elapsedTime.toFixed(2));

    const isNew = !bestRecord || (finalAttempts < bestRecord.attempts) || (finalAttempts === bestRecord.attempts && finalTime < bestRecord.time_seconds);
    setIsNewRecord(isNew);
    
    setStatus('FINISHED');
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('game_leaderboard')
        .insert([{ 
          player_name: playerName, 
          attempts: finalAttempts, 
          time_seconds: finalTime 
        }]);

      if (error) console.error("Save Error:", error.message);
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      await fetchLeaderboard();
      setIsSubmitting(false);
    }
  };

  const resetToLobby = () => {
    setStatus('LOBBY');
    setPlayerName('');
    setElapsedTime(0);
    setHistory([]);
    setIsNewRecord(false);
    fetchLeaderboard();
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col font-sans bg-slate-950 relative">
      {status === 'FINISHED' && isNewRecord && <CelebrationParticles />}
      
      <div className="flex-1 px-4 py-8 flex flex-col relative z-10 overflow-y-auto">
        <header className="text-center mb-8">
          <div className="inline-block bg-blue-500 w-full h-8 mb-2 rounded shadow-lg shadow-blue-500/20"></div>
          <p className="text-slate-500 text-[10px] font-black tracking-widest uppercase">Classic Number Challenge</p>
        </header>

        {dbError && (
          <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-xl mb-6 text-red-400 text-xs text-center font-bold">
            ⚠️ {dbError}
          </div>
        )}

        {status === 'LOBBY' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="text-yellow-400">🏆</span> 최단 기록
              </h2>
              {bestRecord ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 bg-slate-800/50 p-3 rounded-lg flex justify-between items-center border border-slate-700/50">
                    <span className="text-slate-400 text-xs">레전드 도전자</span>
                    <span className="font-bold text-blue-400">{bestRecord.player_name}</span>
                  </div>
                  <StatCard label="최저 시도" value={`${bestRecord.attempts}회`} />
                  <StatCard label="최단 시간" value={`${bestRecord.time_seconds.toFixed(1)}s`} />
                </div>
              ) : (
                <div className="text-center py-4 text-slate-500 italic text-sm border-2 border-dashed border-slate-800 rounded-xl">
                  아직 기록이 없습니다.
                </div>
              )}
            </div>

            <div className="bg-slate-900/30 border border-slate-800/50 rounded-2xl overflow-hidden">
              <div className="bg-slate-800/40 px-4 py-2 border-b border-slate-800/50">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global TOP 10</h3>
              </div>
              <div className="max-h-40 overflow-y-auto">
                <table className="w-full text-[11px] text-left">
                  <tbody className="divide-y divide-slate-800/30">
                    {leaderboard.map((entry, index) => (
                      <tr key={index} className={`hover:bg-slate-800/20 ${index === 0 ? 'bg-blue-500/5' : ''}`}>
                        <td className="px-4 py-2 font-black italic text-slate-500">{index + 1}</td>
                        <td className="px-2 py-2 font-bold text-slate-300">{entry.player_name}</td>
                        <td className="px-2 py-2 text-emerald-400 font-bold">{entry.attempts}회</td>
                        <td className="px-4 py-2 text-right text-slate-500">{entry.time_seconds.toFixed(1)}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
              <label className="block text-slate-400 text-[10px] font-black uppercase mb-2 tracking-widest">도전자 이름</label>
              <form onSubmit={(e) => { e.preventDefault(); startGame(); }} className="space-y-4">
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="이름을 입력하세요"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-lg font-bold"
                />
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] text-lg uppercase tracking-wider"
                >
                  Game Start
                </button>
              </form>
            </div>
          </div>
        )}

        {status === 'PLAYING' && (
          <div className="flex-1 flex flex-col gap-4 animate-in fade-in duration-300">
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Time" value={`${elapsedTime.toFixed(1)}s`} />
              <StatCard label="Guesses" value={`${history.length + 1}회`} />
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-lg">
              <div className="absolute top-0 left-0 w-1 bg-blue-500 h-full"></div>
              <p className="text-[10px] text-blue-400 font-black uppercase mb-1 tracking-widest">Gemini Commentary</p>
              <p className="text-lg font-bold text-slate-100 italic">"{aiMessage}"</p>
            </div>

            <form onSubmit={handleGuess} className="flex gap-2">
              <input
                ref={inputRef}
                autoFocus
                type="number"
                min="1"
                max="100"
                value={currentGuess}
                onChange={(e) => setCurrentGuess(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-4 text-3xl font-black text-center text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 rounded-xl font-black transition-all active:scale-95 shadow-lg uppercase text-sm"
              >
                Guess
              </button>
            </form>

            <div className="flex-1 overflow-hidden flex flex-col bg-slate-900/40 border border-slate-800/50 rounded-2xl">
              <h3 className="p-4 text-[10px] font-black text-slate-500 uppercase border-b border-slate-800/50 tracking-widest">Recent Activity</h3>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {history.map((item, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-3 rounded-xl animate-in slide-in-from-top-2 duration-300 bg-slate-900/60 border border-slate-800/50`}>
                    <div className="flex items-center gap-4">
                      <span className={`text-2xl font-black ${item.result === 'CORRECT' ? 'text-emerald-400' : 'text-slate-300'}`}>{item.value}</span>
                      <div className="flex flex-col">
                        <span className={`text-[9px] font-black uppercase ${item.result === 'UP' ? 'text-red-400' : item.result === 'DOWN' ? 'text-blue-400' : 'text-emerald-400'}`}>
                          {item.result}
                        </span>
                        <span className="text-[11px] text-slate-400 italic leading-tight">{item.commentary}</span>
                      </div>
                    </div>
                    <span className="text-[9px] text-slate-700 font-black">#{history.length - idx}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {status === 'FINISHED' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 animate-in zoom-in duration-500">
            <div className="relative">
              {isNewRecord && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-max animate-bounce">
                  <span className="bg-yellow-400 text-slate-950 px-4 py-1.5 rounded-full font-black text-xs shadow-[0_0_20px_rgba(250,204,21,0.6)] uppercase tracking-tighter">
                    ✨ New Best Record ✨
                  </span>
                </div>
              )}
              
              <div className={`w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-emerald-500/50 ${isNewRecord ? 'animate-pulse scale-110 shadow-[0_0_40px_rgba(16,185,129,0.4)]' : ''}`}>
                <span className="text-5xl">{isNewRecord ? '🏆' : '🏅'}</span>
              </div>
              
              <h2 className={`text-4xl font-black italic uppercase tracking-tighter mb-1 ${isNewRecord ? 'text-yellow-400' : 'text-white'}`}>
                Mission Success!
              </h2>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">{playerName}님의 최종 리포트</p>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full">
              <StatCard label="Guesses" value={`${history.length}회`} />
              <StatCard label="Time" value={`${elapsedTime.toFixed(2)}s`} />
            </div>

            <button
              onClick={resetToLobby}
              className="w-full max-w-xs bg-white text-slate-950 font-black py-4 rounded-xl transition-all shadow-xl active:scale-95 hover:bg-slate-200 uppercase text-sm tracking-widest"
            >
              Back to Menu
            </button>
          </div>
        )}
      </div>

      <PacmanAnimation />

      <footer className="py-4 text-center text-[9px] text-slate-800 uppercase tracking-[0.3em] font-black shrink-0">
        AI Intelligence Service • Supabase Grid
      </footer>
    </div>
  );
};

export default App;
