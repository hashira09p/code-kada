"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Settings2, 
  Coffee, 
  Brain, 
  Trophy,
  Volume2,
  VolumeX,
  FastForward
} from "lucide-react";
import { completeSession } from "@/lib/actions/session.actions";
import Swal from "sweetalert2";
import PomodoroSettingsModal from "./PomodoroSettingsModal";
import { useFocusEnforcement } from "@/hooks/useFocusEnforcement";
import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";

interface PomodoroTimerProps {
  userId: string;
  classId?: string;
}

type Mode = "focus" | "short" | "long";

const MODE_CONFIG = {
  focus: {
    label: "Focus Time",
    color: "indigo",
    icon: Brain,
    duration: 25 * 60,
    gradient: "from-indigo-500 to-blue-600",
    shadow: "shadow-indigo-500/20",
  },
  short: {
    label: "Short Break",
    color: "teal",
    icon: Coffee,
    duration: 5 * 60,
    gradient: "from-teal-400 to-emerald-500",
    shadow: "shadow-teal-500/20",
  },
  long: {
    label: "Long Break",
    color: "purple",
    icon: Trophy,
    duration: 15 * 60,
    gradient: "from-purple-500 to-pink-600",
    shadow: "shadow-purple-500/20",
  },
};

export default function PomodoroTimer({ userId, classId }: PomodoroTimerProps) {
  const [mode, setMode] = useState<Mode>("focus");
  const [durations, setDurations] = useState({ focus: 25, short: 5, long: 15 });
  const [timeLeft, setLeft] = useState(durations.focus * 60);
  const [isActive, setIsActive] = useState(false);
  const [isStrictMode, setIsStrictMode] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Focus Enforcement (Strict Mode)
  useFocusEnforcement({
    isActive: isActive && mode === "focus",
    isStrictMode: isStrictMode,
    classId: classId,
  });

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
    audioRef.current.volume = 0.5;
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const playSound = useCallback(() => {
    if (!isMuted && audioRef.current) {
      audioRef.current.currentTime = 0; // Reset to start
      audioRef.current.play().catch(e => console.log("Audio play blocked", e));
    }
  }, [isMuted]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = useCallback(() => {
    setIsActive(false);
    setLeft(durations[mode] * 60);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [mode, durations]);

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setLeft(durations[newMode] * 60);
    setIsActive(false);
  };

  const handleSessionComplete = useCallback(async () => {
    playSound();
    setIsActive(false);
    
    // Notify extension that timer is finished
    window.dispatchEvent(new CustomEvent("FOCUSFORGE_TIMER_FINISHED"));
    
    if (mode === "focus") {
      setSessionsCompleted(prev => prev + 1);
      
      // Award XP for completing a focus session
      const xpEarned = durations.focus * 2; // 2 XP per minute
      
      const result = await completeSession({
        userId,
        durationMinutes: durations.focus,
        xpEarned,
        status: "COMPLETED"
      });

      if (result.success) {
        Swal.fire({
          title: "Focus Session Complete!",
          text: `You earned ${xpEarned} XP!`,
          icon: "success",
          toast: true,
          position: "top-end",
          timer: 3000,
          showConfirmButton: false,
          background: "rgba(30, 41, 59, 0.95)",
          color: "#fff"
        });
      }

      // Auto-switch to break
      if ((sessionsCompleted + 1) % 4 === 0) {
        switchMode("long");
      } else {
        switchMode("short");
      }
    } else {
      switchMode("focus");
      setIsActive(true); // Auto-start focus after break finishes
    }
  }, [mode, sessionsCompleted, userId, playSound, durations.focus]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleSessionComplete();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, handleSessionComplete]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleSaveSettings = (newSettings: typeof durations) => {
    setDurations(newSettings);
    setLeft(newSettings[mode] * 60);
    setIsActive(false);
  };

  const progress = 1 - timeLeft / (durations[mode] * 60);
  const ActiveIcon = MODE_CONFIG[mode].icon;

  return (
    <div className="w-full max-w-xl mx-auto px-4">
      {/* Strict Mode Toggle & Mode Selector Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <button
          onClick={() => setIsStrictMode(!isStrictMode)}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${
            isStrictMode 
              ? "bg-secondary text-white shadow-lg shadow-secondary/20" 
              : "bg-muted text-muted-foreground hover:bg-muted-foreground/10"
          }`}
        >
          {isStrictMode ? <ShieldCheck size={14} className="animate-pulse" /> : <Shield size={14} />}
          {isStrictMode ? "Strict Mode" : "Standard"}
        </button>

        <div className="flex justify-center gap-2 p-1.5 bg-muted/30 backdrop-blur-md rounded-2xl border border-border shadow-inner">
          {(["focus", "short", "long"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                mode === m 
                  ? `bg-gradient-to-br ${MODE_CONFIG[m].gradient} text-white shadow-lg ${MODE_CONFIG[m].shadow}`
                  : "text-muted-foreground hover:text-foreground hover:bg-white/10"
              }`}
            >
              {MODE_CONFIG[m].label}
            </button>
          ))}
        </div>
      </div>

      {/* Timer Display */}
      <div className="relative group">
        <div className={`absolute -inset-0.5 bg-gradient-to-br ${MODE_CONFIG[mode].gradient} rounded-[3rem] blur-2xl opacity-10 group-hover:opacity-20 transition-opacity duration-500`} />
        
        <div className="relative bg-card/80 backdrop-blur-2xl border border-border rounded-[2.5rem] p-10 flex flex-col items-center shadow-xl">
          {/* Progress Circle SVG */}
          <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="50%"
                cy="50%"
                r="45%"
                className="stroke-muted fill-none"
                strokeWidth="8"
              />
              <motion.circle
                cx="50%"
                cy="50%"
                r="45%"
                className={`fill-none stroke-current text-transparent bg-clip-border`}
                strokeWidth="8"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: progress }}
                transition={{ duration: 0.5, ease: "linear" }}
                style={{
                  stroke: `url(#gradient-${mode})`,
                }}
              />
              <defs>
                <linearGradient id={`gradient-focus`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
                <linearGradient id={`gradient-short`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#14b8a6" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
                <linearGradient id={`gradient-long`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.div
                key={mode}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mb-2"
              >
                <ActiveIcon className={`w-8 h-8 text-primary opacity-60`} />
              </motion.div>
              <motion.span 
                className="text-6xl md:text-7xl font-black tracking-tighter tabular-nums bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent"
                initial={{ scale: 0.9 }}
                animate={{ scale: isActive ? [1, 1.02, 1] : 1 }}
                transition={{ repeat: isActive ? Infinity : 0, duration: 2 }}
              >
                {formatTime(timeLeft)}
              </motion.span>
              <span className="text-sm font-semibold tracking-widest uppercase text-muted-foreground mt-2">
                {isActive ? "Flowing..." : "Paused"}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-6 mt-10">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-3 rounded-full bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleTimer}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 ${
                isActive 
                  ? "bg-muted text-foreground border border-border" 
                  : `bg-gradient-to-br ${MODE_CONFIG[mode].gradient} text-white shadow-2xl ${MODE_CONFIG[mode].shadow}`
              }`}
            >
              {isActive ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
            </motion.button>

            <button
              onClick={resetTimer}
              className="p-3 rounded-full bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Reset"
            >
              <RotateCcw size={20} />
            </button>
          </div>

          {/* Quick Stats */}
          <div className="mt-12 w-full grid grid-cols-2 gap-4">
            <div className="bg-muted/30 border border-border rounded-2xl p-4 flex flex-col items-center justify-center">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">Sessions</span>
              <span className="text-xl font-bold text-foreground">{sessionsCompleted}</span>
            </div>
            <div className="bg-muted/30 border border-border rounded-2xl p-4 flex flex-col items-center justify-center">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">Daily XP</span>
              <span className="text-xl font-bold text-primary">+{sessionsCompleted * 50}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings / Extra info */}
      <div className="mt-8 flex justify-between items-center px-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-muted-foreground font-medium">Focus Protection Active</span>
        </div>
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings2 size={14} />
          Settings
        </button>
      </div>

      <PomodoroSettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={durations}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
