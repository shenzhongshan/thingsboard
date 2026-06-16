# ThingsBoard System Architecture Overview

## What is ThingsBoard?

ThingsBoard is an open-source IoT platform for device management, data collection, processing, and visualization. It provides a multi-tenant SaaS-ready architecture that supports both cloud and on-premises deployments. The platform handles the full lifecycle of IoT data: from device connectivity and protocol translation, through real-time rule-based processing and persistence, to dashboard visualization and alerting.

Key capabilities:
- **Device management**: Provisioning, credential management, and configuration via device profiles
- **Multi-protocol connectivity**: MQTT, HTTP, CoAP, LwM2M, SNMP transports
- **Rule engine**: DAG-based message processing with 50+ built-in rule nodes for filtering, transformation, enrichment, and external integration
- **Data persistence**: Time-series telemetry, attributes, events, and alarms stored in SQL (PostgreSQL) or NoSQL (Cassandra) backends
- **Real-time dashboards**: WebSocket-powered visualization with 30+ widget types
- **Edge computing**: Edge nodes for distributed processing with store-and-forward to the cloud
- **Alarm system**: Configurable alarm rules with severity levels, propagation, and notifications
- **RBAC**: Role-based access control across three levels (system, tenant, customer)
- **API extensibility**: REST API, WebSocket API, and custom rule nodes

## Version and Technology Stack

| Component | Technology |
|---|---|
| Build tool | Maven (Java 25, Spring Boot 3.5) |
| Backend runtime | Java 25, Spring Boot 3.5.14 |
| Frontend | Angular 20, Angular Material 20, TypeScript |
| Build/package manager | Yarn |
| Primary database | PostgreSQL |
| Optional NoSQL DB | Apache Cassandra (for time-series at scale) |
| Cache | Caffeine (in-process), Valkey/Redis (distributed) |
| Message queue | Kafka (production) or in-memory (dev/demo) |
| Service discovery | ZooKeeper (microservice deployments) |
| Protocol codecs | Netty 4.1 (MQTT), Californium (CoAP), Leshan (LwM2M) |
| Serialization | Protobuf 3.25, gRPC 1.76 |
| Containerization | Docker, Docker Compose |
| Script execution | Nashorn sandboxed JS (JVM), Node.js sidecar (Rule Engine JS) |

## Deployment Topology

ThingsBoard supports two deployment modes:

### Monolithic Deployment
All services run in a single JVM process. Suitable for development, evaluation, and small-scale production. Uses in-memory or Kafka queues internally.

### Microservice Deployment
Services are deployed as independent containers:

| Service | Container Image | Purpose |
|---|---|---|
| **tb-node** | `thingsboard/tb-node` | Main application node: HTTP API, WebSocket, rule engine, actors |
| **tb-http-transport** | `thingsboard/tb-http-transport` | HTTP device connectivity |
| **tb-mqtt-transport** | `thingsboard/tb-mqtt-transport` | MQTT device connectivity |
| **tb-coap-transport** | `thingsboard/tb-coap-transport` | CoAP device connectivity |
| **tb-lwm2m-transport** | `thingsboard/tb-lwm2m-transport` | LwM2M device connectivity |
| **tb-snmp-transport** | `thingsboard/tb-snmp-transport` | SNMP device connectivity |
| **tb-edqs** | `thingsboard/tb-edqs` | Entity Data Query Service (dedicated query engine) |
| **js-executor** | Node.js sidecar | Remote JavaScript execution for rule engine |
| **tb-web-ui** | nginx-served SPA | Angular frontend served via nginx |
| **vc-executor** | `thingsboard/tb-vc-executor` | Version control operations (bulk import/export) |

For development, a Docker Compose file at `docker/` deploys the full stack with PostgreSQL, Kafka, and Valkey.

## Core Data Flow

```
Device                   Transport          Queue              Rule Engine
  │                         │                  │                    │
  ├─ MQTT/HTTP/CoAP ──────►├─ Parse ──────────►├─ Topic ───────────►├─ Filter nodes
  │   telemetry upload      │   protocol        │   tb_rule_engine   │   "Originator Type"
  │                         │   Convert to      │                    │   "Message Type Switch"
  │                         │   internal msg     │                    │
  │                         │                  │                    ├─ Transform nodes
  │                         │                  │                    │   "Script"
  │                         │                  │                    │   "Change Originator"
  │                         │                  │                    │
  │                         │                  │                    ├─ Action nodes
  │                         │                  │                    │   "Save Timeseries"
  │                         │                  │                    │   "Create Alarm"
  │                         │                  │                    │   "RPC Call"
  │                         │                  │                    │   "Send Email"
  │                         │                  │                    │   "MQTT/HTTP out"
  │                         │                  │                    │
  │                         │                  │                    ▼
  │                         │                  │              Persistence
  │                         │                  │              ┌─────────────┐
  │                         │                  │              │ PostgreSQL   │
  │                         │                  │              │ (entities,   │
  │                         │                  │              │  attributes, │
  │                         │                  │              │  events)     │
  │                         │                  │              ├─────────────┤
  │                         │                  │              │ Cassandra    │
  │                         │                  │              │ (time-series,│
  │                         │                  │              │  latest TS)  │
  │                         │                  │              └─────────────┘
  │                         │                  │                    │
  │                         │                  │              WebSocket Push
  │                         │                  │              ┌─────────────┐
  │                         │                  │              │ Dashboard   │
  │                         │                  │              │ Widgets     │
  │                         │                  │              │ (real-time) │
  │                         │                  │              └─────────────┘
```

**Step-by-step flow**:

1. **Device publishes telemetry** via MQTT, HTTP, or CoAP to a transport endpoint.
2. **Transport** authenticates the device, decodes the protocol-specific payload, and converts it to a canonical internal message (`TelemetryUploadRequest` or similar).
3. **Transport pushes** the message to the **queue** (Kafka topic `tb_rule_engine` or in-memory equivalent).
4. **Rule Engine** consumes the message from the queue and routes it through the device's assigned rule chain.
5. **Rule nodes** process the message: filter by originator type, transform data via scripts, save telemetry to the database, generate alarms, call external APIs, send emails, etc.
6. **WebSocket notifications** push updated telemetry and alarm state to connected dashboard sessions in real time.

**Downlink flow** (server to device):

1. User or rule engine initiates an **RPC request** (Remote Procedure Call) toward a device.
2. The request is queued to `tb_transport.api.requests`.
3. The appropriate **transport** consumes the RPC request and delivers it to the device over the device's active session (MQTT, HTTP, CoAP).
4. The device sends back an RPC response, which follows the uplink path back to the caller.

## Architectural Layers

### 1. Transport Layer

- **Location**: `transport/` Maven module; submodules: `mqtt`, `http`, `coap`, `lwm2m`, `snmp`
- **Role**: Device-facing network endpoints
- **Details**: Each transport is a standalone Netty-based (or Californium-based for CoAP/LwM2M) server. Transports authenticate devices using access tokens, X.509 certificates, or LwM2M credentials. They decode protocol-specific payloads (JSON, CBOR, Protobuf) into the internal `TransportProtos` message format defined in `common/transport/transport-api`. Transports are stateless -- session state is held in memory or in a shared cache (Valkey/Redis) for horizontal scaling.

### 2. Queue Layer

- **Location**: `common/queue/` Maven module
- **Role**: Asynchronous message bus between transports, rule engine, and core services
- **Details**: Abstracts over Kafka (production) or an in-memory implementation (dev). Topics are partitioned by entity ID for ordered processing. Each microservice type has dedicated topics:
  - `tb_rule_engine` -- telemetry, attribute updates, device connect/disconnect
  - `tb_transport.api.requests` -- RPC and attribute requests to devices
  - `tb_core` -- core service notifications (alarms, events)
  - `tb_ota_package` -- OTA firmware updates
  - `tb_version_control` -- bulk import/export operations
  - `tb_housekeeper` -- system maintenance tasks

### 3. Rule Engine

- **Location**: `rule-engine/` Maven module; submodules: `rule-engine-api`, `rule-engine-components`
- **Role**: Data processing pipeline as a directed acyclic graph (DAG)
- **Details**: Each tenant configures one or more **rule chains** -- visual DAGs of **rule nodes**. Messages enter at an "Input" node and traverse the graph. Each node can filter (conditionally route), transform (run JavaScript, enrich from DB), or act (save data, send HTTP, produce alarms). The rule engine processes messages within the **actor system**, with each rule chain instance mapped to an actor. Built-in node types number 50+, including:
  - **Filters**: Originator Type, Message Type Switch, Script, Device Profile, Entity Type
  - **Transformers**: Script (JavaScript), Change Originator, Originator Attributes, Originator Fields
  - **Actions**: Save Timeseries, Save Attributes, Create Alarm, Clear Alarm, RPC Call, Send Email, REST API Call, MQTT, HTTP, Kafka, AWS SQS/SNS, Azure Service Bus, Google Pub/Sub
  - **AI**: AI Agent, AI Insight, AI Guard, AI Summarize
  - **Edge**: Push to Edge, Push to Cloud

### 4. Actor System

- **Location**: `common/actor/` (abstractions), `application/.../actors/` (implementations)
- **Role**: Concurrency model for stateful entity processing
- **Details**: Each **device**, **tenant**, **rule chain**, **edge**, **calculated field**, and **alarm** is represented by its own actor. Actors process messages sequentially on a dedicated dispatcher thread pool, eliminating the need for explicit locking. The actor system is inspired by Akka but implemented with a custom lightweight framework. Dispatcher thread pool sizes are configurable per actor type (see `actors.system.*_dispatcher_pool_size` in `thingsboard.yml`). Key actor types:
  - `tenant` -- tenant-level state and configuration
  - `device` -- device session management, RPC dispatch
  - `ruleChain` -- rule engine message processing
  - `app` -- application-level coordination
  - `calculatedField` -- computed metrics
  - `stats` -- usage statistics aggregation

### 5. DAO Layer (Data Access)

- **Location**: `dao/` Maven module, `common/dao-api/` (interfaces)
- **Role**: Persistence abstraction for all entity types
- **Details**: DAO interfaces are defined in `common/dao-api/`. Implementations live in `dao/` with a `sql/` subdirectory (JDBC/PostgreSQL via JPA) and a `nosql/` subdirectory (Cassandra) for time-series and latest-telemetry data. Entity types persisted include: Device, Asset, DeviceProfile, AssetProfile, Customer, User, Tenant, TenantProfile, Dashboard, RuleChain, Alarm, Edge, EntityView, Widget, Resource, OtaPackage, Notification, AiModel, and more. The DAO layer uses Spring Data JPA repositories for SQL and the Cassandra driver for NoSQL.

### 6. Controllers and Services (Application Layer)

- **Location**: `application/.../controller/` and `application/.../service/`
- **Role**: REST API and business logic
- **Details**: REST controllers are organized 1:1 with entity types (e.g., `DeviceController`, `AlarmController`, `DashboardController`). Base controller (`BaseController`) provides common JWT-based authentication, tenant isolation, and pagination helpers. Controllers delegate to dedicated service classes. Each entity type has its own service (e.g., `DeviceService`, `AlarmService`, `DashboardService`). System-level services handle cross-cutting concerns: telemetry, queues, subscriptions, state, sync, edge synchronization, housekeeping, installation, mail, SMS, notifications, security, and OTA.

### 7. Frontend (Angular Application)

- **Location**: `ui-ngx/` Maven module
- **Role**: Web UI for device management, dashboards, and administration
- **Details**: Angular 20 single-page application built with Angular Material 20 component library. Key structural areas:
  - `src/app/core/http/` -- HTTP service layer, one service per entity type
  - `src/app/modules/home/pages/` -- Feature pages following the entity table pattern
  - `src/app/shared/components/` -- Reusable components (entity selectors, timewindow pickers, dashboards)
  - Entity pages use a `TableConfigResolver` to define columns and actions, extending a generic `EntityComponent<T>` base class
  - Real-time dashboard updates via WebSocket (SockJS fallback)

## Tenant Isolation Model

ThingsBoard is a **multi-tenant SaaS platform**. The data model enforces isolation at every level:

- **System Administrator**: Highest privilege level. Manages system configuration, tenant creation, and platform-wide settings.
- **Tenant Administrator**: Manages a tenant's devices, assets, customers, dashboards, and rule chains. Each tenant is an isolated workspace.
- **Customer**: An end-user of a tenant. Customers own sub-groups of devices and have their own dashboards.
- **User**: Belongs to a customer or directly to a tenant. Has role-based permissions (RBAC).

Isolation is enforced at the database level: every entity (Device, Asset, Dashboard, etc.) carries a `tenant_id` field. All queries are scoped by tenant ID, extracted from the authenticated user's JWT. The actor system ensures that tenant-specific actors process only messages belonging to their tenant.

## Edge Computing Architecture

ThingsBoard Edge extends the platform to remote locations with intermittent connectivity:

- **Edge Node**: A lightweight ThingsBoard instance deployed at a remote site (factory floor, retail store, vehicle). It runs a subset of the platform -- rule engine, local storage, and device connectivity -- without requiring a persistent connection to the cloud.
- **Cloud-to-Edge Sync**: Tenant administrators assign rule chains, dashboards, device profiles, and assets to an edge. These are pushed down to the edge node via the queue (`tb_edge` topics).
- **Edge-to-Cloud Sync**: The edge node collects telemetry locally, applies rule chains, and publishes data upstream when connectivity is available. Edge-originated data flows through dedicated `tb_edge_event.notifications` topics.

This architecture supports use cases like:
- Offshore platforms with satellite links
- Vehicle fleets with cellular connectivity
- Retail stores that must operate during internet outages
- Industrial sites with air-gapped networks

## Key Configuration

The main configuration file is `thingsboard.yml` at `application/src/main/resources/thingsboard.yml`. It is parameterized with environment variables (e.g., `${HTTP_BIND_PORT:8080}`), enabling full configuration via Docker environment variables or Kubernetes ConfigMaps. Key configuration sections:

| Section | Purpose |
|---|---|
| `server` | HTTP/HTTPS bind address, port, SSL, WebSocket settings |
| `queue` | Queue type (in-memory or kafka), Kafka bootstrap servers, topic config |
| `database.ts` | Time-series storage backend (sql, cassandra, timescale) |
| `cassandra` | Cassandra cluster connection settings |
| `actors` | Actor system thread pools, dispatcher sizes, timeouts |
| `security.jwt` | JWT token signing and expiration |
| `zk` | ZooKeeper service discovery (microservice mode) |
| `cache` | Caffeine cache specs and Valkey/Redis config |
| `edge` | Edge computing queue and sync settings |

## Module Map

For detailed module descriptions, see [Build System](01-build-system.md).

| Module | Submodules | Purpose |
|---|---|---|
| `common/` | 16 submodules | Shared data models, messaging, queue, caching, actor abstractions |
| `netty-mqtt/` | -- | Custom Netty MQTT codec |
| `dao/` | -- | Data access implementations (SQL + NoSQL) |
| `edqs/` | -- | Entity Data Query Service |
| `rule-engine/` | `api`, `components` | Rule engine framework + built-in rule nodes |
| `transport/` | `mqtt`, `http`, `coap`, `lwm2m`, `snmp` | Device connectivity transports |
| `application/` | -- | Spring Boot application (controllers, services, actors) |
| `ui-ngx/` | -- | Angular 20 frontend |
| `msa/` | 10 submodules | Docker images for all services + black-box tests |
| `rest-client/` | -- | Java REST client SDK |
| `monitoring/` | -- | Micrometer-based metrics |
| `tools/` | -- | Migration and utility tools |
