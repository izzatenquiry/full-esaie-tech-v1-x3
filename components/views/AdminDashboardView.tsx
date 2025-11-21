import React from 'react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getAllUsers, updateUserStatus, replaceUsers, exportAllUserData, forceUserLogout, updateUserSubscription, saveUserPersonalAuthToken, createNewUser } from '../../services/userService';
import { type User, type UserStatus, type Language, UserRole } from '../../types';
import { UsersIcon, XIcon, DownloadIcon, UploadIcon, CheckCircleIcon, AlertTriangleIcon, VideoIcon, UserPlusIcon } from '../Icons';
import Spinner from '../common/Spinner';
import ApiHealthCheckModal from '../common/ApiHealthCheckModal';
import ConfirmationModal from '../common/ConfirmationModal';
import { getTranslations } from '../../services/translations';

const AdminDashboardView: React.FC<{ language: Language }> = ({ language }) => {
    const T = getTranslations(language).adminDashboardView;
    
    const formatStatus = useCallback((user: User): { text: string; color: 'green' | 'yellow' | 'red' | 'blue' } => {
        const statusMap = T.table;
        switch(user.status) {
            case 'admin':
                return { text: statusMap.statusAdmin, color: 'blue' };
            case 'lifetime':
                return { text: statusMap.statusLifetime, color: 'green' };
            case 'subscription':
                return { text: statusMap.statusSubscription, color: 'green' };
            case 'trial':
                return { text: statusMap.statusTrial, color: 'yellow' };
            case 'inactive':
                return { text: statusMap.statusInactive, color: 'red' };
            default:
                return { text: statusMap.statusUnknown, color: 'red' };
        }
    }, [T]);
    
    const statusColors: Record<'green' | 'yellow' | 'red' | 'blue', string> = {
        green: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        red: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        blue: 'bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-300',
    };

    const TrialCountdown: React.FC<{ expiry: number }> = ({ expiry }) => {
        const calculateRemainingTime = useCallback(() => {
            const now = Date.now();
            const timeLeft = expiry - now;

            if (timeLeft <= 0) {
                return { text: T.table.expired, color: 'red' as const };
            }

            const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
            const seconds = Math.floor((timeLeft / 1000) % 60);

            return { text: T.table.expiresIn.replace('{minutes}', String(minutes)).replace('{seconds}', String(seconds)), color: 'yellow' as const };
        }, [expiry]);
        
        const [timeInfo, setTimeInfo] = useState(calculateRemainingTime());

        useEffect(() => {
            const timer = setInterval(() => {
                setTimeInfo(calculateRemainingTime());
            }, 1000);

            return () => clearInterval(timer);
        }, [expiry, calculateRemainingTime]);

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[timeInfo.color]}`}>
                {timeInfo.text}
            </span>
        );
    };

    const getTimeAgo = (date: Date): string => {
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    const [users, setUsers] = useState<User[] | null>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [newStatus, setNewStatus] = useState<UserStatus>('trial');
    const [subscriptionDuration, setSubscriptionDuration] = useState<1 | 3 | 6 | 12>(6);
    const [personalToken, setPersonalToken] = useState<string>('');
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'loading'; message: string } | null>(null);
    const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
    const [userForHealthCheck, setUserForHealthCheck] = useState<User | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isConfirmLogoutOpen, setIsConfirmLogoutOpen] = useState(false);
    
    const [newUser, setNewUser] = useState({ fullName: '', email: '', phone: '', role: 'user' as UserRole, status: 'lifetime' as UserStatus });
    const [modalError, setModalError] = useState<string | null>(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        const allUsers = await getAllUsers();
        if (allUsers) {
            setUsers(allUsers.filter(user => user.role !== 'admin'));
        } else {
            setUsers(null);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const openEditModal = (user: User) => {
        setSelectedUser(user);
        setNewStatus(user.status);
        setPersonalToken(user.personalAuthToken || '');
        setIsEditModalOpen(true);
    };
    
    const openAddUserModal = () => {
        setNewUser({ fullName: '', email: '', phone: '', role: 'user', status: 'lifetime' });
        setModalError(null);
        setIsAddUserModalOpen(true);
    };

    const veoAuthorizedUsersCount = useMemo(() => {
        if (!users) return 0;
        return users.filter(u => u.personalAuthToken).length;
    }, [users]);
    
    const handleCreateUser = async () => {
        setModalError(null);
        setStatusMessage({ type: 'loading', message: T.addModal.creating });
        const result = await createNewUser(newUser);

        if (result.success) {
            setStatusMessage({ type: 'success', message: T.messages.userCreateSuccess.replace('{email}', newUser.email) });
            setIsAddUserModalOpen(false);
            fetchUsers();
            setTimeout(() => setStatusMessage(null), 5000);
        } else {
            const errorKey = result.messageKey as keyof typeof T.messages;
            const errorMessage = T.messages[errorKey] || result.messageKey || 'An unknown error occurred.';
            setModalError(errorMessage);
            setStatusMessage(null); // Clear main page message
        }
    };

    const handleSaveChanges = async () => {
        if (!selectedUser) return;
        setStatusMessage({ type: 'loading', message: T.messages.saving });
    
        const statusPromise = new Promise<{ success: boolean; message?: string }>(async (resolve) => {
            const isUpgradingToVeo = (newStatus === 'lifetime' || newStatus === 'subscription') &&
                                    (selectedUser.status !== 'lifetime' && selectedUser.status !== 'subscription');
    
            if (isUpgradingToVeo && veoAuthorizedUsersCount >= 4) {
                return resolve({ success: false, message: T.messages.veoLimit });
            }
    
            // Always update if the new status is subscription, to apply new duration
            if (newStatus === 'subscription') {
                const success = await updateUserSubscription(selectedUser.id, subscriptionDuration);
                return resolve({ success });
            }
            
            // Update only if status is different for other types
            if (newStatus !== selectedUser.status) {
                const success = await updateUserStatus(selectedUser.id, newStatus);
                return resolve({ success });
            }
            
            // No status change needed
            resolve({ success: true });
        });
    
        // Token update logic
        const tokenPromise = new Promise<{ success: boolean; message?: string }>(async (resolve) => {
            const currentToken = selectedUser.personalAuthToken || '';
            const newToken = personalToken.trim();
            if (newToken === currentToken) return resolve({ success: true });
    
            const result = await saveUserPersonalAuthToken(selectedUser.id, newToken || null);
            if (result.success === false) {
                resolve({ success: false, message: result.message });
            } else {
                resolve({ success: true });
            }
        });
    
        const [statusResult, tokenResult] = await Promise.all([statusPromise, tokenPromise]);
    
        const errorMessages = [];
        if (!statusResult.success) {
            errorMessages.push(statusResult.message || T.messages.statusFail);
        }
        if (tokenResult.success === false) {
            errorMessages.push(tokenResult.message || T.messages.tokenFail);
        }
    
        if (errorMessages.length > 0) {
            setStatusMessage({ type: 'error', message: errorMessages.join(' ') });
        } else {
            setStatusMessage({ type: 'success', message: T.messages.updateSuccess.replace('{username}', selectedUser.username) });
            fetchUsers();
        }
    
        setIsEditModalOpen(false);
        setSelectedUser(null);
        setTimeout(() => setStatusMessage(null), 5000);
    };
    
    const handleForceLogout = () => {
        if (!selectedUser) return;
        setIsConfirmLogoutOpen(true);
    };

    const executeForceLogout = async () => {
        if (!selectedUser) return;
        
        if (await forceUserLogout(selectedUser.id)) {
            await fetchUsers();
            setStatusMessage({ type: 'success', message: T.messages.logoutSuccess.replace('{username}', selectedUser.username) });
        } else {
             setStatusMessage({ type: 'error', message: T.messages.logoutFail });
        }
        setIsEditModalOpen(false);
        setIsConfirmLogoutOpen(false);
        setSelectedUser(null);
        setTimeout(() => setStatusMessage(null), 4000);
    };


    const handleExport = async () => {
        setStatusMessage(null);
        const usersToExport = await exportAllUserData();
        if (!usersToExport) {
            setStatusMessage({ type: 'error', message: T.messages.exportFail });
            setTimeout(() => setStatusMessage(null), 4000);
            return;
        }

        try {
            const dataStr = JSON.stringify(usersToExport, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().split('T')[0];
            link.download = `monoklix-users-backup-${timestamp}.json`;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            setStatusMessage({ type: 'success', message: T.messages.exportSuccess });
        } catch (error) {
             setStatusMessage({ type: 'error', message: 'Failed to create export file.' });
        }
        setTimeout(() => setStatusMessage(null), 4000);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        setStatusMessage(null);
        const file = event.target.files?.[0];
        if (!file) return;

        if (window.confirm(T.messages.importConfirm)) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const text = e.target?.result;
                    if (typeof text !== 'string') throw new Error(T.messages.importReadFail);
                    
                    const importedUsers = JSON.parse(text);
                    const result = await replaceUsers(importedUsers);

                    if (result.success) {
                        setStatusMessage({ type: 'success', message: result.message });
                        fetchUsers(); // Refresh the view
                    } else {
                        setStatusMessage({ type: 'error', message: result.message });
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Invalid file format.';
                    setStatusMessage({ type: 'error', message: T.messages.importError.replace('{error}', errorMessage) });
                } finally {
                     if(event.target) event.target.value = '';
                     setTimeout(() => setStatusMessage(null), 5000);
                }
            };
            reader.readAsText(file);
        } else {
            if(event.target) event.target.value = '';
        }
    };


    const filteredUsers = useMemo(() => {
        if (!users) return [];

        const filtered = users.filter(user =>
            (user.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
        );

        return filtered.sort((a, b) => {
            const now = new Date().getTime();
            const aLastSeen = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
            const bLastSeen = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;

            const aIsOnline = aLastSeen > 0 && (now - aLastSeen) < 60 * 60 * 1000;
            const bIsOnline = bLastSeen > 0 && (now - bLastSeen) < 60 * 60 * 1000;

            if (aIsOnline && !bIsOnline) return -1;
            if (!aIsOnline && bIsOnline) return 1;
            
            return bLastSeen - aLastSeen;
        });
    }, [users, searchTerm]);
    
    const activeUsersCount = useMemo(() => {
        if (!users) return 0;
        const now = new Date().getTime();
        const oneHour = 60 * 60 * 1000;
        return users.filter(user => 
            user.lastSeenAt && (now - new Date(user.lastSeenAt).getTime()) < oneHour
        ).length;
    }, [users]);

    if (loading) {
        return <div>{T.loading}</div>;
    }

    if (users === null) {
        return (
            <div className="bg-red-100 dark:bg-red-900/50 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg" role="alert">
                <strong className="font-bold">Critical Error:</strong>
                <span className="block sm:inline"> {T.fail}</span>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm">
                <h2 className="text-xl font-semibold mb-2">{T.title}</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">{T.subtitle}</p>
                
                <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                    <input
                        type="text"
                        placeholder={T.searchPlaceholder}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full max-w-sm bg-white dark:bg-neutral-800/50 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                    />
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 text-sm bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 font-semibold py-2 px-3 rounded-lg">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                            <span>{T.activeUsers.replace('{count}', String(activeUsersCount))}</span>
                        </div>
                        <div className={`flex items-center gap-2 text-sm font-semibold py-2 px-3 rounded-lg ${veoAuthorizedUsersCount >= 4 ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'}`}>
                            {veoAuthorizedUsersCount >= 4 ? <AlertTriangleIcon className="w-4 h-4" /> : <VideoIcon className="w-4 h-4" />}
                            <span>{T.veoUsers.replace('{count}', String(veoAuthorizedUsersCount))}</span>
                        </div>
                         <button onClick={() => { setUserForHealthCheck(null); setIsHealthModalOpen(true); }} className="flex items-center gap-2 text-sm bg-blue-600 text-white font-semibold py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors">
                            <CheckCircleIcon className="w-4 h-4" />
                            {T.healthSummary}
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".json" className="hidden" />
                        <button onClick={openAddUserModal} className="flex items-center gap-2 text-sm bg-primary-600 text-white font-semibold py-2 px-3 rounded-lg hover:bg-primary-700 transition-colors">
                            <UserPlusIcon className="w-4 h-4" />
                            {T.addUser}
                        </button>
                        <button onClick={handleImportClick} className="flex items-center gap-2 text-sm bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold py-2 px-3 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors">
                            <UploadIcon className="w-4 h-4" />
                            {T.import}
                        </button>
                        <button onClick={handleExport} className="flex items-center gap-2 text-sm bg-primary-600 text-white font-semibold py-2 px-3 rounded-lg hover:bg-primary-700 transition-colors">
                            <DownloadIcon className="w-4 h-4" />
                            {T.export}
                        </button>
                    </div>
                </div>

                 {statusMessage && (
                    <div className={`p-3 rounded-md mb-4 text-sm ${statusMessage.type === 'loading' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' : statusMessage.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'}`}>
                        {statusMessage.message}
                    </div>
                )}

                <div className="bg-white dark:bg-neutral-950 rounded-lg shadow-inner">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-neutral-500 dark:text-neutral-400">
                            <thead className="text-xs text-neutral-700 uppercase bg-neutral-100 dark:bg-neutral-800/50 dark:text-neutral-400">
                                <tr>
                                    <th scope="col" className="px-4 py-3">#</th>
                                    <th scope="col" className="px-6 py-3">{T.table.email}</th>
                                    <th scope="col" className="px-6 py-3">{T.table.phone}</th>
                                    <th scope="col" className="px-6 py-3">{T.table.lastLogin}</th>
                                     <th scope="col" className="px-6 py-3">{T.table.appVersion}</th>
                                    <th scope="col" className="px-6 py-3">{T.table.proxy}</th>
                                    <th scope="col" className="px-6 py-3">{T.table.token}</th>
                                    <th scope="col" className="px-6 py-3">{T.table.status}</th>
                                    <th scope="col" className="px-6 py-3">{T.table.actions}</th>
                                    <th scope="col" className="px-6 py-3">{T.table.checkApi}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.length > 0 ? (
                                    filteredUsers.map((user, index) => {
                                        const { text, color } = formatStatus(user);
                                        
                                        let activeInfo: { text: string; color: 'green' | 'gray' | 'red'; fullDate: string; } = { text: T.table.never, color: 'red', fullDate: 'N/A' };
                                        if (user.lastSeenAt) {
                                            const lastSeenDate = new Date(user.lastSeenAt);
                                            const diffMinutes = (new Date().getTime() - lastSeenDate.getTime()) / (1000 * 60);
                                            if (diffMinutes < 60) {
                                                activeInfo = { text: T.table.activeNow, color: 'green', fullDate: lastSeenDate.toLocaleString() };
                                            } else {
                                                activeInfo = { text: getTimeAgo(lastSeenDate), color: 'gray', fullDate: lastSeenDate.toLocaleString() };
                                            }
                                        }
                                        const activeStatusColors: Record<'green' | 'gray' | 'red', string> = {
                                            green: 'bg-green-500',
                                            gray: 'bg-neutral-400',
                                            red: 'bg-red-500',
                                        };

                                        return (
                                            <tr key={user.id} className="bg-white dark:bg-neutral-950 border-b dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
                                                <td className="px-4 py-4 font-medium text-neutral-600 dark:text-neutral-400">{index + 1}</td>
                                                <th scope="row" className="px-6 py-4 font-medium text-neutral-900 whitespace-nowrap dark:text-white">
                                                    <div>{user.username || '-'}</div>
                                                    <div className="text-xs text-neutral-500">{user.email || '-'}</div>
                                                </th>
                                                <td className="px-6 py-4">{user.phone || '-'}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2" title={`Last seen: ${activeInfo.fullDate}`}>
                                                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${activeStatusColors[activeInfo.color]}`}></span>
                                                        <span>{activeInfo.text}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">{user.appVersion || '-'}</td>
                                                <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-300">
                                                    {user.proxyServer ? user.proxyServer.replace('https://', '').replace('.esaie.tech', '') : '-'}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                                                    {user.personalAuthToken ? `...${user.personalAuthToken.slice(-6)}` : '-'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[color]}`}>
                                                            {text}
                                                        </span>
                                                        {user.status === 'subscription' && user.subscriptionExpiry && (
                                                            <div className="text-xs text-neutral-500 mt-1">
                                                                Expires: {new Date(user.subscriptionExpiry).toLocaleDateString()}
                                                                {Date.now() > user.subscriptionExpiry && <span className="text-red-500 font-bold"> (Expired)</span>}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button onClick={() => openEditModal(user)} className="font-medium text-primary-600 dark:text-primary-500 hover:underline">{T.table.update}</button>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                     <button onClick={() => { setUserForHealthCheck(user); setIsHealthModalOpen(true); }} className="font-medium text-blue-600 dark:text-blue-500 hover:underline" title={'Check API health'}>{T.table.check}</button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={10} className="text-center py-10">
                                            {users.length > 0 ? (
                                                <div>
                                                    <p className="mt-2 font-semibold">No users found.</p>
                                                    <p className="text-xs">No users match "{searchTerm}".</p>
                                                </div>
                                            ) : (
                                                <div>
                                                    <UsersIcon className="w-12 h-12 mx-auto text-neutral-400" />
                                                    <p className="mt-2 font-semibold">{T.noUsers}</p>
                                                    <p className="text-xs">{T.noUsersHelp}</p>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            {isEditModalOpen && selectedUser && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" aria-modal="true" role="dialog">
                    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">{T.editModal.title}</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700"><XIcon className="w-5 h-5" /></button>
                        </div>
                        <p className="mb-4 text-sm">{T.editModal.subtitle} <span className="font-semibold">{selectedUser.username}</span>.</p>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="status-select" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{T.editModal.statusLabel}</label>
                                <select id="status-select" value={newStatus} onChange={(e) => setNewStatus(e.target.value as UserStatus)} className="w-full bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none">
                                    <option value="trial">Trial</option>
                                    <option value="subscription">Subscription</option>
                                    <option value="lifetime">Lifetime</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                             <div>
                                <label htmlFor="token-input" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{T.editModal.tokenLabel}</label>
                                <input id="token-input" type="text" value={personalToken} onChange={(e) => setPersonalToken(e.target.value)} placeholder={T.editModal.tokenPlaceholder} className="w-full bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none font-mono text-xs"/>
                            </div>
                            {newStatus === 'subscription' && (
                                <div className="mt-4 p-3 bg-neutral-100 dark:bg-neutral-700/50 rounded-md">
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{T.editModal.durationLabel}</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <label className="flex items-center"><input type="radio" name="duration" value={1} checked={subscriptionDuration === 1} onChange={() => setSubscriptionDuration(1)} className="form-radio" /><span className="ml-2">{T.editModal.duration1}</span></label>
                                        <label className="flex items-center"><input type="radio" name="duration" value={3} checked={subscriptionDuration === 3} onChange={() => setSubscriptionDuration(3)} className="form-radio" /><span className="ml-2">{T.editModal.duration3}</span></label>
                                        <label className="flex items-center"><input type="radio" name="duration" value={6} checked={subscriptionDuration === 6} onChange={() => setSubscriptionDuration(6)} className="form-radio" /><span className="ml-2">{T.editModal.duration6}</span></label>
                                        <label className="flex items-center"><input type="radio" name="duration" value={12} checked={subscriptionDuration === 12} onChange={() => setSubscriptionDuration(12)} className="form-radio" /><span className="ml-2">{T.editModal.duration12}</span></label>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="mt-6 flex justify-between items-center">
                            <button onClick={handleForceLogout} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"><XIcon className="w-4 h-4" />{T.editModal.logoutButton}</button>
                            <div className="flex gap-2">
                                <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-semibold bg-neutral-200 dark:bg-neutral-600 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-500 transition-colors">{T.editModal.cancel}</button>
                                <button onClick={handleSaveChanges} className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors">{T.editModal.save}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {isAddUserModalOpen && (
                 <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" aria-modal="true" role="dialog">
                    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">{T.addModal.title}</h3>
                            <button onClick={() => setIsAddUserModalOpen(false)} className="p-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700"><XIcon className="w-5 h-5" /></button>
                        </div>
                        <p className="mb-4 text-sm">{T.addModal.subtitle}</p>
                        {modalError && <p className="text-red-500 text-sm text-center p-2 bg-red-100 rounded-md mb-4">{modalError}</p>}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{T.addModal.fullName}</label>
                                <input type="text" value={newUser.fullName} onChange={(e) => setNewUser(p => ({ ...p, fullName: e.target.value }))} className="w-full bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg p-2"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{T.addModal.email}</label>
                                <input type="email" value={newUser.email} onChange={(e) => setNewUser(p => ({ ...p, email: e.target.value }))} className="w-full bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg p-2"/>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{T.addModal.phone}</label>
                                <input type="tel" value={newUser.phone} onChange={(e) => setNewUser(p => ({ ...p, phone: e.target.value }))} className="w-full bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg p-2"/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{T.addModal.role}</label>
                                    <select value={newUser.role} onChange={(e) => setNewUser(p => ({ ...p, role: e.target.value as UserRole }))} className="w-full bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg p-2">
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{T.addModal.status}</label>
                                    <select value={newUser.status} onChange={(e) => setNewUser(p => ({ ...p, status: e.target.value as UserStatus }))} className="w-full bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg p-2">
                                        <option value="lifetime">Lifetime</option>
                                        <option value="subscription">Subscription</option>
                                        <option value="trial">Trial</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <button onClick={() => setIsAddUserModalOpen(false)} className="px-4 py-2 text-sm font-semibold bg-neutral-200 dark:bg-neutral-600 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-500">{T.addModal.cancel}</button>
                            <button onClick={handleCreateUser} className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700">{T.addModal.createUser}</button>
                        </div>
                    </div>
                </div>
            )}
            
            {isConfirmLogoutOpen && selectedUser && (
                <ConfirmationModal
                    isOpen={isConfirmLogoutOpen}
                    title={T.confirmLogout.title}
                    message={T.confirmLogout.message.replace('{username}', selectedUser.username)}
                    onConfirm={executeForceLogout}
                    onCancel={() => setIsConfirmLogoutOpen(false)}
                    confirmText={T.confirmLogout.confirm}
                    confirmButtonClass="bg-red-600 hover:bg-red-700"
                    language={language}
                />
            )}

            {isHealthModalOpen && (
                <ApiHealthCheckModal
                    isOpen={isHealthModalOpen}
                    onClose={() => {
                        setIsHealthModalOpen(false);
                        setUserForHealthCheck(null);
                    }}
                    user={userForHealthCheck}
                    language={language}
                />
            )}
        </>
    );
};

export default AdminDashboardView;