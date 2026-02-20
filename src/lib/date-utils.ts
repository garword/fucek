// Utility function to format dates with WIB timezone
export function formatDateWIB(date: Date, options: Intl.DateTimeFormatOptions = {}) {
    return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        ...options
    }).format(date);
}

export function formatDateTimeWIB(date: Date) {
    return formatDateWIB(date, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
    });
}

export function formatDateOnlyWIB(date: Date) {
    return formatDateWIB(date, {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

export function formatDateShortWIB(date: Date) {
    return formatDateWIB(date, {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

// Calculate expiry date based on duration
// If duration is a multiple of 30, treat as months (e.g., 30 days = 1 month)
// Otherwise, calculate by days
export function calculateExpiryDate(purchaseDate: Date, durationDays: number): Date {
    const expiry = new Date(purchaseDate);
    // Strict day calculation as requested (1 month = 30 days)
    expiry.setDate(expiry.getDate() + durationDays);
    return expiry;
}
