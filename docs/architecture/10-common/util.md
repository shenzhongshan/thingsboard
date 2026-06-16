# Common Util (`common/util`)

**Maven artifact:** `org.thingsboard.common:util`

The `common/util` module provides general-purpose utility classes used across all ThingsBoard modules. These cover JSON processing, geospatial calculations, concurrency, SSL, validation, and system-level helpers.

## Architecture

All utility classes are stateless and thread-safe. They follow a functional/static method pattern and have minimal dependencies (mainly Jackson, SLF4J, and standard Java libraries).

## Utility Classes

### JSON and Serialization

| Class | Purpose |
|-------|---------|
| `JacksonUtil` | Central JSON utility using Jackson ObjectMapper -- serialization, deserialization, tree manipulation, pretty printing |
| `JsonSchemaUtils` | JSON Schema validation using networknt/json-schema-validator |
| `ExpressionUtils` | Expression/variable resolution utilities for script evaluation |

### Concurrency

| Class | Purpose |
|-------|---------|
| `ThingsBoardExecutors` | Factory for creating executors with ThingsBoard naming and thread pool conventions |
| `ThingsBoardThreadFactory` | Custom ThreadFactory with ThingsBoard thread naming, daemon configuration |
| `ThingsBoardForkJoinWorkerThreadFactory` | ForkJoinPool thread factory for parallel processing |
| `ThingsBoardScheduledThreadPoolExecutor` | Scheduled executor with ThingsBoard conventions |
| `ListeningExecutor` | Interface for listenable future executors |
| `AbstractListeningExecutor` | Base class for executors that support listenable futures |
| `DirectListeningExecutor` | Executor that wraps direct (same-thread) execution in a `ListenableFuture` |
| `ExecutorProvider` | Provider interface for obtaining executors |
| `DonAsynchron` | French-named utility for running tasks asynchronously with callback wrapping |
| `NoOpFutureCallback` | No-op `FutureCallback` implementation |
| `RecoveryAware` | Interface for components aware of recovery/restart events |

### Caching and Collections

| Class | Purpose |
|-------|---------|
| `CachedValue` | Generic thread-safe cached value with lazy initialization and TTL |
| `SetCache` | Simple in-memory set with TTL-based expiration |
| `LinkedHashMapRemoveEldest` | LRU-like LinkedHashMap that removes eldest entries on overflow |
| `TbStringPool` | String interning pool for reducing memory from duplicated strings |
| `TbBytePool` | Byte array pool for reducing GC pressure |

### Geospatial

| Class | Purpose |
|-------|---------|
| `GeoUtil` | Geo distance calculation, coordinate validation |
| `Coordinates` | Latitude/longitude pair |
| `Perimeter` | Geographic boundary interface |
| `PerimeterDefinition` | Perimeter definition (DTO) |
| `PerimeterDefinitionSerializer` / `PerimeterDefinitionDeserializer` | Jackson serializers for perimeter types |
| `PerimeterType` | Enum: `CIRCLE`, `POLYGON` |
| `CirclePerimeterDefinition` | Circular geofence (center + radius) |
| `PolygonPerimeterDefinition` | Polygonal geofence (array of coordinate points) |
| `RangeUnit` | Distance unit enum: `METER`, `KILOMETER`, `FOOT`, `MILE`, `NAUTICAL_MILE` |

### Monitoring and Debugging

| Class | Purpose |
|-------|---------|
| `TbStopWatch` | High-resolution stopwatch for performance measurement |
| `DebugModeUtil` | Debug mode detection and logging utilities |
| `SystemUtil` | System information (OS, memory, process info) |
| `ExceptionUtil` | Exception helper utilities |

### Validation and Security

| Class | Purpose |
|-------|---------|
| `SsrfProtectionValidator` | Server-Side Request Forgery (SSRF) protection for HTTP calls made by rule nodes |
| `SslUtil` | SSL/TLS utility methods (key store loading, certificate handling) |
| `RegexUtils` | Regular expression compilation and matching utilities |
| `NumberUtils` | Number parsing and comparison utilities |
| `DeduplicationUtil` | Deduplication logic for entity/telemetry deduplication |
| `KvUtil` | Key-value data manipulation utilities |

### External Service Utilities

| Class | Purpose |
|-------|---------|
| `AzureIotHubUtil` | Azure IoT Hub integration helpers |
| (geo package) | Geofencing utilities for location-based rules |

## Key Usage Patterns

### JacksonUtil

Centralizes all JSON operations. Provides:
- `OBJECT_MAPPER` -- Shared, pre-configured ObjectMapper instance
- `toString(Object o)` / `toPrettyString(Object o)` -- Serialization
- `fromString(String json, Class<T> clazz)` -- Deserialization
- `toJsonNode(String json)` / `fromJsonNode(JsonNode, Class<T>)` -- Tree manipulation
- `ObjectMapper` configuration: `FAIL_ON_UNKNOWN_PROPERTIES=false`, Java 8 time module, `ACCEPT_SINGLE_VALUE_AS_ARRAY`, etc.

### Executor Patterns

```java
// Create a fixed thread pool with ThingsBoard naming
ExecutorService executor = ThingsBoardExecutors.newFixedThreadPool(4, "my-task");

// Create a scheduled executor
ScheduledExecutorService scheduler = ThingsBoardExecutors.newScheduledThreadPool(2, "my-scheduler");

// Create a work-stealing pool (ForkJoinPool)
ExecutorService forkJoin = ThingsBoardExecutors.newWorkStealingPool(8, "my-forkjoin");
```

`ThingsBoardThreadFactory` creates threads with:
- Thread group: `thingsboard`
- Naming: `prefix-{counter}`
- Daemon: configurable
- Uncaught exception handler: configurable

### GeoUtil

Used by the rule engine's geofencing features:
- `distance(Coordinates c1, Coordinates c2, RangeUnit unit)` -- Calculate distance between two points
- `contains(Perimeter perimeter, Coordinates point)` -- Check if a point is inside a geofence

## Relationships

- **Depends on:** Jackson, SLF4J, standard Java libraries -- minimal dependencies
- **Depended on by:** Virtually every module in the project (widest usage of all common modules)
- **Maven groupId:** `org.thingsboard.common`
- **Maven artifactId:** `util`
