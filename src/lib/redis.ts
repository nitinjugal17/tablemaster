
// src/lib/redis.ts
'use server';

import { createClient, RedisClientType } from 'redis';

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = process.env.REDIS_PORT || '6379';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

let redisClient: RedisClientType | null = null;
let redisConnectionStatus: { isConnected: boolean; message: string } | null = null;

export async function getRedisClient(): Promise<RedisClientType | null> {
    if (redisClient && redisClient.isOpen) {
        return redisClient;
    }

    try {
        const client = createClient({
            password: REDIS_PASSWORD,
            socket: {
                host: REDIS_HOST,
                port: Number(REDIS_PORT),
                connectTimeout: 5000,
            }
        });

        client.on('error', (err) => {
            console.error('[Redis] Client Error', err);
            redisConnectionStatus = { isConnected: false, message: (err as Error).message };
            redisClient = null; // Invalidate client on error
        });

        await client.connect();
        redisClient = client as RedisClientType;
        redisConnectionStatus = { isConnected: true, message: 'Successfully connected to Redis.' };
        return redisClient;
    } catch (err) {
        const errorMessage = (err as Error).message;
        console.error('[Redis] Failed to connect:', errorMessage);
        redisConnectionStatus = { isConnected: false, message: errorMessage };
        return null;
    }
}

export async function getRedisStatus(): Promise<{ isConnected: boolean; message: string }> {
    // If status has been checked before and it's a success, return it.
    // If it was a failure, we should re-attempt connection.
    if (redisConnectionStatus && redisConnectionStatus.isConnected) {
        return redisConnectionStatus;
    }

    const client = await getRedisClient();
    if (client) {
        try {
            const pong = await client.ping();
            if (pong === 'PONG') {
                 redisConnectionStatus = { isConnected: true, message: 'Successfully connected to Redis.' };
            } else {
                 redisConnectionStatus = { isConnected: false, message: 'Ping command to Redis failed.' };
            }
        } catch (e) {
             const errorMessage = (e as Error).message;
             redisConnectionStatus = { isConnected: false, message: errorMessage };
        }
    }
    return redisConnectionStatus || { isConnected: false, message: 'Redis client connection failed.' };
}


export async function checkSystemReady(): Promise<{ isReady: boolean, message: string }> {
    const status = await getRedisStatus();
    if (!status.isConnected) {
        return { isReady: false, message: `Redis connection failed: ${status.message}` };
    }
    return { isReady: true, message: 'Redis is ready.' };
}

// =================================================================
// DATA ACTIONS - TO BE IMPLEMENTED
// =================================================================
// This section is where you would implement functions to get/set 
// data for specific modules from Redis, following the pattern used
// for General Settings in `data-management-actions.ts`.
//
// Example conceptual function:
/*
export async function getUsersFromRedis(): Promise<User[]> {
    const client = await getRedisClient();
    if (!client) throw new Error("Redis client not available");
    // This is conceptual. You might use HGETALL or scan for keys.
    const userKeys = await client.keys('user:*'); 
    const users = await Promise.all(userKeys.map(key => client.hGetAll(key)));
    return users.map(user => ({...user, id: user.id})); // Needs proper type conversion
}
*/
// =================================================================

export default getRedisClient;
