
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
// Ensure this key is 32 bytes. In production, use env var.
// For now, derive from a fixed secret or env (and pad/truncate).
const SECRET_KEY = process.env.STOCK_ENCRYPTION_KEY || 'your-32-char-secret-key-must-be-32-bytes!';

// Helper to ensure key is 32 bytes
const getKey = () => {
    return Buffer.from(SECRET_KEY.padEnd(32, '0').slice(0, 32));
};

export function encrypt(text: string): { iv: string; content: string; tag: string } {
    const iv = randomBytes(12);
    const key = getKey();
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
        iv: iv.toString('hex'),
        content: encrypted,
        tag: cipher.getAuthTag().toString('hex')
    };
}

// Format stored in DB usually: "iv:content:tag" or separate columns.
// Schema has `payloadEncrypted`. Let's store as "iv:tag:content" string?
// Or just return the string format directly.
export function encryptToString(text: string): string {
    const { iv, content, tag } = encrypt(text);
    return `${iv}:${tag}:${content}`;
}

export function decryptFromString(encryptedText: string): string {
    const [ivHex, tagHex, contentHex] = encryptedText.split(':');
    if (!ivHex || !tagHex || !contentHex) return '';

    const key = getKey();
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

    let decrypted = decipher.update(contentHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}
