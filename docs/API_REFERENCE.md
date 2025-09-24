# 🔌 API Reference - CyberLens v1.0.3

## 📋 Visão Geral

Esta documentação descreve todas as rotas e endpoints da API REST do CyberLens. A API é construída com NestJS e utiliza autenticação JWT.

**Base URL**: `http://localhost:3000/api`  
**Autenticação**: Bearer Token (JWT)  
**Content-Type**: `application/json`

---

## 🔐 Autenticação

### POST /auth/login
Realiza login do usuário.

**Request Body:**
```json
{
  "email": "usuario@exemplo.com",
  "password": "senha123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clx1234567890",
    "email": "usuario@exemplo.com",
    "name": "Nome do Usuário",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

**Response (401):**
```json
{
  "statusCode": 401,
  "message": "Credenciais inválidas",
  "error": "Unauthorized"
}
```

### POST /auth/register
Registra um novo usuário.

**Request Body:**
```json
{
  "email": "novousuario@exemplo.com",
  "password": "senha123",
  "name": "Nome do Usuário"
}
```

**Response (201):**
```json
{
  "message": "Usuário criado com sucesso",
  "user": {
    "id": "clx1234567890",
    "email": "novousuario@exemplo.com",
    "name": "Nome do Usuário"
  }
}
```

### POST /auth/refresh
Renova o token de acesso.

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### POST /auth/logout
Realiza logout do usuário.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "message": "Logout realizado com sucesso"
}
```

---

## 👥 Usuários

### GET /users/profile
Obtém o perfil do usuário autenticado.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "id": "clx1234567890",
  "email": "usuario@exemplo.com",
  "name": "Nome do Usuário",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z",
  "networks": [
    {
      "id": "clx0987654321",
      "name": "Rede Principal",
      "subnet": "192.168.1.0/24"
    }
  ]
}
```

### PUT /users/profile
Atualiza o perfil do usuário.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "name": "Novo Nome",
  "email": "novoemail@exemplo.com"
}
```

**Response (200):**
```json
{
  "message": "Perfil atualizado com sucesso",
  "user": {
    "id": "clx1234567890",
    "email": "novoemail@exemplo.com",
    "name": "Novo Nome"
  }
}
```

---

## 🌐 Redes

### GET /networks
Lista todas as redes do usuário.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (opcional): Número da página (padrão: 1)
- `limit` (opcional): Itens por página (padrão: 10)

**Response (200):**
```json
{
  "data": [
    {
      "id": "clx0987654321",
      "name": "Rede Principal",
      "subnet": "192.168.1.0/24",
      "description": "Rede principal da casa",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "devices": [
        {
          "id": "clx1111111111",
          "name": "Smartphone",
          "ip": "192.168.1.100",
          "mac": "AA:BB:CC:DD:EE:FF",
          "status": "online"
        }
      ],
      "rules": [
        {
          "id": "clx2222222222",
          "name": "Bloquear Redes Sociais",
          "type": "firewall",
          "status": "active"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

### GET /networks/:id
Obtém detalhes de uma rede específica.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "id": "clx0987654321",
  "name": "Rede Principal",
  "subnet": "192.168.1.0/24",
  "description": "Rede principal da casa",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "devices": [...],
  "rules": [...],
  "statistics": {
    "totalDevices": 15,
    "activeDevices": 12,
    "totalTraffic": "2.5 GB",
    "threatsBlocked": 3
  }
}
```

### POST /networks
Cria uma nova rede.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "name": "Nova Rede",
  "subnet": "192.168.2.0/24",
  "description": "Descrição da nova rede"
}
```

**Response (201):**
```json
{
  "message": "Rede criada com sucesso",
  "network": {
    "id": "clx3333333333",
    "name": "Nova Rede",
    "subnet": "192.168.2.0/24",
    "description": "Descrição da nova rede"
  }
}
```

### PUT /networks/:id
Atualiza uma rede existente.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "name": "Rede Atualizada",
  "description": "Nova descrição"
}
```

**Response (200):**
```json
{
  "message": "Rede atualizada com sucesso",
  "network": {
    "id": "clx0987654321",
    "name": "Rede Atualizada",
    "subnet": "192.168.1.0/24",
    "description": "Nova descrição"
  }
}
```

### DELETE /networks/:id
Exclui uma rede.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "message": "Rede excluída com sucesso"
}
```

---

## 📱 Dispositivos

### GET /networks/:networkId/devices
Lista dispositivos de uma rede.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `status` (opcional): online, offline, all (padrão: all)
- `type` (opcional): smartphone, computer, router, etc.

**Response (200):**
```json
{
  "data": [
    {
      "id": "clx1111111111",
      "name": "iPhone de João",
      "ip": "192.168.1.100",
      "mac": "AA:BB:CC:DD:EE:FF",
      "type": "smartphone",
      "status": "online",
      "lastSeen": "2025-01-01T12:00:00.000Z",
      "bandwidth": {
        "upload": "1.2 Mbps",
        "download": "5.8 Mbps"
      },
      "threats": 0
    }
  ]
}
```

### POST /networks/:networkId/devices/scan
Inicia scan de dispositivos na rede.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "message": "Scan iniciado com sucesso",
  "scanId": "scan_123456789",
  "estimatedTime": "30 segundos"
}
```

### GET /networks/:networkId/devices/scan/:scanId
Obtém status do scan de dispositivos.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "scanId": "scan_123456789",
  "status": "completed",
  "progress": 100,
  "devicesFound": 15,
  "newDevices": 2,
  "completedAt": "2025-01-01T12:00:30.000Z"
}
```

---

## 🛡️ Regras de Segurança

### GET /networks/:networkId/rules
Lista regras de segurança de uma rede.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `type` (opcional): firewall, parental_control, bandwidth_limit
- `status` (opcional): active, inactive

**Response (200):**
```json
{
  "data": [
    {
      "id": "clx2222222222",
      "name": "Bloquear Redes Sociais",
      "type": "firewall",
      "status": "active",
      "description": "Bloqueia acesso a redes sociais durante horário de trabalho",
      "conditions": {
        "domains": ["facebook.com", "instagram.com", "twitter.com"],
        "schedule": {
          "start": "09:00",
          "end": "18:00",
          "days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
        }
      },
      "actions": {
        "block": true,
        "log": true,
        "notify": false
      },
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

### POST /networks/:networkId/rules
Cria uma nova regra de segurança.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "name": "Limite de Banda",
  "type": "bandwidth_limit",
  "description": "Limita banda para dispositivos específicos",
  "conditions": {
    "devices": ["clx1111111111"],
    "maxBandwidth": "10 Mbps"
  },
  "actions": {
    "limit": true,
    "log": true
  }
}
```

**Response (201):**
```json
{
  "message": "Regra criada com sucesso",
  "rule": {
    "id": "clx4444444444",
    "name": "Limite de Banda",
    "type": "bandwidth_limit",
    "status": "active"
  }
}
```

### PUT /networks/:networkId/rules/:id
Atualiza uma regra existente.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "status": "inactive",
  "description": "Regra temporariamente desativada"
}
```

**Response (200):**
```json
{
  "message": "Regra atualizada com sucesso"
}
```

### DELETE /networks/:networkId/rules/:id
Exclui uma regra.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "message": "Regra excluída com sucesso"
}
```

---

## 📊 Monitoramento

### GET /monitoring/network/:networkId/status
Obtém status em tempo real da rede.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "networkId": "clx0987654321",
  "status": "healthy",
  "uptime": "99.9%",
  "bandwidth": {
    "total": "100 Mbps",
    "used": "45 Mbps",
    "available": "55 Mbps"
  },
  "devices": {
    "total": 15,
    "online": 12,
    "offline": 3
  },
  "security": {
    "threatsBlocked": 3,
    "vulnerabilities": 1,
    "lastScan": "2025-01-01T11:30:00.000Z"
  },
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

### GET /monitoring/network/:networkId/traffic
Obtém dados de tráfego da rede.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `period`: 1h, 24h, 7d, 30d (padrão: 24h)
- `granularity`: minute, hour, day (padrão: hour)

**Response (200):**
```json
{
  "period": "24h",
  "granularity": "hour",
  "data": [
    {
      "timestamp": "2025-01-01T00:00:00.000Z",
      "upload": 1024000,
      "download": 5120000,
      "devices": 8
    },
    {
      "timestamp": "2025-01-01T01:00:00.000Z",
      "upload": 2048000,
      "download": 10240000,
      "devices": 12
    }
  ],
  "summary": {
    "totalUpload": "2.5 GB",
    "totalDownload": "12.8 GB",
    "peakHour": "2025-01-01T20:00:00.000Z",
    "averageDevices": 10
  }
}
```

### GET /monitoring/threats
Lista ameaças detectadas.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `severity`: low, medium, high, critical
- `status`: active, resolved, ignored
- `period`: 1h, 24h, 7d, 30d

**Response (200):**
```json
{
  "data": [
    {
      "id": "threat_123456",
      "type": "malware",
      "severity": "high",
      "status": "active",
      "source": {
        "ip": "192.168.1.100",
        "device": "iPhone de João"
      },
      "target": {
        "domain": "malicious-site.com",
        "ip": "203.0.113.1"
      },
      "description": "Tentativa de acesso a site malicioso",
      "detectedAt": "2025-01-01T11:45:00.000Z",
      "actions": [
        "blocked",
        "logged",
        "notified"
      ]
    }
  ]
}
```

### POST /monitoring/threats/:id/resolve
Marca uma ameaça como resolvida.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "resolution": "Bloqueado permanentemente",
  "action": "block_domain"
}
```

**Response (200):**
```json
{
  "message": "Ameaça marcada como resolvida"
}
```

---

## 🔍 Vulnerabilidades

### POST /monitoring/vulnerability-scan
Inicia scan de vulnerabilidades.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "networkId": "clx0987654321",
  "scanType": "full",
  "targets": ["all"]
}
```

**Response (200):**
```json
{
  "message": "Scan de vulnerabilidades iniciado",
  "scanId": "vuln_scan_789",
  "estimatedTime": "5 minutos"
}
```

### GET /monitoring/vulnerability-scan/:scanId
Obtém status do scan de vulnerabilidades.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "scanId": "vuln_scan_789",
  "status": "completed",
  "progress": 100,
  "results": {
    "vulnerabilities": [
      {
        "id": "vuln_001",
        "severity": "medium",
        "type": "open_port",
        "device": "192.168.1.1",
        "port": 23,
        "service": "telnet",
        "description": "Porta Telnet aberta - risco de segurança",
        "recommendation": "Desabilitar serviço Telnet e usar SSH"
      }
    ],
    "summary": {
      "critical": 0,
      "high": 0,
      "medium": 1,
      "low": 3,
      "info": 5
    }
  },
  "completedAt": "2025-01-01T12:05:00.000Z"
}
```

---

## 📋 Logs

### GET /logs
Obtém logs do sistema.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `level`: debug, info, warn, error
- `source`: firewall, threat_detection, network_monitor
- `startDate`: ISO 8601 date
- `endDate`: ISO 8601 date
- `page`: Número da página
- `limit`: Itens por página

**Response (200):**
```json
{
  "data": [
    {
      "id": "log_123456",
      "timestamp": "2025-01-01T12:00:00.000Z",
      "level": "warn",
      "source": "firewall",
      "message": "Tentativa de acesso bloqueada",
      "metadata": {
        "sourceIp": "192.168.1.100",
        "targetDomain": "blocked-site.com",
        "rule": "Bloquear Redes Sociais"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1250,
    "totalPages": 25
  }
}
```

### POST /logs/export
Exporta logs para arquivo.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "format": "csv",
  "filters": {
    "level": ["warn", "error"],
    "startDate": "2025-01-01T00:00:00.000Z",
    "endDate": "2025-01-01T23:59:59.000Z"
  }
}
```

**Response (200):**
```json
{
  "message": "Exportação iniciada",
  "exportId": "export_456789",
  "estimatedTime": "2 minutos"
}
```

---

## 📊 Relatórios

### GET /reports
Lista relatórios disponíveis.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "report_001",
      "name": "Relatório Semanal de Segurança",
      "type": "security_weekly",
      "period": {
        "start": "2024-12-25T00:00:00.000Z",
        "end": "2024-12-31T23:59:59.000Z"
      },
      "status": "completed",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "fileSize": "2.5 MB"
    }
  ]
}
```

### POST /reports/generate
Gera um novo relatório.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "type": "security_monthly",
  "period": {
    "start": "2024-12-01T00:00:00.000Z",
    "end": "2024-12-31T23:59:59.000Z"
  },
  "format": "pdf",
  "sections": [
    "network_overview",
    "threat_analysis",
    "vulnerability_summary",
    "device_activity"
  ]
}
```

**Response (200):**
```json
{
  "message": "Relatório sendo gerado",
  "reportId": "report_002",
  "estimatedTime": "3 minutos"
}
```

### GET /reports/:id/download
Faz download de um relatório.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="relatorio-seguranca-dezembro-2024.pdf"

[Binary PDF content]
```

---

## ⚡ WebSocket Events

### Conexão
```javascript
const socket = io('ws://localhost:3000', {
  auth: {
    token: 'Bearer <access_token>'
  }
});
```

### Eventos Disponíveis

#### network_status_update
Atualização de status da rede em tempo real.

```javascript
socket.on('network_status_update', (data) => {
  console.log('Status da rede:', data);
  // {
  //   networkId: 'clx0987654321',
  //   status: 'healthy',
  //   bandwidth: { used: '45 Mbps', total: '100 Mbps' },
  //   devices: { online: 12, total: 15 }
  // }
});
```

#### threat_detected
Nova ameaça detectada.

```javascript
socket.on('threat_detected', (threat) => {
  console.log('Nova ameaça:', threat);
  // {
  //   id: 'threat_123456',
  //   type: 'malware',
  //   severity: 'high',
  //   source: { ip: '192.168.1.100' },
  //   description: 'Tentativa de acesso a site malicioso'
  // }
});
```

#### device_status_change
Mudança de status de dispositivo.

```javascript
socket.on('device_status_change', (device) => {
  console.log('Status do dispositivo alterado:', device);
  // {
  //   deviceId: 'clx1111111111',
  //   status: 'offline',
  //   lastSeen: '2025-01-01T12:00:00.000Z'
  // }
});
```

---

## 🚨 Códigos de Erro

### Códigos HTTP
- **200**: Sucesso
- **201**: Criado com sucesso
- **400**: Requisição inválida
- **401**: Não autorizado
- **403**: Acesso negado
- **404**: Recurso não encontrado
- **409**: Conflito (recurso já existe)
- **422**: Dados inválidos
- **429**: Muitas requisições
- **500**: Erro interno do servidor

### Estrutura de Erro
```json
{
  "statusCode": 400,
  "message": "Dados de entrada inválidos",
  "error": "Bad Request",
  "details": {
    "field": "email",
    "constraint": "deve ser um email válido"
  },
  "timestamp": "2025-01-01T12:00:00.000Z",
  "path": "/api/auth/register"
}
```

---

## 🔧 Rate Limiting

### Limites por Endpoint
- **Autenticação**: 5 tentativas por minuto
- **API Geral**: 100 requisições por minuto
- **Monitoramento**: 200 requisições por minuto
- **Upload/Download**: 10 requisições por minuto

### Headers de Rate Limit
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## 📚 Exemplos de Uso

### JavaScript/TypeScript
```typescript
// Configuração do cliente
const API_BASE_URL = 'http://localhost:3000/api';
let authToken = '';

// Login
async function login(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  
  const data = await response.json();
  authToken = data.access_token;
  return data;
}

// Obter redes
async function getNetworks() {
  const response = await fetch(`${API_BASE_URL}/networks`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });
  
  return await response.json();
}

// Monitoramento em tempo real
function startRealTimeMonitoring(networkId: string) {
  const socket = io('ws://localhost:3000', {
    auth: { token: `Bearer ${authToken}` }
  });
  
  socket.on('network_status_update', (data) => {
    if (data.networkId === networkId) {
      updateUI(data);
    }
  });
}
```

### Python
```python
import requests
import json

class CyberLensAPI:
    def __init__(self, base_url="http://localhost:3000/api"):
        self.base_url = base_url
        self.token = None
    
    def login(self, email, password):
        response = requests.post(
            f"{self.base_url}/auth/login",
            json={"email": email, "password": password}
        )
        data = response.json()
        self.token = data["access_token"]
        return data
    
    def get_networks(self):
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.get(f"{self.base_url}/networks", headers=headers)
        return response.json()
    
    def scan_vulnerabilities(self, network_id):
        headers = {"Authorization": f"Bearer {self.token}"}
        data = {
            "networkId": network_id,
            "scanType": "full",
            "targets": ["all"]
        }
        response = requests.post(
            f"{self.base_url}/monitoring/vulnerability-scan",
            json=data,
            headers=headers
        )
        return response.json()

# Uso
api = CyberLensAPI()
api.login("usuario@exemplo.com", "senha123")
networks = api.get_networks()
print(f"Redes encontradas: {len(networks['data'])}")
```

---

## 🔄 Versionamento

**Versão Atual**: v1.0.3  
**Compatibilidade**: Backward compatible  
**Próxima Versão**: v1.1.0 (planejada)

### Changelog
- **v1.0.3**: Melhorias de performance e correções de bugs
- **v1.0.2**: Adição de WebSocket events
- **v1.0.1**: Correções de segurança
- **v1.0.0**: Versão inicial

---

**Documentação da API CyberLens v1.0.3**  
**Última atualização**: Janeiro 2025  
**Mantido por**: Equipe CyberLens

---

*Para dúvidas sobre a API, consulte a documentação completa ou abra uma issue no GitHub.*