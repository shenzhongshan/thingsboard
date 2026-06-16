# Rule Engine

The ThingsBoard Rule Engine is a configurable data processing pipeline based on directed acyclic graphs (DAGs) of rule nodes. It processes every message entering the system -- telemetry, attribute updates, RPC calls, device lifecycle events -- and routes them through user-defined chains of nodes that can filter, transform, enrich, and act upon the data.

## Architecture

### Rule Chain as a DAG

Each **rule chain** is a directed acyclic graph:
- **Nodes** (vertices) are rule node instances -- Java classes implementing `TbNode`.
- **Edges** connect nodes via typed relations (e.g., `"Success"`, `"Failure"`, `"True"`, `"False"`, or custom relation types).
- Both nodes and edges are stored as JSON in the SQL database (`rule_chain.configuration` and `rule_node.configuration` columns).

A rule chain is defined by:
```json
{
  "nodes": [
    {
      "id": "uuid",
      "type": "org.thingsboard.rule.engine.filter.TbMsgTypeFilterNode",
      "name": "Filter Telemetry",
      "configuration": { ... },
      "additionalInfo": { "layoutX": 100, "layoutY": 200 }
    }
  ],
  "connections": [
    {
      "fromIndex": 0,
      "toIndex": 1,
      "type": "True"
    }
  ]
}
```

### Message Lifecycle

1. **Origin**: A device sends telemetry/attributes/RPC via a transport (MQTT, HTTP, CoAP, etc.), or an internal event triggers.
2. **Queue**: The transport converts the input into a `TbMsg` and pushes it to a Kafka topic.
3. **Actor dispatch**: The application consumes from Kafka and routes the message to the appropriate **rule chain actor**.
4. **Root node**: The rule chain actor starts processing at the **first rule node** (the "input" node).
5. **Node traversal**: Each node receives the `TbMsg`, performs its logic, and tells the chain actor which relation to follow via `ctx.tellNext(msg, relationType)` or `ctx.tellFailure(msg)`.
6. **Output**: If the message reaches a "rule chain output" node, it is forwarded to the next rule chain (or the root chain terminates).

### `TbMsg` -- The Message Object

`TbMsg` is the immutable message object flowing through rule chains. Key fields:
- `id` -- unique message UUID
- `type` -- message type (e.g., `POST_TELEMETRY_REQUEST`, `POST_ATTRIBUTES_REQUEST`, `ATTRIBUTES_UPDATED`, `RPC_CALL_FROM_SERVER_TO_DEVICE`)
- `originator` -- the entity ID that triggered the message (device, asset, etc.)
- `customerId` -- associated customer ID (may be null)
- `data` -- the payload as a JSON string (telemetry, attributes, RPC params)
- `metaData` -- key-value metadata map (device name, device type, additional context)

### `TbMsgMetaData`

A key-value map attached to every message. Nodes can read, add, or modify metadata fields. Common metadata fields: `deviceName`, `deviceType`, `ts` (timestamp), `scope` (for attributes), `requestId` (for RPC).

## Rule Node Types

The `@RuleNode` annotation categorizes each node by `ComponentType`:

| Type | Purpose | Examples |
|------|---------|----------|
| **FILTER** | Conditionally route messages based on data inspection | Message type filter, originator type filter, JS filter, check alarm status |
| **ENRICHMENT** | Fetch additional data and attach to the message | Get attributes, get device details, get tenant details, fetch credentials |
| **TRANSFORMATION** | Modify message payload, metadata, or originator | Script transform, change originator, rename/delete keys, JSON path |
| **ACTION** | Perform side effects | Create alarm, clear alarm, save timeseries, save attributes, send email, RPC call, log |
| **EXTERNAL** | Integrate with external systems | REST API call, Kafka publish, MQTT publish, RabbitMQ, AWS SNS/SQS/Lambda, GCP Pub/Sub, send SMS |
| **FLOW** | Control message flow through chains | Input node (entry), output node (exit to parent), checkpoint, acknowledgement |

## Rule Engine API

The rule engine API lives in `rule-engine/rule-engine-api/src/main/java/org/thingsboard/rule/engine/api/`.

### `TbNode` -- Core Interface

```java
public interface TbNode {
    void init(TbContext ctx, TbNodeConfiguration configuration) throws TbNodeException;
    void onMsg(TbContext ctx, TbMsg msg) throws TbNodeException;
    default void destroy() {}
    default void onPartitionChangeMsg(TbContext ctx, PartitionChangeMsg msg) {}
    default TbPair<Boolean, JsonNode> upgrade(int fromVersion, JsonNode oldConfiguration) throws TbNodeException;
}
```

- **`init()`** -- called once when the node is created. Receives its JSON configuration (deserialized from `rule_node.configuration`).
- **`onMsg()`** -- called for every message that arrives at this node. The node processes the message and calls `ctx.tellNext()`, `ctx.tellFailure()`, or creates new messages via `ctx.newMsg()`.
- **`destroy()`** -- cleanup when the node is removed.
- **`onPartitionChangeMsg()`** -- handles partition reassignment in clustered deployments.
- **`upgrade()`** -- migrates configuration from older versions.

### `TbContext` -- Service Access

`TbContext` provides the node access to all platform services:

```
ctx.getDeviceService()       -> DeviceService
ctx.getAssetService()        -> AssetService
ctx.getAlarmService()        -> AlarmService
ctx.getTelemetryService()    -> TelemetryService
ctx.getRpcService()          -> RPC service
ctx.getMailService()         -> Email sending
ctx.getSmsService()          -> SMS sending
ctx.getNotificationCenter()  -> Notifications
// ... 40+ services available
```

Message routing methods:
- `ctx.tellNext(msg, relationType)` -- forward to the next node along a specific relation
- `ctx.tellFailure(msg, error)` -- forward along the "Failure" relation
- `ctx.newMsg(msg)` -- create a new message (for generating new TbMsgs)
- `ctx.ack(msg)` -- acknowledge message processing
- `ctx.getCallback(msg)` -- get a callback for async operations

### `@RuleNode` Annotation

```java
@RuleNode(
    type = ComponentType.FILTER,
    name = "message type switch",
    configClazz = EmptyNodeConfiguration.class,
    relationTypes = {"Success"},
    nodeDescription = "Route incoming messages by Message Type",
    nodeDetails = "...",
    uiResources = {"static/rulenode/rulenode-core-config.js"},
    configDirective = "tbEnrichedNodeConfig"
)
```

This annotation registers the node with the component scanner. Key attributes:
- `type` -- `ComponentType` enum value (FILTER, ENRICHMENT, TRANSFORMATION, ACTION, EXTERNAL, FLOW)
- `configClazz` -- configuration class for deserializing the node's JSON configuration
- `relationTypes` -- the set of output relation types this node can produce
- `customRelations` -- if true, allows user-defined relation names
- `ruleChainNode` -- if true, this node represents a sub-chain link
- `version` -- configuration version for upgrade support

### `NodeDefinition`

Created at runtime from the `@RuleNode` annotation data. Used by the UI to render the rule node palette and configuration forms. Contains:
- `details`, `description` -- human-readable text
- `inEnabled`, `outEnabled` -- whether the node has input/output endpoints
- `defaultConfiguration` -- default JSON configuration
- `uiResources`, `configDirective` -- UI rendering hints

### Key API Interfaces

| Interface | Purpose |
|-----------|---------|
| `TbNode` | Core rule node lifecycle: init, process, destroy |
| `TbContext` | Service access + message routing for nodes |
| `NodeConfiguration` | Marker base class for node configuration objects |
| `TbNodeConfiguration` | Wraps JSON config and provides typed accessors |
| `TbNodeState` | Persistent state for stateful nodes (serialized JSON) |
| `NodeDefinition` | Node metadata for UI component palette |
| `RuleEngineDeviceProfileCache` | Cached device profiles for rule engine use |
| `RuleEngineAssetProfileCache` | Cached asset profiles for rule engine use |
| `RuleEngineTelemetryService` | Telemetry operations from rule nodes |
| `RuleEngineAlarmService` | Alarm operations from rule nodes |
| `RuleEngineRpcService` | RPC operations from rule nodes |
| `MailService` | Email sending interface |
| `SmsService` / `SmsSender` / `SmsSenderFactory` | SMS sending |
| `ScriptEngine` | JS/Python script execution interface |
| `NotificationCenter` / `SlackService` / `FirebaseService` | Notification channels |

## Actor System Integration

Each rule chain is backed by an actor (`RuleChainActor`). The actor system:

1. **Processes messages sequentially** per chain -- only one message is processed at a time within a single rule chain, ensuring deterministic behavior within that chain.
2. **Isolates tenant chains** -- each tenant has its own root rule chain actor, plus sub-chain actors.
3. **Handles concurrency** via the queue system -- multiple rule chain actors run in parallel across the cluster.
4. **Persists node state** -- stateful nodes (deduplication, checkpoint, delay) persist state via `RuleNodeState` records in the database.

### Processing Flow

```
Transport -> Kafka Queue -> RuleChainActorMessageProcessor
                                |
                                v
                        RuleChainActor
                                |
              +-----------------+------------------+
              |                                    |
         TbNode.onMsg()                       TbNode.onMsg()
              |                                    |
         ctx.tellNext()                       ctx.tellNext()
              |                                    |
              v                                    v
         Next Node                            Next Node
              |                                    |
         ... (continues through DAG)        ...
              |
         ctx.tellNext() with "Output" relation type
              |
              v
         Forward to parent chain (or end)
```

## Component System

Rule node components live in `rule-engine/rule-engine-components/src/main/java/org/thingsboard/rule/engine/` with **29 category directories** containing **223 Java files**.

Components are auto-discovered at startup via the `@RuleNode` annotation and registered in the `component_descriptor` table. The UI reads this table to build the rule node palette.

Each component typically consists of:
- A `Tb...Node` class (implements `TbNode`)
- A `Tb...NodeConfiguration` class (implements `NodeConfiguration`)

## Related Documents

- [Rule Node Catalog](components.md) -- detailed catalog of all rule node categories and implementations
- [DAO Layer Overview](../20-dao/README.md) -- how rule nodes access persistent data
- [Entity DAO Catalog](../20-dao/entity-dao.md) -- entity DAOs used by rule engine services
