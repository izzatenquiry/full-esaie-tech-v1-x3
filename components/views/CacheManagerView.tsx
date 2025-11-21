import React, { useState, useEffect } from 'react';
import { 
  getFormattedCacheStats,
  clearVideoCache,
  getCacheStats, // Import getCacheStats to get raw size
} from '../../services/videoCacheService';
import { TrashIcon, RefreshCwIcon, DatabaseIcon } from '../Icons';
import Spinner from '../common/Spinner';
import { Language } from '../../types';
import { getTranslations } from '../../services/translations';


const MAX_CACHE_SIZE_MB = 500;

const CacheManagerView: React.FC<{ language: Language }> = ({ language }) => {
  const [stats, setStats] = useState<{
    size: string;
    count: number;
    percentage: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const T = getTranslations(language).settingsView.cache;

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const formattedStats = await getFormattedCacheStats();
      const rawStats = await getCacheStats();
      const maxSizeBytes = MAX_CACHE_SIZE_MB * 1024 * 1024;
      const percentage = maxSizeBytes > 0 ? Math.round((rawStats.totalSize / maxSizeBytes) * 100) : 0;

      setStats({ ...formattedStats, percentage });
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleClearCache = async () => {
    if (!confirm(T.confirmClear)) {
      return;
    }

    setIsClearing(true);
    try {
      await clearVideoCache();
      await loadStats();
      alert(T.clearSuccess);
    } catch (error) {
      console.error('Failed to clear cache:', error);
      alert(T.clearFail);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <DatabaseIcon className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold">{T.title}</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {T.subtitle}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner />
          </div>
        ) : stats ? (
          <div className="space-y-6">
            {/* Cache Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                  {T.storageUsed}
                </p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {stats.size}
                </p>
              </div>

              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                  {T.videosCached}
                </p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {stats.count}
                </p>
              </div>
            </div>
            
            {/* Information */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                {T.howItWorks}
              </h3>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>{T.l1}</li>
                <li>{T.l2}</li>
                <li>{T.l3}</li>
                <li>{T.l4}</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={loadStats}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold py-2 px-4 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50"
              >
                <RefreshCwIcon className="w-4 h-4" />
                {T.refresh}
              </button>

              <button
                onClick={handleClearCache}
                disabled={isClearing || stats.count === 0}
                className="flex items-center justify-center gap-2 bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isClearing ? (
                  <>
                    <Spinner />
                    {T.clearing}
                  </>
                ) : (
                  <>
                    <TrashIcon className="w-4 h-4" />
                    {T.clear}
                  </>
                )}
              </button>
            </div>

            {/* Tips */}
            <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
              <h3 className="font-semibold mb-2">{T.tips}</h3>
              <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                <li>{T.tip1}</li>
                <li>{T.tip2}</li>
                <li>{T.tip3}</li>
                <li>{T.tip4}</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-neutral-500">
            {T.failLoad}
          </div>
        )}
      </div>
    </div>
  );
};

export default CacheManagerView;
