import { useState, useCallback } from 'react';

export const useSpeechSynthesis = () => {
  const [speaking, setSpeaking] = useState(false);
  const supported = 'speechSynthesis' in window;

  const speak = useCallback((text: string) => {
    if (!supported) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  return {
    speak,
    supported,
    speaking,
  };
}; 