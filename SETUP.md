# 🚀 Guia de Configuração - CyberLens 1.0.3

Este guia irá te ajudar a configurar o projeto CyberLens do zero.

## ⚠️ Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js 18+** - [Download](https://nodejs.org/)
- **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop/)
- **Git** - [Download](https://git-scm.com/)
- **React Native CLI** - `npm install -g @react-native-community/cli`
- **Android Studio** (para desenvolvimento Android)
- **Xcode** (para desenvolvimento iOS - apenas macOS)

## 📋 Checklist de Configuração

### ✅ 1. Configuração Inicial

```bash
# Clone o repositório
git clone <repository-url>
cd Cyberlens1.0.3

# Verifique se o Docker está rodando
docker --version
docker-compose --version
```

### ✅ 2. Configuração do Backend

```bash
cd backend

# Instale as dependências
npm install

# Copie o arquivo de ambiente
cp .env.example .env

# Edite o arquivo .env com suas configurações
# Especialmente: JWT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
```

**Configurações obrigatórias no .env:**

```env
# Gere uma chave JWT segura (32+ caracteres)
JWT_SECRET="sua-chave-jwt-super-secreta-aqui-32-chars-min"
REFRESH_TOKEN_SECRET="sua-chave-refresh-token-secreta-aqui"

# Configure o Google OAuth (opcional para desenvolvimento)
GOOGLE_CLIENT_ID="seu-google-client-id"
GOOGLE_CLIENT_SECRET="seu-google-client-secret"
```

### ✅ 3. Configuração do Banco de Dados

```bash
# Volte para a raiz do projeto
cd ..

# Inicie o PostgreSQL com Docker
docker-compose up -d postgres

# Aguarde alguns segundos para o banco inicializar
# Verifique se está rodando
docker-compose ps

# Volte para o backend
cd backend

# Gere o cliente Prisma
npx prisma generate

# Execute as migrações
npx prisma migrate dev

# (Opcional) Visualize o banco de dados
npx prisma studio
```

### ✅ 4. Configuração do Mobile

```bash
# Vá para o diretório mobile
cd ../mobile

# Instale as dependências
npm install

# Para iOS (apenas macOS)
cd ios && pod install && cd ..

# Configure o Metro bundler
npx react-native start --reset-cache
```

### ✅ 5. Teste a Configuração

**Terminal 1 - Backend:**
```bash
cd backend
npm run start:dev
```

**Terminal 2 - Mobile (Metro):**
```bash
cd mobile
npx react-native start
```

**Terminal 3 - Mobile (Android):**
```bash
cd mobile
npx react-native run-android
```

**Terminal 4 - Mobile (iOS - apenas macOS):**
```bash
cd mobile
npx react-native run-ios
```

## 🔧 Configurações Avançadas

### Google OAuth Setup

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione existente
3. Ative a **Google+ API** e **Google OAuth2 API**
4. Vá em **Credenciais** > **Criar Credenciais** > **ID do cliente OAuth 2.0**
5. Configure:
   - **Tipo de aplicativo**: Aplicativo da Web
   - **URIs de redirecionamento autorizados**:
     - `http://localhost:3000/auth/google/callback`
     - `http://localhost:3000/auth/google/redirect`
6. Copie o **Client ID** e **Client Secret** para o `.env`

### Configuração de Desenvolvimento Android

```bash
# Configure as variáveis de ambiente (Windows)
setx ANDROID_HOME "C:\Users\%USERNAME%\AppData\Local\Android\Sdk"
setx PATH "%PATH%;%ANDROID_HOME%\tools;%ANDROID_HOME%\platform-tools"

# Verifique a configuração
adb devices
```

### Configuração de Desenvolvimento iOS (macOS)

```bash
# Instale as dependências do iOS
sudo gem install cocoapods

# Configure o simulador
sudo xcode-select --install
```

## 🐛 Solução de Problemas Comuns

### Problema: Docker não está rodando

**Solução:**
```bash
# Windows: Inicie o Docker Desktop
# Verifique se está rodando
docker ps
```

### Problema: Erro de conexão com o banco

**Solução:**
```bash
# Verifique se o PostgreSQL está rodando
docker-compose ps

# Reinicie o container se necessário
docker-compose restart postgres

# Verifique os logs
docker-compose logs postgres
```

### Problema: Metro bundler não inicia

**Solução:**
```bash
# Limpe o cache
npx react-native start --reset-cache

# Ou
cd mobile
npm start -- --reset-cache
```

### Problema: Erro de build no Android

**Solução:**
```bash
# Limpe o projeto
cd mobile/android
./gradlew clean

# Volte e rode novamente
cd ..
npx react-native run-android
```

### Problema: Prisma Client não encontrado

**Solução:**
```bash
cd backend
npx prisma generate
npm run build
```

## ✅ Verificação Final

Após a configuração, você deve ter:

- ✅ Backend rodando em `http://localhost:3000`
- ✅ Swagger docs em `http://localhost:3000/api`
- ✅ PostgreSQL rodando na porta 5432
- ✅ App mobile rodando no emulador/dispositivo
- ✅ Metro bundler ativo

## 📱 Testando a Aplicação

1. **Abra o app mobile**
2. **Teste o registro de usuário**
3. **Teste o login**
4. **Verifique a API no Swagger**
5. **Teste as funcionalidades básicas**

## 🆘 Precisa de Ajuda?

- **Documentação**: Leia o [README.md](README.md)
- **Issues**: Abra uma issue no GitHub
- **Discord**: Entre no servidor da comunidade

---

**Próximos Passos**: Após a configuração, consulte o [README.md](README.md) para informações sobre desenvolvimento e contribuição.