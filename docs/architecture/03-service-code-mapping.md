# ThingsBoard — Service-to-Code Package Mapping

This document maps each deployable service/process to its source code modules, main class, configuration, and build artifacts.

---

## 1. Complete Mapping Table

| Service | Docker Image | Maven source module (groupId:artifactId) | Packaging module (Docker) | Main Class | Language |
|---------|-------------|------------------------------------------|---------------------------|------------|----------|
| **Monolith / tb-node** | `tb-node` | `org.thingsboard:application` | `org.thingsboard.msa:tb-node` | `ThingsboardServerApplication` | Java 25 |
| **Monolith+PG** | `tb-postgres` | `org.thingsboard:application` | `org.thingsboard.msa:tb` | `ThingsboardServerApplication` | Java 25 |
| **Monolith+Cassandra** | `tb-cassandra` | `org.thingsboard:application` | `org.thingsboard.msa:tb` | `ThingsboardServerApplication` | Java 25 |
| **MQTT Transport** | `tb-mqtt-transport` | `org.thingsboard.transport:mqtt` | `org.thingsboard.msa.transport:mqtt` | `ThingsboardMqttTransportApplication` | Java 25 |
| **HTTP Transport** | `tb-http-transport` | `org.thingsboard.transport:http` | `org.thingsboard.msa.transport:http` | `ThingsboardHttpTransportApplication` | Java 25 |
| **CoAP Transport** | `tb-coap-transport` | `org.thingsboard.transport:coap` | `org.thingsboard.msa.transport:coap` | `ThingsboardCoapTransportApplication` | Java 25 |
| **LwM2M Transport** | `tb-lwm2m-transport` | `org.thingsboard.transport:lwm2m` | `org.thingsboard.msa.transport:lwm2m` | `ThingsboardLwm2mTransportApplication` | Java 25 |
| **SNMP Transport** | `tb-snmp-transport` | `org.thingsboard.transport:snmp` | `org.thingsboard.msa.transport:snmp` | `ThingsboardSnmpTransportApplication` | Java 25 |
| **EDQS** | `tb-edqs` | `org.thingsboard:edqs` | `org.thingsboard.msa:edqs` | `ThingsboardEdqsApplication` | Java 25 |
| **VC Executor** | `tb-vc-executor` | `org.thingsboard.msa:vc-executor` | `org.thingsboard.msa:vc-executor-docker` | `ThingsboardVersionControlExecutorApplication` | Java 25 |
| **JS Executor** | `tb-js-executor` | `org.thingsboard.msa:js-executor` | (same) | `server.ts` → `server.js` | Node.js 22 |
| **Web UI** | `tb-web-ui` | `org.thingsboard.msa:web-ui` | (same) | `server.ts` → `server.js` | Node.js 22 |
| **Monitoring** | `tb-monitoring` | `org.thingsboard:application` | `org.thingsboard.msa:monitoring` | `ThingsboardServerApplication` | Java 25 |

---

## 2. tb-node (Monolith / tb-core / tb-rule-engine)

The same Docker image serves three roles differentiated by `TB_SERVICE_TYPE` env var.

**Packaging chain:**
```
application/                    (org.thingsboard:application)
  └─ compiles uber-jar → application/target/thingsboard.deb

msa/tb-node/                    (org.thingsboard.msa:tb-node)
  └─ Dockerfile copies .deb from application/
  └─ CMD: start-tb-node.sh
```

**Main class:** `org.thingsboard.server.ThingsboardServerApplication`
- File: `application/src/main/java/org/thingsboard/server/ThingsboardServerApplication.java`
- Annotations: `@SpringBootConfiguration`, `@EnableAsync`, `@EnableScheduling`
- ComponentScan: `org.thingsboard.server`, `org.thingsboard.script`
- Config: `--spring.config.name=thingsboard` → `thingsboard.yml`

**Source code modules compiled into the application .deb:**

| Dependency | Source Location | Content |
|------------|----------------|---------|
| `org.thingsboard:application` | `application/src/main/java/` | All services, controllers, actors, config |
| `org.thingsboard:dao` | `dao/src/main/java/` | Entity DAOs, SQL/NoSQL implementations, timeseries |
| `org.thingsboard.rule-engine:rule-engine-api` | `rule-engine/rule-engine-api/` | Rule engine interfaces, TbNode, TbContext |
| `org.thingsboard.rule-engine:rule-engine-components` | `rule-engine/rule-engine-components/` | All 223 built-in rule node implementations |
| `org.thingsboard.common:actor` | `common/actor/` | Actor system abstractions |
| `org.thingsboard.common:queue` | `common/queue/` | Kafka/in-memory queue implementations |
| `org.thingsboard.common:cache` | `common/cache/` | Caffeine/Redis cache implementations |
| `org.thingsboard.common:cluster-api` | `common/cluster-api/` | Cluster service interfaces |
| `org.thingsboard.common:edge-api` | `common/edge-api/` | Edge sync protobuf + RPC client |
| `org.thingsboard.common:edqs` | `common/edqs/` | EDQS shared types |
| `org.thingsboard.common:discovery-api` | `common/discovery-api/` | Service discovery interfaces |
| `org.thingsboard.common:stats` | `common/stats/` | Statistics aggregation |
| `org.thingsboard.common:util` | `common/util/` | Shared utility classes |
| `org.thingsboard.common:version-control` | `common/version-control/` | Entity version control shared types |
| `org.thingsboard.common.transport:transport-api` | `common/transport/transport-api/` | Transport session/context abstractions |
| `org.thingsboard.common.transport:mqtt` | `common/transport/mqtt/` | Shared MQTT transport code (Netty codec, etc.) |
| `org.thingsboard.common.transport:http` | `common/transport/http/` | Shared HTTP transport code |
| `org.thingsboard.common.transport:coap` | `common/transport/coap/` | Shared CoAP transport code (Californium) |
| `org.thingsboard.common.transport:lwm2m` | `common/transport/lwm2m/` | Shared LwM2M transport code (Leshan) |
| `org.thingsboard.common.transport:snmp` | `common/transport/snmp/` | Shared SNMP transport code |
| `org.thingsboard.common.script:script-api` | `common/script/script-api/` | Script engine API (TBEL) |
| `org.thingsboard.common.script:remote-js-client` | `common/script/remote-js-client/` | Remote JS executor client |
| **Runtime only** | | |
| `org.thingsboard:ui-ngx` | `ui-ngx/` | Compiled Angular frontend (JAR, unpacked at boot) |

**Application source packages** (`application/src/main/java/org/thingsboard/server/`):

```
org.thingsboard.server
  ├── ThingsboardServerApplication.java          ← Main class
  ├── actors/                                     ← Actor system
  │   ├── .app/ .calculatedField/ .device/
  │   ├── .ruleChain/ .service/ .shared/
  │   ├── .stats/ .tenant/
  ├── config/                                     ← Spring @Configuration classes
  ├── controller/                                 ← 63 REST controllers
  ├── exception/                                  ← Custom exceptions
  ├── install/                                    ← DB install/upgrade logic
  ├── service/                                    ← 44 business service packages
  │   ├── .action/ .ai/ .apiusage/ .asset/
  │   ├── .cf/ .component/ .device/ .edge/
  │   ├── .edqs/ .entitiy/ .executors/
  │   ├── .gateway_device/ .housekeeper/
  │   ├── .install/ .job/ .lwm2m/ .mail/
  │   ├── .mobile/ .notification/ .ota/
  │   ├── .partition/ .profile/ .query/ .queue/
  │   ├── .resource/ .rpc/ .rule/ .ruleengine/
  │   ├── .script/ .security/ .session/ .sms/
  │   ├── .state/ .stats/ .subscription/
  │   ├── .sync/ .system/ .telemetry/
  │   ├── .transport/ .ttl/ .update/ .user/ .ws/
  └── utils/
```

---

## 3. Transport Services

Each transport is a lightweight Spring Boot application with minimal dependencies. They share a common architecture:
- Own main class in its own package
- Scans its own package + shared transport code + queue + cache
- Uses its own config YAML (e.g., `tb-mqtt-transport.yml`)
- Packaged as a .deb, installed into Docker

### 3a. MQTT Transport

**Packaging chain:**
```
transport/mqtt/                  (org.thingsboard.transport:mqtt)
  └─ compiles → transport/mqtt/target/tb-mqtt-transport.deb

msa/transport/mqtt/              (org.thingsboard.msa.transport:mqtt)
  └─ Dockerfile copies .deb
  └─ CMD: start-tb-mqtt-transport.sh
```

| Property | Value |
|----------|-------|
| Main class | `org.thingsboard.server.mqtt.ThingsboardMqttTransportApplication` |
| Config | `tb-mqtt-transport.yml` |
| ComponentScan | `org.thingsboard.server.mqtt`, `org.thingsboard.server.common`, `org.thingsboard.server.transport.mqtt`, `org.thingsboard.server.queue`, `org.thingsboard.server.cache` |
| Maven dependencies | `common/transport/mqtt`, `common/queue`, `spring-boot-starter-web` |
| Source packages | `org.thingsboard.server.mqtt` (single package, transport handler) |

### 3b. HTTP Transport

**Packaging chain:**
```
transport/http/                  (org.thingsboard.transport:http)
  └─ → transport/http/target/tb-http-transport.deb

msa/transport/http/              (org.thingsboard.msa.transport:http)
  └─ Dockerfile copies .deb
```

| Property | Value |
|----------|-------|
| Main class | `org.thingsboard.server.http.ThingsboardHttpTransportApplication` |
| Config | `tb-http-transport.yml` |
| ComponentScan | `org.thingsboard.server.http`, `org.thingsboard.server.common`, `org.thingsboard.server.transport.http`, `org.thingsboard.server.queue`, `org.thingsboard.server.cache` |
| Maven dependencies | `common/transport/http`, `common/queue`, `spring-boot-starter-web` |
| Source packages | `org.thingsboard.server.http` (single package, HTTP controller handlers) |

### 3c. CoAP Transport

**Packaging chain:**
```
transport/coap/                  (org.thingsboard.transport:coap)
  └─ → transport/coap/target/tb-coap-transport.deb

msa/transport/coap/              (org.thingsboard.msa.transport:coap)
  └─ Dockerfile copies .deb
```

| Property | Value |
|----------|-------|
| Main class | `org.thingsboard.server.coap.ThingsboardCoapTransportApplication` |
| Config | `tb-coap-transport.yml` |
| ComponentScan | `org.thingsboard.server.coap`, `org.thingsboard.server.common`, `org.thingsboard.server.coapserver`, `org.thingsboard.server.transport.coap`, `org.thingsboard.server.queue`, `org.thingsboard.server.cache` |
| Maven dependencies | `common/transport/coap`, `common/queue`, `common/coap-server`, `spring-boot-starter-web` |
| Source packages | `org.thingsboard.server.coap` (CoAP device endpoints) |

### 3d. LwM2M Transport

**Packaging chain:**
```
transport/lwm2m/                 (org.thingsboard.transport:lwm2m)
  └─ → transport/lwm2m/target/tb-lwm2m-transport.deb

msa/transport/lwm2m/             (org.thingsboard.msa.transport:lwm2m)
  └─ Dockerfile copies .deb
```

| Property | Value |
|----------|-------|
| Main class | `org.thingsboard.server.lwm2m.ThingsboardLwm2mTransportApplication` |
| Config | `tb-lwm2m-transport.yml` |
| ComponentScan | `org.thingsboard.server.lwm2m`, `org.thingsboard.server.common`, `org.thingsboard.server.transport.lwm2m`, `org.thingsboard.server.queue`, `org.thingsboard.server.cache` |
| Maven dependencies | `common/transport/lwm2m`, `common/queue`, `common/cache`, `leshan-server-cf`, `leshan-client-cf`, `leshan-server-redis` |
| Source packages | `org.thingsboard.server.lwm2m` (LwM2M bootstrap, registration, resource handling) |

### 3e. SNMP Transport

**Packaging chain:**
```
transport/snmp/                  (org.thingsboard.transport:snmp)
  └─ → transport/snmp/target/tb-snmp-transport.deb

msa/transport/snmp/              (org.thingsboard.msa.transport:snmp)
  └─ Dockerfile copies .deb
```

| Property | Value |
|----------|-------|
| Main class | `org.thingsboard.server.snmp.ThingsboardSnmpTransportApplication` |
| Config | `tb-snmp-transport.yml` |
| ComponentScan | `org.thingsboard.server.snmp`, `org.thingsboard.server.common`, `org.thingsboard.server.transport.snmp`, `org.thingsboard.server.queue`, `org.thingsboard.server.cache` |
| Maven dependencies | `common/transport/snmp`, `common/queue`, `spring-boot-starter-web` |
| Source packages | `org.thingsboard.server.snmp` (SNMP trap/listener handling) |

---

## 4. EDQS (Entity Data Query Service)

**Packaging chain:**
```
edqs/                            (org.thingsboard:edqs)
  └─ compiles → edqs/target/tb-edqs.deb

msa/edqs/                        (org.thingsboard.msa:edqs)
  └─ Dockerfile copies .deb from edqs/
```

| Property | Value |
|----------|-------|
| Main class | `org.thingsboard.server.edqs.ThingsboardEdqsApplication` |
| Config | `edqs.yml` |
| Annotations | `@SpringBootConfiguration`, `@EnableAutoConfiguration`, `@EnableAsync`, `@EnableScheduling` |
| ComponentScan | `org.thingsboard.server.edqs`, `org.thingsboard.server.queue.edqs`, `org.thingsboard.server.queue.discovery`, `org.thingsboard.server.queue.kafka`, `org.thingsboard.server.queue.settings`, `org.thingsboard.server.queue.environment`, `org.thingsboard.server.common.stats` |
| Maven dependencies | `common/edqs`, `curator-recipes` (ZooKeeper), `grpc-protobuf` |
| Source packages | `org.thingsboard.server.edqs` (single package, 1 controller class) |

---

## 5. VC Executor (Version Control Executor)

**Packaging chain:**
```
msa/vc-executor/                 (org.thingsboard.msa:vc-executor, packaging: jar)
  └─ compiles → msa/vc-executor/target/tb-vc-executor.deb

msa/vc-executor-docker/          (org.thingsboard.msa:vc-executor-docker, packaging: pom)
  └─ Dockerfile copies .deb from vc-executor/
```

| Property | Value |
|----------|-------|
| Main class | `org.thingsboard.server.vc.ThingsboardVersionControlExecutorApplication` |
| Config | `tb-vc-executor.yml` |
| Annotations | `@SpringBootApplication`, `@EnableAsync`, `@EnableScheduling` |
| ComponentScan | `org.thingsboard.server`, `org.thingsboard.server.common`, `org.thingsboard.server.service.sync.vc` |
| Maven dependencies | `common/queue`, `common/version-control`, `grpc-netty-shaded`, `spring-boot-starter-web` |
| Source packages | `org.thingsboard.server.vc`, `org.thingsboard.server.vc.service` (version control Git operations) |

---

## 6. JS Executor (Node.js / TypeScript)

**Packaging chain:**
```
msa/js-executor/                 (org.thingsboard.msa:js-executor, packaging: pom)
  └─ yarn compiles TypeScript
  └─ Dockerfile copies server.js + api/ + queue/ + config/
```

| Property | Value |
|----------|-------|
| Entry point | `msa/js-executor/server.ts` (async IIFE) |
| Language | TypeScript → JavaScript (Node.js 22) |
| Base image | `thingsboard/node:22.22.2-bookworm-slim` |
| Communication | Kafka (`kafkajs` library) |
| Source structure | |
| `server.ts` | Main entry point — initializes HTTP server, Kafka consumers, loads processors |
| `api/httpServer.ts` | Express HTTP server for health checks |
| `api/jsExecutor.ts` | Core JS execution engine (sandboxed `vm` context) |
| `api/jsInvokeMessageProcessor.ts` | Kafka message processor for JS eval requests |
| `api/jsExecutor.models.ts` | TypeScript interfaces for eval requests/responses |
| `api/utils.ts` | Utility functions |
| `config/logger.ts` | Winston logger configuration |
| `queue/kafkaTemplate.ts` | Kafka producer/consumer template |
| `queue/queue.models.ts` | Queue message type definitions |

---

## 7. Web UI (Node.js / TypeScript)

**Packaging chain:**
```
msa/web-ui/                      (org.thingsboard.msa:web-ui, packaging: pom)
  └─ Extracts ui-ngx JAR into web/
  └─ yarn compiles TypeScript
  └─ Dockerfile copies server.js + web/ + config/
```

| Property | Value |
|----------|-------|
| Entry point | `msa/web-ui/server.ts` (async IIFE) |
| Language | TypeScript → JavaScript (Node.js 22) |
| Base image | `thingsboard/node:22.22.2-bookworm-slim` |
| Upstream artifact | `org.thingsboard:ui-ngx` (pre-built Angular SPA, unpacked into `web/`) |
| Source structure | |
| `server.ts` | Express HTTP server — serves static files from `web/`, health checks |
| `config/default.yml` | Default configuration (ports, bind address, proxy settings) |
| `config/custom-environment-variables.yml` | Env var overrides mapping |
| `config/logger.ts` | Winston logger configuration |
| `install.js` | Installation/setup script |

---

## 8. Source Module Dependency Map

```
                           ┌─────────────────────────────┐
                           │  ui-ngx (Angular frontend)   │── runtime dep of application
                           └─────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                    application (tb-node / monolith)                  │
│  ThingsboardServerApplication                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │actors/   │ │controllers│ │service/  │ │config/   │ │install/  │ │
│  │          │ │(63 REST) │ │(44 pkgs) │ │          │ │          │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
└────────────────────────────┬───────────────────────────────────────┘
                             │ depends on
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐
│    dao       │  │  rule-engine │  │  common/*            │
│  (entities,  │  │  (api +      │  │  actor, queue,       │
│   timeseries)│  │   components)│  │  cache, cluster-api, │
│              │  │              │  │  edge-api, edqs,     │
│              │  │              │  │  discovery-api,      │
│              │  │              │  │  stats, util,        │
│              │  │              │  │  version-control     │
└──────────────┘  └──────────────┘  └──────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                transport/* (lightweight microservices)        │
│                                                              │
│  mqtt/  → ThingsboardMqttTransportApplication                │
│  http/  → ThingsboardHttpTransportApplication                │
│  coap/  → ThingsboardCoapTransportApplication                │
│  lwm2m/ → ThingsboardLwm2mTransportApplication               │
│  snmp/  → ThingsboardSnmpTransportApplication                │
│                                                              │
│  Each depends on: common/transport/<proto>, common/queue,    │
│                    common/cache, spring-boot-starter-web     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    edqs/ (standalone service)                 │
│  ThingsboardEdqsApplication                                  │
│  depends on: common/edqs, common/queue (Kafka),              │
│              curator-recipes (ZooKeeper)                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              msa/vc-executor/ (standalone service)            │
│  ThingsboardVersionControlExecutorApplication                │
│  depends on: common/queue, common/version-control, gRPC      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│     msa/js-executor/  │   msa/web-ui/   (Node.js / TS)      │
│  server.ts → server.js│ server.ts → server.js               │
│  Kafka consumer       │ Express HTTP server                  │
│  Sandboxed JS exec    │ Serves Angular SPA                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Config File Mapping

| Service | Config File | Config Location |
|---------|------------|-----------------|
| tb-node (monolith/tb-core/tb-rule-engine) | `thingsboard.yml` | `application/src/main/resources/` |
| EDQS | `edqs.yml` | `edqs/src/main/resources/` |
| MQTT Transport | `tb-mqtt-transport.yml` | `transport/mqtt/src/main/resources/` |
| HTTP Transport | `tb-http-transport.yml` | `transport/http/src/main/resources/` |
| CoAP Transport | `tb-coap-transport.yml` | `transport/coap/src/main/resources/` |
| LwM2M Transport | `tb-lwm2m-transport.yml` | `transport/lwm2m/src/main/resources/` |
| SNMP Transport | `tb-snmp-transport.yml` | `transport/snmp/src/main/resources/` |
| VC Executor | `tb-vc-executor.yml` | `msa/vc-executor/src/main/resources/` |
| JS Executor | `config/logger.ts` | `msa/js-executor/config/` |
| Web UI | `config/default.yml` | `msa/web-ui/config/` |

---

## 10. Dockerfile-to-Source Mapping

Each Docker image builds from a Maven packaging module that wraps a source module:

```
Source (Java JAR)                     Packaging (Docker)                Docker Image
─────────────────                     ───────────────────               ─────────────
application/                   →      msa/tb-node/              →      tb-node
application/                   →      msa/tb/                   →      tb-postgres
application/                   →      msa/tb/                   →      tb-cassandra
application/                   →      msa/monitoring/           →      tb-monitoring
transport/mqtt/                →      msa/transport/mqtt/       →      tb-mqtt-transport
transport/http/                →      msa/transport/http/       →      tb-http-transport
transport/coap/                →      msa/transport/coap/       →      tb-coap-transport
transport/lwm2m/              →      msa/transport/lwm2m/      →      tb-lwm2m-transport
transport/snmp/               →      msa/transport/snmp/       →      tb-snmp-transport
edqs/                          →      msa/edqs/                 →      tb-edqs
msa/vc-executor/              →      msa/vc-executor-docker/    →      tb-vc-executor
msa/js-executor/              →      (self)                     →      tb-js-executor
msa/web-ui/                    →      (self)                    →      tb-web-ui
```

All Java services use base image `thingsboard/openjdk25:trixie-slim`.  
All Node.js services use base image `thingsboard/node:22.22.2-bookworm-slim`.

Each Java service installs a `.deb` package, sets the JAR executable (`chmod 555`), and runs a `start-*.sh` script that launches the JAR with `--spring.config.name=<service>`.
