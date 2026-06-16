# Common Proto (`common/proto`)

**Maven artifact:** `org.thingsboard.common:proto`

The `common/proto` module defines Protobuf message schemas for inter-service communication. These schemas are used by Kafka queue serialization, gRPC service definitions, and the transport layer.

## Proto Files

| File | Package | Generated Java Class | Purpose |
|------|---------|---------------------|---------|
| `queue.proto` | `msgqueue` | `MsgProtos` | Queue message envelope, TbMsg protobuf serialization |
| `transport.proto` | `transport` | `TransportProtos` | All transport-layer messages, service discovery, core communication |
| `jsinvoke.proto` | `js` | `JsInvokeProtos` | Remote JS executor communication |

Additionally, `edge.proto` in `common/edge-api/` defines the Edge gRPC service and message types (see [edge-api.md](edge-api.md)).

### queue.proto

Defines the protobuf representation of `TbMsg` for Kafka serialization:

- `TbMsgProto` -- Full TbMsg serialization including UUID, type, entity IDs, metadata map, customer ID, rule chain/node IDs, and data payload
- `TbMsgMetaDataProto` -- Key-value map serialization
- `TbMsgProcessingStackItemProto` -- Rule node processing stack for loop detection

### transport.proto

The most comprehensive proto file (1934 lines). Defines all messages exchanged between services. Key sections:

#### Entity Type Proto
`EntityTypeProto` enum with 35+ values mapping to `EntityType` (TENANT, CUSTOMER, USER, DASHBOARD, ASSET, DEVICE, ALARM, RULE_CHAIN, RULE_NODE, ENTITY_VIEW, WIDGETS_BUNDLE, WIDGET_TYPE, TENANT_PROFILE, DEVICE_PROFILE, ASSET_PROFILE, API_USAGE_STATE, TB_RESOURCE, OTA_PACKAGE, EDGE, RPC, QUEUE, NOTIFICATION*, OAUTH2_CLIENT, DOMAIN, MOBILE_APP, MOBILE_APP_BUNDLE, CALCULATED_FIELD, JOB, ADMIN_SETTINGS, AI_MODEL, API_KEY).

#### Service Discovery
- `ServiceInfo` -- Node metadata (service ID, types, transports, system info)
- `SystemInfoProto` -- CPU, memory, disk usage

#### Transport-Service Messages
- `SessionInfoProto` -- Device session state
- `PostTelemetryMsg` / `PostAttributeMsg` -- Device data upload
- `GetAttributeRequestMsg` / `GetAttributeResponseMsg` -- Attribute fetch
- `ToDeviceRpcRequestMsg` / `ToDeviceRpcResponseMsg` -- RPC commands
- `ValidateDeviceTokenRequestMsg` / `ValidateDeviceX509CertRequestMsg` -- Authentication
- `ProvisionDeviceRequestMsg` / `ProvisionDeviceResponseMsg` -- Device provisioning
- `ClaimDeviceMsg` -- Device claiming
- `GetOtaPackageRequestMsg` / `GetOtaPackageResponseMsg` -- OTA firmware
- `SubscribeToAttributeUpdatesMsg` / `SubscribeToRPCMsg` -- Subscriptions
- `SessionCloseNotificationProto` -- Session termination

#### Core-to-Core Messages
- `ToCoreMsg` -- Messages from transport to core (device sessions, telemetry, RPC, entity subscriptions)
- `ToCoreNotificationMsg` -- High-priority core notifications (RPC responses, queue updates, lifecycle events)
- `ToRuleEngineMsg` -- Messages forwarded to the rule engine
- `ToTransportMsg` -- Messages from core to transport (RPC, attribute updates, entity changes)
- `SubscriptionMgrMsgProto` -- Timeseries/attribute/alarm subscription management
- `ComponentLifecycleMsgProto` -- Entity lifecycle event broadcasting (CREATED, UPDATED, DELETED, etc.)

#### Edge Messages
- `EdgeNotificationMsgProto` -- Edge entity sync notifications
- `ToEdgeSyncRequestMsgProto` / `FromEdgeSyncResponseMsgProto` -- Edge sync protocol
- `EdgeEventUpdateMsgProto` / `EdgeHighPriorityMsgProto` -- Edge state updates
- `ToEdgeMsg` / `ToEdgeNotificationMsg` -- Messages to edge queue

#### Version Control Messages
- `CommitRequestMsg` / `CommitResponseMsg` -- Git commit operations
- `ListVersionsRequestMsg` / `ListVersionsResponseMsg` -- Version history listing
- `EntityContentRequestMsg` / `EntityContentResponseMsg` -- Entity content retrieval
- `VersionsDiffRequestMsg` / `VersionsDiffResponseMsg` -- Diff between versions
- `ToVersionControlServiceMsg` -- Version control service request envelope

#### Calculated Fields
- `CalculatedFieldTelemetryMsgProto` -- Calculated field telemetry
- `CalculatedFieldStateProto` -- Calculated field evaluation state (single value args, rolling, geofencing, aggregation)
- `ToCalculatedFieldMsg` / `ToCalculatedFieldNotificationMsg` -- Calculated field messages

#### EDQS Messages
- `ToEdqsMsg` / `FromEdqsMsg` -- EDQS event and request messages
- `EdqsEventMsg` / `EdqsRequestMsg` / `EdqsResponseMsg` -- EDQS protocol

#### Other
- `ToUsageStatsServiceMsg` -- API usage statistics
- `ToOtaPackageStateServiceMsg` -- OTA state updates
- `NotificationSchedulerServiceMsg` -- Notification scheduling
- `HousekeeperTaskProto` -- Data cleanup tasks
- `JobStatsMsg` / `TaskResultProto` -- Job execution tracking
- `AlarmStateProto` -- Calculated field alarm rule states

#### Top-Level Message Routing
```protobuf
message TransportApiRequestMsg { ... }   // Transport -> Core
message TransportApiResponseMsg { ... }   // Core -> Transport
message ToCoreMsg { ... }                // Transport/Core -> Core
message ToCoreNotificationMsg { ... }     // High-priority core notifications
message ToRuleEngineMsg { ... }           // Core -> Rule Engine
message ToTransportMsg { ... }            // Core/RE -> Transport
message ToEdgeMsg { ... }                 // Core -> Edge
message ToVersionControlServiceMsg { ... } // Core -> Version Control
```

### jsinvoke.proto

Defines the protocol for communicating with the remote JS executor (Node.js sidecar):

- `RemoteJsRequest` -- Contains compile/invoke/release sub-requests
- `RemoteJsResponse` -- Contains compile/invoke/release sub-responses
- `JsCompileRequest` / `JsCompileResponse` -- Script compilation
- `JsInvokeRequest` / `JsInvokeResponse` -- Script execution (function name, args, timeout)
- `JsReleaseRequest` / `JsReleaseResponse` -- Script release/cleanup
- `JsInvokeErrorCode` -- COMPILATION_ERROR, RUNTIME_ERROR, TIMEOUT_ERROR, NOT_FOUND_ERROR

## Generated Code

Protobuf compilation produces Java classes under:
- `org.thingsboard.server.gen.transport.TransportProtos`
- `org.thingsboard.server.gen.transport.TransportApiProtos`
- `org.thingsboard.server.gen.transport.MsgProtos`
- `org.thingsboard.server.gen.edge.v1.EdgeProtos`
- `org.thingsboard.server.gen.js.JsInvokeProtos`

## Relationships

- **Depends on:** Nothing within common (standalone proto definitions)
- **Depended on by:** `common/message`, `common/queue`, `common/script`, `common/edge-api`, `application`, `transport/*`, `rule-engine`
- **Maven groupId:** `org.thingsboard.common`
- **Maven artifactId:** `proto`
