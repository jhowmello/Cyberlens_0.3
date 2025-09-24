const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkUserPassword() {
  try {
    console.log('🔍 Verificando usuário test@example.com...');
    
    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });
    
    if (!user) {
      console.log('❌ Usuário não encontrado!');
      return;
    }
    
    console.log('✅ Usuário encontrado:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Nome: ${user.name}`);
    console.log(`   Status: ${user.status}`);
    console.log(`   Ativo: ${user.isActive}`);
    console.log(`   Email verificado: ${user.isEmailVerified}`);
    console.log(`   Tem senha: ${user.password ? 'Sim' : 'Não'}`);
    
    if (user.password) {
      console.log('\n🔐 Testando senhas comuns...');
      
      const commonPasswords = ['password', 'password123', '123456', 'admin', 'test', 'user'];
      
      for (const pwd of commonPasswords) {
        const isMatch = await bcrypt.compare(pwd, user.password);
        console.log(`   ${pwd}: ${isMatch ? '✅ CORRETA' : '❌'}`);
        
        if (isMatch) {
          console.log(`\n🎉 Senha encontrada: ${pwd}`);
          break;
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserPassword();