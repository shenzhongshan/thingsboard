# Common Queue (`common/queue`)

**Maven artifact:** `org.thingsboard.common:queue`

The `common/queue` module provides a queue abstraction layer for message passing between ThingsBoard services. It supports multiple backends (Kafka, in-memory, pub-sub) and handles partition discovery, consumer management, and message serialization.

## Architecture

The queue system routes messages between service types:
- **Transport -> Core** -- Device telemetry, attribute updates, authentication requests
- **Core -> Rule Engine** -- TbMsg flow for rule chain processing
- **Core -> Transport** -- RPC commands, attribute updates, session notifications
- **Core -> EDQS** -- Entity data query events and requests
- **Core -> Version Control** -- Git commit requests
- **Core -> Core** -- Inter-node cluster communication (broadcasts, RPC)

### Key Abstractions

| Interface | Purpose |
|-----------|---------|
| `TbQueueProducer<T>` | Produces messages to a topic |
| `TbQueueConsumer<T>` | Consumes messages from a topic |
| `TbQueueRequestTemplate<REQ,RES>` | Request-reply pattern over queues |
| `TbQueueResponseTemplate<REQ,RES>` | Response side of request-reply |
| `TbQueueMsg` | Envelope wrapping raw bytes + key + headers |
| `TbQueueCallback` | Async callback for produce/consume completion |
| `TbQueueClusterService` | Cluster-aware queue operations |
| `TbQueueAdmin` | Topic/partition administration |

### Message Lifecycle

1. **Encode** -- Producer serializes the message body to `byte[]` (typically protobuf)
2. **Partition** -- Message key (entity UUID) is hashed to determine target partition
3. **Publish** -- Message is published asynchronously via `TbQueueProducer.send()`
4. **Consume** -- `QueueConsumerManager` polls partitions across a thread pool
5. **Decode** -- Consumer deserializes bytes back to typed message
6. **Process** -- Message is dispatched to the appropriate handler (actor, service, etc.)

### Partition Strategy

Messages are partitioned by entity ID (UUID-based key). This ensures that all messages for a given device, tenant, or rule chain arrive in order on the same partition. The `PartitionService` manages the consistent hash ring that maps tenants/entities to partitions. When cluster topology changes, `PartitionChangeEvent` triggers partition rebalancing.

## Subpackage Structure

| Subpackage | Purpose | Key Files |
|-----------|---------|-----------|
| `common/` | Abstract queue template implementations | `AbstractTbQueueConsumerTemplate.java`, `AbstractParallelTbQueueConsumerTemplate.java`, `DefaultTbQueueMsg.java`, `DefaultTbQueueRequestTemplate.java` |
| `common/consumer/` | Consumer management | `QueueConsumerManager.java`, `PartitionedQueueConsumerManager.java`, `MainQueueConsumerManager.java`, `QueueTaskType.java` |
| `common/state/` | Queue state tracking | `QueueStateService.java`, `DefaultQueueStateService.java`, `KafkaQueueStateService.java` |
| `discovery/` | Service discovery and partition assignment | `DiscoveryService.java`, `PartitionService.java`, `HashPartitionService.java`, `ConsistentHashCircle.java` |
| `discovery/event/` | Cluster topology events | `ClusterTopologyChangeEvent.java`, `PartitionChangeEvent.java`, `ServiceListChangedEvent.java` |
| `kafka/` | Kafka-specific implementations | Kafka producer, consumer, and admin implementations |
| `pubsub/` | Google Cloud Pub/Sub backend | Pub/Sub producer and consumer implementations |
| `memory/` | In-memory queue backend | In-memory producer/consumer for testing and single-node deployments |
| `rabbitmq/` | RabbitMQ backend | RabbitMQ producer and consumer implementations |
| `aws-sqs/` | AWS SQS backend | SQS producer and consumer implementations |
| `azure-service-bus/` | Azure Service Bus backend | Azure producer and consumer implementations |

### Queue Backends

| Backend | Active Profile | Use Case |
|---------|---------------|----------|
| Kafka | Default (production) | Multi-node clusters, persistent messaging |
| In-Memory | `queue-type=in-memory` | Single-node testing, development |
| Pub/Sub | `queue-type=pubsub` | GCP deployments |
| RabbitMQ | `queue-type=rabbitmq` | RabbitMQ-based deployments |
| AWS SQS | `queue-type=aws-sqs` | AWS deployments |
| Azure Service Bus | `queue-type=azure-service-bus` | Azure deployments |

### DefaultTbQueueMsg

The standard queue message envelope:

```java
@Data
public class DefaultTbQueueMsg implements TbQueueMsg {
    private final UUID key;       // Partition key (entity UUID)
    private final byte[] data;    // Serialized payload
    private final DefaultTbQueueMsgHeaders headers;  // Metadata headers
}
```

### Consumer Management

`QueueConsumerManager` is the base for all consumer lifecycle management. It:
- Creates and manages consumer threads (configurable pool size)
- Handles partition assignment/rebalancing events
- Provides graceful shutdown with draining
- Reports consumer lag and health metrics

Specialized managers:
- `MainQueueConsumerManager` -- standard single-consumer-per-topic
- `PartitionedQueueConsumerManager` -- multiple consumers for partitioned processing

### Service Discovery

The `discovery/` subpackage integrates with the service discovery mechanism (ZooKeeper or Kubernetes). Key components:
- `HashPartitionService` -- Calculates which node owns which partitions using consistent hashing
- `ConsistentHashCircle` -- Consistent hash ring implementation
- `DiscoveryService` -- Interface for service registry lookups
- `DummyDiscoveryService` -- No-op implementation for single-node mode
- `DefaultTbServiceInfoProvider` -- Provides local service metadata for registration

## Protobuf Integration

Queue messages use protobuf for serialization. Key wrapper classes:
- `TbProtoQueueMsg<T>` -- Generic protobuf message wrapper
- `TbProtoJsQueueMsg` -- JS executor message wrapper (JS invoke protobuf)

## Kafka-Specific Architecture

The Kafka backend uses:
- **Topics per service type** -- `tb_core`, `tb_rule_engine`, `tb_transport`, `tb_edqs`, `tb_version_control`, etc.
- **Partitions per tenant** -- Isolation and parallelism per tenant
- **Consumer groups** -- Each service instance is its own consumer group member
- **Manual offset commits** -- After successful processing, not before
- **State tracking** -- `KafkaQueueStateService` tracks partition offsets per node

## Relationships

- **Depends on:** `common/data`, `common/message`, `common/cluster-api`, `common/discovery-api`, `common/stats`
- **Depended on by:** `application`, `transport/*`, `msa/*`
- **Maven groupId:** `org.thingsboard.common`
- **Maven artifactId:** `queue`
