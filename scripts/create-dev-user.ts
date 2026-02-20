import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createDevAccount() {
    try {
        // Check if dev account already exists
        const existing = await prisma.user.findUnique({
            where: { email: 'dev@hasilkuuy.com' }
        });

        if (existing) {
            console.log('✅ Dev account already exists');
            console.log('Email: dev@hasilkuuy.com');
            console.log('Password: dev123456');
            console.log('Role:', existing.role);
            return;
        }

        // Hash password
        const passwordHash = await bcrypt.hash('dev123456', 10);

        // Create dev user
        const devUser = await prisma.user.create({
            data: {
                email: 'dev@hasilkuuy.com',
                username: 'devuser',
                name: 'Development User',
                passwordHash,
                role: 'ADMIN',
                emailVerifiedAt: new Date(),
            }
        });

        console.log('✅ Dev account created successfully!');
        console.log('');
        console.log('═══════════════════════════════════════');
        console.log('📧 Email: dev@hasilkuuy.com');
        console.log('🔑 Password: dev123456');
        console.log('👤 Role: ADMIN');
        console.log('🆔 User ID:', devUser.id);
        console.log('═══════════════════════════════════════');
        console.log('');
        console.log('Login sekarang dengan kredensial di atas!');

    } catch (error) {
        console.error('❌ Error creating dev account:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createDevAccount();
