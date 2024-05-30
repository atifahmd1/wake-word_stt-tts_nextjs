"use client";

import { useEffect, useState, useRef } from "react";
import { usePorcupine } from "@picovoice/porcupine-react";

import helloDoctorKeywordModel from "../hello_doctor";
import modelParams from "../porcupine_params";

export default function Home() {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [voiceSpeed, setVoiceSpeed] = useState(0.9);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const inactivityTimeoutRef = useRef(null);
  const interimTextRef = useRef("");
  const recognitionRef = useRef(null);

  const {
    keywordDetection,
    isLoaded,
    isListening,
    error,
    init,
    start,
    stop,
    release,
  } = usePorcupine();

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.lang = "en-US";
    recognitionInstance.interimResults = true;
    recognitionInstance.continuous = true;

    recognitionInstance.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript + " ";
        }
      }

      interimTextRef.current = interimTranscript;
      setInterimText(interimTranscript);
      setText((prevText) => prevText + finalTranscript);

      resetInactivityTimeout();
    };

    recognitionRef.current = recognitionInstance;

    const handleVoicesChanged = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      console.log(availableVoices);

      setSelectedVoice(availableVoices.find((voice) => voice.lang === "en-US"));
      console.log(selectedVoice);
    };

    window.speechSynthesis.addEventListener(
      "voiceschanged",
      handleVoicesChanged
    );

    return () => {
      window.speechSynthesis.removeEventListener(
        "voiceschanged",
        handleVoicesChanged
      );
    };
  }, []);

  useEffect(() => {
    const initEngine = async () => {
      await init(
        process.env.NEXT_PUBLIC_PICOVOICE_ACCESS_KEY,
        {
          base64: helloDoctorKeywordModel,
          label: "Hello Doctor",
        },
        { base64: modelParams }
      );
      start();
    };
    initEngine();
  }, []);

  useEffect(() => {
    if (keywordDetection && !isRecording) {
      console.log("detected keyword: " + keywordDetection.label);
      startRecord();
      setText("");
    }
  }, [keywordDetection]);

  const startRecord = () => {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.start();
      console.log("recording started");
      setIsRecording(true);
      stop();
      resetInactivityTimeout();
    }
  };

  const stopRecord = () => {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.stop();
      console.log("recording stopped");
    }
    clearInactivityTimeout();
    setIsRecording(false);
    start();
    setText((prevText) => prevText + interimTextRef.current);
    setInterimText("");
  };

  const resetInactivityTimeout = () => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }
    inactivityTimeoutRef.current = setTimeout(() => {
      stopRecord();
      console.log("Inactivity timeout triggered");
    }, 5000);
  };

  const clearInactivityTimeout = () => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
  };

  const handleTTS = () => {
    if (!isPlaying && text) {
      const speech = new SpeechSynthesisUtterance(text);
      speech.lang = "en-IN";
      speech.voice = selectedVoice;
      speech.rate = voiceSpeed;
      speech.onend = () => {
        setIsPlaying(false);
        setIsPaused(false);
      };
      window.speechSynthesis.speak(speech);
      setIsPlaying(true);
      setIsPaused(false);
    } else if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  const handlePauseResume = () => {
    if (isPlaying && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    } else if (isPlaying && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  };

  const handleVoiceChange = (event) => {
    const selectedVoice = voices.find(
      (voice) => voice.name === event.target.value
    );
    setSelectedVoice(selectedVoice);
    console.log(selectedVoice);
  };

  const handleVoiceSpeedChange = (event) => {
    setVoiceSpeed(event.target.value);
    console.log(voiceSpeed);
  };

  const toggleDarkMode = () => {
    setIsDarkMode((prevMode) => !prevMode);
  };

  return (
    <main
      className={`flex min-h-screen flex-col items-center justify-between p-24 ${
        isDarkMode ? "bg-gray-900 text-white" : "bg-white text-black"
      }`}
    >
      <div className="absolute top-4 right-4">
        <label className="flex items-center cursor-pointer">
          <span className="mr-2">Dark Mode</span>
          <input
            type="checkbox"
            className="hidden"
            checked={isDarkMode}
            onChange={toggleDarkMode}
          />
          <div
            className={`w-10 h-6 flex items-center bg-gray-300 rounded-full p-1 ${
              isDarkMode ? "bg-gray-700" : ""
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform ${
                isDarkMode ? "translate-x-4" : ""
              }`}
            ></div>
          </div>
        </label>
      </div>

      <div className="flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold underline">stt-tts</h1>
        <h3>with wake word (Hello Doctor) using PicoVoice</h3>
      </div>
      <p className="h-4/5 w-3/4 border border-black p-4 overflow-y-scroll">
        {text} {interimText}
      </p>

      <div className="mb-4 flex items-center justify-center flex-wrap gap-2">
        <button
          className="px-4 py-2 bg-red-500 text-white rounded"
          onClick={isRecording ? stopRecord : startRecord}
        >
          {isRecording ? "Stop Recording" : "Start Recording"}
        </button>
        <button
          className={`px-4 py-2 ${
            text ? "bg-blue-500" : "bg-gray-300"
          } text-white rounded`}
          onClick={handleTTS}
          disabled={!text}
        >
          {isPlaying ? "Terminate Audio" : "Play Text"}
        </button>
        <button
          className={`px-4 py-2 ${
            isPlaying ? "bg-yellow-500" : "bg-gray-300"
          } text-white rounded`}
          onClick={handlePauseResume}
          disabled={!isPlaying}
        >
          {isPaused ? "Resume Audio" : "Pause Audio"}
        </button>
      </div>

      <div className="flex items-center justify-center gap-2">
        <div className="mb-4">
          <label htmlFor="voiceSelect" className="mr-2">
            Select Voice:
          </label>
          <select
            id="voiceSelect"
            value={selectedVoice ? selectedVoice.name : ""}
            onChange={handleVoiceChange}
          >
            {voices.map((voice, index) => (
              <option key={index} value={voice.name}>
                {voice.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label htmlFor="voiceSpeed" className="mr-2">
            Voice Speed:
          </label>
          <input
            type="range"
            id="voiceSpeed"
            min="0.1"
            max="2"
            step="0.1"
            value={voiceSpeed}
            onChange={handleVoiceSpeedChange}
          />
        </div>
      </div>
    </main>
  );
}
