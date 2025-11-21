import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MicIcon, DownloadIcon, AlertTriangleIcon } from '../Icons';
import { generateVoiceOver } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import TwoColumnLayout from '../common/TwoColumnLayout';
import { type Language } from '../../types';
import { handleApiError } from '../../services/errorHandler';
import { getTranslations } from '../../services/translations';

const SESSION_KEY = 'voiceStudioState';

interface VoiceStudioViewProps {
    language: Language;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        {children}
    </div>
);

export const VoiceStudioView: React.FC<VoiceStudioViewProps> = ({ language }) => {
    const T = getTranslations(language).voiceStudioView;
    const voiceActors = T.voiceActors;
    const moodOptions = T.moodOptions;
    const musicStyleOptions = T.musicStyleOptions;

    const [script, setScript] = useState('');
    const [actor, setActor] = useState(voiceActors[0].id);
    const [mood, setMood] = useState('Normal');
    const [generationMode, setGenerationMode] = useState<'speak' | 'sing'>('speak');
    const [musicStyle, setMusicStyle] = useState(musicStyleOptions[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

    const selectedActorDetails = useMemo(() => voiceActors.find(va => va.id === actor)!, [actor, voiceActors]);

    useEffect(() => {
        try {
            const savedState = sessionStorage.getItem(SESSION_KEY);
            if (savedState) {
                const state = JSON.parse(savedState);
                if (state.script) setScript(state.script);
                if (state.actor) setActor(state.actor);
                if (state.mood) setMood(state.mood);
                if (state.generationMode) setGenerationMode(state.generationMode);
                if (state.musicStyle) setMusicStyle(state.musicStyle);
            }
        } catch (e) { console.error("Failed to load state from session storage", e); }
    }, []);

    useEffect(() => {
        try {
            const stateToSave = { script, actor, mood, generationMode, musicStyle };
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(stateToSave));
        } catch (e) { console.error("Failed to save state to session storage", e); }
    }, [script, actor, mood, generationMode, musicStyle]);

    useEffect(() => {
        return () => {
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        };
    }, [audioUrl]);

    const handleGenerate = useCallback(async () => {
        if (!script.trim()) {
            setError(T.errorNoScript);
            return;
        }
        setIsLoading(true);
        setError(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setAudioBlob(null);

        try {
            const blob = await generateVoiceOver(
                script, 
                actor, 
                selectedActorDetails.language, 
                mood, 
                generationMode,
                musicStyle
            );

            if (!blob) {
                throw new Error(T.errorFailed);
            }
            
            const url = URL.createObjectURL(blob);
            setAudioUrl(url);
            setAudioBlob(blob);
            await addHistoryItem({
                type: 'Audio',
                prompt: `Voice: ${actor}, Mood: ${mood}, Script: ${script.substring(0, 50)}...`,
                result: blob,
            });
        } catch (e) {
            const userFriendlyMessage = handleApiError(e);
            setError(userFriendlyMessage);
        } finally {
            setIsLoading(false);
        }
    }, [script, actor, audioUrl, mood, generationMode, musicStyle, selectedActorDetails.language, T]);
    
    const handleReset = useCallback(() => {
        setScript('');
        setActor(voiceActors[0].id);
        setMood('Normal');
        setGenerationMode('speak');
        setMusicStyle(musicStyleOptions[0]);
        setError(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setAudioBlob(null);
        sessionStorage.removeItem(SESSION_KEY);
    }, [audioUrl, voiceActors, musicStyleOptions]);

    const leftPanel = (
        <>
            <div>
                <h1 className="text-2xl font-bold sm:text-3xl">{T.title}</h1>
                <p className="text-neutral-500 dark:text-neutral-400 mt-1">{T.subtitle}</p>
            </div>

            <Section title={T.scriptLabel}>
                <textarea
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    placeholder={T.scriptPlaceholder}
                    rows={8}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3"
                />
                 <p className="text-right text-xs text-neutral-500">{T.characterCount.replace('{count}', String(script.length))}</p>
            </Section>

            <Section title={T.actorLabel}>
                 <select value={actor} onChange={(e) => setActor(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3">
                    {voiceActors.map(va => <option key={va.id} value={va.id}>{va.name} ({va.language} {va.gender})</option>)}
                </select>
            </Section>
            
            <Section title={T.generationType}>
                <div className="flex gap-4">
                     <button onClick={() => setGenerationMode('speak')} className={`px-6 py-2 rounded-full font-semibold transition-colors text-sm ${generationMode === 'speak' ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>{T.speak}</button>
                     <button onClick={() => setGenerationMode('sing')} className={`px-6 py-2 rounded-full font-semibold transition-colors text-sm ${generationMode === 'sing' ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>{T.sing}</button>
                </div>
            </Section>

            {generationMode === 'speak' ? (
                <Section title={T.moodLabel}>
                    <select value={mood} onChange={(e) => setMood(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3">
                        {moodOptions.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </Section>
            ) : (
                <Section title={T.musicStyleLabel}>
                    <select value={musicStyle} onChange={(e) => setMusicStyle(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3">
                        {musicStyleOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </Section>
            )}
            
            <div className="pt-4 mt-auto">
                <div className="flex gap-4">
                    <button onClick={handleGenerate} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50">
                        {isLoading ? <Spinner /> : T.generateButton}
                    </button>
                    <button onClick={handleReset} disabled={isLoading} className="flex-shrink-0 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold py-3 px-4 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50">
                        {T.resetButton}
                    </button>
                </div>
                {error && <p className="text-red-500 dark:text-red-400 mt-2 text-center">{error}</p>}
            </div>
        </>
    );

    const rightPanel = (
        <>
           {isLoading ? (
               <div className="flex flex-col items-center justify-center h-full gap-4">
                   <Spinner />
                   <p className="text-neutral-500 dark:text-neutral-400">{T.status}</p>
               </div>
           ) : error ? (
                <div className="text-center p-4 text-red-500 dark:text-red-400">
                    <AlertTriangleIcon className="w-12 h-12 mx-auto mb-2"/>
                   <p className="font-semibold">Oh no!</p>
                   <p className="text-sm">{error}</p>
               </div>
           ) : audioUrl ? (
               <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-4">
                   <audio src={audioUrl} controls autoPlay className="w-full max-w-md rounded-lg"/>
                   {audioBlob && (
                        <a 
                           href={audioUrl} 
                           download={`esaie-tech-voiceover-${Date.now()}.wav`}
                           className="flex items-center gap-2 bg-green-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-green-700 transition-colors mt-4"
                       >
                           <DownloadIcon className="w-4 h-4"/> {T.download}
                       </a>
                   )}
               </div>
           ) : (
               <div className="text-center text-neutral-500 dark:text-neutral-600">
                   <MicIcon className="w-16 h-16 mx-auto" />
                   <p>{T.outputPlaceholder}</p>
               </div>
           )}
       </>
   );

    return <TwoColumnLayout leftPanel={leftPanel} rightPanel={rightPanel} language={language} />;
};