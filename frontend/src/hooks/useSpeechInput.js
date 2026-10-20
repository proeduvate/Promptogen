import { useEffect, useRef, useState } from "react";

const Recognition = typeof window !== "undefined" ? window.SpeechRecognition ?? window.webkitSpeechRecognition : undefined;

/* Browser speech-to-text for the composer (spec §2 voice input).
   `onText` receives each final transcript chunk. Unsupported browsers get
   `supported: false` so the button can explain why it's disabled. */
export default function useSpeechInput(onText) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const onTextRef = useRef(onText);
  useEffect(() => {
    onTextRef.current = onText;
  });

  useEffect(() => () => recognitionRef.current?.abort(), []);

  const start = () => {
    if (!Recognition || listening) return;
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        if (event.results[i].isFinal) onTextRef.current(event.results[i][0].transcript.trim());
      }
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const stop = () => recognitionRef.current?.stop();

  return { supported: Boolean(Recognition), listening, start, stop, toggle: () => (listening ? stop() : start()) };
}
