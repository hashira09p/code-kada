"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { getFocusPolicy, getUserFocusPolicy } from "@/lib/actions/shield.actions";

interface FocusEnforcementProps {
  isActive: boolean;
  isStrictMode: boolean;
  classId?: string;
  userId?: string;
  onViolation?: () => void;
}

export function useFocusEnforcement({ isActive, isStrictMode, classId, userId, onViolation }: FocusEnforcementProps) {
  const [isTabFocused, setIsTabFocused] = useState(true);

  useEffect(() => {
    const notifyExtension = async () => {
      // Default distraction list for general focus (e.g. Teacher's own Pomodoro)
      let domains: string[] = ["facebook.com", "youtube.com", "tiktok.com", "instagram.com", "twitter.com"]; 
      
      if (classId) {
        const policy = await getFocusPolicy(classId);
        if (policy && policy.domains.length > 0) {
          domains = policy.domains.filter(d => d.trim() !== "");
        }
      } else if (userId) {
        // For Teacher's personal Pomodoro, use all their class policies combined
        const policy = await getUserFocusPolicy(userId);
        if (policy && policy.domains.length > 0) {
          domains = policy.domains.filter(d => d.trim() !== "");
        }
      }

      // Notify the Chrome Extension (if installed)
      // Shield (blurring) should ONLY be active if both the timer is running AND strict mode is ON
      // Shield (blurring) should ONLY be active if both the timer is running AND strict mode is ON
      window.postMessage({
        type: "FOCUSFORGE_TIMER_STATE",
        active: isActive && isStrictMode,
        domains: domains
      }, "*");
    };

    notifyExtension();

    if (!isActive || !isStrictMode) {
      setIsTabFocused(true);
      return;
    }

    const handleBlur = () => {
      setIsTabFocused(false);
      
      Swal.fire({
        title: "Focus Interrupted!",
        text: "You've left the focus zone. Return immediately to maintain your streak!",
        icon: "warning",
        confirmButtonText: "I'm Back",
        confirmButtonColor: "var(--color-secondary)",
        background: "var(--color-card)",
        color: "var(--color-primary)",
        allowOutsideClick: false,
        backdrop: `rgba(15, 23, 42, 0.9) blur(10px)`
      }).then((result) => {
        if (result.isConfirmed) {
          setIsTabFocused(true);
        }
      });

      if (onViolation) onViolation();
    };

    const handleFocus = () => {
      // Logic for when they return if needed
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      
      // Cleanup: Notify extension that focus is inactive when leaving the page
      window.postMessage({
        type: "FOCUSFORGE_TIMER_STATE",
        active: false,
        domains: []
      }, "*");
    };
  }, [isActive, isStrictMode, onViolation]);

  return { isTabFocused };
}
