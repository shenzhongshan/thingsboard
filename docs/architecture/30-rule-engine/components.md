# Rule Node Catalog

A catalog of all 29 rule node categories in `rule-engine/rule-engine-components/src/main/java/org/thingsboard/rule/engine/`, organized by functional domain.

---

## Filter

**Directory:** `filter/`

Nodes that make routing decisions -- send messages down different relations based on data inspection.

| Class | Description | Relations |
|-------|-------------|-----------|
| `TbMsgTypeFilterNode` | Routes messages by `TbMsgType` (POST_TELEMETRY_REQUEST, POST_ATTRIBUTES_REQUEST, etc.) | One relation per selected message type |
| `TbMsgTypeSwitchNode` | Switches message to an output named after the message type | Dynamic: one output per message type |
| `TbOriginatorTypeFilterNode` | Routes by originator entity type (Device, Asset, etc.) | One relation per selected entity type |
| `TbOriginatorTypeSwitchNode` | Switches by originator type | Dynamic: one output per entity type |
| `TbDeviceTypeSwitchNode` | Switches by device profile name | Dynamic: one output per device type |
| `TbAssetTypeSwitchNode` | Switches by asset profile name | Dynamic: one output per asset type |
| `TbCheckMessageNode` | Evaluates message data/metadata against configurable predicates (contains, equals, regex, numeric comparisons) | True, False |
| `TbCheckAlarmStatusNode` | Checks if an alarm exists with given type/severity for the originator | True, False |
| `TbCheckRelationNode` | Checks if a relation exists from the originator to a target entity | True, False |
| `TbJsFilterNode` | Executes a user-defined JavaScript function returning `true`/`false` | True, False |
| `TbJsSwitchNode` | Executes user-defined JavaScript returning the next relation name | Dynamic: relation names from script output |

**Abstract base:** `TbAbstractTypeSwitchNode` -- common switching logic for type-based nodes.

---

## Enrichment / Metadata

**Directory:** `metadata/`

Nodes that fetch additional data and attach it to the message (as metadata or within the payload).

| Class | Description | Output |
|-------|-------------|--------|
| `TbGetAttributesNode` | Fetches attributes for an entity (originator or related) | Success, Failure |
| `TbGetDeviceAttrNode` | Fetches device attributes (shortcut for device-specific lookups) | Success, Failure |
| `TbGetTenantAttributeNode` | Fetches tenant-level attributes | Success, Failure |
| `TbGetCustomerAttributeNode` | Fetches customer-level attributes | Success, Failure |
| `TbGetRelatedAttributeNode` | Fetches attributes from a related entity | Success, Failure |
| `TbGetTelemetryNode` | Fetches latest timeseries for an entity | Success, Failure |
| `TbGetOriginatorFieldsNode` | Fetches entity fields (name, type, additional info) from the originator | Success, Failure |
| `TbGetEntityDataNode` | Generic fetch for configured entity fields | Success, Failure |
| `TbGetTenantDetailsNode` | Fetches tenant details (title, address, etc.) | Success, Failure |
| `TbGetCustomerDetailsNode` | Fetches customer details | Success, Failure |
| `TbGetMappedDataNode` | Maps source data keys to target data keys | Success, Failure |
| `TbFetchDeviceCredentialsNode` | Fetches device credentials (access token, X.509 cert) | Success, Failure |
| `CalculateDeltaNode` | Computes delta (difference) between current and previous telemetry values | Success, Failure |

**Abstract bases:**
- `TbAbstractGetEntityDetailsNode` -- common logic for fetching entity detail fields
- `TbAbstractGetAttributesNode` -- common logic for attribute fetching
- `TbAbstractGetEntityDataNode` -- common logic for entity data fetching
- `TbAbstractGetMappedDataNode` -- common logic for key mapping
- `TbAbstractNodeWithFetchTo` -- common logic for fetch-target routing

---

## Transformation

**Directory:** `transform/`

Nodes that modify the message: payload, metadata, or originator.

| Class | Description | Output |
|-------|-------------|--------|
| `TbTransformMsgNode` | Executes user-defined JavaScript to transform the message payload and/or metadata | Success, Failure |
| `TbChangeOriginatorNode` | Changes the message originator to another entity (source: related entity, customer, tenant, or alarm originator) | Success, Failure |
| `TbJsonPathNode` | Evaluates JSONPath expressions on the message payload and puts results into metadata | Success, Failure |
| `TbRenameKeysNode` | Renames keys in the message payload | Success, Failure |
| `TbDeleteKeysNode` | Deletes keys from the message payload | Success, Failure |
| `TbCopyKeysNode` | Copies keys (optionally with rename) from payload to metadata or vice versa | Success, Failure |
| `TbSplitArrayMsgNode` | Splits a message containing a JSON array into multiple individual messages, one per array element | Success (per element) |
| `TbAbstractTransformNode` | Base for simple transform nodes | -- |

---

## Action

**Directory:** `action/`

Nodes that perform side effects: create/update entities, send commands, log data.

| Class | Description | Output |
|-------|-------------|--------|
| `TbCreateAlarmNode` | Creates or updates an alarm (wraps `create_or_update_active_alarm` logic) | Created, Updated, Failure |
| `TbClearAlarmNode` | Clears an active alarm | Cleared, Failure |
| `TbCreateRelationNode` | Creates an entity relation | Success, Failure |
| `TbDeleteRelationNode` | Deletes an entity relation | Success, Failure |
| `TbAssignToCustomerNode` | Assigns an entity to a customer | Success, Failure |
| `TbUnassignFromCustomerNode` | Unassigns an entity from a customer | Success, Failure |
| `TbDeviceStateNode` | Manages device connectivity state (connected/disconnected) | Success, Failure |
| `TbSaveToCustomCassandraTableNode` | Saves data to a user-defined Cassandra table | Success, Failure |
| `TbLogNode` | Logs the message to the server log (for debugging) | Success |
| `TbMsgCountNode` | Counts messages passing through (for monitoring/rate limiting) | Success |
| `TbCopyAttributesToEntityViewNode` | Copies attributes from the originator entity to its entity views | Success |

**Abstract bases:**
- `TbAbstractAlarmNode` -- shared alarm creation/update logic
- `TbAbstractCustomerActionNode` -- shared customer assignment logic
- `TbAbstractRelationActionNode` -- shared relation management logic

---

## Telemetry

**Directory:** `telemetry/`

Nodes that save timeseries data or attributes.

| Class | Description | Output |
|-------|-------------|--------|
| `TbMsgTimeseriesNode` | Saves message data as timeseries (telemetry) for the originator | Success, Failure |
| `TbMsgAttributesNode` | Saves message data as attributes (server scope) for the originator | Success, Failure |
| `TbMsgDeleteAttributesNode` | Deletes attributes from the originator | Success, Failure |
| `TbCalculatedFieldsNode` | Evaluates calculated fields for the originator and saves results | Success, Failure |

---

## External Integrations

### REST API Call

**Directory:** `rest/`

| Class | Description | Output |
|-------|-------------|--------|
| `TbRestApiCallNode` | Makes an HTTP request (GET, POST, PUT, DELETE, etc.) to an external REST API. Supports configurable headers, body templates, and response handling | Success, Failure |
| `TbSendRestApiCallReplyNode` | Sends an HTTP reply back to a waiting REST API call (request-reply pattern) | Success, Failure |

### Kafka

**Directory:** `kafka/`

| Class | Description | Output |
|-------|-------------|--------|
| `TbKafkaNode` | Publishes a message to a configurable Kafka topic with key, headers, and payload | Success, Failure |

### MQTT

**Directory:** `mqtt/`

| Class | Description | Output |
|-------|-------------|--------|
| `TbMqttNode` | Publishes a message to an MQTT broker (configurable topic, QoS, retain flag) | Success, Failure |

### RabbitMQ

**Directory:** `rabbitmq/`

| Class | Description | Output |
|-------|-------------|--------|
| `TbRabbitMqNode` | Publishes a message to a RabbitMQ exchange with routing key | Success, Failure |

### Email

**Directory:** `mail/`

| Class | Description | Output |
|-------|-------------|--------|
| `TbSendEmailNode` | Sends an email with configurable to/from, subject, and body (supports HTML and template variables) | Success, Failure |
| `TbMsgToEmailNode` | Converts a message payload into an email (`TbEmail` object) for downstream processing | Success, Failure |

### SMS

**Directory:** `sms/`

| Class | Description | Output |
|-------|-------------|--------|
| `TbSendSmsNode` | Sends an SMS via configured SMS provider (Twilio, AWS SNS, etc.) | Success, Failure |

### RPC

**Directory:** `rpc/`

| Class | Description | Output |
|-------|-------------|--------|
| `TbSendRPCRequestNode` | Sends an RPC command to a device (server-to-device) with configurable method, params, and timeout | Success, Failure |
| `TbSendRPCReplyNode` | Sends a reply to a pending RPC request from a device | Success, Failure |

### AWS

**Directory:** `aws/` (subdirectories: `lambda/`, `sns/`, `sqs/`)

| Subdirectory | Description |
|-------------|-------------|
| `lambda/` | Invokes AWS Lambda functions |
| `sns/` | Publishes messages to AWS SNS topics |
| `sqs/` | Sends messages to AWS SQS queues |

### GCP

**Directory:** `gcp/` (subdirectory: `pubsub/`)

| Subdirectory | Description |
|-------------|-------------|
| `pubsub/` | Publishes messages to Google Cloud Pub/Sub topics |

---

## AI

**Directory:** `ai/`

| Class | Description | Output |
|-------|-------------|--------|
| `TbAiNode` | Calls an AI model (configured via AI models in the system) for chat completions, embeddings, or text generation. Supports LangChain4j integration for structured output | Success, Failure |

Supporting files:
- `TbAiNodeConfiguration` -- node configuration (model selection, prompt template, response format)
- `TbResponseFormat` -- enum: TEXT, JSON
- `Langchain4jJsonSchemaAdapter` -- adapter for structured JSON output via LangChain4j

---

## Math

**Directory:** `math/`

| Class | Description | Output |
|-------|-------------|--------|
| `TbMathNode` | Performs mathematical operations (ADD, SUBTRACT, MULTIPLY, DIVIDE, etc.) on message data. Supports custom expressions with configurable arguments from payload/metadata | Success, Failure |

Supporting files:
- `TbRuleNodeMathFunctionType` -- enum of supported operations
- `TbMathArgument` / `TbMathArgumentValue` / `TbMathResult` -- data wrappers

---

## Geo / Geofencing

**Directory:** `geo/`

| Class | Description | Output |
|-------|-------------|--------|
| `TbGpsGeofencingFilterNode` | Checks if GPS coordinates in the message are within/outside a configured geofence polygon or radius | True, False |
| `TbGpsGeofencingActionNode` | Triggers actions based on geofence events (entered, exited, inside, outside) | Success, Failure |

**Abstract base:** `AbstractGeofencingNode` -- shared geofence evaluation logic (polygon point-in-polygon, circle radius checks).

---

## Deduplication

**Directory:** `deduplication/`

| Class | Description | Output |
|-------|-------------|--------|
| `TbMsgDeduplicationNode` | Deduplicates messages based on a configurable key strategy (entire message, originator, tenant, or custom fields). Uses a time-based window | Unique, Duplicate, Failure |

Supporting files:
- `DeduplicationStrategy` -- enum of dedup strategies
- `DeduplicationData` / `DeduplicationId` -- data wrappers for dedup state

---

## Delay

**Directory:** `delay/`

| Class | Description | Output |
|-------|-------------|--------|
| `TbMsgDelayNode` | Delays message processing for a configurable period (fixed duration or derived from message data). Uses scheduled message delivery via Kafka | Success |

---

## Flow Control

**Directory:** `flow/`

| Class | Description | Output |
|-------|-------------|--------|
| `TbRuleChainInputNode` | Entry point for a rule chain. Receives messages from transports or parent chains | Success |
| `TbRuleChainOutputNode` | Exit point -- forwards messages to the parent chain or terminates processing | Success |
| `TbAckNode` | Explicitly acknowledges message processing (marks the message as successfully processed) | Success |
| `TbCheckpointNode` | Creates a checkpoint for message processing. Useful for transactional consistency in complex chains | Success |

---

## Transaction / Synchronization

**Directory:** `transaction/`

| Class | Description | Output |
|-------|-------------|--------|
| `TbSynchronizationBeginNode` | Marks the start of a synchronized transaction block. Begins accumulating messages | Success |
| `TbSynchronizationEndNode` | Marks the end of a synchronized transaction block. Releases accumulated messages | Success |

---

## Edge

**Directory:** `edge/`

| Class | Description | Output |
|-------|-------------|--------|
| `TbMsgPushToEdgeNode` | Pushes a message (entity update) to connected edge instances for synchronization | Success, Failure |
| `TbMsgPushToCloudNode` | Pushes a message from an edge instance up to the cloud | Success, Failure |

**Abstract base:** `AbstractTbMsgPushNode` / `BaseTbMsgPushNodeConfiguration`

---

## Profile / Alarm Rules

**Directory:** `profile/`

| Class | Description | Output |
|-------|-------------|--------|
| `TbDeviceProfileNode` | Evaluates device profile alarm rules against incoming telemetry. Creates/clears alarms based on threshold conditions, schedules, and dynamic predicates | Success, Failure |

Supporting files (alarm rule state machine):
- `AlarmRuleState` / `AlarmState` / `DeviceState` -- state tracking enums
- `AlarmEvalResult` -- alarm evaluation result
- `DataSnapshot` / `SnapshotUpdate` -- telemetry snapshot for alarm evaluation
- `EntityKeyValue` -- entity key-value for dynamic predicates
- `DynamicPredicateValueCtx` -- context for resolving dynamic predicates
- `ProfileState` -- aggregated profile rule state
- `state/` subdirectory -- persistent state management for profile alarm rules

---

## Notifications

**Directory:** `notification/`

| Class | Description | Output |
|-------|-------------|--------|
| `TbNotificationNode` | Sends a notification using the notification center (in-app, webhook, etc.) | Success, Failure |
| `TbSlackNode` | Sends a message to a Slack channel via webhook | Success, Failure |

---

## Debug

**Directory:** `debug/`

| Class | Description | Output |
|-------|-------------|--------|
| `TbMsgGeneratorNode` | Generates synthetic messages for testing rule chains. Configurable message type, payload, and metadata | Success |

---

## Credentials

**Directory:** `credentials/`

Manages credential types for external integrations (HTTP, MQTT, Kafka, etc.).

| Class | Description |
|-------|-------------|
| `AnonymousCredentials` | No authentication |
| `BasicCredentials` | Username/password authentication |
| `CertPemCredentials` | Certificate-based (PEM) authentication |
| `ClientCredentials` | Client ID/secret (OAuth2-style) authentication |
| `CredentialsType` | Enum: ANONYMOUS, BASIC, CERT_PEM, CLIENT |

---

## Utilities

**Directory:** `util/`

Shared utilities used by multiple rule node categories:

| Class | Description |
|-------|-------------|
| `TbMsgSource` | Abstraction for message data source (metadata, payload, or originator attributes) |
| `TenantIdLoader` | Utility for loading tenant ID from message context |
| `EntitiesByNameAndTypeLoader` | Async loader for entities by name and type |
| `EntitiesFieldsAsyncLoader` | Async loader for entity fields |
| `EntitiesRelatedEntityIdAsyncLoader` | Async loader for related entity IDs |
| `EntitiesAlarmOriginatorIdAsyncLoader` | Async loader for alarm originator IDs |
| `ContactBasedEntityDetails` | Shared data for entity detail nodes (tenant, customer) |
| `GpsGeofencingEvents` | GPS geofencing event constants |
| `SemaphoreWithTbMsgQueue` | Semaphore-based message queue for rate limiting |
| `DataToFetch` | Enum controlling what data to fetch (LATEST_TELEMETRY, ATTRIBUTES, FIELDS, etc.) |
| `FetchMode` | Enum: FIRST, LAST, ALL |

---

## Data (Query Types)

**Directory:** `data/`

Shared data classes for relation-based queries:

| Class | Description |
|-------|-------------|
| `RelationsQuery` | Defines a relation query (direction, relation type, entity types) |
| `DeviceRelationsQuery` | Device-specific relation query with device profile filter |

---

## Summary: Component Type Categories

| Category | Type | Count |
|----------|------|-------|
| `filter/` | FILTER | ~11 nodes |
| `metadata/` | ENRICHMENT | ~13 nodes |
| `transform/` | TRANSFORMATION | ~8 nodes |
| `action/` | ACTION | ~11 nodes |
| `telemetry/` | ACTION | ~4 nodes |
| `rest/` | EXTERNAL | ~2 nodes |
| `kafka/` | EXTERNAL | 1 node |
| `mqtt/` | EXTERNAL | 1 node |
| `rabbitmq/` | EXTERNAL | 1 node |
| `mail/` | EXTERNAL | ~2 nodes |
| `sms/` | EXTERNAL | 1 node |
| `rpc/` | ACTION | ~2 nodes |
| `aws/` | EXTERNAL | 3 subcategories (Lambda, SNS, SQS) |
| `gcp/` | EXTERNAL | 1 subcategory (Pub/Sub) |
| `ai/` | EXTERNAL | 1 node |
| `math/` | TRANSFORMATION | 1 node |
| `geo/` | FILTER + ACTION | 2 nodes |
| `deduplication/` | FILTER | 1 node |
| `delay/` | ACTION | 1 node |
| `flow/` | FLOW | 4 nodes |
| `transaction/` | FLOW | 2 nodes |
| `edge/` | ACTION | 2 nodes |
| `profile/` | FILTER + ACTION | 1 node |
| `notification/` | ACTION | 2 nodes |
| `debug/` | ACTION | 1 node |
| `credentials/` | -- (support) | 5 credential types |
| `util/` | -- (support) | ~12 utilities |
| `data/` | -- (support) | 2 query classes |

**Total: 223 Java files across 29 categories**

## Related Documents

- [Rule Engine Overview](README.md) -- architecture, message lifecycle, API reference
- [DAO Layer Overview](../20-dao/README.md) -- how rule nodes access the database
