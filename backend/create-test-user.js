const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('🔍 Verificando usuários existentes...');
    
    const existingUsers = await prisma.user.findMany();
    console.log(`📊 Usuários encontrados: ${existingUsers.length}`);
    
    if (existingUsers.length > 0) {
      console.log('👥 Usuários existentes:');
      existingUsers.forEach(user => {
        console.log(`  - ${user.email} (${user.name}) - Status: ${user.status} - Ativo: ${user.isActive}`);
      });
    }
    
    // Verificar se já existe um usuário ativo para teste
    const activeUser = await prisma.user.findFirst({
      where: { 
        status: 'ACTIVE',
        isActive: true,
        isEmailVerified: true
      }
    });
    
    if (activeUser) {
      console.log('✅ Usuário ativo encontrado para teste!');
      console.log(`   Email: ${activeUser.email}`);
      console.log(`   Nome: ${activeUser.name}`);
      console.log(`   Status: ${activeUser.status}`);
      console.log(`   Ativo: ${activeUser.isActive}`);
      console.log(`   Email verificado: ${activeUser.isEmailVerified}`);
      console.log('\n🔑 Credenciais para teste:');
      console.log(`   Email: ${activeUser.email}`);
      console.log(`   Senha: password (padrão)`);
      return;
    }
    
    // Verificar se já existe um usuário de teste específico
    const testUser = await prisma.user.findUnique({
      where: { email: 'test@cyberlens.com' }
    });
    
    if (testUser) {
      console.log('✅ Usuário de teste já existe!');
      console.log(`   Email: ${testUser.email}`);
      console.log(`   Nome: ${testUser.name}`);
      console.log(`   Status: ${testUser.status}`);
      console.log(`   Ativo: ${testUser.isActive}`);
      console.log(`   Email verificado: ${testUser.isEmailVerified}`);
      
      // Ativar o usuário se não estiver ativo
      if (!testUser.isActive || testUser.status !== 'ACTIVE') {
        console.log('🔧 Ativando usuário de teste...');
        await prisma.user.update({
          where: { id: testUser.id },
          data: {
            isActive: true,
            status: 'ACTIVE',
            isEmailVerified: true,
            emailVerifiedAt: new Date()
          }
        });
        console.log('✅ Usuário de teste ativado!');
      }
      
      console.log('\n🔑 Credenciais para teste:');
      console.log(`   Email: ${testUser.email}`);
      console.log(`   Senha: 123456`);
      return;
    }
    
    console.log('🔐 Criando hash da senha...');
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    console.log('👤 Criando usuário de teste...');
    const timestamp = Date.now();
    const newUser = await prisma.user.create({
      data: {
        email: 'test@cyberlens.com',
        name: 'Usuário Teste',
        username: `testuser_${timestamp}`,
        firstName: 'Usuário',
        lastName: 'Teste',
        password: hashedPassword,
        role: 'USER',
        status: 'ACTIVE',
        isActive: true,
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        authProvider: 'LOCAL'
      }
    });
    
    console.log('✅ Usuário de teste criado com sucesso!');
    console.log(`   ID: ${newUser.id}`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Nome: ${newUser.name}`);
    console.log('\n🔑 Credenciais para teste:');
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Senha: 123456`);
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário de teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();