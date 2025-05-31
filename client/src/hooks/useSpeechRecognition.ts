import { useState, useEffect, useCallback } from 'react';

export const useSpeechRecognition = () => {
  const [transcript, setTranscript] = useState('');
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;
        setTranscript(transcript);
      };

      setRecognition(recognition);
      setSpeechRecognitionSupported(true);
    }
  }, []);

  const startListening = useCallback(() => {
    if (recognition) {
      recognition.start();
    }
  }, [recognition]);

  const stopListening = useCallback(() => {
    if (recognition) {
      recognition.stop();
    }
  }, [recognition]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    transcript,
    resetTranscript,
    startListening,
    stopListening,
    speechRecognitionSupported,
  };
}; 