# Common Modules

The `common/` directory contains 17 Maven modules that provide shared abstractions, data models, messaging types, and infrastructure interfaces used by all other layers of ThingsBoard (DAO, transport, rule engine, application, microservices).

## Module Overview

| Module | Maven artifact | Purpose | Key packages |
|--------|---------------|---------|-------------|
| [data](data.md) | `org.thingsboard.common:data` | Entity models, DTOs, enums, IDs, constants | `common.data`, `common.data.id`, `common.data.*` |
| [message](message.md) | `org.thingsboard.common:message` | Internal message types (TbMsg, actor messages, queue messages) | `common.msg`, `common.msg.queue`, `common.msg.cluster` |
| [queue](queue.md) | `org.thingsboard.common:queue` | Queue abstraction layer (Kafka, in-memory, pub-sub) | `queue.common`, `queue.discovery`, `queue.kafka` |
| [dao-api](dao-api.md) | `org.thingsboard.common:dao-api` | DAO interfaces, DB-type annotations, service contracts | `dao.*`, `dao.util` |
| [cache](cache.md) | `org.thingsboard.common:cache` | Caffeine/Redis caching, per-entity cache implementations | `cache`, `cache.device`, `cache.customer` |
| [cluster-api](cluster-api.md) | `org.thingsboard.common:cluster-api` | Cluster communication interfaces (RPC, events, routing) | `cluster`, `queue` |
| [actor](actor.md) | `org.thingsboard.common:actor` | Actor system abstractions (Akka-like model) | `actors` |
| [proto](proto.md) | `org.thingsboard.common:proto` | Protobuf/gRPC definitions for transport, JS invoke, queue | `gen.transport`, `gen.js` |
| [transport](transport.md) | `org.thingsboard.common:transport` | Shared transport abstractions (sub-modules per protocol) | `transport.coap`, `transport.http`, `transport.mqtt` |
| [edge-api](edge-api.md) | `org.thingsboard.common:edge-api` | Edge sync gRPC service definitions and client | `edge.rpc`, `edge.exception` |
| [script](script.md) | `org.thingsboard.common:script` | Script engine API (TBEL, JS, Nashorn) | `script.api`, `script.api.js`, `script.api.tbel` |
| [coap-server](coap-server.md) | `org.thingsboard.common:coap-server` | CoAP server infrastructure (DTLS, session management) | `coapserver` |
| [util](util.md) | `org.thingsboard.common:util` | Common utilities (JSON, geo, executors, SSL, validation) | `common.util`, `common.util.geo` |
| **discovery-api** | `org.thingsboard.common:discovery-api` | Service discovery provider interface | `queue.discovery` |
| **edqs** | `org.thingsboard.common:edqs` | Entity Data Query Service abstractions (RocksDB-based) | `edqs.data`, `edqs.query`, `edqs.repo` |
| **stats** | `org.thingsboard.common:stats` | Statistics, counters, API usage reporting | `common.stats` |
| **version-control** | `org.thingsboard.common:version-control` | Git-based version control service (entity sync) | `service.sync`, `service.sync.vc` |

The last four modules (discovery-api, edqs, stats, version-control) are covered in the table above but do not have dedicated documentation pages. They provide focused, single-purpose abstractions.

## Architecture

All common modules are part of the parent POM `org.thingsboard:common` at version `4.4.0-SNAPSHOT`. The group ID is `org.thingsboard.common` for each module.

### Design Principles

1. **Shared by all layers** -- Every module in `common/` is a dependency of the application, DAO, transport, and rule engine layers. Common modules never depend on higher-level modules.

2. **Minimal dependencies** -- Common modules avoid heavy frameworks. Most depend only on `org.thingsboard:data` and a small set of libraries (Jackson, Protobuf, Caffeine, Redis client).

3. **API-only, no concrete implementations** -- Modules like `dao-api`, `cluster-api`, and `actor` define interfaces and abstract classes only. Concrete implementations reside in `dao/`, `application/`, and `transport/`.

4. **Pluggable backends** -- Modules like `cache` and `queue` support pluggable backends (Caffeine vs Redis, Kafka vs in-memory vs pub-sub) controlled by Spring profiles and annotations.

### Dependency Diagram

```
                          +-------------------+
                          |      [data]       |  <-- Foundation: entities, DTOs, IDs
                          +--------+----------+
                                   |
          +-------------+----------+---------+------------+
          |             |                    |            |
     [message]     [util]              [cache]      [proto]
          |             |                    |            |
    +-----+-----+  +----+----+         +----+----+  +----+----+
    |           |  |         |         |         |  |         |
[actor]  [cluster-api][dao-api]  [discovery-api][queue][edge-api]
    |           |         |         |         |        |
    |           |    [script]  [version-control]  [edqs]
    |           |
    +-----+-----+
          |
    [coap-server]
          |
     [transport]
          |
       [stats]
```

Key dependency flows:
- `data` is the foundation -- everything depends on it
- `message` depends on `data`, `proto`; used by `actor`, `cluster-api`, `queue`
- `queue` depends on `data`, `message`, `cluster-api`, `discovery-api`
- `dao-api` depends on `data`; used by `dao` module (not in common/)
- `cache` depends on `data`; provides both Caffeine and Redis implementations
- `script` depends on `data`, `message`, `proto`
- `transport/*` sub-modules depend on `data`, `message`, `proto`, `transport-api`
- `edge-api` depends on `data`, `proto`
- `version-control` depends on `data`, `proto`, `cluster-api`

## Use in the Build

```bash
# All common modules are compiled as part of the full build:
mvn clean install -T6 -DskipTests -Dpkg.skip=true
```

Common modules are compiled early in the reactor build order, before the `dao`, `application`, `rule-engine`, `transport/*`, and `msa/*` modules.
