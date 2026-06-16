# ThingsBoard — Deployment Modes & Service Process Views

This document analyzes every deployment topology of ThingsBoard CE, describing which processes run, how they communicate, and how they scale.

---

## 1. Service Types

The codebase defines 7 distinct service types (`ServiceType` enum in `common/message/.../queue/ServiceType.java`):

| Enum Value | `TB_SERVICE_TYPE` | Role |
|---|---|---|
| `TB_CORE` | `tb-core` | REST API, WebSocket, device management, subscriptions, RPC |
| `TB_RULE_ENGINE` | `tb-rule-engine` | Rule chain DAG processing, telemetry persistence, alarms |
| `TB_TRANSPORT` | `tb-transport` | Protocol-specific device connectivity (MQTT, HTTP, CoAP, LwM2M, SNMP) |
| `JS_EXECUTOR` | `js-executor` | Remote JavaScript execution for rule engine script nodes |
| `TB_VC_EXECUTOR` | `tb-vc-executor` | Entity version control (Git integration) |
| `EDQS` | `edqs` | Entity Data Query Service |
| `TASK_PROCESSOR` | N/A | Internal task processor |

The same `tb-node` Docker image is reused for `monolith`, `tb-core`, and `tb-rule-engine` — behavior is determined by the `TB_SERVICE_TYPE` environment variable at startup.

---

## 2. Component Activation Mechanism

Three custom annotations gate which Spring beans are loaded per service type:

| Annotation | Active When | Purpose |
|---|---|---|
| `@TbCoreComponent` | `monolith` or `tb-core` | Core services: REST API, WebSocket, device state, subscriptions |
| `@TbRuleEngineComponent` | `monolith` or `tb-rule-engine` | Rule engine services: rule chain processing, telemetry persistence |
| `@TbTransportComponent` | `monolith` (with transport enabled) or `tb-transport` | Transport services: MQTT, HTTP, CoAP, LwM2M, SNMP |

In `monolith` mode, **all three annotations are active** — everything runs in one JVM.

---

## 3. Deployment Mode 1: Monolith (Development / Simple Production)

### Process View

```
┌─────────────────────────────────────────────────────────┐
│                   Monolith (Single JVM)                  │
│                                                         │
│  TB_SERVICE_TYPE=monolith  |  Queue: in-memory (default) │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  tb-core     │  │ tb-rule-     │  │ tb-transport  │  │
│  │  (REST API,  │  │ engine       │  │ (MQTT, HTTP,  │  │
│  │   WebSocket, │  │ (DAG proc,   │  │  CoAP, LwM2M, │  │
│  │   RPC,       │  │  telemetry,  │  │  SNMP)        │  │
│  │   device mgr)│  │  alarms)     │  │               │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
│                                                         │
│  ┌──────────────┐  ┌──────────────────────────────────┐ │
│  │  JS Exec     │  │  EDQS (embedded, RocksDB)         │ │
│  │  (local      │  │  TB_EDQS_MODE=local               │ │
│  │   Nashorn)   │  │                                   │ │
│  └──────────────┘  └──────────────────────────────────┘ │
│                                                         │
│  Cache: Caffeine (local)  |  Queue: in-memory (no net)  │
│  Database: PostgreSQL (entities + timeseries)            │
└─────────────────────────────────────────────────────────┘
```

**Docker images:** `thingsboard/tb-postgres` or `thingsboard/tb-cassandra`

### Key Configuration

```yaml
service.type: monolith          # All components active
queue.type: in-memory           # No Kafka needed
zk.enabled: false               # No ZooKeeper needed
queue.edqs.mode: local          # Embedded EDQS (RocksDB)
js.evaluator: local             # Nashorn, not remote
transport.api_enabled: true     # Embedded transport server
```

### Infrastructure Dependencies

| Component | Required | Notes |
|-----------|----------|-------|
| PostgreSQL | Yes | Entities + timeseries |
| Kafka | No | Uses in-memory queues |
| ZooKeeper | No | Single process, no coordination |
| Redis/Valkey | No | Uses in-process Caffeine cache |
| JS Executor | No | Uses embedded Nashorn |

### Scaling

- **Not horizontally scalable** — single JVM process
- Vertical scaling only (more CPU/RAM)
- Suitable for development, evaluation, small deployments

---

## 4. Deployment Mode 2: Core + Rule Engine Split

### Process View

```
                        ZooKeeper (2181)
                             │
                    ┌────────┴────────┐
                    │  coordination,  │
                    │  partition mgmt │
                    └─────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ tb-core-1     │   │ tb-core-2     │   │ tb-core-N     │
│ (REST API,    │   │ (REST API,    │   │ (REST API,    │
│  WebSocket,   │   │  WebSocket,   │   │  WebSocket,   │
│  device mgr)  │   │  device mgr)  │   │  device mgr)  │
│ port: 8080    │   │ port: 8080    │   │ port: 8080    │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                    Kafka (9092)
                    ┌───────┴───────┐
                    │   tb_core     │
                    │   tb_rule_    │
                    │   engine      │
                    │   js_eval.*   │
                    └───────┬───────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ tb-rule-      │   │ tb-rule-      │   │ tb-rule-      │
│ engine-1      │   │ engine-2      │   │ engine-N      │
│ (DAG proc,    │   │ (DAG proc,    │   │ (DAG proc,    │
│  telemetry,   │   │  telemetry,   │   │  telemetry,   │
│  alarms)      │   │  alarms)      │   │  alarms)      │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                    Kafka (9092)
                    ┌───────┴───────┐
                    │ js_eval.req   │
                    │ js_eval.resp  │
                    └───────┬───────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ js-executor-1 │   │ js-executor-2 │...│ js-executor-10│
│ (Node.js)     │   │ (Node.js)     │   │ (Node.js)     │
│ Kafka topics  │   │ Kafka topics  │   │ Kafka topics  │
│ 30 partitions │   │ 30 partitions │   │ 30 partitions │
└───────────────┘   └───────────────┘   └───────────────┘

                    PostgreSQL (5432)
                    Cache: Valkey/Redis (6379)
```

**Docker images:**
- `thingsboard/tb-node` (with `TB_SERVICE_TYPE=tb-core` or `TB_SERVICE_TYPE=tb-rule-engine`)
- `thingsboard/tb-js-executor`
- `thingsboard/tb-web-ui`

### Key Configuration

```yaml
# On tb-core instances:
service.type: tb-core
queue.type: kafka
zk.enabled: true                # Service discovery + partition mgmt
zk.url: zookeeper:2181
js.evaluator: remote            # Send JS to external executor
transport.type: remote          # Transport services are separate

# On tb-rule-engine instances:
service.type: tb-rule-engine
queue.type: kafka
zk.enabled: true
zk.url: zookeeper:2181
js.evaluator: remote
```

### Infrastructure Dependencies

| Component | Required | Notes |
|-----------|----------|-------|
| PostgreSQL | Yes | Shared database |
| Kafka | Yes | Inter-service message bus |
| ZooKeeper | Yes | Service discovery, partition coordination |
| Redis/Valkey | Yes | Distributed cache (shared across instances) |
| JS Executor | Yes | Remote Node.js processes |

### Scaling

| Component | Scaling | Mechanism |
|-----------|---------|-----------|
| tb-core | Horizontal | Kafka consumer groups with `consumer-per-partition=true` |
| tb-rule-engine | Horizontal | Multiple instances consume from same topic |
| js-executor | Horizontal | 30 partitions in `js_eval.requests` topic |

### Inter-Service Communication (Kafka Topics)

```
tb_core                  ←→  tb_core (core-to-core)
tb_core.notifications    →   tb-core consumers (notifications)
tb_rule_engine           ←→  tb-rule-engine consumers
tb_rule_engine.notifications → tb-rule-engine consumers
js_eval.requests         →   js-executor consumers
js_eval.responses.{id}   →   tb-rule-engine consumers
```

---

## 5. Deployment Mode 3: Full Microservices (Production)

### Process View

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL CLIENTS                             │
│  Browsers (HTTPS)    |    Devices (MQTT/HTTP/CoAP/LwM2M/SNMP)       │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │  HAProxy       │
                    │  (80, 443,     │
                    │   1883, 7070,  │
                    │   9999)        │
                    └───────┬────────┘
                            │
        ┌───────┬───────────┼───────────┬───────────┬───────┐
        │       │           │           │           │       │
        ▼       ▼           ▼           ▼           ▼       ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ web-ui-1 │ │ web-ui-2 │ │ mqtt-1   │ │ mqtt-2   │ │ http-1   │
│ (Node.js)│ │ (Node.js)│ │ :1883    │ │ :1883    │ │ :8081    │
│ nginx    │ │ nginx    │ │          │ │          │ │          │
└──────────┘ └──────────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
  stateless     stateless       │            │            │
                                │            │            │
        ┌──────────┐ ┌──────────┤            │            │
        │ http-2   │ │ coap     │            │            │
        │ :8081    │ │ :5683    │            │            │
        └──────────┘ └────┬─────┘            │            │
                          │                  │            │
        ┌──────────┐ ┌────┤                  │            │
        │ lwm2m    │ │snmp│                  │            │
        │ :5685/86 │ │:1620│                 │            │
        └──────────┘ └────┘                  │            │
                                             │            │
                    ┌────────────────────────┴────────────┘
                    │
            ZooKeeper (2181)
            Service Discovery
                    │
            ┌───────┴───────┐
            ▼               ▼
    ┌───────────────┐ ┌───────────────┐
    │ tb-core-1     │ │ tb-core-2     │
    │ REST/WS/8080  │ │ REST/WS/8080  │
    │ Edge RPC:7070 │ │ Edge RPC:7070 │
    └───────┬───────┘ └───────┬───────┘
            │                 │
            └────────┬────────┘
                     │
             Kafka (9092)
                     │
    ┌────────────────┼────────────────┐
    │                │                │
    ▼                ▼                ▼
┌─────────┐   ┌───────────┐   ┌───────────┐
│ tb-re-1 │   │ tb-re-2   │   │ tb-edqs-1/2│
│ :8080   │   │ :8080     │   │ Entity Data│
│ Rule    │   │ Rule      │   │ Query Svc  │
│ Engine  │   │ Engine    │   │ (optional) │
└────┬────┘   └────┬──────┘   └───────────┘
     │             │
     └──────┬──────┘
            │
    Kafka (9092)
    js_eval.requests
            │
    ┌───────┼───────┬───...───┐
    ▼       ▼       ▼         ▼
┌───────┐ ┌───────┐      ┌───────────┐
│js-ex-1│ │js-ex-2│ ...  │js-ex-10   │
│Node.js│ │Node.js│      │Node.js    │
└───────┘ └───────┘      └───────────┘

┌───────────┐ ┌───────────┐
│vc-exec-1  │ │vc-exec-2  │  (optional)
│:8081      │ │:8081      │  Version Control
└───────────┘ └───────────┘

┌──────────────────────────────────────┐
│ PostgreSQL (5432) + Cassandra (9042) │
│ Valkey/Redis Cache (6379)            │
└──────────────────────────────────────┘
```

### Complete Service Inventory

| Service | Docker Image | Port | Replicas | Scaling | Type |
|---------|-------------|------|----------|---------|------|
| `tb-core-1/2` | `tb-node` | 8080, 7070 | 2 (configurable) | Partition-based | Java 25 |
| `tb-rule-engine-1/2` | `tb-node` | 8080 | 2 (configurable) | Queue-based | Java 25 |
| `tb-mqtt-transport-1/2` | `tb-mqtt-transport` | 1883 | 2 (configurable) | Stateless | Java 25 |
| `tb-http-transport-1/2` | `tb-http-transport` | 8081 | 2 (configurable) | Stateless | Java 25 |
| `tb-coap-transport` | `tb-coap-transport` | 5683/udp | 1 | Stateless | Java 25 |
| `tb-lwm2m-transport` | `tb-lwm2m-transport` | 5685,5686/udp | 1 | Stateless | Java 25 |
| `tb-snmp-transport` | `tb-snmp-transport` | 1620/udp | 1 | Stateless | Java 25 |
| `tb-js-executor` | `tb-js-executor` | — | 10 | Partition-based | Node.js 22 |
| `tb-web-ui-1/2` | `tb-web-ui` | 8080 (internal) | 2 | Stateless | Node.js 22 |
| `tb-vc-executor-1/2` | `tb-vc-executor` | 8081 | 2 (optional) | Partition-based | Java 25 |
| `tb-edqs-1/2` | `tb-edqs` | 8080 | 2 (optional) | Partition-based | Java 25 |
| `haproxy` | `haproxy-certbot` | 80, 443, 1883, 7070 | 1 | N/A | HAProxy |
| `zookeeper` | `zookeeper:3.8.1` | 2181 | 1 | N/A | Java |
| `kafka` | `bitnamilegacy/kafka:4.0` | 9092 | 1 (KRaft) | N/A | Java |
| `postgres` | `postgres:16` | 5432 | 1 | N/A | PostgreSQL |
| `cassandra` | `cassandra:5.0` | 9042 | 1 (hybrid only) | N/A | Cassandra |
| `valkey` | `bitnamilegacy/valkey:8.0` | 6379 | 1/3/6 | N/A | Valkey |

### Kafka Topic Map (Full Microservices)

```
┌─────────────────────────────────────────────────────────────────┐
│                        KAFKA TOPIC MAP                           │
├─────────────────┬────────────────┬──────────────────────────────┤
│ Topic            │ Partitions     │ Direction / Consumers         │
├─────────────────┼────────────────┼──────────────────────────────┤
│ tb_core          │ 10             │ Core ↔ Core                   │
│ tb_core.notify   │ —              │ → Core consumers              │
│ tb_rule_engine   │ 1              │ RE ↔ RE                      │
│ tb_re.notify     │ —              │ → RE consumers               │
│ tb_transport.api │                │                               │
│  .requests       │ 10             │ Transport → Core              │
│ tb_transport.api │                │                               │
│  .responses      │ 10             │ Core → Transport              │
│ js_eval.requests │ 30             │ RE → JS Executor              │
│ js_eval.resp.{id}│ —              │ JS Executor → RE (per node)   │
│ edqs.events      │ 1              │ Core → EDQS                   │
│ edqs.state       │ 1 (compacted)  │ Core → EDQS                   │
│ edqs.requests    │ 1              │ Core → EDQS                   │
│ edqs.responses   │ 1              │ EDQS → Core                   │
│ tb_edge          │ 10             │ Core ↔ Core (edge sync)       │
│ tb_housekeeper   │ 10             │ Maintenance tasks             │
│ tb_cf_event      │ 1              │ Calculated Field events       │
│ tb_cf_state      │ 1              │ Calculated Field state        │
│ tb_version_      │                │                               │
│   control        │ 10             │ Core ↔ VC Executor            │
│ tb_notifications │ —              │ Notification delivery         │
└─────────────────┴────────────────┴──────────────────────────────┘
```

### HAProxy Routing

| Frontend | Port | Route | Backend |
|----------|------|-------|---------|
| `http-in` | 80 | `/api/v1/` | HTTP transport (8081) |
| `http-in` | 80 | `/api/`, `/static/`, etc. | tb-core (8080) |
| `http-in` | 80 | Default | tb-web-ui (8080) |
| `https-in` | 443 | Same as http-in | (SSL-terminated) |
| `mqtt-in` | 1883 | TCP (SNI) | MQTT transport (1883) |
| `edges-rpc-in` | 7070 | TCP | tb-core (7070) |
| `stats` | 9999 | HTTP | HAProxy Stats |

---

## 6. Deployment Mode 4: Install / Upgrade Mode

### Process View

```
┌─────────────────────────────────────────────────────────┐
│              tb-core-1 (ephemeral, INSTALL_TB=true)      │
│                                                         │
│  spring.profiles.active=install                         │
│  INSTALL_TB=true       (triggers schema creation)       │
│  LOAD_DEMO=optional    (loads demo data)                │
│                                                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │ SqlAbstractDatabaseSchemaService                    │ │
│  │   ├── Execute schema-entities.sql                  │ │
│  │   ├── Execute schema-ts-psql.sql                   │ │
│  │   ├── Execute schema-functions.sql                 │ │
│  │   ├── Execute schema-views.sql                     │ │
│  │   └── Insert tb_schema_settings version row        │ │
│  │                                                    │ │
│  │ SqlDatabaseUpgradeService (UPGRADE_TB=true)         │ │
│  │   ├── Load basic/schema_update.sql                 │ │
│  │   ├── Load lts/schema_update.sql                   │ │
│  │   └── Apply sequential upgrades                    │ │
│  │                                                    │ │
│  │ DefaultSystemDataLoaderService                      │ │
│  │   └── Insert system-level data (admin user,        │ │
│  │       default rule chains, widget bundles, etc.)    │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  Starts → Creates/Upgrades schema → Exits               │
│  Kafka, ZooKeeper, Cache: NOT required                  │
│  PostgreSQL: REQUIRED                                   │
└─────────────────────────────────────────────────────────┘
```

This is a bootstrap mode, not a runtime deployment. The container starts, creates or upgrades the database schema, loads system data, then exits. Used by `docker-install-tb.sh` and `docker-upgrade-tb.sh`.

---

## 7. Deployment Matrix Summary

### Comparison by Mode

| Aspect | Monolith | Core+RE Split | Full Microservices |
|--------|----------|---------------|--------------------|
| **Java processes** | 1 | 2-4 (1-2 core + 1-2 RE) | 10+ (core, RE, transport×5, edqs, vc) |
| **Node.js processes** | 0 (embedded Nashorn) | 1-10 (js-executor) + 1-2 (web-ui) | 10 (js-executor) + 2 (web-ui) |
| **Queue** | in-memory (no Kafka) | Kafka required | Kafka required |
| **Service discovery** | None | ZooKeeper | ZooKeeper |
| **Cache** | Caffeine (local) | Valkey/Redis (shared) | Valkey/Redis (shared) |
| **DB for entities** | PostgreSQL | PostgreSQL | PostgreSQL |
| **DB for timeseries** | PostgreSQL, Cassandra, or TimescaleDB | PostgreSQL, Cassandra, or TimescaleDB | PostgreSQL, Cassandra, or TimescaleDB |
| **JS execution** | Local (JVM Nashorn) | Remote (Node.js via Kafka) | Remote (Node.js via Kafka) |
| **Transport** | Embedded in JVM | Separate processes via Kafka | Separate processes via Kafka |
| **EDQS** | Embedded (RocksDB) | Optional remote | Optional remote (2 instances) |
| **Horizontal scaling** | No | Yes (core, RE, js-exec) | Yes (all components) |
| **Fault tolerance** | No | Yes (multi-instance) | Yes (multi-instance) |
| **Complexity** | Low | Medium | High |

### Infrastructure Dependency by Mode

```
                         Monolith    Core+RE      Full Micro
PostgreSQL                 ●           ●             ●
Cassandra (optional)       ○           ○             ○
Kafka                      ✗           ●             ●
ZooKeeper                  ✗           ●             ●
Valkey/Redis               ✗           ●             ●
JS Executor (Node.js)      ✗           ●             ●
HAProxy                    ✗           ✗             ●
```

---

## 8. Cache Deployment Variants

The cache backend is independently selectable and works with any deployment mode:

| Cache Mode | Compose File | Architecture |
|------------|-------------|--------------|
| **valkey** (standalone) | `docker-compose.valkey.yml` | Single Valkey 8.0 node (port 6379) |
| **valkey-cluster** | `docker-compose.valkey-cluster.yml` | 6-node Valkey cluster (3 primary + 3 replica) |
| **valkey-sentinel** | `docker-compose.valkey-sentinel.yml` | 1 primary + 1 replica + 1 sentinel |
| **caffeine** (embedded) | none | In-process Caffeine cache (monolith only) |

Relevant config:
```yaml
cache:
  type: "${CACHE_TYPE:caffeine}"  # caffeine or redis
redis:
  connection_type: "${REDIS_CONNECTION_TYPE:standalone}"  # standalone, cluster, sentinel
```

---

## 9. Database Deployment Variants

| Mode | Compose File | Entities | Timeseries | Additional Container |
|------|-------------|----------|------------|---------------------|
| **postgres** | `docker-compose.postgres.yml` | PostgreSQL | PostgreSQL (sql) | None |
| **hybrid** | `docker-compose.hybrid.yml` | PostgreSQL | Cassandra | `cassandra:5.0` |

Relevant config:
```yaml
database:
  ts:
    type: "${DATABASE_TS_TYPE:sql}"  # sql, cassandra, timescale
  ts_latest:
    type: "${DATABASE_TS_LATEST_TYPE:sql}"  # sql, cassandra, timescale
```

---

## 10. Queue Deployment Variants

| Mode | Compose File | Local Broker | Use Case |
|------|-------------|-------------|----------|
| **kafka** | `docker-compose.kafka.yml` | Yes (KRaft, port 9092) | Default production |
| **confluent** | `docker-compose.confluent.yml` | No (Confluent Cloud) | Cloud-native, managed Kafka |

---

## 11. Startup Sequence (Full Microservices)

```
1. PostgreSQL    ──→  healthy
2. ZooKeeper     ──→  healthy
3. Kafka         ──→  healthy  
4. Valkey        ──→  healthy
5. JS Executor   ──→  healthy (10 replicas)
6. tb-rule-engine-1/2  ──→  healthy
7. tb-core-1/2         ──→  healthy
8. Transport services  ──→  healthy (MQTT, HTTP, CoAP, LwM2M, SNMP)
9. EDQS (optional)     ──→  healthy
10. VC Executor (optional) ──→  healthy
11. Web UI              ──→  healthy
12. HAProxy             ──→  healthy (exposes all ports)
```

The install script (`docker-install-tb.sh`) follows a different sequence:
1. Start infrastructure only (postgres, zookeeper, kafka, valkey)
2. Start tb-core-1 with `INSTALL_TB=true` (creates schema, loads system data, exits)
3. Start all services normally
