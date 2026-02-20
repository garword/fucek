'use client';

import { MessageCircle } from 'lucide-react';

export default function LiveChatWidget({ phoneNumber }: { phoneNumber?: string }) {
    if (!phoneNumber) return null;

    // Ensure number is clean (only digits)
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    const url = `https://wa.me/${cleanNumber}?text=Halo%20Admin,%20saya%20butuh%20bantuan`;

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg transition-transform hover:scale-110 animate-bounce-slow"
            aria-label="Chat with Admin"
        >
            <MessageCircle className="w-8 h-8" />
        </a>
    );
}
