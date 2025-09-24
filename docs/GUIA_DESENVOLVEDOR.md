# 👨‍💻 Guia do Desenvolvedor - CyberLens v1.0.3

## 🎯 Introdução

Este guia é destinado a desenvolvedores que desejam contribuir, modificar ou entender profundamente o código do CyberLens. Aqui você encontrará informações técnicas detalhadas sobre a arquitetura, padrões de código e melhores práticas.

---

## 🏗️ Arquitetura de Código

### Estrutura do Frontend (CyberLensNew)

```
src/
├── components/          # Componentes reutilizáveis
├── screens/            # Telas da aplicação
├── services/           # Serviços e APIs
├── navigation/         # Configuração de navegação
├── contexts/           # Contextos React
├── utils/              # Utilitários e helpers
├── types/              # Definições TypeScript
└── assets/             # Recursos estáticos
```

### Padrões de Arquitetura

#### 🎨 Component Pattern
```typescript
// Exemplo de componente funcional
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ComponentProps {
  title: string;
  onPress?: () => void;
}

export const CustomComponent: React.FC<ComponentProps> = ({ title, onPress }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
```

#### 🔄 Service Pattern
```typescript
// Exemplo de serviço
class NetworkService {
  private baseURL = 'http://localhost:3000/api';

  async getNetworkStatus(): Promise<NetworkStatus> {
    try {
      const response = await fetch(`${this.baseURL}/network/status`);
      return await response.json();
    } catch (error) {
      throw new Error('Failed to fetch network status');
    }
  }

  async scanDevices(): Promise<Device[]> {
    // Implementação do scan de dispositivos
  }
}

export const networkService = new NetworkService();
```

---

## 📱 Desenvolvimento Frontend

### Configuração do Ambiente

```bash
# Navegue para o diretório principal
cd CyberLensNew

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npx expo start
```

### Estrutura de Telas

Todas as telas seguem o mesmo padrão:

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function ExampleScreen() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Carregar dados
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Conteúdo da tela */}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
});
```

### Navegação

O sistema de navegação utiliza React Navigation v7:

```typescript
// App.tsx - Configuração principal
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Navegação por abas
function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Network" component={NetworkScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

// Navegação principal
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="NetworkMonitor" component={NetworkMonitorScreen} />
        {/* Outras telas */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### Gerenciamento de Estado

Utilizamos Context API para estado global:

```typescript
// contexts/AppContext.tsx
import React, { createContext, useContext, useReducer } from 'react';

interface AppState {
  user: User | null;
  networkStatus: NetworkStatus;
  threats: Threat[];
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};
```

---

## ⚙️ Desenvolvimento Backend

### Estrutura do Backend

```
src/
├── auth/               # Módulo de autenticação
├── users/              # Módulo de usuários
├── networks/           # Módulo de redes
├── monitoring/         # Módulo de monitoramento
├── rules/              # Módulo de regras
├── common/             # Utilitários comuns
├── database/           # Configuração do banco
└── main.ts             # Arquivo principal
```

### Padrões NestJS

#### 🎯 Controller Pattern
```typescript
// networks/networks.controller.ts
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NetworksService } from './networks.service';

@Controller('networks')
@UseGuards(JwtAuthGuard)
export class NetworksController {
  constructor(private readonly networksService: NetworksService) {}

  @Get()
  async findAll() {
    return this.networksService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.networksService.findOne(id);
  }

  @Post()
  async create(@Body() createNetworkDto: CreateNetworkDto) {
    return this.networksService.create(createNetworkDto);
  }
}
```

#### 🔧 Service Pattern
```typescript
// networks/networks.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class NetworksService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.network.findMany({
      include: {
        devices: true,
        rules: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.network.findUnique({
      where: { id },
      include: {
        devices: true,
        rules: true,
      },
    });
  }

  async create(data: CreateNetworkDto) {
    return this.prisma.network.create({
      data,
    });
  }
}
```

### Configuração do Prisma

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  networks  Network[]
}

model Network {
  id        String   @id @default(cuid())
  name      String
  subnet    String
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  devices   Device[]
  rules     Rule[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## 🧪 Testes

### Testes Frontend (Jest + React Native Testing Library)

```typescript
// __tests__/DashboardScreen.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import DashboardScreen from '../src/screens/DashboardScreen';

describe('DashboardScreen', () => {
  it('should render dashboard correctly', () => {
    const { getByText } = render(<DashboardScreen />);
    expect(getByText('CyberLens Dashboard')).toBeTruthy();
  });

  it('should navigate to network monitor when pressed', async () => {
    const mockNavigation = { navigate: jest.fn() };
    const { getByText } = render(
      <DashboardScreen navigation={mockNavigation} />
    );
    
    fireEvent.press(getByText('Monitor de Rede'));
    
    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith('NetworkMonitor');
    });
  });
});
```

### Testes Backend (Jest + Supertest)

```typescript
// test/networks.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('NetworksController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Obter token de autenticação
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    
    authToken = loginResponse.body.access_token;
  });

  it('/networks (GET)', () => {
    return request(app.getHttpServer())
      .get('/networks')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });
});
```

---

## 🔧 Ferramentas de Desenvolvimento

### Scripts Úteis

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:mobile\"",
    "dev:backend": "cd backend && npm run start:dev",
    "dev:mobile": "cd CyberLensNew && npx expo start",
    "build": "npm run build:backend && npm run build:mobile",
    "test": "npm run test:backend && npm run test:mobile",
    "lint": "eslint . --ext .ts,.tsx",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx}\""
  }
}
```

### Configuração do ESLint

```json
{
  "extends": [
    "@react-native-community",
    "@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "react-hooks/exhaustive-deps": "warn",
    "no-console": "warn"
  }
}
```

### Configuração do Prettier

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

---

## 🚀 Deploy e CI/CD

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Build application
      run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: Deploy to production
      run: echo "Deploy to production"
```

### Docker para Desenvolvimento

```dockerfile
# Dockerfile.dev
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3000
EXPOSE 19000
EXPOSE 19001

CMD ["npm", "run", "dev"]
```

---

## 📊 Monitoramento e Debug

### Logs Estruturados

```typescript
// utils/logger.ts
import { createLogger, format, transports } from 'winston';

export const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { service: 'cyberlens' },
  transports: [
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.simple()
  }));
}
```

### Performance Monitoring

```typescript
// utils/performance.ts
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTimer(label: string): void {
    this.metrics.set(label, Date.now());
  }

  endTimer(label: string): number {
    const startTime = this.metrics.get(label);
    if (!startTime) return 0;
    
    const duration = Date.now() - startTime;
    this.metrics.delete(label);
    
    logger.info(`Performance: ${label} took ${duration}ms`);
    return duration;
  }
}
```

---

## 🔒 Segurança

### Validação de Dados

```typescript
// dto/create-network.dto.ts
import { IsString, IsNotEmpty, IsIP, IsOptional } from 'class-validator';

export class CreateNetworkDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsIP(4)
  subnet: string;

  @IsOptional()
  @IsString()
  description?: string;
}
```

### Sanitização

```typescript
// utils/sanitizer.ts
import DOMPurify from 'dompurify';

export const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input.trim());
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
```

---

## 📚 Recursos Adicionais

### Documentação de APIs

- **Swagger UI**: Disponível em `/api/docs` quando o backend está rodando
- **Postman Collection**: Arquivo `cyberlens.postman_collection.json`

### Debugging

- **React Native Debugger**: Para debug do frontend
- **NestJS Logger**: Para logs estruturados do backend
- **Prisma Studio**: Para visualização do banco de dados

### Extensões Recomendadas (VS Code)

- **ES7+ React/Redux/React-Native snippets**
- **TypeScript Importer**
- **Prettier - Code formatter**
- **ESLint**
- **Prisma**
- **Thunder Client** (para testes de API)

---

## 🤝 Contribuindo

### Fluxo de Contribuição

1. **Fork** o repositório
2. **Clone** seu fork localmente
3. **Crie** uma branch para sua feature: `git checkout -b feature/nova-funcionalidade`
4. **Implemente** suas mudanças seguindo os padrões
5. **Teste** suas mudanças
6. **Commit** com mensagens descritivas
7. **Push** para sua branch
8. **Abra** um Pull Request

### Padrões de Commit

```
feat: adiciona nova funcionalidade de monitoramento
fix: corrige bug na detecção de ameaças
docs: atualiza documentação da API
style: formata código seguindo padrões
refactor: refatora serviço de rede
test: adiciona testes para dashboard
chore: atualiza dependências
```

### Code Review

- **Funcionalidade**: A feature funciona como esperado?
- **Testes**: Existem testes adequados?
- **Performance**: O código é eficiente?
- **Segurança**: Não há vulnerabilidades?
- **Documentação**: O código está bem documentado?

---

**Guia mantido pela equipe CyberLens**  
**Última atualização**: Janeiro 2025  
**Versão**: 1.0

---

*Para dúvidas específicas sobre desenvolvimento, abra uma issue no GitHub ou consulte a documentação completa.*