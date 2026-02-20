import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import CSPageClient from '@/components/features/admin/cs/CSPageClient';

export default async function CCSettingsPage() {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        redirect('/admin/login');
    }

    // Fetch Configs
    // @ts-ignore
    const configs = await prisma.systemConfig.findMany({
        where: { key: { in: ['CS_WHATSAPP', 'CS_TELEGRAM'] } }
    });

    const whatsapp = configs.find((c: any) => c.key === 'CS_WHATSAPP')?.value || '';
    const telegram = configs.find((c: any) => c.key === 'CS_TELEGRAM')?.value || '';

    // Fetch FAQs
    // @ts-ignore
    const faqs = await prisma.faq.findMany({
        orderBy: { sortOrder: 'asc' }
    });

    return (
        <CSPageClient
            initialWhatsapp={whatsapp}
            initialTelegram={telegram}
            initialFaqs={faqs}
        />
    );
}
