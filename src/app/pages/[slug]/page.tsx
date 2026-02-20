
import prisma from '@/lib/prisma';
import React from 'react';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Footer from '@/components/layout/Footer';

export const dynamic = 'force-dynamic';

export default async function DynamicPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    const content = await prisma.siteContent.findUnique({
        where: { slug },
    });

    if (!content) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-300 mb-4">404</h1>
                    <p className="text-gray-500 mb-8">Halaman tidak ditemukan.</p>
                    <Link href="/" className="px-6 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition">
                        Kembali ke Beranda
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <Link href="/" className="inline-flex items-center text-gray-500 hover:text-green-600 mb-8 transition-colors">
                    <ArrowLeft size={16} className="mr-2" />
                    Kembali
                </Link>

                <article className="prose prose-lg prose-green max-w-none">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6">
                        {content.title || slug.replace(/-/g, ' ').toUpperCase()}
                    </h1>

                    {/* Render Content - Assuming Simple Text or HTML logic. 
                        For safety in a real app, use a sanitizer. 
                        Here we just render simple text with line breaks or HTML if trusted.
                    */}
                    <div
                        className="text-gray-600 leading-relaxed whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: content.content || '' }}
                    />
                </article>
            </div>
            <Footer />
        </div>
    );
}
