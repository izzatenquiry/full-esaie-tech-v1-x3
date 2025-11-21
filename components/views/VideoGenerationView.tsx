import React, { useState, useCallback, useEffect } from 'react';
import { generateVideo } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import { DownloadIcon, TrashIcon, StarIcon, AlertTriangleIcon, RefreshCwIcon } from '../Icons';
import TwoColumnLayout from '../common/TwoColumnLayout';
import ImageUpload from '../common/ImageUpload';
import { MODELS } from '../../services/aiConfig';
import { addLogEntry } from '../../services/aiLogService';
import { triggerUserWebhook } from '../../services/webhookService';
import { handleApiError } from '../../services/errorHandler';
// FIX: Add missing Language import.
import { type User, type Language } from '../../types';
import { incrementVideoUsage } from '../../services/userService';
import { getTranslations } from '../../services/translations';


interface ImageData {
  base64: string;
  mimeType: string;
}

interface VideoGenPreset {
  prompt: string;
  image: { base64: string; mimeType: string; };
}

interface VideoGenerationViewProps {
  preset: VideoGenPreset | null;
  clearPreset: () => void;
  currentUser: User;
  onUserUpdate: (user: User) => void;
  // FIX: Add language to props.
  language: Language;
}

const SESSION_KEY = 'videoGenerationState';

const VideoGenerationView: React.FC<VideoGenerationViewProps> = ({ preset, clearPreset, currentUser, onUserUpdate, language }) => {
  const T = getTranslations(language).videoGenerationView;
  
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [dialogue, setDialogue] = useState('');
  const [dialogueAudio, setDialogueAudio] = useState('');
  
  // Creative Direction State
  const [style, setStyle] = useState(T.styleOptions[0]);
  const [lighting, setLighting] = useState(T.lightingOptions[0]);
  const [camera, setCamera] = useState(T.cameraOptions[0]);
  const [composition, setComposition] = useState(T.compositionOptions[0]);
  const [lensType, setLensType] = useState(T.lensTypeOptions[0]);
  const [filmSim, setFilmSim] = useState(T.filmSimOptions[0]);
  const [effect, setEffect] = useState(T.effectOptions[0]);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFilename, setVideoFilename] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [referenceImage, setReferenceImage] = useState<ImageData | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resolution, setResolution] = useState("720p");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [imageUploadKey, setImageUploadKey] = useState(Date.now());
  const [voiceoverLanguage, setVoiceoverLanguage] = useState('English');
  const [voiceoverMood, setVoiceoverMood] = useState('Normal');

  const model = MODELS.videoGenerationDefault;
  const isVeo3 = model.startsWith('veo-3');

  useEffect(() => {
    try {
        const savedState = sessionStorage.getItem(SESSION_KEY);
        if (savedState) {
            const state = JSON.parse(savedState);
            Object.keys(state).forEach(key => {
                if (key === 'prompt') setPrompt(state[key]);
                if (key === 'negativePrompt') setNegativePrompt(state[key]);
                if (key === 'dialogue') setDialogue(state[key]);
                if (key === 'dialogueAudio') setDialogueAudio(state[key]);
                if (key === 'style') setStyle(state[key]);
                if (key === 'lighting') setLighting(state[key]);
                if (key === 'camera') setCamera(state[key]);
                if (key === 'composition') setComposition(state[key]);
                if (key === 'lensType') setLensType(state[key]);
                if (key === 'filmSim') setFilmSim(state[key]);
                if (key === 'effect') setEffect(state[key]);
                if (key === 'referenceImage') setReferenceImage(state[key]);
                if (key === 'previewUrl') setPreviewUrl(state[key]);
                if (key === 'resolution') setResolution(state[key]);
                if (key === 'aspectRatio') setAspectRatio(state[key]);
                if (key === 'voiceoverLanguage') setVoiceoverLanguage(state[key]);
                if (key === 'voiceoverMood') setVoiceoverMood(state[key]);
            });
        }
    } catch (e) { console.error("Failed to load state from session storage", e); }
  }, []);
  
  useEffect(() => {
    try {
        const stateToSave = {
            prompt, negativePrompt, dialogue, dialogueAudio,
            style, lighting, camera, composition, lensType, filmSim, effect,
            resolution, aspectRatio, voiceoverLanguage, voiceoverMood
            // Excluded: referenceImage, previewUrl
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(stateToSave));
    } catch (e) { console.error("Failed to save state to session storage", e); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    prompt, negativePrompt, dialogue, dialogueAudio,
    style, lighting, camera, composition, lensType, filmSim, effect,
    resolution, aspectRatio, voiceoverLanguage, voiceoverMood
  ]);

  const loadingMessages = T.loadingMessages;

  useEffect(() => {
      let interval: ReturnType<typeof setInterval> | null = null;
      if (isLoading) {
        interval = setInterval(() => {
          setLoadingMessageIndex(prev => (prev + 1) % loadingMessages.length);
        }, 3000);
      }
      return () => {
        if (interval) clearInterval(interval);
      };
  }, [isLoading, loadingMessages.length]);

  useEffect(() => {
      if (preset) {
          const sceneText = preset.prompt;
          let voiceover = '';
          let caption = '';
          let visualDescription = sceneText;

          const voiceoverRegex = /\*\*(?:Voiceover|Skrip Suara Latar):\*\*\s*([\s\S]*?)(?=\n\*\*|$)/i;
          const voiceoverMatch = sceneText.match(voiceoverRegex);
          if (voiceoverMatch) {
              voiceover = voiceoverMatch[1].trim().replace(/"/g, "'");
              visualDescription = visualDescription.replace(voiceoverRegex, '');
          }

          const captionRegex = /\*\*(?:Captions?|Kapsyen):\*\*([\s\S]*?)(?=\n\*\*|$)/i;
          const captionMatch = sceneText.match(captionRegex);
          if (captionMatch) {
              caption = captionMatch[1].trim().replace(/"/g, "'");
              visualDescription = visualDescription.replace(captionRegex, '');
          }

          visualDescription = visualDescription.replace(/\*\*(.*?):\*\*/g, '').replace(/[\*\-]/g, '').replace(/\s+/g, ' ').trim();

          setPrompt(visualDescription);
          setDialogueAudio(voiceover);
          setDialogue(caption);
          setReferenceImage(preset.image);
          setPreviewUrl(`data:${preset.image.mimeType};base64,${preset.image.base64}`);
          
          clearPreset();
          window.scrollTo(0, 0);
      }
  }, [preset, clearPreset]);

  // Cleanup blob URLs to prevent memory leaks
  useEffect(() => {
      const urlToClean = videoUrl;
      return () => {
          if (urlToClean && urlToClean.startsWith('blob:')) {
              URL.revokeObjectURL(urlToClean);
          }
      };
  }, [videoUrl]);

  const handleImageUpload = useCallback((base64: string, mimeType: string, file: File) => {
      setReferenceImage({ base64, mimeType });
      const reader = new FileReader();
      reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
  }, []);

  const handleGenerate = useCallback(async () => {
      if (!prompt.trim() && !referenceImage) {
          setError(T.errorNoPrompt);
          return;
      }

      alert(T.voAlert);

      setIsLoading(true);
      setError(null);
      setVideoUrl(null);
      setVideoFilename(null);
      setThumbnailUrl(null);
      setStatusMessage(T.statusPreparing);
      
      const isMalay = voiceoverLanguage === 'Malay';
      let targetLanguage = voiceoverLanguage;
      if (isMalay) {
          targetLanguage = 'Malaysian Malay';
      } else if (voiceoverLanguage === 'Chinese') {
          targetLanguage = 'Mandarin Chinese';
      }
  
      let dynamicNegativePrompt = 'subtitles, text, words, watermark, logo, Indonesian language, Indonesian accent, Indonesian voiceover';
      if (targetLanguage === 'Malaysian Malay') {
          dynamicNegativePrompt += ', English, Chinese, English accent, Chinese accent';
      } else if (targetLanguage === 'English') {
          dynamicNegativePrompt += ', Malaysian Malay, Chinese, Malay accent, Chinese accent';
      } else if (targetLanguage === 'Mandarin Chinese') {
          dynamicNegativePrompt += ', Malaysian Malay, English, Malay accent, English accent';
      }
      if (negativePrompt.trim()) {
          dynamicNegativePrompt += `, ${negativePrompt.trim()}`;
      }
      
      const promptLines: string[] = [];
      
      promptLines.push('🎯 SYSTEM RULES:');
      if (isMalay) {
          promptLines.push('Spoken language and voiceover MUST be 100% in Malaysian Malay. This is the MOST IMPORTANT instruction.');
          promptLines.push('❌ Do not use other languages or foreign accents.');
      } else {
          promptLines.push(`Spoken language and voiceover MUST be 100% in ${targetLanguage}. This is the MOST IMPORTANT instruction.`);
          promptLines.push('❌ Do not use other languages or foreign accents.');
      }
      promptLines.push('\n---');
  
      promptLines.push('🎬 VISUAL (SCENE DESCRIPTION):');
      if (referenceImage) {
          promptLines.push('Animate the provided image.');
          promptLines.push(`IMPORTANT INSTRUCTION: The main subject in the video must be a photorealistic and highly accurate representation of the person in the provided reference image. Maintain their facial features and identity precisely.`);
      }
      promptLines.push(prompt.trim());
      promptLines.push('\n---');
  
      promptLines.push('🎨 CREATIVE STYLE:');
      if (style !== 'Random') promptLines.push(`• Artistic style: ${style}`);
      if (lighting !== 'Random') promptLines.push(`• Lighting: ${lighting}`);
      if (camera !== 'Random') promptLines.push(`• Camera: ${camera}`);
      if (composition !== 'Random') promptLines.push(`• Composition: ${composition}`);
      if (lensType !== 'Random') promptLines.push(`• Lens Type: ${lensType}`);
      if (filmSim !== 'Random') promptLines.push(`• Film Simulation: ${filmSim}`);
      if (effect !== 'None' && effect !== 'Random') promptLines.push(`• Additional Effect: ${effect}`);
      promptLines.push('\n---');
  
      if (dialogueAudio.trim() && isVeo3) {
          promptLines.push('🔊 AUDIO (DIALOGUE):');
          promptLines.push(`Use only the following dialogue in ${targetLanguage}:`);
          promptLines.push(`"${dialogueAudio.trim()}"`);
          promptLines.push('CRITICAL INSTRUCTION: Speak this script completely, word for word. Do not change or shorten the sentences.');
          promptLines.push(`Voice tone: ${voiceoverMood}.`);
          promptLines.push('\n---');
      }
  
      promptLines.push('🚫 ADDITIONAL REMINDERS:');
      if (dialogue.trim()) {
          promptLines.push(`• Display this exact on-screen text: "${dialogue.trim()}".`);
      } else {
          promptLines.push('• Do not include any on-screen text, captions, or subtitles.');
      }
      promptLines.push('• Do not change the language.');
      
      const fullPrompt = promptLines.join('\n');

      try {
          const image = referenceImage ? { imageBytes: referenceImage.base64, mimeType: referenceImage.mimeType } : undefined;
          
          const { videoFile, thumbnailUrl: newThumbnailUrl } = await generateVideo(fullPrompt, model, aspectRatio, resolution, dynamicNegativePrompt, image, setStatusMessage);

          if (videoFile) {
              const objectUrl = URL.createObjectURL(videoFile);
              console.log('✅ Video file received and object URL created:', objectUrl);
              setVideoUrl(objectUrl);
              setVideoFilename(videoFile.name);
              setThumbnailUrl(newThumbnailUrl);
              
              // Clone the blob before passing it to the history service to prevent race conditions
              // where IndexedDB write operation interferes with the blob used by the object URL.
              const blobForHistory = videoFile.slice();

              addHistoryItem({
                  type: 'Video',
                  prompt: `Video Generation: ${prompt.trim().substring(0, 100)}...`,
                  result: blobForHistory,
              }).then(async () => {
                  const updateResult = await incrementVideoUsage(currentUser);
                  if (updateResult.success && updateResult.user) {
                      onUserUpdate(updateResult.user);
                  }
              }).catch(err => {
                  console.error("Failed to save video to history:", err);
                  setError("Video generated but failed to save to gallery. Please download it now.");
              });
          }
      } catch (e) {
          const userFriendlyMessage = handleApiError(e);
          setError(userFriendlyMessage);
      } finally {
          setIsLoading(false);
          setStatusMessage('');
      }
  }, [prompt, style, lighting, camera, composition, lensType, filmSim, effect, dialogue, dialogueAudio, isVeo3, referenceImage, model, aspectRatio, resolution, negativePrompt, voiceoverLanguage, voiceoverMood, currentUser, onUserUpdate, T.errorNoPrompt, T.voAlert]);

  const handleDownloadVideo = async () => {
    if (!videoUrl || !videoFilename) return;
    setIsDownloading(true);
    try {
        const link = document.createElement('a');
        link.href = videoUrl;
        link.download = videoFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error("Download error:", error);
        setError(error instanceof Error ? error.message : "Failed to download video.");
    } finally {
        setIsDownloading(false);
    }
  };

  const removeReferenceImage = () => {
      setReferenceImage(null);
      setPreviewUrl(null);
      setImageUploadKey(Date.now());
  };

  const handleReset = useCallback(() => {
    setPrompt('');
    setNegativePrompt('');
    setDialogue('');
    setDialogueAudio('');
    
    setStyle(T.styleOptions[0]);
    setLighting(T.lightingOptions[0]);
    setCamera(T.cameraOptions[0]);
    setComposition(T.compositionOptions[0]);
    setLensType(T.lensTypeOptions[0]);
    setFilmSim(T.filmSimOptions[0]);
    setEffect(T.effectOptions[0]);
    
    setVideoUrl(null);
    setVideoFilename(null);
    setThumbnailUrl(null);
    setError(null);
    setReferenceImage(null);
    setPreviewUrl(null);
    setResolution("720p");
    setAspectRatio("9:16");
    setVoiceoverLanguage('English');
    setVoiceoverMood('Normal');
    setImageUploadKey(Date.now());
    setStatusMessage('');
    sessionStorage.removeItem(SESSION_KEY);
  }, [T]);

  const leftPanel = (
    <>
        <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{T.title}</h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">{T.subtitle}</p>
        </div>
        
        <div>
            <h2 className="text-lg font-semibold mb-2">{T.modelAndFormat}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                     <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{T.aspectRatio}</label>
                     <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition">
                        {["9:16", "16:9", "1:1", "4:3", "3:4"].map(ar => <option key={ar} value={ar}>{ar}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{T.resolution}</label>
                    <select value={resolution} onChange={(e) => setResolution(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition">
                        {["720p", "1080p"].map(res => <option key={res} value={res}>{res}</option>)}
                    </select>
                </div>
            </div>
        </div>

        <div>
            <h2 className="text-lg font-semibold mb-2">{T.referenceImage}</h2>
            {previewUrl ? (
                 <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                    <img src={previewUrl} alt="Reference Preview" className="w-full h-full object-contain bg-neutral-100 dark:bg-neutral-800" />
                    <button onClick={removeReferenceImage} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <ImageUpload id="video-ref-upload" key={imageUploadKey} onImageUpload={handleImageUpload} title={T.uploadStart} language={language}/>
            )}
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 p-2 bg-neutral-100 dark:bg-neutral-800/50 rounded-md">
                {T.referenceHelp}
            </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">{T.mainPrompt}</h2>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={T.mainPromptPlaceholder} rows={5} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition" />
        </div>
        
        <div>
            <h2 className="text-lg font-semibold mb-2">{T.creativeDirection}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">{T.artisticStyle}</label><select value={style} onChange={e => setStyle(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">{T.styleOptions.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1">{T.lighting}</label><select value={lighting} onChange={e => setLighting(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">{T.lightingOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1">{T.cameraShot}</label><select value={camera} onChange={e => setCamera(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">{T.cameraOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1">{T.composition}</label><select value={composition} onChange={e => setComposition(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">{T.compositionOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1">{T.lensType}</label><select value={lensType} onChange={e => setLensType(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">{T.lensTypeOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1">{T.filmSim}</label><select value={filmSim} onChange={e => setFilmSim(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">{T.filmSimOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">{T.visualEffect}</label><select value={effect} onChange={e => setEffect(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">{T.effectOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">{T.negativePrompt}</label><textarea value={negativePrompt} onChange={e => setNegativePrompt(e.target.value)} placeholder={T.negativePromptPlaceholder} rows={1} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none" /></div>
            </div>
        </div>

        <div>
            <h2 className="text-lg font-semibold mb-2">{T.dialogueAndText}</h2>
            <div className="space-y-4">
                <div>
                    <label htmlFor="on-screen-text" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{T.onScreenText}</label>
                    <textarea id="on-screen-text" value={dialogue} onChange={e => setDialogue(e.target.value)} placeholder={T.onScreenTextPlaceholder} rows={2} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                        <label htmlFor="spoken-dialogue" className={`block text-sm font-medium mb-1 ${!isVeo3 ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>{T.spokenDialogue}</label>
                        <div className={`relative ${!isVeo3 ? 'opacity-50' : ''}`}>
                            <textarea
                                id="spoken-dialogue"
                                value={dialogueAudio}
                                onChange={e => setDialogueAudio(e.target.value)}
                                placeholder={T.spokenDialoguePlaceholder}
                                rows={2}
                                className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition disabled:cursor-not-allowed"
                                disabled={!isVeo3}
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="voiceover-language" className={`block text-sm font-medium mb-1 ${!isVeo3 ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>{T.voiceoverLanguage}</label>
                        <select
                            id="voiceover-language"
                            value={voiceoverLanguage}
                            onChange={(e) => setVoiceoverLanguage(e.target.value)}
                            disabled={!isVeo3}
                            className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {T.languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="voiceover-mood" className={`block text-sm font-medium mb-1 ${!isVeo3 ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>{T.voiceoverMood}</label>
                        <select
                            id="voiceover-mood"
                            value={voiceoverMood}
                            onChange={(e) => setVoiceoverMood(e.target.value)}
                            disabled={!isVeo3}
                            className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {T.moodOptions.map(mood => <option key={mood} value={mood}>{mood}</option>)}
                        </select>
                    </div>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 p-2 bg-neutral-100 dark:bg-neutral-800/50 rounded-md" dangerouslySetInnerHTML={{ __html: T.voiceoverHelp }}/>
            </div>
        </div>
        
        <div className="pt-4 mt-auto">
            <div className="flex gap-4">
                <button onClick={handleGenerate} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {isLoading ? <Spinner /> : T.generateButton}
                </button>
                <button
                    onClick={handleReset}
                    disabled={isLoading}
                    className="flex-shrink-0 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold py-3 px-4 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50"
                >
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
              <div className="flex flex-col items-center justify-center h-full gap-2">
                  <Spinner />
                  <p className="mt-4 text-neutral-500 dark:text-neutral-400">{statusMessage || T.generating}</p>
                  <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">{loadingMessages[loadingMessageIndex]}</p>
              </div>
          ) : error && !videoUrl ? ( // Only show error if there's no video to display
               <div className="text-center text-red-500 dark:text-red-400 p-4">
                   <AlertTriangleIcon className="w-12 h-12 mx-auto mb-4" />
                   <p className="font-semibold">{T.generationFailed}</p>
                   <p className="text-sm mt-2 max-w-md mx-auto">{error}</p>
                   <button
                       onClick={handleGenerate}
                       className="mt-6 flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-700 mx-auto"
                   >
                       <RefreshCwIcon className="w-4 h-4" />
                       {T.tryAgain}
                   </button>
              </div>
          ) : videoUrl ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                  <video 
                      key={videoUrl}
                      src={videoUrl}
                      poster={thumbnailUrl || undefined}
                      controls 
                      autoPlay 
                      playsInline
                      muted
                      className="max-h-full max-w-full rounded-md"
                  >
                      {T.unsupportedBrowser}
                  </video>
                  
                  {error && <p className="text-red-500 dark:text-red-400 text-center text-sm">{error}</p>}

                  <button
                    onClick={handleDownloadVideo}
                    disabled={isDownloading}
                    className="flex items-center justify-center gap-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold py-2 px-4 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50"
                  >
                    {isDownloading ? <Spinner /> : <DownloadIcon className="w-4 h-4" />}
                    {isDownloading ? T.downloading : T.downloadButton}
                  </button>
              </div>
          ) : (
              <div className="text-center text-neutral-500 dark:text-neutral-600">
                  <StarIcon className="w-16 h-16 mx-auto" />
                  <p>{T.outputPlaceholder}</p>
              </div>
          )}
      </>
  );

  return <TwoColumnLayout leftPanel={leftPanel} rightPanel={rightPanel} language={language} />;
};

export default VideoGenerationView;
