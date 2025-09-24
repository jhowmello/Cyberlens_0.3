# CyberLens - Sistema Avançado de Monitoramento e Segurança de Rede

## Visão Geral

O CyberLens é uma solução completa e avançada de monitoramento e segurança de rede que combina funcionalidades de análise de tráfego, detecção de ameaças, controle parental, descoberta inteligente de dispositivos e gerenciamento de rede em uma única plataforma integrada com tecnologias de ponta.

## Arquitetura Consolidada e Otimizada

Este projeto representa a consolidação de duas aplicações móveis (CyberLensNew e mobile) em uma solução unificada com backend altamente otimizado e funcionalidades avançadas de rede.

### 🚀 Principais Melhorias Implementadas

#### 1. Consolidação e Otimização do Backend
- **Schema Prisma Unificado**: Consolidação de dois schemas em uma única configuração otimizada
- **Migração para PostgreSQL**: Transição de SQLite para PostgreSQL para melhor performance e recursos avançados
- **Otimizações de Performance**: Implementação de cache, pool de conexões e monitoramento de queries
- **Arquitetura Modular**: Estrutura modular com separação clara de responsabilidades

#### 2. Sistema Avançado de Performance e Monitoramento
- **PerformanceService**: Monitoramento em tempo real de queries e métricas do banco
- **CacheInterceptor**: Sistema de cache inteligente para otimização de consultas
- **Alertas de Performance**: Detecção automática de queries lentas e gargalos
- **Métricas Detalhadas**: Coleta e análise de métricas de sistema e aplicação

#### 3. **🌐 NOVO: Biblioteca de Rede Otimizada e Segura**
- **SecureNetworkService**: Implementação de protocolos seguros (TLS 1.3, HTTPS/2, WebSocket Secure)
- **NetworkMonitoringService**: Monitoramento avançado de latência, throughput e qualidade de conexão
- **NetworkDiscoveryService**: Descoberta inteligente e automática de dispositivos na rede
- **RateLimitingService**: Proteção avançada contra ataques DDoS e rate limiting adaptativo
- **Connection Pooling**: Gerenciamento otimizado de conexões de rede
- **Cache Distribuído**: Sistema de cache com Redis para otimização de performance

#### 4. Configuração Docker Otimizada
- **Multi-stage Builds**: Dockerfile otimizado para produção
- **Inicialização de Banco**: Scripts SQL para configuração automática do PostgreSQL
- **Health Checks**: Monitoramento de saúde dos containers
- **Orquestração Completa**: Docker Compose para ambiente completo

## Estrutura do Projeto

```
Cyberlens1.0.3/
├── backend/                    # API Backend (NestJS)
│   ├── src/
│   │   ├── auth/              # Autenticação e autorização
│   │   │   ├── guards/        # Guards de segurança
│   │   │   └── decorators/    # Decorators customizados
│   │   ├── common/            # Utilitários compartilhados
│   │   │   ├── interceptors/  # Cache e performance
│   │   │   └── performance/   # Monitoramento de performance
│   │   ├── prisma/           # Configuração do banco
│   │   ├── users/            # Gerenciamento de usuários
│   │   ├── networks/         # Gerenciamento de redes
│   │   ├── rules/            # Regras de segurança
│   │   ├── monitoring/       # Monitoramento de dispositivos
│   │   └── router/           # Integração com roteadores
│   ├── prisma/
│   │   └── schema.prisma     # Schema consolidado
│   ├── Dockerfile            # Container otimizado
│   └── .dockerignore
├── database/
│   └── init/
│       └── 01-init.sql       # Inicialização PostgreSQL
├── CyberLensConsolidated/     # Aplicação móvel consolidada
└── docker-compose.yml         # Orquestração de containers
```

## Tecnologias Utilizadas

### Backend
- **NestJS**: Framework Node.js para APIs escaláveis e modulares
- **Prisma**: ORM moderno para TypeScript com schema unificado
- **PostgreSQL**: Banco de dados relacional robusto e performático
- **Redis**: Cache distribuído para otimização de performance
- **TypeScript**: Linguagem tipada para maior segurança e produtividade

### 🌐 Bibliotecas de Rede Avançadas
- **ws**: WebSocket seguro para comunicação em tempo real
- **ping**: Monitoramento de latência e conectividade
- **ioredis**: Cliente Redis otimizado para Node.js
- **node-cache**: Cache local para fallback e otimização
- **netmask**: Manipulação de redes e subnets
- **fast-speedtest-api**: Testes de velocidade de rede
- **TLS 1.3**: Protocolo de segurança mais recente
- **HTTP/2**: Protocolo HTTP otimizado para performance

### Segurança e Autenticação
- **JWT**: Autenticação baseada em tokens seguros
- **bcryptjs**: Hash seguro de senhas
- **Helmet**: Headers de segurança HTTP
- **Rate Limiting**: Proteção contra ataques DDoS
- **CORS**: Controle de acesso entre origens
- **Winston**: Sistema de logging avançado
- **Docker**: Containerização e deploy

### Frontend Mobile
- **React Native**: Framework para desenvolvimento móvel
- **Expo**: Plataforma de desenvolvimento
- **TypeScript**: Tipagem estática
- **React Navigation**: Navegação entre telas

## Configuração e Instalação

### Pré-requisitos
- Node.js 18+
- Docker e Docker Compose
- PostgreSQL (se não usar Docker)

### Instalação do Backend

```bash
cd backend
npm install
```

### Configuração do Ambiente

Crie um arquivo `.env` no diretório `backend`:

```env
# Database
DATABASE_URL="postgresql://cyberlens:cyberlens123@localhost:5432/cyberlens"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="24h"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_REFRESH_EXPIRES_IN="7d"

# App
PORT=3000
NODE_ENV=development

# Google OAuth (opcional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### Executando com Docker

```bash
# Iniciar todos os serviços
docker-compose up -d

# Verificar logs
docker-compose logs -f

# Parar serviços
docker-compose down
```

### Executando Localmente

```bash
# Gerar cliente Prisma
npm run prisma:generate

# Executar migrações
npm run prisma:migrate

# Iniciar em desenvolvimento
npm run start:dev

# Build para produção
npm run build
npm run start:prod
```

## Funcionalidades Principais

### 1. Autenticação e Autorização
- Login/registro com email e senha
- Autenticação OAuth (Google)
- Sistema de roles (ADMIN, USER, MODERATOR)
- JWT com refresh tokens
- Proteção de rotas baseada em roles

### 2. Monitoramento de Rede
- Descoberta automática de dispositivos
- Monitoramento de tráfego em tempo real
- Análise de largura de banda
- Histórico de atividades
- Alertas de segurança

### 3. Gerenciamento de Regras
- Regras de firewall
- Controle de qualidade de serviço (QoS)
- Controle parental
- Controle de acesso por dispositivo
- Agendamento de regras

### 4. Integração com Roteadores
- Suporte a múltiplos fabricantes
- Configuração remota
- Monitoramento de status
- Backup e restauração de configurações

### 5. Performance e Monitoramento
- Dashboard de métricas em tempo real
- Monitoramento de queries do banco
- Sistema de cache inteligente
- Alertas de performance
- Relatórios detalhados

## API Endpoints

### Autenticação
```
POST /auth/register     # Registro de usuário
POST /auth/login        # Login
POST /auth/refresh      # Renovar token
POST /auth/logout       # Logout
```

### Usuários
```
GET  /users/profile     # Perfil do usuário
PUT  /users/profile     # Atualizar perfil
DELETE /users/account   # Deletar conta
```

### Redes
```
GET    /networks        # Listar redes
POST   /networks        # Criar rede
PUT    /networks/:id    # Atualizar rede
DELETE /networks/:id    # Deletar rede
```

### Monitoramento
```
GET /monitoring/devices    # Dispositivos conectados
GET /monitoring/bandwidth  # Uso de largura de banda
GET /monitoring/activity   # Atividade da rede
GET /monitoring/stats      # Estatísticas gerais
```

### 🌐 **NOVO: Funcionalidades Avançadas de Rede**

#### Descoberta de Rede
```
GET  /network/discovery/scan        # Escanear rede para dispositivos
GET  /network/discovery/devices     # Listar dispositivos descobertos
GET  /network/discovery/device/:ip  # Detalhes de dispositivo específico
POST /network/discovery/refresh     # Atualizar descoberta de rede
GET  /network/discovery/stats       # Estatísticas de descoberta
```

#### Monitoramento Avançado
```
GET  /network/monitoring/metrics    # Métricas de rede em tempo real
GET  /network/monitoring/latency    # Monitoramento de latência
GET  /network/monitoring/throughput # Análise de throughput
GET  /network/monitoring/anomalies  # Detecção de anomalias
GET  /network/monitoring/quality    # Qualidade da conexão
```

#### Rate Limiting e Segurança
```
GET  /network/rate-limit/stats      # Estatísticas de rate limiting
GET  /network/rate-limit/blocked    # IPs bloqueados
POST /network/rate-limit/unblock    # Desbloquear IP
GET  /network/rate-limit/rules      # Regras de rate limiting
POST /network/rate-limit/rules      # Criar nova regra
```

#### Conexões Seguras
```
POST /network/secure/request        # Requisição HTTPS/HTTP2 segura
GET  /network/secure/websocket      # Estabelecer WebSocket seguro
GET  /network/secure/health         # Health check dos serviços
GET  /network/secure/performance    # Métricas de performance
```

### Performance (Admin)
```
GET /performance/stats     # Estatísticas de performance
GET /performance/metrics   # Métricas detalhadas
GET /performance/slow      # Queries lentas
POST /performance/clear    # Limpar métricas
```

## Testes

```bash
# Executar todos os testes
npm test

# Testes com coverage
npm run test:cov

# Testes e2e
npm run test:e2e
```

## Deploy

### Produção com Docker

```bash
# Build da imagem
docker build -t cyberlens-backend .

# Executar container
docker run -p 3000:3000 --env-file .env cyberlens-backend
```

### Variáveis de Ambiente para Produção

```env
NODE_ENV=production
DATABASE_URL="postgresql://user:pass@host:5432/db"
JWT_SECRET="production-secret"
PORT=3000
```

## Monitoramento e Logs

### Logs
Os logs são estruturados usando Winston e incluem:
- Requests HTTP
- Queries do banco de dados
- Erros e exceções
- Métricas de performance

### Métricas
- Tempo de resposta das APIs
- Uso de memória e CPU
- Queries lentas do banco
- Taxa de erro das requisições

## Segurança

### Medidas Implementadas
- Validação de entrada em todas as rotas
- Rate limiting
- CORS configurado
- Headers de segurança
- Sanitização de dados
- Criptografia de senhas com bcrypt
- Tokens JWT seguros

## Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## Suporte

Para suporte e dúvidas:
- Abra uma issue no GitHub
- Entre em contato através do email: suporte@cyberlens.com

## Changelog

### v1.0.3 (Atual) - Edição Avançada de Rede
- ✅ Consolidação de schemas Prisma
- ✅ Migração para PostgreSQL
- ✅ Sistema de performance e cache
- ✅ Otimizações Docker
- ✅ Guards e decorators de autorização
- ✅ Testes automatizados
- ✅ Documentação atualizada
- 🌐 **NOVO: Biblioteca de Rede Otimizada**
  - ✅ SecureNetworkService com TLS 1.3 e HTTP/2
  - ✅ NetworkMonitoringService com detecção de anomalias
  - ✅ NetworkDiscoveryService com descoberta inteligente
  - ✅ RateLimitingService com proteção DDoS adaptativa
  - ✅ Connection pooling e cache distribuído
  - ✅ Testes abrangentes para todas as funcionalidades de rede
  - ✅ Monitoramento de latência, throughput e qualidade
  - ✅ Identificação automática de dispositivos e serviços
  - ✅ Avaliação de segurança e detecção de vulnerabilidades

### Próximas Versões
- 🔄 Interface web administrativa
- 🔄 Integração com mais fabricantes de roteadores
- 🔄 Machine learning para detecção de anomalias
- 🔄 Relatórios avançados e dashboards
- 🔄 API GraphQL para consultas otimizadas
- 🔄 Suporte a IPv6 completo
- 🔄 Integração com sistemas de SIEM