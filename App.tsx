import React, { useState, useEffect, useCallback, useRef } from 'react';
import { type View, type User, type BatchProcessorPreset, type Language, UserStatus } from './types';
import Sidebar from './components/Sidebar';
import AiTextSuiteView from './components/views/AiTextSuiteView';
import AiImageSuiteView from './components/views/AiImageSuiteView';
import AiVideoSuiteView from './components/views/AiVideoSuiteView';
import ECourseView from './components/views/ECourseView';
import SettingsView from './components/views/SettingsView';
import LoginPage from './LoginPage';
import GalleryView from './components/views/GalleryView';
import WelcomeAnimation from './components/WelcomeAnimation';
import LibraryView from './components/views/LibraryView';
import { MenuIcon, XIcon, SunIcon, MoonIcon, CheckCircleIcon, AlertTriangleIcon, PartyPopperIcon, RefreshCwIcon, UsersIcon, ServerIcon, ShieldCheckIcon, TerminalIcon } from './components/Icons';
import { signOutUser, logActivity, getVeoAuthTokens, getSharedMasterApiKey, updateUserLastSeen, assignPersonalTokenAndIncrementUsage, saveUserPersonalAuthToken, getServerUsageCounts, updateUserProxyServer, updateTokenStatusToExpired } from './services/userService';
import { createChatSession, streamChatResponse } from './services/geminiService';
import Spinner from './components/common/Spinner';
import { loadData, saveData } from './services/indexedDBService';
import { type Chat } from '@google/genai';
import { getSupportPrompt } from './services/promptManager';
import { triggerUserWebhook } from './services/webhookService';
import { GetStartedView } from './components/views/GetStartedView';
import AiPromptLibrarySuiteView from './components/views/AiPromptLibrarySuiteView';
import eventBus from './services/eventBus';
import ApiKeyStatus from './components/ApiKeyStatus';
import { clearLogs } from './services/aiLogService';
import { clearVideoCache } from './services/videoCacheService';
import localforage from 'localforage';
import { supabase, type Database } from './services/supabaseClient';
import { handleApiError } from './services/errorHandler';
import { runComprehensiveTokenTest } from './services/imagenV3Service';
import ConsoleLogSidebar from './components/ConsoleLogSidebar';
import { getTranslations } from './services/translations';
import { Logo } from './components/Logo';

// ... interfaces ...
interface VideoGenPreset {
  prompt: string;
  image: { base64: string; mimeType: string; };
}

interface ImageEditPreset {
  base64: string;
  mimeType: string;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

// ... subcomponents ...
const ThemeSwitcher: React.FC<{ theme: string; setTheme: (theme: string) => void, language: Language }> = ({ theme, setTheme, language }) => {
    const T = getTranslations(language).common;
    return (
    <button
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        aria-label={T.switchTheme}
    >
        {theme === 'light' ? (
            <MoonIcon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
        ) : (
            <SunIcon className="w-5 h-5 text-yellow-500" />
        )}
    </button>
)};

const NotificationBanner: React.FC<{ message: string; onDismiss: () => void, language: Language }> = ({ message, onDismiss, language }) => {
    const T = getTranslations(language).common;
    return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 w-full max-w-md z-50 p-4">
        <div className="bg-yellow-100 dark:bg-yellow-900/50 border-l-4 border-yellow-500 text-yellow-800 dark:text-yellow-200 p-4 rounded-r-lg shadow-lg flex items-start gap-3 animate-zoomIn">
            <AlertTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
                <p className="font-bold">{T.attention}</p>
                <p className="text-sm">{message}</p>
            </div>
            <button onClick={onDismiss} className="p-1 rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-800">
                <XIcon className="w-4 h-4" />
            </button>
        </div>
    </div>
)};

type AssigningStatus = 'scanning' | 'assigning' | 'success' | 'error';
interface AssigningTokenModalProps {
  status: AssigningStatus;
  error: string | null;
  scanProgress: { current: number; total: number };
  onRetry: () => void;
  language: Language;
}

const AssigningTokenModal: React.FC<AssigningTokenModalProps> = ({ status, error, scanProgress, onRetry, language }) => {
    const T = getTranslations(language).assigningTokenModal;
    
    const statusInfo = {
        scanning: {
            icon: <Spinner />,
            title: T.scanningTitle,
            message: scanProgress.total > 0
                ? T.scanningMessage.replace('{current}', String(scanProgress.current)).replace('{total}', String(scanProgress.total))
                : T.scanningMessageDefault,
        },
        assigning: {
            icon: <Spinner />,
            title: T.assigningTitle,
            message: T.assigningMessage,
        },
        success: {
            icon: <ShieldCheckIcon className="w-12 h-12 text-green-500 mx-auto" />,
            title: T.successTitle,
            message: T.successMessage,
        },
        error: {
            icon: <AlertTriangleIcon className="w-12 h-12 text-red-500 mx-auto" />,
            title: T.errorTitle,
            message: error || T.errorMessageDefault,
        },
    };

    const currentStatusInfo = statusInfo[status];

    return (
        <div className="fixed inset-0 bg-black/70 flex flex-col items-center justify-center z-50 p-4 animate-zoomIn" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl p-8 text-center max-w-sm w-full">
                {currentStatusInfo.icon}
                <h2 className="text-xl font-bold mt-4 text-neutral-800 dark:text-neutral-100">{currentStatusInfo.title}</h2>
                <p className="text-neutral-500 dark:text-neutral-400 mt-2 text-sm">
                    {currentStatusInfo.message}
                </p>
                {status === 'error' && (
                    <button onClick={onRetry} className="mt-6 w-full bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors">
                        {T.retryButton}
                    </button>
                )}
            </div>
        </div>
    );
};

const SERVERS = [
    'https://s1.esaie.tech',
    'https://s2.esaie.tech',
    'https://s3.esaie.tech',
    'https://s4.esaie.tech',
    'https://s5.esaie.tech'
];

const ServerSelectionModal: React.FC<{ onSelect: (serverUrl: string) => void, currentUser: User, language: Language }> = ({ onSelect, currentUser, language }) => {
    const T = getTranslations(language).serverSelectionModal;
    const [selectedServer, setSelectedServer] = useState<string | null>(null);
    const [serverCounts, setServerCounts] = useState<Record<string, number | 'loading'>>({});

    useEffect(() => {
        const fetchCounts = async () => {
            setServerCounts(SERVERS.reduce((acc, server) => ({...acc, [server]: 'loading'}), {}));
            const counts = await getServerUsageCounts();
            setServerCounts(counts);
        };
        fetchCounts();
    }, []);

    const handleSelect = () => {
        if (selectedServer) {
            onSelect(selectedServer);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-4 animate-zoomIn" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl p-8 text-left max-w-lg w-full">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary-100 dark:bg-primary-900/50 rounded-full">
                        <ServerIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">{T.title}</h2>
                        <p className="text-neutral-500 dark:text-neutral-400 mt-1 text-sm">
                            {T.subtitle}
                        </p>
                    </div>
                </div>

                <div className="mt-6 space-y-3">
                    {SERVERS.map((server, index) => {
                        const count = serverCounts[server];
                        const serverName = `${T.server} ${index + 1}`;
                        const userCount = typeof count === 'number' ? count : 0;
                        
                        let colorClasses = 'bg-green-500';
                        let textColor = 'text-green-700 dark:text-green-300';
                        if (userCount > 25) {
                            colorClasses = 'bg-yellow-500';
                            textColor = 'text-yellow-700 dark:text-yellow-300';
                        }
                        if (userCount > 40) {
                            colorClasses = 'bg-red-500';
                            textColor = 'text-red-700 dark:text-red-300';
                        }
                        
                        return (
                             <label key={server} className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${selectedServer === server ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md' : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 hover:border-primary-400'}`}>
                                <input
                                    type="radio"
                                    name="server-selection"
                                    value={server}
                                    checked={selectedServer === server}
                                    onChange={() => setSelectedServer(server)}
                                    className="sr-only"
                                />
                                <div className="flex items-center gap-3">
                                    <span className="relative flex h-3 w-3">
                                        {count !== 'loading' && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colorClasses} opacity-75`}></span>}
                                        <span className={`relative inline-flex rounded-full h-3 w-3 ${colorClasses}`}></span>
                                    </span>
                                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">{serverName}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                                    <UsersIcon className="w-4 h-4" />
                                    {count === 'loading' ? <Spinner /> : (
                                        <span className={`font-bold text-base ${textColor}`}>
                                            {count || 0} <span className="text-xs text-neutral-400">/ 50</span>
                                        </span>
                                    )}
                                </div>
                            </label>
                        )
                    })}
                </div>

                <button 
                    onClick={handleSelect} 
                    disabled={!selectedServer}
                    className="mt-6 w-full bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {T.confirmButton}
                </button>
            </div>
        </div>
    );
};

// ... Main App component ...
const App: React.FC = () => {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeApiKey, setActiveApiKey] = useState<string | null>(null);
  const [isApiKeyLoading, setIsApiKeyLoading] = useState(true);
  const [activeView, setActiveView] = useState<View>('ai-text-suite');
  const [theme, setTheme] = useState('light');
  const language: Language = 'en';
  const [videoGenPreset, setVideoGenPreset] = useState<VideoGenPreset | null>(null);
  const [imageToReEdit, setImageToReEdit] = useState<ImageEditPreset | null>(null);
  const [imageGenPresetPrompt, setImageGenPresetPrompt] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLogSidebarOpen, setIsLogSidebarOpen] = useState(false);
  const [isShowingWelcome, setIsShowingWelcome] = useState(false);
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  const [veoTokenRefreshedAt, setVeoTokenRefreshedAt] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showServerSelectionModal, setShowServerSelectionModal] = useState(false);
  const isAssigningTokenRef = useRef(false);
  const [assigningStatus, setAssigningStatus] = useState<AssigningStatus>('scanning');
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });
  const [autoAssignError, setAutoAssignError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  
  const T = getTranslations(language).app;

  const handleUserUpdate = useCallback((updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
  }, []);

  const handleLogout = useCallback(async () => {
    await signOutUser();
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('esaie_tech_session_api_key');
    sessionStorage.removeItem('session_started_at');
    sessionStorage.removeItem('selectedProxyServer');
    setCurrentUser(null);
    setActiveApiKey(null);
    setActiveView('ai-text-suite');
  }, []);

  const handleClearCacheAndRefresh = () => {
    if (window.confirm(T.clearCacheConfirm)) {
        try {
            sessionStorage.clear();
            localStorage.clear();
            window.location.reload();
        } catch (error) {
            console.error("Failed to refresh session:", error);
            alert(T.clearCacheError);
        }
    }
  };

  useEffect(() => {
    const loadSettings = async () => {
        const savedTheme = await loadData<string>('theme');
        if (savedTheme) setTheme(savedTheme);
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveData('theme', theme);
  }, [theme]);
  
  useEffect(() => {
    const handleUserUsageUpdate = (updatedUser: User) => {
      handleUserUpdate(updatedUser);
    };
    eventBus.on('userUsageUpdated', handleUserUsageUpdate);
    return () => {
      eventBus.remove('userUsageUpdated', handleUserUsageUpdate);
    };
  }, [handleUserUpdate]);
  
  useEffect(() => {
    try {
        const savedUserJson = localStorage.getItem('currentUser');
        if (savedUserJson) {
            const user = JSON.parse(savedUserJson);
            setCurrentUser(user);
            sessionStorage.setItem('session_started_at', new Date().toISOString());
        }
    } catch (error) {
        localStorage.removeItem('currentUser');
    }
    setSessionChecked(true);
  }, []);

  useEffect(() => {
    const handlePersonalTokenFailure = async () => {
      if (currentUser && currentUser.personalAuthToken) {
        setNotification(T.tokenRefreshed);
        const result = await saveUserPersonalAuthToken(currentUser.id, null);
        if (result.success) {
          handleUserUpdate(result.user);
        }
        setTimeout(() => setNotification(null), 8000);
      }
    };
    eventBus.on('personalTokenFailed', handlePersonalTokenFailure);
    return () => {
      eventBus.remove('personalTokenFailed', handlePersonalTokenFailure);
    };
  }, [currentUser, handleUserUpdate, T.tokenRefreshed]);

  useEffect(() => {
    const initializeSessionData = async () => {
      if (!currentUser?.id) {
        setActiveApiKey(null);
        sessionStorage.removeItem('esaie_tech_session_api_key');
        sessionStorage.removeItem('veoAuthTokens');
        sessionStorage.removeItem('veoAuthToken');
        sessionStorage.removeItem('veoAuthTokenCreatedAt');
        setIsApiKeyLoading(false);
        return;
      }

      setIsApiKeyLoading(true);
      try {
        const [masterKey, tokensData] = await Promise.all([
          getSharedMasterApiKey(),
          getVeoAuthTokens(),
        ]);

        if (masterKey) {
          sessionStorage.setItem('esaie_tech_session_api_key', masterKey);
          setActiveApiKey(masterKey);
        } else {
          setActiveApiKey(null);
        }

        if (tokensData && tokensData.length > 0) {
          sessionStorage.setItem('veoAuthTokens', JSON.stringify(tokensData));
          sessionStorage.setItem('veoAuthToken', tokensData[0].token);
          sessionStorage.setItem('veoAuthTokenCreatedAt', tokensData[0].createdAt);
          setVeoTokenRefreshedAt(new Date().toISOString());
        } else {
          sessionStorage.removeItem('veoAuthTokens');
          sessionStorage.removeItem('veoAuthToken');
          sessionStorage.removeItem('veoAuthTokenCreatedAt');
        }

      } catch (error) {
        console.error("Error initializing session data:", error);
        setActiveApiKey(null);
      } finally {
        setIsApiKeyLoading(false);
      }
    };

    initializeSessionData();
  }, [currentUser?.id]);


  useEffect(() => {
    if (justLoggedIn) {
        setIsShowingWelcome(true);
        setJustLoggedIn(false);
    }
  }, [justLoggedIn]);
  
    useEffect(() => {
        if (currentUser?.id) {
            updateUserLastSeen(currentUser.id);
            const heartbeatInterval = setInterval(() => {
                updateUserLastSeen(currentUser!.id);
            }, 30000);
            return () => clearInterval(heartbeatInterval);
        }
    }, [currentUser?.id]);

    useEffect(() => {
        if (!currentUser?.id) return;
        const channel = supabase
            .channel(`user-session-channel-${currentUser.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'users',
                    filter: `id=eq.${currentUser.id}`,
                },
                (payload) => {
                    const newUserData = payload.new as Database['public']['Tables']['users']['Row'];
                    const forceLogoutAt = newUserData.force_logout_at;
                    
                    if (forceLogoutAt) {
                        const sessionStartedAt = sessionStorage.getItem('session_started_at');
                        if (sessionStartedAt && new Date(forceLogoutAt) > new Date(sessionStartedAt)) {
                            alert(T.sessionTerminated);
                            handleLogout();
                        }
                    }
                }
            )
            .subscribe();
        
        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser?.id, handleLogout, T.sessionTerminated]);

    const assignTokenProcess = useCallback(async (): Promise<{ success: boolean; error: string | null; }> => {
        if (!currentUser || isAssigningTokenRef.current) {
            return { success: false, error: "Process is already running or user is not available." };
        }
        
        isAssigningTokenRef.current = true;
        setAssigningStatus('scanning');
        
        const tokensJSON = sessionStorage.getItem('veoAuthTokens');
        if (!tokensJSON) {
            const errorMsg = "System could not find any available connection tokens. Please contact the admin.";
            isAssigningTokenRef.current = false;
            setAssigningStatus('error');
            return { success: false, error: errorMsg };
        }
        
        let tokenAssigned = false;
        let finalError: string | null = "All connection slots are currently full. Please try again in a moment or contact the admin.";

        try {
            const sharedTokens: { token: string; createdAt: string }[] = JSON.parse(tokensJSON);
            setScanProgress({ current: 0, total: sharedTokens.length });
            
            for (let i = sharedTokens.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [sharedTokens[i], sharedTokens[j]] = [sharedTokens[j], sharedTokens[i]];
            }

            for (const [index, tokenData] of sharedTokens.entries()) {
                setScanProgress({ current: index + 1, total: sharedTokens.length });
                const results = await runComprehensiveTokenTest(tokenData.token);
                const isImagenOk = results.find(r => r.service === 'Imagen')?.success;
                const isVeoOk = results.find(r => r.service === 'Veo')?.success;

                if (isImagenOk && isVeoOk) {
                    setAssigningStatus('assigning');
                    const assignResult = await assignPersonalTokenAndIncrementUsage(currentUser.id, tokenData.token);

                    if (assignResult.success === false) {
                        setAssigningStatus('scanning');
                        if (assignResult.message === 'DB_SCHEMA_MISSING_COLUMN_personal_auth_token' && currentUser.role === 'admin') {
                            finalError = "Database schema is outdated.";
                            break;
                        }
                    } else {
                        handleUserUpdate(assignResult.user);
                        tokenAssigned = true;
                        finalError = null;
                        setAssigningStatus('success');
                        break;
                    }
                }
            }

        } catch (error) {
            finalError = "An unexpected error occurred during assignment. Please try again.";
        } finally {
            isAssigningTokenRef.current = false;
        }
        
        if (!tokenAssigned) {
            setAssigningStatus('error');
        }

        return { success: tokenAssigned, error: finalError };
    }, [currentUser, handleUserUpdate]);
    
    const retryAssignment = useCallback(async () => {
        setAssigningStatus('scanning');
        setAutoAssignError(null);
        setScanProgress({ current: 0, total: 0 });
        const result = await assignTokenProcess();
        if (result.success) {
            setTimeout(() => {
                setShowAssignModal(false);
                setJustLoggedIn(true);
            }, 1500);
        } else if (result.error) {
            setAutoAssignError(result.error);
        }
    }, [assignTokenProcess]);

  const handleLoginSuccess = async (user: User) => {
    handleUserUpdate(user);
    logActivity('login');
    sessionStorage.setItem('session_started_at', new Date().toISOString());
    
    if (window.location.hostname === 'localhost') {
        if (user && !user.personalAuthToken) {
            setShowAssignModal(true);
            setAssigningStatus('scanning');
            setAutoAssignError(null);
            setScanProgress({ current: 0, total: 0 });
            const result = await assignTokenProcess();
            if (result.success) {
                setTimeout(() => {
                  setShowAssignModal(false);
                  setJustLoggedIn(true); 
                }, 1500);
            } else {
                setAutoAssignError(result.error);
            }
        } else {
            setJustLoggedIn(true);
        }
    } else {
        setShowServerSelectionModal(true);
    }
  };

  const handleCreateVideoFromImage = (preset: VideoGenPreset) => {
    setVideoGenPreset(preset);
    setActiveView('ai-video-suite');
  };

  const handleReEditImage = (preset: ImageEditPreset) => {
    setImageToReEdit(preset);
    setActiveView('ai-image-suite');
  };

  const handleUsePromptInGenerator = (prompt: string) => {
    setImageGenPresetPrompt(prompt);
    setActiveView('ai-image-suite');
  };

  const renderView = () => {
    switch (activeView) {
      case 'home':
        return <ECourseView currentUser={currentUser!} language={language} />;
      case 'get-started':
        return <GetStartedView language={language} />;
      case 'ai-text-suite':
        return <AiTextSuiteView currentUser={currentUser!} language={language} />;
      case 'ai-image-suite':
        return <AiImageSuiteView 
                  onCreateVideo={handleCreateVideoFromImage} 
                  onReEdit={handleReEditImage}
                  imageToReEdit={imageToReEdit}
                  clearReEdit={() => setImageToReEdit(null)}
                  presetPrompt={imageGenPresetPrompt}
                  clearPresetPrompt={() => setImageGenPresetPrompt(null)}
                  currentUser={currentUser!}
                  onUserUpdate={handleUserUpdate}
                  language={language}
                />;
      case 'ai-video-suite':
        return <AiVideoSuiteView 
                  currentUser={currentUser!}
                  preset={videoGenPreset} 
                  clearPreset={() => setVideoGenPreset(null)}
                  onCreateVideo={handleCreateVideoFromImage}
                  onReEdit={handleReEditImage}
                  onUserUpdate={handleUserUpdate}
                  language={language}
                />;
      case 'ai-prompt-library-suite':
          return <AiPromptLibrarySuiteView onUsePrompt={handleUsePromptInGenerator} language={language} />;
      case 'gallery':
        return <GalleryView onCreateVideo={handleCreateVideoFromImage} onReEdit={handleReEditImage} language={language} />;
      case 'settings':
          return <SettingsView 
                    currentUser={currentUser!} 
                    tempApiKey={null}
                    onUserUpdate={handleUserUpdate} 
                    language={language}
                    veoTokenRefreshedAt={veoTokenRefreshedAt}
                    assignTokenProcess={assignTokenProcess}
                 />;
      default:
        return <AiTextSuiteView currentUser={currentUser!} language={language} />;
    }
  };
  
  if (!sessionChecked || (currentUser && isApiKeyLoading)) {
      return (
          <div className="flex items-center justify-center min-h-screen bg-neutral-100 dark:bg-neutral-900">
              <Spinner />
          </div>
      );
  }

  if (isShowingWelcome) {
    return <WelcomeAnimation onAnimationEnd={() => {
        setIsShowingWelcome(false);
        setActiveView('ai-text-suite');
    }} language={language} />;
  }
  
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} language={language} />;
  }

  let isBlocked = false;
  let blockMessage = { title: T.accessDenied, body: "" };

  const isSubscriptionActive = currentUser.status === 'subscription' && currentUser.subscriptionExpiry && Date.now() < currentUser.subscriptionExpiry;

  if (currentUser.status === 'admin' || currentUser.status === 'lifetime' || isSubscriptionActive || currentUser.status === 'trial') {
    isBlocked = false;
  } 
  else if (currentUser.status === 'subscription' && !isSubscriptionActive) {
      isBlocked = true;
      blockMessage = { title: T.subscriptionExpired, body: T.subscriptionExpiredMessage };
  }
  else {
      isBlocked = true;
      blockMessage = { title: T.accessDenied, body: T.accountStatusBlocked.replace('{status}', currentUser.status) };
  }


  const renderBlockMessageBody = (body: string) => {
        if (!body.includes('[BUTTON]')) {
            return <p className="mt-2 text-neutral-600 dark:text-neutral-300 whitespace-pre-line">{body}</p>;
        }

        const buttonRegex = /\[BUTTON\](.*?)\[URL\](.*)/;
        const buttonMatch = body.match(buttonRegex);

        if (!buttonMatch || typeof buttonMatch.index === 'undefined') {
            return <p className="mt-2 text-neutral-600 dark:text-neutral-300 whitespace-pre-line">{body}</p>;
        }
        
        const beforeText = body.substring(0, buttonMatch.index);
        const buttonText = buttonMatch[1];
        const buttonUrl = buttonMatch[2];
        const afterText = body.substring(buttonMatch.index + buttonMatch[0].length);

        return (
            <div className="mt-4 text-neutral-600 dark:text-neutral-300 space-y-4">
                <p className="whitespace-pre-line text-sm">{beforeText.trim()}</p>
                <a
                    href={buttonUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-primary-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-primary-700 transition-colors shadow-md text-base"
                >
                    {buttonText}
                </a>
                <p className="whitespace-pre-line text-sm">{afterText.trim()}</p>
            </div>
        );
    };

  const PageContent = isBlocked ? (
    <div className="flex items-center justify-center h-full p-4">
      <div className="text-center p-8 sm:p-12 max-w-lg bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/50">
          <XIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
        </div>
        <h2 className="mt-5 text-xl font-bold text-neutral-800 dark:text-white sm:text-2xl">{blockMessage.title}</h2>
        {renderBlockMessageBody(blockMessage.body)}
      </div>
    </div>
  ) : renderView();

  return (
    <div className="flex h-screen bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 font-sans">
      {showServerSelectionModal && (
        <ServerSelectionModal
          currentUser={currentUser!}
          language={language}
          onSelect={async (serverUrl) => {
            sessionStorage.setItem('selectedProxyServer', serverUrl);
            updateUserProxyServer(currentUser!.id, serverUrl);
            setShowServerSelectionModal(false);
            
            if (currentUser && !currentUser.personalAuthToken) {
                setShowAssignModal(true);
                setAssigningStatus('scanning');
                setAutoAssignError(null);
                setScanProgress({ current: 0, total: 0 });
                const result = await assignTokenProcess();
                if (result.success) {
                    setTimeout(() => {
                      setShowAssignModal(false);
                      setJustLoggedIn(true); 
                    }, 1500);
                } else {
                    setAutoAssignError(result.error);
                }
            } else {
                setJustLoggedIn(true);
            }
          }}
        />
      )}
      {showAssignModal && <AssigningTokenModal status={assigningStatus} error={autoAssignError} onRetry={retryAssignment} scanProgress={scanProgress} language={language} />}
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        onLogout={handleLogout} 
        currentUser={currentUser}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        language={language}
      />
      <main className="flex-1 flex flex-col overflow-y-auto min-w-0">
        <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 sticky top-0 z-20">
            <div className="flex items-center gap-4">
                <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500" aria-label={T.openMenu}>
                    <MenuIcon className="w-6 h-6" />
                </button>
                <div className="lg:hidden">
                   <Logo className="w-24" />
                </div>
            </div>
            <div className="flex items-center gap-3">
                 <ApiKeyStatus 
                    activeApiKey={activeApiKey} 
                    currentUser={currentUser!} 
                    assignTokenProcess={assignTokenProcess}
                    onUserUpdate={handleUserUpdate}
                    onOpenChangeServerModal={() => setShowServerSelectionModal(true)}
                    language={language}
                    veoTokenRefreshedAt={veoTokenRefreshedAt}
                />
                <button onClick={() => setIsLogSidebarOpen(!isLogSidebarOpen)} className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500" title={T.openConsole}>
                    <TerminalIcon className="w-5 h-5" />
                </button>
                <ThemeSwitcher theme={theme} setTheme={setTheme} language={language} />
                <button onClick={handleClearCacheAndRefresh} className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500" title={T.refreshSessionTooltip}>
                    <RefreshCwIcon className="w-5 h-5" />
                </button>
            </div>
        </header>

        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {notification && <NotificationBanner message={notification} onDismiss={() => setNotification(null)} language={language} />}
            {PageContent}
        </div>
      </main>
      <ConsoleLogSidebar isOpen={isLogSidebarOpen} onClose={() => setIsLogSidebarOpen(false)} language={language} />
    </div>
  );
};

export default App;