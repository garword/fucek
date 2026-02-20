
import prisma from '@/lib/prisma';

/**
 * Get system configuration value by key.
 * Prioritizes Database value > Environment Variable > Default Value (optional).
 */
export async function getSystemConfig(key: string, fallbackEnv?: string): Promise<string | undefined> {
    try {
        // 1. Try DB first
        const config = await prisma.systemConfig.findUnique({
            where: { key }
        });

        if (config?.value) {
            return config.value;
        }
    } catch (error) {
        console.warn(`[Config] Failed to fetch config '${key}' from DB, falling back to ENV.`);
    }

    // 2. Fallback to Env
    if (fallbackEnv && process.env[fallbackEnv]) {
        return process.env[fallbackEnv];
    }

    return undefined;
}

/**
 * Set or update system configuration.
 */
export async function setSystemConfig(key: string, value: string, isSecret = false, description?: string) {
    return await prisma.systemConfig.upsert({
        where: { key },
        update: { value, isSecret, description },
        create: { key, value, isSecret, description }
    });
}
