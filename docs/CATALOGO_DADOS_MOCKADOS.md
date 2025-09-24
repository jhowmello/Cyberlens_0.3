# 📋 Catálogo de Dados Mockados - CyberLens v1.0.3

## 🎯 Visão Geral

Este documento cataloga todos os dados mockados/simulados identificados no código do CyberLens que precisam ser removidos e substituídos por implementações reais.

---

## 🔍 Dados Mockados Identificados

### 1. 🌐 Serviços de Rede

#### `networkService.ts`
**Localização**: `src/services/networkService.ts`

**Métodos Mockados**:
- `getMockDevices()` (linha 274): Dispositivos de rede simulados
- `getMockWiFiNetworks()` (linha 300): Redes WiFi simuladas
- `getMockNetworkStats()` (linha 321): Estatísticas de rede simuladas

**Condições de Uso**:
- Linhas 73-74: Dispositivos mockados quando `ENABLE_MOCK_DATA = true`
- Linhas 129-130: Redes WiFi mockadas quando `ENABLE_MOCK_DATA = true`
- Linhas 153-154: Estatísticas mockadas quando `ENABLE_MOCK_DATA = true`

**Dados Simulados**:
```typescript
// Dispositivos de rede fictícios
- Router principal (192.168.1.1)
- Smartphone Android (192.168.1.100)
- Laptop Windows (192.168.1.101)
- Smart TV Samsung (192.168.1.102)
- Tablet iPad (192.168.1.103)

// Redes WiFi fictícias
- MyNetwork_5G (WPA2, -45 dBm)
- Neighbor_WiFi (WPA2, -67 dBm)
- Public_Hotspot (Open, -72 dBm)

// Estatísticas simuladas
- Download: 85.5 Mbps
- Upload: 23.2 Mbps
- Latência: 12 ms
- Dispositivos conectados: 8
```

---

#### `realNetworkService.ts`
**Localização**: `src/services/realNetworkService.ts`

**Métodos Mockados**:
- `getMockDevices()` (linha 388): Dispositivos reais simulados
- `getMockStats()` (linha 461): Estatísticas reais simuladas
- `getMockWiFiNetworks()` (linha 508): Redes WiFi reais simuladas

**Condições de Uso**:
- Linhas 104-105: Fallback para dispositivos mockados
- Linhas 197-198: Fallback para estatísticas mockadas
- Linhas 317-318: Fallback para redes WiFi mockadas

---

### 2. 📊 Monitoramento em Tempo Real

#### `realTimeMonitoringService.ts`
**Localização**: `src/services/realTimeMonitoringService.ts`

**Dados Simulados**:
- Linha 63: Lógica condicional para usar dados simulados
- Linha 118: Força de sinal simulada (Math.random() * 100)
- Linha 211: `simulateThreatBlocked()` - Simulação de ameaças bloqueadas
- Linha 217: `simulateNewAlert()` - Simulação de novos alertas

**Funcionalidades Mockadas**:
- Estatísticas de sistema simuladas
- Alertas de segurança simulados
- Dados de monitoramento em tempo real simulados

---

### 3. 🔐 Autenticação

#### `authService.ts`
**Localização**: `src/services/authService.ts`

**Tokens Mockados**:
- Linhas 104-114: Token JWT mockado para login
- Linhas 128-138: Token JWT mockado para fallback de login
- Linhas 172-182: Token JWT mockado para registro
- Linhas 192-202: Token JWT mockado para fallback de registro

**Estrutura do Token Mock**:
```typescript
const mockResponse: AuthResponse = {
  access_token: 'mock_jwt_token_' + Date.now(),
  user: {
    id: 'mock_user_id',
    name: name || 'Mock User',
    email: email || 'mock@example.com'
  }
};
```

---

#### `apiService.ts`
**Localização**: `src/services/apiService.ts`

**Tokens JWT Mockados**:
- Linhas 222-224: Token JWT complexo mockado
- Linhas 260-262: Token JWT complexo mockado (fallback)
- Linhas 301-303: Token JWT complexo mockado (registro)

**Estrutura do Token JWT Mock**:
```typescript
const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  btoa(JSON.stringify({ sub: email, name: name, iat: Date.now() })) +
  '.mock-signature-' + Date.now();
```

**Métodos com Fallback Mock**:
- `login()`: Linhas 211-241
- `register()`: Linhas 291-320
- `refreshToken()`: Linhas 346-360
- `logout()`: Linha 366
- `getNetworkDevices()`: Linha 382
- `getNetworkStats()`: Linha 414
- `getThreatAlerts()`: Linha 548
- `getVulnerabilities()`: Linha 654
- `getFirewallRules()`: Linha 715
- `getSystemLogs()`: Linha 845
- `getReports()`: Linha 882
- `getAlerts()`: Linha 896
- `getSecurityRules()`: Linha 926
- `isTokenValid()`: Linhas 966-967

---

#### `googleAuthService.ts`
**Localização**: `src/services/googleAuthService.ts`

**Usuário Google Mockado**:
- Linhas 69-83: Simulação completa de login Google

```typescript
const mockGoogleUser: GoogleUser = {
  id: 'mock_google_user_id',
  name: 'Mock Google User',
  email: 'mockuser@gmail.com',
  photo: 'https://via.placeholder.com/150',
  familyName: 'User',
  givenName: 'Mock'
};
```

---

### 4. 🖥️ Telas com Dados Mockados

#### `DeviceManagementScreen.tsx`
**Localização**: `src/screens/DeviceManagementScreen.tsx`

**Métodos Mockados**:
- `getMockDevices()` (linha 132): 5 dispositivos simulados
- `getMockAccessRules()` (linha 174): 4 regras de acesso simuladas

**Dispositivos Simulados**:
- Smartphone Samsung Galaxy
- Laptop Dell Inspiron
- Smart TV LG
- Tablet iPad Pro
- Desktop Gaming PC

---

#### `FirewallConfigScreen.tsx`
**Localização**: `src/screens/FirewallConfigScreen.tsx`

**Método Mockado**:
- `generateMockRules()` (linha 89): 6 regras de firewall simuladas

**Regras Simuladas**:
- Allow HTTP Traffic (porta 80)
- Allow HTTPS Traffic (porta 443)
- Block Malicious IPs
- Allow SSH Access (porta 22)
- Block P2P Traffic
- Allow DNS Queries (porta 53)

---

#### `NetworkSettingsScreen.tsx`
**Localização**: `src/screens/NetworkSettingsScreen.tsx`

**Método Mockado**:
- `getMockNetworks()` (linha 111): 4 redes WiFi simuladas

**Redes Simuladas**:
- Home_Network_5G (WPA3, -42 dBm)
- Office_WiFi (WPA2, -58 dBm)
- Guest_Network (WPA2, -65 dBm)
- Public_Hotspot (Open, -78 dBm)

---

#### `NetworkMonitoringScreen.tsx`
**Localização**: `src/screens/NetworkMonitoringScreen.tsx`

**Método Mockado**:
- `getMockDevices()` (linha 134): 6 dispositivos de rede simulados

**Dispositivos Simulados**:
- Router TP-Link (Gateway)
- iPhone 13 Pro
- MacBook Pro
- Smart TV Samsung
- PlayStation 5
- Amazon Echo

---

#### `ThreatDetectionScreen.tsx`
**Localização**: `src/screens/ThreatDetectionScreen.tsx`

**Método Mockado**:
- `getMockThreats()` (linha 77): 5 ameaças simuladas

**Ameaças Simuladas**:
- Malware Detection (Crítico)
- Suspicious Network Activity (Alto)
- Unauthorized Access Attempt (Médio)
- Port Scan Detected (Alto)
- Phishing Attempt Blocked (Médio)

---

#### `VulnerabilityScanScreen.tsx`
**Localização**: `src/screens/VulnerabilityScanScreen.tsx`

**Métodos Mockados**:
- `getMockVulnerabilities()` (linha 104): 4 vulnerabilidades simuladas
- `getMockScanResults()` (linha 200): 3 resultados de scan simulados

**Vulnerabilidades Simuladas**:
- CVE-2023-1234 (Crítico)
- CVE-2023-5678 (Alto)
- CVE-2023-9012 (Médio)
- CVE-2023-3456 (Baixo)

---

#### `LogsAnalysisScreen.tsx`
**Localização**: `src/screens/LogsAnalysisScreen.tsx`

**Métodos Mockados**:
- `generateMockLogs()` (linha 64): Gerador de logs simulados
- `getMockLogs()` (linha 130): Wrapper para logs mockados

**Tipos de Logs Simulados**:
- System logs (INFO, WARNING, ERROR)
- Security logs (ALERT, BLOCKED)
- Network logs (CONNECTION, DISCONNECTION)
- Application logs (START, STOP, ERROR)

---

#### `ReportsScreen.tsx`
**Localização**: `src/screens/ReportsScreen.tsx`

**Métodos Mockados**:
- `generateMockReports()` (linha 68): 4 relatórios simulados
- `generateMockMetrics()` (linha 134): Métricas de segurança simuladas
- `getMockReports()` (linha 161): Wrapper para relatórios
- `getMockMetrics()` (linha 165): Wrapper para métricas

**Relatórios Simulados**:
- Security Summary Report
- Network Performance Report
- Threat Analysis Report
- Vulnerability Assessment Report

---

#### `AlertsScreen.tsx`
**Localização**: `src/screens/AlertsScreen.tsx`

**Método Mockado**:
- `getMockAlerts()` (linha 41): 6 alertas simulados

**Alertas Simulados**:
- High CPU Usage (Warning)
- Suspicious Login Attempt (Critical)
- Network Intrusion Detected (Critical)
- Firewall Rule Violation (Medium)
- Malware Detected (Critical)
- System Update Available (Info)

---

#### `SecurityRulesScreen.tsx`
**Localização**: `src/screens/SecurityRulesScreen.tsx`

**Método Mockado**:
- `getMockRules()` (linha 42): 4 regras de segurança simuladas

**Regras Simuladas**:
- Block Malicious IPs
- Allow HTTPS Only
- Restrict Admin Access
- Enable Intrusion Detection

---

### 5. 🔧 Integração com Backend

#### `backendIntegrationService.ts`
**Localização**: `src/services/backendIntegrationService.ts`

**Métodos Mockados**:
- `getMockMonitoringData()` (linha 276): Dados de monitoramento simulados
- `getMockSecurityAlerts()` (linha 303): Alertas de segurança simulados
- `getMockSystemHealth()` (linha 329): Saúde do sistema simulada
- `getMockThreatIntelligence()` (linha 354): Inteligência de ameaças simulada
- `getMockConfig()` (linha 363): Configurações simuladas

**Condições de Uso**:
- Linha 69: Sempre retorna false quando `ENABLE_MOCK_DATA = true`
- Linha 112: Fallback para dados de monitoramento mockados
- Linha 209: Fallback para inteligência de ameaças mockada
- Linha 264: Fallback para configurações mockadas

---

## 🎯 Configuração de Mock Data

### `environment.ts`
**Localização**: `src/config/environment.ts`

**Configuração Principal**:
- Linha 30: Interface `ENABLE_MOCK_DATA: boolean`
- Linha 80: Valor padrão `ENABLE_MOCK_DATA: getEnvironmentValue('ENABLE_MOCK_DATA', true)`

**Impacto**: Esta configuração controla globalmente se o aplicativo usa dados reais ou simulados.

---

## 📊 Estatísticas de Mock Data

### Resumo por Categoria:
- **🌐 Serviços de Rede**: 6 métodos mockados
- **🔐 Autenticação**: 8 implementações mockadas
- **📱 Telas**: 12 telas com dados simulados
- **🔧 Backend**: 5 serviços mockados
- **⚙️ Configuração**: 1 flag global

### Total de Arquivos Afetados: **17 arquivos**
### Total de Métodos Mockados: **32 métodos**
### Total de Linhas com Mock Data: **~150 linhas**

---

## 🚀 Plano de Remoção

### Fase 1: Preparação
1. ✅ Catalogar todos os dados mockados
2. 🔄 Analisar dependências entre serviços
3. 📋 Criar plano de migração por prioridade

### Fase 2: Remoção Sistemática
1. **Alta Prioridade**:
   - Remover `ENABLE_MOCK_DATA` do environment
   - Limpar authService e apiService
   - Remover dados mockados dos serviços de rede

2. **Média Prioridade**:
   - Limpar telas principais (Dashboard, Network, Threats)
   - Remover dados simulados do monitoramento
   - Limpar integração com backend

3. **Baixa Prioridade**:
   - Limpar telas secundárias (Reports, Logs, Alerts)
   - Remover dados mockados de configurações
   - Limpar Google Auth simulado

### Fase 3: Implementação Real
1. Implementar APIs reais
2. Conectar com backend NestJS
3. Testar funcionalidades reais
4. Validar integração completa

---

## ⚠️ Considerações Importantes

### Dependências Críticas:
- Todos os serviços dependem da flag `Environment.ENABLE_MOCK_DATA`
- Remoção deve ser feita de forma coordenada
- Backend deve estar funcional antes da remoção completa
- Testes devem ser executados após cada remoção

### Riscos:
- Quebra de funcionalidades se backend não estiver pronto
- Perda de dados de demonstração
- Necessidade de reconfiguração de ambiente

---

**Documento criado em**: Janeiro 2025  
**Versão**: 1.0.0  
**Status**: Catalogação Completa ✅