# Common Message (`common/message`)

**Maven artifact:** `org.thingsboard.common:message`

The `common/message` module defines all internal message types used for communication between actors, rule engine nodes, queue topics, cluster nodes, and transport services. It is the communication backbone of ThingsBoard.

## Architecture

Messages flow through the system in several layers:

1. **Transport to Core** -- Device telemetry, attributes, RPC responses arrive from transports as `TransportProtos` messages published to Kafka topics
2. **Core to Rule Engine** -- `TbMsg` instances are routed through rule chains for processing
3. **Core to Transport** -- RPC requests and attribute updates flow back to devices
4. **Cluster broadcast** -- Entity state changes, profile updates, and cache evictions are broadcast cluster-wide
5. **Edge sync** -- Edge instances receive entity updates and send telemetry

## Key Types

### TbMsg -- The Core Message

`TbMsg` is the fundamental message type flowing through the rule engine. It carries:

| Field | Type | Purpose |
|-------|------|---------|
| `id` | `UUID` | Unique message identifier |
| `ts` | `long` | Timestamp (epoch millis) |
| `type` | `String` | Human-readable type (e.g., `POST_TELEMETRY`, `POST_ATTRIBUTES_REQUEST`) |
| `internalType` | `TbMsgType` | Enum-based internal type |
| `originator` | `EntityId` | Source entity (device, asset, etc.) |
| `customerId` | `CustomerId` | Associated customer |
| `metaData` | `TbMsgMetaData` | Key-value metadata map |
| `dataType` | `TbMsgDataType` | Payload type (JSON, proto, text) |
| `data` | `String` | JSON payload |
| `queueName` | `String` | Target queue for routing |

`TbMsg` is immutable (final, via Lombok `@Data`). Metadata is carried in `TbMsgMetaData` -- a simple key-value container with utility methods for extracting typed values.

### TbMsgType

The `TbMsgType` enum classifies messages for rule chain routing. Examples:
- `POST_TELEMETRY_REQUEST` -- device posted telemetry
- `POST_ATTRIBUTES_REQUEST` -- device posted attributes
- `TO_SERVER_RPC_REQUEST` -- device-to-server RPC call
- `RPC_CALL_FROM_SERVER_TO_DEVICE` -- server-to-device RPC
- `ACTIVITY_EVENT` -- device connect/disconnect/activity
- `INACTIVITY_EVENT` -- device inactivity timeout
- `LC_EVENT` -- lifecycle event
- `ERROR_EVENT` -- error event
- `ENTITY_CREATED`, `ENTITY_UPDATED`, `ENTITY_DELETED` -- entity lifecycle events
- `ALARM_*` -- alarm lifecycle events

### Actor Messages

`TbActorMsg` is the marker interface for all messages exchanged between actors. Key message classes:

| Class | Purpose |
|-------|---------|
| `TbActorMsg` | Base interface for all actor messages |
| `TbRuleEngineActorMsg` | Messages targeted at rule engine actors (wraps TbMsg) |
| `ToDeviceActorNotificationMsg` | Notifications to device actors (edge update, name change, RPC) |
| `CalculatedFieldStatePartitionRestoreMsg` | Calculated field state restoration |
| `ToCalculatedFieldSystemMsg` | Messages to the calculated field actor system |
| `TbActorStopReason` | Enum for actor stop reasons |

### Subpackage Structure

| Subpackage | Purpose | Key Files |
|-----------|---------|-----------|
| (root) | Core message types | `TbMsg.java`, `TbMsgMetaData.java`, `TbMsgDataType.java`, `TbMsgProcessingCtx.java` |
| `queue/` | Queue-specific messages | `QueueToRuleEngineMsg.java`, `TbMsgCallback.java`, `TopicPartitionInfo.java` |
| `cluster/` | Cluster communication | `ClusterEventMsg.java`, `ServerAddress.java` |
| `rule/` | Rule engine messages | Rule node input/output message types |
| `session/` | Transport session messages | `AdaptorToSessionActorMsg.java`, `BasicTransportToDeviceSessionActorMsg.java` |
| `rpc/` | RPC messages | `FromDeviceRpcResponse.java`, `ToDeviceRpcRequest.java` |
| `edge/` | Edge sync messages | `EdgeEventUpdateMsg.java`, `EdgeHighPriorityMsg.java`, `FromEdgeSyncResponse.java`, `ToEdgeSyncRequest.java` |
| `plugin/` | Plugin lifecycle | `ComponentLifecycleMsg.java` |
| `aware/` | Context-aware messages | `TenantAwareMsg.java`, `CustomerAwareMsg.java` |
| `cf/` | Calculated field messages | `CalculatedFieldLinkedTelemetryMsg.java` |
| `gateway/` | Gateway messages | Gateway-related message types |
| `housekeeper/` | Housekeeper task messages | `HousekeeperTask.java` |
| `notification/` | Notification messages | Notification trigger types |
| `edqs/` | EDQS messages | EDQS-specific message types |
| `timeout/` | Timeout messages | Idle/timeout actor messages |
| `tools/` | Message utilities | Helper classes |

## Message Lifecycle

1. **Creation** -- Transport creates a `TbMsg` from raw device data (protobuf -> TbMsg)
2. **Queuing** -- `TbMsg` is serialized via protobuf and published to a Kafka partition (keyed by entity ID)
3. **Consumption** -- Rule engine consumer reads from Kafka and deserializes
4. **Processing** -- Each rule node in the chain transforms the `TbMsg` (metadata, data, type, originator)
5. **Output** -- Processed `TbMsg` is re-published to the output queue or committed (save timeseries, create alarm, etc.)

## Relationships

- **Depends on:** `common/data` (for entity IDs, types), `common/proto` (for protobuf serialization)
- **Depended on by:** `common/actor`, `common/queue`, `common/cluster-api`, `common/script`, `rule-engine`, `application`, `transport/*`
- **Maven groupId:** `org.thingsboard.common`
- **Maven artifactId:** `message`
