# Common Cluster API (`common/cluster-api`)

**Maven artifact:** `org.thingsboard.common:cluster-api`

The `common/cluster-api` module defines interfaces for inter-node cluster communication. It provides the API contract for service discovery, queue-based messaging between cluster nodes, and entity state change broadcasting. Concrete implementations reside in the `application/` module.

## Architecture

ThingsBoard operates as a cluster of nodes, each running one or more services (Core, Rule Engine, Transport, EDQS, JS Executor, Version Control). Nodes communicate exclusively through the queue system (typically Kafka) -- there is no direct HTTP/RPC between nodes.

### Core Interfaces

| Interface | Purpose |
|-----------|---------|
| `TbClusterService` | Primary cluster communication API -- pushes messages to other services, broadcasts state changes |
| `TbQueueClusterService` | Queue-level cluster operations (parent of TbClusterService) |
| `TbQueueProducer<T>` | Produces messages to a specific topic |
| `TbQueueConsumer<T>` | Consumes messages from a specific topic |
| `TbQueueRequestTemplate<REQ,RES>` | Request-reply messaging pattern |
| `TbQueueResponseTemplate<REQ,RES>` | Response side of request-reply |
| `TbQueueMsg` | Queue message envelope interface |
| `TbQueueMsgHeaders` | Message header interface |
| `TbQueueMsgDecoder<T>` | Decodes raw bytes to typed messages |
| `TbQueueMsgMetadata` | Message metadata (timestamps, source) |
| `TbQueueCallback` | Async callback interface for queue operations |
| `TbQueueHandler` | Message handler callback |
| `TbQueueAdmin` | Topic/partition administration |
| `TbEdgeQueueAdmin` | Edge-specific queue administration |

### TbClusterService

The main cluster communication interface extends `TbQueueClusterService`. Its methods are organized by target service:

#### To Core
```java
void pushMsgToCore(TopicPartitionInfo tpi, UUID msgKey, ToCoreMsg msg, TbQueueCallback callback);
void broadcastToCore(ToCoreNotificationMsg msg);
void pushNotificationToCore(String targetServiceId, FromDeviceRpcResponse response, TbQueueCallback callback);
```

#### To Rule Engine
```java
void pushMsgToRuleEngine(TenantId tenantId, EntityId entityId, TbMsg msg, TbQueueCallback callback);
void pushNotificationToRuleEngine(String targetServiceId, FromDeviceRpcResponse response, TbQueueCallback callback);
```

#### To Transport
```java
void pushNotificationToTransport(String targetServiceId, ToTransportMsg response, TbQueueCallback callback);
```

#### To Calculated Fields
```java
void pushMsgToCalculatedFields(TenantId tenantId, EntityId entityId, ToCalculatedFieldMsg msg, TbQueueCallback callback);
```

#### To Edge
```java
void pushMsgToEdge(TenantId tenantId, EntityId entityId, ToEdgeMsg msg, TbQueueCallback callback);
void pushEdgeSyncRequestToEdge(ToEdgeSyncRequest request);
```

#### To Version Control
```java
void pushMsgToVersionControl(TenantId tenantId, ToVersionControlServiceMsg msg, TbQueueCallback callback);
```

#### Entity State Change Broadcasting
```java
void broadcastEntityStateChangeEvent(TenantId tenantId, EntityId entityId, ComponentLifecycleEvent state);
void onDeviceProfileChange(DeviceProfile deviceProfile, DeviceProfile old, TbQueueCallback callback);
void onTenantProfileChange(TenantProfile tenantProfile, TbQueueCallback callback);
void onTenantChange(Tenant tenant, TbQueueCallback callback);
void onApiStateChange(ApiUsageState apiUsageState, TbQueueCallback callback);
void onDeviceUpdated(Device device, Device old);
void onAssetUpdated(Asset asset, Asset old);
void onCustomerUpdated(Customer customer, Customer old);
void onCalculatedFieldUpdated(CalculatedField cf, CalculatedField old, TbQueueCallback callback);
void onRelationUpdated(TenantId tenantId, EntityRelation relation, TbQueueCallback callback);
void onResourceChange(TbResourceInfo resource, TbQueueCallback callback);
```

### Routing Strategy

Messages are routed to specific nodes using:
1. **TopicPartitionInfo** (for direct partition targeting)
2. **TenantId + EntityId** (for partition-based consistent hashing)
3. **Service ID** (for targeting a specific node by its unique service ID)
4. **Broadcast** (to all nodes of a given service type)

### Queue Message Envelope

```java
public interface TbQueueMsg {
    UUID getKey();              // Partition key
    byte[] getData();           // Serialized payload (protobuf)
    TbQueueMsgHeaders getHeaders();  // Metadata
}
```

Headers carry routing metadata (source service ID, callback topic, message type).

### Request-Reply Pattern

`TbQueueRequestTemplate` and `TbQueueResponseTemplate` enable synchronous-style communication over asynchronous queues. A request message includes a correlation ID and a reply-to topic. The caller blocks (or handles asynchronously) until the response arrives.

## Relationships

- **Depends on:** `common/data` (for entity models, IDs), `common/message` (for message types)
- **Depended on by:** `common/queue`, `application`, `rule-engine`, `transport/*`, `edge-api`, `version-control`
- **Maven groupId:** `org.thingsboard.common`
- **Maven artifactId:** `cluster-api`
