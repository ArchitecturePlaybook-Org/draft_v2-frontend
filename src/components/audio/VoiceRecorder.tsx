import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Trash2, Send, RotateCcw, Volume2, Globe, Check } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { INDIAN_LANGUAGES, getLanguageByCode, LanguageOption } from "@/lib/i18n/languages";
import { AudioPlayer } from "./AudioPlayer";

interface VoiceRecorderProps {
  onSendVoiceNote: (audioBlob: Blob, duration: number, transcript: string, language: string) => void;
  onCancel?: () => void;
  defaultLanguage?: string;
  isSubmitting?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onSendVoiceNote,
  onCancel,
  defaultLanguage = "en",
  isSubmitting = false,
}) => {
  const [selectedLang, setSelectedLang] = useState<LanguageOption>(() => getLanguageByCode(defaultLanguage));
  const [recordingState, setRecordingState] = useState<"idle" | "recording" | "review">("idle");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcriptText, setTranscriptText] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Speech recognition hook for concurrent speech-to-text dictation
  const {
    startListening,
    stopListening,
    resetTranscript,
    isSupported: isSpeechSupported,
  } = useSpeechRecognition({
    lang: selectedLang.locale,
    onResult: (text) => {
      setTranscriptText(text);
    },
  });

  // Timer loop
  useEffect(() => {
    if (recordingState === "recording") {
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recordingState]);

  const startRecording = async () => {
    audioChunksRef.current = [];
    setTranscriptText("");
    resetTranscript();
    setRecordingDuration(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setRecordingState("review");
      };

      mediaRecorder.start(250); // collect 250ms chunks
      setRecordingState("recording");

      // Start concurrent speech-to-text in selected regional language
      if (isSpeechSupported) {
        startListening(selectedLang.locale);
      }
    } catch (err: any) {
      console.error("Microphone access denied or error:", err);
      alert("Microphone access is required to record voice notes. Please grant microphone permission.");
      setRecordingState("idle");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState === "recording") {
      mediaRecorderRef.current.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
    stopListening();
  };

  const discardRecording = () => {
    stopRecording();
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setAudioBlob(null);
    setTranscriptText("");
    setRecordingDuration(0);
    setRecordingState("idle");
    if (onCancel) onCancel();
  };

  const handleSend = () => {
    if (!audioBlob) return;
    onSendVoiceNote(audioBlob, recordingDuration, transcriptText.trim(), selectedLang.code);
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining < 10 ? "0" : ""}${remaining}`;
  };

  return (
    <div className="flex flex-col gap-2 p-2.5 rounded-xl bg-surface-100 dark:bg-surface-850 border border-surface-300 dark:border-surface-700/80 shadow-xs transition-all">
      {/* Top Header / Language Picker */}
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className="font-bold text-foreground flex items-center gap-1.5">
          <Volume2 className="w-3.5 h-3.5 text-accent" />
          <span>Voice Note + Auto Speech-to-Text</span>
        </span>

        {/* Regional Language Selector */}
        <div className="flex items-center gap-1">
          <Globe className="w-3 h-3 text-surface-400" />
          <select
            value={selectedLang.code}
            disabled={recordingState === "recording"}
            onChange={(e) => setSelectedLang(getLanguageByCode(e.target.value))}
            className="h-6 bg-surface-50 dark:bg-surface-900 border border-surface-300 dark:border-surface-700 rounded-md px-1.5 text-[10px] font-bold text-foreground outline-none focus:border-accent appearance-none cursor-pointer"
          >
            {INDIAN_LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code} className="bg-surface-100 dark:bg-surface-900 text-foreground">
                {lang.flagEmoji} {lang.nativeName} ({lang.name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* IDLE STATE */}
      {recordingState === "idle" && (
        <div className="flex items-center justify-between p-2 rounded-lg bg-surface-50 dark:bg-surface-900 border border-dashed border-surface-300 dark:border-surface-700">
          <p className="text-[11px] font-medium text-surface-500">
            Click mic to record memo in <span className="font-bold text-accent">{selectedLang.nativeName}</span>
          </p>
          <button
            type="button"
            onClick={startRecording}
            className="h-7 px-3 rounded-lg bg-red-500 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-xs hover:bg-red-600 transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Record</span>
          </button>
        </div>
      )}

      {/* RECORDING STATE */}
      {recordingState === "recording" && (
        <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="text-xs font-black text-red-500 tabular-nums">
                Recording {formatTimer(recordingDuration)}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={discardRecording}
                className="p-1 rounded-md text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Discard recording"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={stopRecording}
                className="h-7 px-3 rounded-lg bg-red-500 hover:bg-red-600 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Done</span>
              </button>
            </div>
          </div>

          {/* Live Transcript Stream */}
          <div className="p-2 rounded-md bg-surface-50/90 dark:bg-surface-900/90 border border-surface-200 dark:border-surface-800 text-xs font-medium text-foreground min-h-[36px] max-h-20 overflow-y-auto">
            {transcriptText ? (
              <p className="italic text-foreground">"{transcriptText}"</p>
            ) : (
              <p className="text-[10px] text-surface-400 italic">Listening and transcribing in {selectedLang.nativeName}...</p>
            )}
          </div>
        </div>
      )}

      {/* REVIEW & SEND STATE */}
      {recordingState === "review" && audioUrl && (
        <div className="flex flex-col gap-2 p-2 rounded-lg bg-surface-50 dark:bg-surface-900 border border-surface-300 dark:border-surface-700 animate-in fade-in duration-200">
          {/* Audio Preview Player */}
          <AudioPlayer src={audioUrl} duration={recordingDuration} />

          {/* Editable Transcript Textarea */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[9px] font-bold text-surface-500">
              <span>Speech-to-Text Transcript ({selectedLang.name}):</span>
              <span className="text-[8px] uppercase tracking-wider opacity-80">Editable</span>
            </div>
            <textarea
              value={transcriptText}
              onChange={(e) => setTranscriptText(e.target.value)}
              placeholder="Spoken words will appear here. You can edit before sending..."
              rows={2}
              className="w-full p-2 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-xs font-medium text-foreground outline-none focus:border-accent resize-none leading-relaxed"
            />
          </div>

          {/* Review Actions: Discard, Re-record, Send */}
          <div className="flex justify-between items-center pt-1 border-t border-surface-200 dark:border-surface-800">
            <button
              type="button"
              onClick={discardRecording}
              disabled={isSubmitting}
              className="px-2.5 py-1 text-[10px] font-bold text-surface-500 hover:text-red-400 flex items-center gap-1 rounded-md transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Discard</span>
            </button>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={startRecording}
                disabled={isSubmitting}
                className="px-2.5 py-1 text-[10px] font-bold text-surface-600 dark:text-surface-300 hover:text-accent flex items-center gap-1 rounded-md bg-surface-200/60 dark:bg-surface-800 border border-surface-300 dark:border-surface-700 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Re-record</span>
              </button>

              <button
                type="button"
                onClick={handleSend}
                disabled={isSubmitting}
                className="h-7 px-3.5 bg-accent text-background font-black text-[10px] uppercase tracking-wider rounded-lg hover:opacity-90 transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-40"
              >
                {isSubmitting ? (
                  <span className="animate-spin text-xs">⟳</span>
                ) : (
                  <Send className="w-3 h-3" />
                )}
                <span>Send Voice Note</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
