# Common Actor (`common/actor`)

**Maven artifact:** `org.thingsboard.common:actor`

The `common/actor` module provides actor system abstractions inspired by the Akka actor model. Every device, tenant, rule chain, and calculated field in ThingsBoard runs as an isolated actor that processes messages asynchronously in its own thread context.

## Architecture

### Actor Model

An actor is a lightweight concurrency primitive: each actor has a mailbox (incoming message queue) and processes messages sequentially, one at a time. This eliminates the need for locks and provides natural isolation. The actor system manages actor lifecycle, message routing, and failure recovery.

Key concepts:
- **Actor** -- A unit of computation with private state and a mailbox
- **ActorRef** -- A handle to an actor (for sending messages)
- **ActorSystem** -- The runtime that manages actors, dispatchers, and mailboxes
- **Dispatcher** -- Thread pool that executes actors
- **Mailbox** -- Per-actor message queue

## Core Interfaces and Classes

| Class/Interface | Purpose |
|----------------|---------|
| `TbActor` | Core actor interface: `process(TbActorMsg)` returns true if message was handled |
| `TbActorRef` | Reference/handle to an actor for sending messages |
| `TbActorCtx` | Actor context -- provides self-ref, parent, child creation, system access |
| `TbActorId` | Actor identifier (typed, comparable) |
| `TbActorSystem` | Actor system lifecycle management (create, stop, find actors) |
| `TbActorCreator` | Factory for creating actor instances |
| `TbActorSystemSettings` | Configuration for the actor system (thread pools, dispatchers) |
| `TbActorMailbox` | Per-actor message queue |
| `Dispatcher` | Thread dispatcher assignment for actors |
| `InitFailureStrategy` | How to handle actor initialization failures (retry with delay, stop) |
| `ProcessFailureStrategy` | How to handle message processing failures (resume, stop) |
| `TbActorNotRegisteredException` | Exception when referencing a non-existent actor |
| `TbActorException` | Base actor system exception |
| `TbRuleNodeUpdateException` | Exception for rule node update failures |

### Actor Types

Actors are identified by their `TbActorId`:

| Actor ID Class | ID Type | Used For |
|---------------|---------|---------|
| `TbEntityActorId` | EntityId-based | Device, tenant, rule chain, asset actors |
| `TbStringActorId` | String-based | Named actors (system services, stats) |
| `TbCalculatedFieldEntityActorId` | CalculatedField-based | Calculated field evaluation actors |

### Actor Lifecycle

```
Create -> Init -> Process (loop) -> Destroy
                    |
            (failure handling)
                    |
          InitFailureStrategy / ProcessFailureStrategy
```

1. **Create** -- `TbActorCreator.createActor()` instantiates the actor
2. **Init** -- `TbActor.init(TbActorCtx)` is called; actor sets up its state
3. **Process** -- Messages arrive via `TbActor.process(TbActorMsg)`; processed sequentially
4. **Destroy** -- `TbActor.destroy(TbActorStopReason, Throwable)` cleans up resources
5. **Failure** -- `InitFailureStrategy` and `ProcessFailureStrategy` define retry/stop behavior

### DefaultTbActorSystem

`DefaultTbActorSystem` is the primary implementation (resides in `application/`):

```java
public class DefaultTbActorSystem implements TbActorSystem {
    // Manages actor registry, dispatchers, mailboxes, schedulers
    // Routes messages to actors based on TbActorId
}
```

### Failure Strategies

```java
// Initialization failure: retry with exponential backoff
InitFailureStrategy.retryWithDelay(5000L * attempt);

// Processing failure: skip the message and continue
ProcessFailureStrategy.resume();

// Processing failure: stop the actor entirely
ProcessFailureStrategy.stop();
```

### Mailbox and Dispatching

Each actor has a dedicated `TbActorMailbox`. The `Dispatcher` assigns actors to a thread pool (e.g., a fixed pool of N threads). Actors on the same dispatcher share threads but maintain sequential processing per actor. The system supports multiple dispatchers for workload isolation (e.g., separate dispatchers for device actors vs rule chain actors).

### Actor Hierarchy

Actors form a tree:
- **System root** -- `TbActorSystem`
  - **App actors** -- One per service component
    - **Tenant actors** -- One per tenant
      - **Rule chain actors** -- One per rule chain per tenant
      - **Device actors** -- One per device per tenant
      - **Asset actors** -- One per asset
    - **Stats actors** -- System-level statistics

Messages are routed through the hierarchy. `TbActorCtx` provides methods for finding child actors by ID and telling (sending messages to) parent or child actors.

## AbstractTbActor

`AbstractTbActor` provides a base implementation with common patterns:

```java
public abstract class AbstractTbActor implements TbActor {
    protected TbActorCtx ctx;

    @Override
    public void init(TbActorCtx ctx) {
        this.ctx = ctx;
    }

    // Subclasses override process()
}
```

## Relationships

- **Depends on:** `common/data` (for TbActorMsg types from `common/message`)
- **Depended on by:** `application` (actor implementations), `common/message` (TbActorMsg interface)
- **Maven groupId:** `org.thingsboard.common`
- **Maven artifactId:** `actor`
