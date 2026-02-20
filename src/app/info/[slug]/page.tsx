import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import Footer from "@/components/layout/Footer";

interface PageProps {
    params: Promise<{
        slug: string;
    }>;
}

export async function generateMetadata({ params }: PageProps) {
    const { slug } = await params;
    const page = await prisma.siteContent.findUnique({
        where: { slug },
    });

    if (!page) return { title: "Not Found" };

    return {
        title: page.title,
    };
}

export default async function InfoPage({ params }: PageProps) {
    const { slug } = await params;
    const page = await prisma.siteContent.findUnique({
        where: { slug },
    });

    if (!page || !page.content) {
        notFound();
    }

    return (
        <div className="flex flex-col min-h-screen">
            <div className="flex-1 py-12 md:py-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 md:p-12 shadow-lg border border-white/20 dark:bg-slate-900/80 dark:border-white/10">
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-8 pb-6 border-b border-gray-100 dark:border-white/10">
                            {page.title}
                        </h1>
                        <div
                            className="prose prose-emerald max-w-none text-gray-600 dark:text-gray-300 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: page.content }}
                        />
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}
