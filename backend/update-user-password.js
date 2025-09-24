const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function updateUserPassword() {
  try {
    console.log('🔍 Atualizando senha do usuário test@example.com...');
    
    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });
    
    if (!user) {
      console.log('❌ Usuário não encontrado!');
      return;
    }
    
    console.log('🔐 Gerando nova senha...');
    const newPassword = 'password123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    console.log('💾 Atualizando usuário...');
    await prisma.user.update({
      where: { email: 'test@example.com' },
      data: {
        password: hashedPassword,
        status: 'ACTIVE',
        isActive: true,
        isEmailVerified: true,
        emailVerifiedAt: new Date()
      }
    });
    
    console.log('✅ Senha atualizada com sucesso!');
    console.log('\n🔑 Credenciais para login:');
    console.log(`   Email: test@example.com`);
    console.log(`   Senha: ${newPassword}`);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateUserPassword();