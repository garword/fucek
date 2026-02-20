import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), '.cache');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

export interface CacheEntry<T> {
    data: T;
    cachedAt: string;
    expiresAt: string;
}

/**
 * Get cached data if exists and not expired
 * @param key Cache key (unique identifier)
 * @param expiryMinutes Cache expiry time in minutes
 * @returns Cached data or null if expired/not found
 */
export function getCachedData<T>(key: string, expiryMinutes: number): T | null {
    try {
        const cachePath = path.join(CACHE_DIR, `${key}.json`);

        if (!fs.existsSync(cachePath)) {
            console.log(`[Cache] Miss: ${key} (not found)`);
            return null;
        }

        const fileContent = fs.readFileSync(cachePath, 'utf-8');
        const cacheEntry: CacheEntry<T> = JSON.parse(fileContent);

        const now = new Date();
        const expiresAt = new Date(cacheEntry.expiresAt);

        if (now > expiresAt) {
            console.log(`[Cache] Miss: ${key} (expired at ${cacheEntry.expiresAt})`);
            // Delete expired cache
            fs.unlinkSync(cachePath);
            return null;
        }

        console.log(`[Cache] Hit: ${key} (expires at ${cacheEntry.expiresAt})`);
        return cacheEntry.data;

    } catch (error) {
        console.error(`[Cache] Error reading ${key}:`, error);
        return null;
    }
}

/**
 * Store data in cache with expiry time
 * @param key Cache key
 * @param data Data to cache
 * @param expiryMinutes Cache expiry time in minutes
 */
export function setCachedData<T>(key: string, data: T, expiryMinutes: number): void {
    try {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + expiryMinutes * 60 * 1000);

        const cacheEntry: CacheEntry<T> = {
            data,
            cachedAt: now.toISOString(),
            expiresAt: expiresAt.toISOString()
        };

        const cachePath = path.join(CACHE_DIR, `${key}.json`);
        fs.writeFileSync(cachePath, JSON.stringify(cacheEntry, null, 2));

        console.log(`[Cache] Set: ${key} (expires at ${expiresAt.toISOString()})`);
    } catch (error) {
        console.error(`[Cache] Error writing ${key}:`, error);
    }
}

/**
 * Clear specific cache by key
 */
export function clearCache(key: string): void {
    try {
        const cachePath = path.join(CACHE_DIR, `${key}.json`);
        if (fs.existsSync(cachePath)) {
            fs.unlinkSync(cachePath);
            console.log(`[Cache] Cleared: ${key}`);
        }
    } catch (error) {
        console.error(`[Cache] Error clearing ${key}:`, error);
    }
}

/**
 * Clear all cache files
 */
export function clearAllCache(): void {
    try {
        const files = fs.readdirSync(CACHE_DIR);
        files.forEach(file => {
            fs.unlinkSync(path.join(CACHE_DIR, file));
        });
        console.log(`[Cache] Cleared all cache (${files.length} files)`);
    } catch (error) {
        console.error('[Cache] Error clearing all cache:', error);
    }
}
