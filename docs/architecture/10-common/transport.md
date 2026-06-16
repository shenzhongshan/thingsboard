# Common Transport (`common/transport`)

**Maven artifact:** `org.thingsboard.common:transport` (parent POM, type `pom`)

The `common/transport` module is a parent POM containing transport-shared sub-modules. Each sub-module provides shared abstractions for a specific device communication protocol. Transport implementations (in `transport/*`) extend these shared classes.

## Sub-Modules

| Sub-Module | Maven artifact | Purpose |
|-----------|---------------|---------|
| `transport-api` | `org.thingsboard.common:transport-api` | Core transport abstractions (sessions, credentials, context) |
| `coap` | `org.thingsboard.common:transport-coap` | CoAP transport shared classes |
| `http` | `org.thingsboard.common:transport-http` | HTTP transport shared classes |
| `mqtt` | `org.thingsboard.common:transport-mqtt` | MQTT transport shared classes |
| `lwm2m` | `org.thingsboard.common:transport-lwm2m` | LwM2M transport shared classes |
| `snmp` | `org.thingsboard.common:transport-snmp` | SNMP transport shared classes |

## transport-api

Provides the core transport abstractions used by all protocol implementations. Key classes include:

| Class | Purpose |
|-------|---------|
| `TransportContext` | Transport-level context (device profile, credentials, session info) |
| `DeviceSessionInfo` | Device session state (session ID, last activity time, subscriptions) |
| `TransportService` | Interface for transport-level operations |
| `TransportAdaptor` | Adapter for converting between raw protocol messages and internal TbMsg |
| `DeviceAuthCallback` | Callback for device authentication results |
| `TransportResource` | Abstract resource endpoint definition |

## transport/coap

Provides CoAP (Constrained Application Protocol) transport abstractions built on the Eclipse Californium library.

| Class | Purpose |
|-------|---------|
| `AbstractCoapTransportResource` | Base CoAP resource for handling device requests |
| `CoapTransportResource` | Main CoAP resource endpoint (telemetry, attributes, RPC) |
| `CoapTransportContext` | CoAP-specific transport context |
| `CoapTransportService` | CoAP transport service interface |
| `CoapTransportAdaptor` | Interface for converting CoAP messages to TbMsg |
| `JsonCoapAdaptor` | JSON payload adaptor |
| `ProtoCoapAdaptor` | Protobuf payload adaptor |
| `TbCoapMessageObserver` | CoAP observe callback interface |
| `TransportConfigurationContainer` | CoAP transport configuration |
| `OtaPackageTransportResource` | OTA firmware CoAP endpoint |

### CoAP Clients

| Class | Purpose |
|-------|---------|
| `CoapClientContext` | Manages CoAP clients for server-initiated requests |
| `DefaultCoapClientContext` | Implementation of CoAP client context |
| `TbCoapClientState` | Tracks per-client state (address, requests) |
| `TbCoapObservationState` | Tracks CoAP observe relationships |

Clients support multiple security modes:
- `NoSecClient` -- No DTLS (plain CoAP)
- `NoSecObserveClient` -- Observe with no security
- `SecureClientNoAuth` -- DTLS without client auth
- `SecureClientX509` -- DTLS with x509 certificate auth

### CoAP Callbacks

| Class | Purpose |
|-------|---------|
| `CoapDeviceAuthCallback` | Authentication result handler |
| `CoapResponseCallback` | Generic response handler |
| `CoapResponseCodeCallback` | Response code handler |
| `GetAttributesSyncSessionCallback` | Synchronous attribute fetch |
| `ToServerRpcSyncSessionCallback` | Synchronous RPC call |
| `CoapEfentoCallback` | Efento sensor callback |
| `CoapNoOpCallback` | No-op callback placeholder |

### Efento Integration

The `efento/` subpackage provides CoAP transport support for Efento sensors:
- `CoapEfentoTransportResource` -- Efento-specific resource endpoint
- `EfentoCoapAdaptor` -- Efento message adaptor
- `CoapEfentoUtils` / `PulseCounterType` -- Efento protocol utilities

## transport/http

Provides HTTP transport abstractions:

| Class | Purpose |
|-------|---------|
| `DeviceApiController` | REST controller for device API (telemetry, attributes, RPC) |
| `HttpTransportContext` | HTTP-specific transport context |
| `PayloadSizeFilter` | Request payload size filtering |
| `TransportSecurityConfiguration` | HTTP security config |

## transport/mqtt

Provides MQTT transport abstractions (Netty-based) for device connectivity. Handles topic parsing, session management, and MQTT-specific message conversion.

## transport/lwm2m

Provides LwM2M (Lightweight M2M) transport abstractions for IoT device management via OMA LwM2M protocol:

| Class | Purpose |
|-------|---------|
| `LwM2MTransportBootstrapService` | Bootstrap interface for LwM2M devices |
| `LwM2MBootstrapConfig` | Bootstrap server configuration |
| `LwM2MBootstrapSecurityStore` | Bootstrap security credentials store |
| `LwM2MInMemoryBootstrapConfigStore` | In-memory bootstrap store |
| `LwM2MConfigurationChecker` | Bootstrap configuration validation |
| `LwM2MSecureServerConfig` / `LwM2MTransportBootstrapConfig` | LwM2M config types |
| `TbLwM2MAuthorizer` | LwM2M authorization interface |
| `LwM2MCredentialsSecurityInfoValidator` | Credential validation |
| `TbLwM2mVersion` | LwM2M version enum |

## transport/snmp

Provides SNMP transport abstractions for polling SNMP-enabled devices. Handles OID mapping, SNMP data conversion, and device discovery.

## Relationships

- **Depends on:** `common/data`, `common/message`, `common/proto`, `common/queue`, `common/cache` (varies per sub-module)
- **Depended on by:** `transport/mqtt`, `transport/http`, `transport/coap`, `transport/lwm2m`, `transport/snmp` (concrete transport implementations)
- **Maven groupId:** `org.thingsboard.common`
- **Maven artifactId:** `transport` (parent), `transport-api`, `transport-coap`, `transport-http`, `transport-mqtt`, `transport-lwm2m`, `transport-snmp`
