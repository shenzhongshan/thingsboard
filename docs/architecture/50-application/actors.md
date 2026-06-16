# Actor System

The actor system is the core asynchronous processing engine of the ThingsBoard application. It is based on an Akka-like actor model implemented within the `org.thingsboard.server.actors` package and the shared abstractions in `common/actor`.

## Actor Model Concepts

The ThingsBoard actor system uses these core abstractions (defined in the `common/actor` module):

| Interface/Class | Purpose |
|-----------------|---------|
| `TbActor` | Actor implementation -- receives messages, maintains state, processes them |
| `TbActorRef` | Reference/handle to an actor -- used to send messages |
| `TbActorMsg` | Base interface for all messages sent between actors |
| `TbActorCtx` | Actor context -- provides `tell()`, `broadcastToChildren()`, self-reference, etc. |
| `TbActorId` | Unique identifier for an actor (subtypes: `TbEntityActorId`, `TbStringActorId`) |
| `TbActorCreator` | Factory that creates actor instances |
| `TbActorSystem` | The runtime container -- manages dispatchers, creates actors, schedules messages |
| `TbActorSystemSettings` | Configuration: throughput, scheduler pool size, max init attempts |

## Actor Hierarchy

The actor system is organized as a tree:

```
AppActor (root)
  |
  +-- StatsActor (root-level parallel actor)
  |
  +-- TenantActor (one per tenant)
        |
        +-- RuleChainManagerActor (per-tenant rule chain management)
        |     |
        |     +-- RuleChainActor (one per rule chain)
        |           |
        |           +-- RuleNodeActor (one per rule node in the chain)
        |
        +-- DeviceActor (one per device)
        |
        +-- CalculatedFieldManagerActor (per-tenant calculated field management)
              |
              +-- CalculatedFieldEntityActor (one per calculated field entity)
```

## Actor Types

### AppActor

`AppActor.java` -- The root actor of the system. It is the entry point for all incoming messages. Responsibilities:

- **Startup**: Receives `AppInitMsg` after the Spring context is ready, then initializes all tenant actors
- **Message routing**: Forwards messages to the correct `TenantActor` based on the message's `TenantId`
- **Partition changes**: Broadcasts `PartitionChangeMsg` to all child actors when cluster partitions change
- **Component lifecycle**: Handles `ComponentLifecycleMsg` for plugin/component start/stop events
- **Session timeout**: Periodically checks for expired device sessions (when running in TB-CORE mode)

Created by `DefaultActorService.initActorSystem()` on the `app-dispatcher`.

### StatsActor

`StatsActor.java` -- Collects and persists system statistics. Created as a root-level sibling of `AppActor`.

Key messages:
- `StatsPersistMsg` -- Triggers persistence of statistics to the database
- `StatsPersistTick` -- Periodic tick for stats collection

### TenantActor

`TenantActor.java` -- One instance per tenant. This is the central actor for all tenant-level processing. It extends `RuleChainManagerActor`. Responsibilities:

- **Device management**: Creates and manages `DeviceActor` instances for each device
- **Rule chain management** (via superclass `RuleChainManagerActor`): Creates and manages `RuleChainActor` instances
- **Calculated field management**: Manages `CalculatedFieldManagerActor`
- **Message routing**: Routes `DeviceAwareMsg` to the correct `DeviceActor`, `RuleChainAwareMsg` to the correct `RuleChainActor`
- **Edge processing**: Tracks deleted devices for edge synchronization
- **API usage state**: Caches the tenant's API usage state for rate limiting

### DeviceActor

`DeviceActor.java` -- One instance per device. Manages device session state and message processing. Key files in `actors/device/`:

| File | Purpose |
|------|---------|
| `DeviceActor.java` | Main actor -- handles device messages |
| `DeviceActorCreator.java` | Factory for creating DeviceActor instances |
| `DeviceActorMessageProcessor.java` | Processes incoming messages for the device |
| `SessionInfo.java` / `SessionInfoMetaData.java` | Transport session tracking data |
| `SessionTimeoutCheckMsg.java` | Periodic session timeout check trigger |
| `ToDeviceRpcRequestMetadata.java` / `ToServerRpcRequestMetadata.java` | RPC request metadata |
| `TransportSessionCloseReason.java` | Enum for session close reasons |

### Rule Chain Actors

Located in `actors/ruleChain/`:

| File | Purpose |
|------|---------|
| `RuleChainActor.java` | Actor for a single rule chain instance |
| `RuleChainActorMessageProcessor.java` | Processes messages flowing through a rule chain |
| `RuleChainManagerActor.java` | Manages all rule chains for a tenant -- creates and destroys `RuleChainActor` instances |
| `RuleNodeActor.java` | Actor for a single rule node within a chain |
| `RuleNodeActorMessageProcessor.java` | Processes messages at a rule node |
| `RuleNodeCtx.java` | Execution context for a rule node |
| `RuleNodeRelation.java` | Defines the relation (edge) between rule nodes |
| `DefaultTbContext.java` | Default implementation of the rule engine context |
| `RuleEngineComponentActor.java` | Base actor for rule engine components |
| `RuleChainInputMsg.java` / `RuleChainOutputMsg.java` | Input/output message types |
| `RuleChainToRuleChainMsg.java` | Message routed between rule chains |
| `RuleChainToRuleNodeMsg.java` | Message routed from chain to a specific node |
| `RuleNodeToRuleChainTellNextMsg.java` | Message from a node to the chain's "tell next" logic |
| `RuleNodeToSelfMsg.java` | Self-addressed message within a rule node |
| `TbToRuleChainActorMsg.java` / `TbToRuleNodeActorMsg.java` | External messages to chain/node actors |

### Calculated Field Actors

Located in `actors/calculatedField/`:

| File | Purpose |
|------|---------|
| `CalculatedFieldManagerActor.java` | Per-tenant manager for calculated field actors |
| `CalculatedFieldEntityActor.java` | Actor for evaluating a calculated field on a specific entity |
| `AbstractCalculatedFieldActor.java` | Base class with common calculated field logic |
| `CalculatedFieldEntityMessageProcessor.java` | Processes calculated field evaluation messages |
| `CalculatedFieldTelemetryMsg.java` | Telemetry input trigger for calculated field |
| `CalculatedFieldLinkedTelemetryMsg.java` | Telemetry from linked/referenced entities |
| `CalculatedFieldAlarmActionMsg.java` | Alarm-related trigger for calculated field |
| `CalculatedFieldRelationActionMsg.java` | Relation change trigger |
| `CalculatedFieldReevaluateMsg.java` | Periodic re-evaluation trigger |
| `CalculatedFieldStateRestoreMsg.java` | State restoration on partition change |

## Actor Lifecycle and Supervision

### Creation

Actors are created via a `Creator` inner class pattern. Each actor class defines a static `ActorCreator` that extends `ContextBasedCreator`:

```java
public static class ActorCreator extends ContextBasedCreator<DeviceActor> {
    private final DeviceId deviceId;
    public ActorCreator(ActorSystemContext context, DeviceId deviceId) {
        super(context);
        this.deviceId = deviceId;
    }
    @Override
    public DeviceActor createActor() {
        return new DeviceActor(context, deviceId);
    }
}
```

The `TbActorSystem.createRootActor()` method creates root actors (AppActor, StatsActor). Child actors are created by their parent actors using the `TbActorCtx.createChild()` method.

### Initialization

When an actor is created, `init(TbActorCtx)` is called. This is where the actor:
- Schedules periodic messages
- Initializes state
- Calls `super.init(ctx)` to store the context reference

### Message Processing

Actors implement the `TbActor` interface with a `doProcess(TbActorMsg)` method. This method:
1. Checks the message type via `msg.getMsgType()` (an enum with types like `APP_INIT_MSG`, `PARTITION_CHANGE_MSG`, `COMPONENT_LIFE_CYCLE_MSG`, `QUEUE_TO_RULE_ENGINE_MSG`, `TRANSPORT_TO_DEVICE_ACTOR_MSG`, etc.)
2. Routes to the appropriate handler
3. Returns `true` (message processed) or `false` (message not handled)

### Termination

Actors are stopped via `destroy(TbActorStopReason)`. `TbActorStopReason` is an enum with values like `STOPPED` (graceful), `INIT_FAILED` (initialization failure), and `DELETED` (entity deleted).

### Error Handling

When an actor throws a `TbActorException`, the fault is handled by:
1. Logging the error via `ActorSystemContext.persistError()`
2. The parent actor decides whether to restart or stop the child

## Message Routing

### Dispatchers

The actor system uses named dispatchers, each backed by an `ExecutorService`:

| Dispatcher Name | Default Pool Size | Purpose |
|-----------------|-------------------|---------|
| `app-dispatcher` | 1 | Root AppActor |
| `tenant-dispatcher` | 2 | TenantActor instances |
| `device-dispatcher` | 4 | DeviceActor instances |
| `rule-dispatcher` | 8 | RuleChainActor and RuleNodeActor instances |
| `cf-manager-dispatcher` | 2 | CalculatedFieldManagerActor instances |
| `cf-entity-dispatcher` | 8 | CalculatedFieldEntityActor instances |

Pool sizes are configured via `thingsboard.yml` properties under `actors.system.*_dispatcher_pool_size`.

### Message Flow

1. Queue consumers (`DefaultTbCoreConsumerService`, `DefaultTbRuleEngineConsumerService`) receive messages from Kafka/pub-sub
2. Consumers deserialize messages into `TbActorMsg` subtypes
3. Messages are sent to the actor system via `ActorSystemContext.tell(msg)` or `tellWithHighPriority(msg)` -- both route to the `AppActor`
4. `AppActor` determines the target `TenantId` and forwards to the correct `TenantActor`
5. `TenantActor` routes to `DeviceActor`, `RuleChainActor`, or `CalculatedFieldManagerActor` based on message type
6. `RuleChainActor` routes `TbMsg` through `RuleNodeActor` instances following the rule chain DAG

## Actor Context and State

### ActorSystemContext

`ActorSystemContext.java` is a Spring `@Component` that serves as the shared context for all actors. It provides:

- **DAO access**: Injects all DAO services (DeviceService, AssetService, TenantService, etc.)
- **Service access**: All service-layer beans (mail, SMS, telemetry, RPC, edge, etc.)
- **Configuration values**: Actor system settings from `thingsboard.yml`
- **Utility methods**: `persistError()`, `persistLifecycleEvent()`, `persistDebugInput()`, `persistDebugOutput()`
- **Scheduling**: `schedulePeriodicMsgWithDelay()` and `scheduleMsgWithDelay()` for timer-based messages
- **Partition resolution**: `resolve()` methods that determine which partition handles a message

### Shared Actor Components

Located in `actors/shared/`:

| File | Purpose |
|------|---------|
| `AbstractContextAwareMsgProcessor.java` | Base class for message processors with access to ActorSystemContext |
| `ActorTerminationMsg.java` | Message sent when an actor is terminating |
| `ComponentMsgProcessor.java` | Interface for component-level message processors |
| `RuleChainErrorActor.java` | Handles errors in rule chain processing |

### Service Classes

Located in `actors/service/`:

| File | Purpose |
|------|---------|
| `ActorService.java` | Interface for actor system lifecycle |
| `DefaultActorService.java` | Implementation -- initializes the actor system, creates root actors, handles partition changes |
| `ContextAwareActor.java` | Base class for actors that need ActorSystemContext |
| `ContextBasedCreator.java` | Base class for actor creators that pass context |
| `ComponentActor.java` | Base class for component-level actors |

## Key Configuration Properties

All configurable via `thingsboard.yml` under the `actors` prefix:

```yaml
actors:
  session:
    max_concurrent_sessions_per_device: 1
    sync.timeout: 10000
  rule:
    chain.error_persist_frequency: 3000
    node.error_persist_frequency: 3000
    external.force_ack: false
    allow_system_mail_service: true
    allow_system_sms_service: true
  statistics:
    enabled: true
    persist_frequency: 3600000
  rpc:
    submit_strategy: BURST
    close_session_on_rpc_delivery_timeout: false
    response_timeout_ms: 30000
    max_retries: 5
  tenant:
    create_components_on_init: true
  system:
    throughput: 5
    max_actor_init_attempts: 10
    scheduler_pool_size: 1
    app_dispatcher_pool_size: 1
    tenant_dispatcher_pool_size: 2
    device_dispatcher_pool_size: 4
    rule_dispatcher_pool_size: 8
    cfm_dispatcher_pool_size: 2
    cfe_dispatcher_pool_size: 8
```

## Related Documents

- [README](README.md) -- Application module overview
- [Services](services.md) -- Services that interact with the actor system
- [Configuration and Security](config-and-security.md) -- Security configuration
