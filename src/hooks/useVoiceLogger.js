import { useState, useRef } from "react";
import { parseVoiceCommand } from "../utils/voiceParser";

export function useVoiceLogger(habits, onLog) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState(null); // { success, message }
  const recognitionRef = useRef(null);

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setResult({
        success: false,
        message: "Voice not supported on this browser",
      });
      return;
    }

    // Clear previous result
    setResult(null);
    setTranscript("");

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);

    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript.toLowerCase();
      setTranscript(text);

      const parsed = parseVoiceCommand(text, habits);
      if (parsed) {
        onLog(parsed);
        setResult({ success: true, message: `Got it! ${parsed.feedback}` });
      } else {
        setResult({ success: false, message: "Didn't catch that. Try again?" });
      }
    };

    recognition.onerror = (e) => {
      setListening(false);
      if (e.error === "no-speech") {
        setResult({
          success: false,
          message: "No speech detected. Try again?",
        });
      } else if (e.error !== "aborted") {
        setResult({ success: false, message: `Mic error: ${e.error}` });
      }
    };

    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  return { startListening, stopListening, listening, transcript, result };
}
