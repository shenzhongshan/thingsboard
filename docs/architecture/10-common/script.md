# Common Script (`common/script`)

**Maven artifact:** `org.thingsboard.common:script` (parent POM, type `pom`)

The `common/script` module provides the script execution engine abstractions for ThingsBoard's rule engine. It supports two scripting languages (TBEL and JavaScript) and can execute scripts locally or remotely via a Node.js sidecar.

## Sub-Modules

| Sub-Module | Maven artifact | Purpose |
|-----------|---------------|---------|
| `script-api` | `org.thingsboard.common:script-api` | Core script invoke service interfaces, TBEL and JS implementations |
| `remote-js-client` | `org.thingsboard.common:remote-js-client` | Client for invoking scripts on a remote JS executor (Node.js sidecar) |

## Architecture

### Script Languages

| Language | Enum | Implementation | Use Case |
|----------|------|---------------|---------|
| TBEL | `ScriptType.TBEL` | `DefaultTbelInvokeService` | Rule chains, filters, transformations (default) |
| JavaScript (Nashorn) | `ScriptType.JS` | `NashornJsInvokeService` / `RemoteJsInvokeService` | Legacy/complex scripts |

TBEL (ThingsBoard Expression Language) is a lightweight expression language optimized for JSON processing and telemetry manipulation. It is the recommended and default script language.

JavaScript support is maintained for backward compatibility and can run locally (Nashorn, embedded) or remotely (Node.js sidecar) for sandbox isolation.

### Script Invocation Flow

1. **Script compilation** -- Script source is compiled/validated (`JsCompileRequest` or TBEL parse)
2. **Script caching** -- Compiled scripts are cached by hash to avoid re-compilation
3. **Execution** -- `TbScriptExecutionTask` wraps a script invocation with timeout and arguments
4. **Result** -- Execution returns a JSON string result or throws `TbScriptException`

## script-api

### Core Interfaces and Classes

| Class/Interface | Purpose |
|----------------|---------|
| `ScriptInvokeService` | Top-level interface for script execution |
| `AbstractScriptInvokeService` | Base implementation with caching, blocking detection |
| `ScriptType` | Enum: `TBEL`, `JS` (JavaScript) |
| `TbScriptExecutionTask` | Execution task with script, timeout, args, callback |
| `TbScriptException` | Exception for script compilation/runtime errors |
| `ScriptStatCallback` | Callback for script execution statistics |
| `BlockedScriptInfo` | Tracks blocked/stale scripts |
| `RuleNodeScriptFactory` | Interface for creating rule node scripts |

### JavaScript (JS)

| Class/Interface | Purpose |
|----------------|---------|
| `JsInvokeService` | JavaScript-specific invoke service interface |
| `AbstractJsInvokeService` | Base JS implementation |
| `JsScriptInfo` | Compiled JS script metadata (function name, MJS module) |
| `JsScriptExecutionTask` | JS-specific execution task |
| `JsValidator` | JS script syntax validation |
| `NashornJsInvokeService` | In-process JS execution via Nashorn engine |

### TBEL (ThingsBoard Expression Language)

| Class/Interface | Purpose |
|----------------|---------|
| `TbelInvokeService` | TBEL-specific invoke service interface |
| `DefaultTbelInvokeService` | TBEL execution engine implementation |
| `TbelScript` | TBEL script representation |
| `TbelScriptExecutionTask` | TBEL-specific execution task |
| `TbDate` | Date manipulation utilities for TBEL |
| `TbJson` | JSON manipulation utilities for TBEL |
| `TbUtils` | General TBEL utilities |
| `TbTimeWindow` | Time-window configuration for aggregation |
| `DateTimeFormatOptions` | Date formatting options |

#### Calculated Field Arguments (TBEL)

These types define argument passing from calculated fields to TBEL scripts:

| Class | Purpose |
|-------|---------|
| `TbelCfCtx` | Calculated field execution context |
| `TbelCfArg` | Base argument interface |
| `TbelCfSingleValueArg` | Single telemetry value argument |
| `TbelCfTsDoubleVal` | Timeseries double value pair (ts, value) |
| `TbelCfTsMultiDoubleVal` | Multiple timeseries double values |
| `TbelCfTsRollingArg` | Rolling window timeseries argument |
| `TbelCfTsRollingData` | Rolling window data container |
| `TbelCfGeofencingArg` | Geofencing zone argument |
| `TbelCfPropagationArg` | Propagation argument (linked entities) |
| `TbelCfRelatedEntitiesArgumentValue` | Related entity query result |
| `TbelCfObject` | Generic CF object |

## remote-js-client

Provides the client side of the remote JS execution protocol (communiques with `msa/js-executor` via protobuf/Kafka):

| Class | Purpose |
|-------|---------|
| `RemoteJsInvokeService` | Client that sends JS invoke requests over the queue |
| `JsExecutorService` | JavaScript execution interface |
| `RemoteJsRequestEncoder` | Encodes `JsInvokeProtos.RemoteJsRequest` for the queue |
| `RemoteJsResponseDecoder` | Decodes `JsInvokeProtos.RemoteJsResponse` from the queue |

Remote execution flow:
1. `RemoteJsInvokeService` creates a `JsInvokeProtos.RemoteJsRequest`
2. Request is published to the JS executor's Kafka topic with a correlation key
3. The `RemoteJsResponseDecoder` deserializes the response
4. The result is returned to the caller

The protobuf-based protocol (see [proto.md](proto.md), `jsinvoke.proto`) supports:
- `JsCompileRequest` / `JsCompileResponse` -- Compile and cache a script
- `JsInvokeRequest` / `JsInvokeResponse` -- Execute a script with arguments and timeout
- `JsReleaseRequest` / `JsReleaseResponse` -- Release a cached script

Error codes: `COMPILATION_ERROR`, `RUNTIME_ERROR`, `TIMEOUT_ERROR`, `NOT_FOUND_ERROR`.

## Relationships

- **Depends on:** `common/data`, `common/message`, `common/proto` (for js invoke protobuf), `common/cache`, Jackson, GraalJS (JavaScript engine) or Nashorn, ANTLR (TBEL parser)
- **Depended on by:** `rule-engine/rule-engine-components`, `application`
- **Maven groupId:** `org.thingsboard.common`
- **Maven artifactId:** `script` (parent), `script-api`, `remote-js-client`
