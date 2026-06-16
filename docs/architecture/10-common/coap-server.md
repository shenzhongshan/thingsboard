# Common CoAP Server (`common/coap-server`)

**Maven artifact:** `org.thingsboard.common:coap-server`

The `common/coap-server` module provides the CoAP server infrastructure shared by the ThingsBoard CoAP transport. It is built on the Eclipse Californium (Cf) CoAP framework and handles DTLS security, session management, and message processing.

## Architecture

The module abstracts the CoAP server setup into reusable components. The actual CoAP transport (in `transport/coap/`) extends these classes to create the device-facing CoAP endpoint.

### Core Components

| Class/Interface | Purpose |
|----------------|---------|
| `CoapServerService` | Interface for managing the CoAP server lifecycle |
| `DefaultCoapServerService` | Default implementation using Californium's `CoapServer` |
| `CoapServerContext` | Context configuration for the CoAP server (host, port, DTLS settings) |
| `TbCoapServerComponent` | Component wrapper for the CoAP server |
| `TbCoapTransportComponent` | Transport component that extends TbCoapServerComponent for device-specific handling |
| `TbCoapServerMessageDeliverer` | Custom message deliverer that routes CoAP requests to transport resources |

### DTLS Security

The module provides DTLS (Datagram Transport Layer Security) for encrypted CoAP communication:

| Class | Purpose |
|-------|---------|
| `TbCoapDtlsSettings` | DTLS configuration (key store, trust store, cipher suites) |
| `TbCoapDtlsCertificateVerifier` | Certificate verification logic for DTLS handshakes |
| `TbCoapDtlsSessionInfo` | DTLS session metadata (cipher, peer certificate, session ID) |
| `TbCoapDtlsSessionKey` | Composite key for DTLS session identity |
| `TbCoapDtlsSessionInMemoryStorage` | In-memory DTLS session storage |

The DTLS session store maps session keys to session info, enabling session resumption and lookup of device identity from an ongoing DTLS connection.

### CoAP Server Lifecycle

1. **Configuration** -- `CoapServerContext` defines host, port, DTLS settings, thread pool
2. **Initialization** -- `DefaultCoapServerService` creates a `CoapServer` with configured endpoints
3. **Resource Registration** -- Transport resources (telemetry, attributes, RPC endpoints) are registered via `TbCoapServerMessageDeliverer`
4. **Runtime** -- Incoming CoAP requests are dispatched to registered `CoapResource` instances
5. **Shutdown** -- Server stops accepting new connections and drains existing ones

### Message Flow

```
Device
  |
  | CoAP Request (GET/POST)
  v
Californium CoapServer
  |
  v
TbCoapServerMessageDeliverer
  |
  v
CoapTransportResource (telemetry/attributes/RPC)
  |
  v
CoapTransportAdaptor -> TbMsg -> Queue -> Rule Engine
```

## Key Classes Detail

### DefaultCoapServerService

```java
public class DefaultCoapServerService implements CoapServerService {
    void init(CoapServerContext context);
    CoapServer getServer();
    void addResources(CoapResource... resources);
    void shutdown();
}
```

Manages the Californium `CoapServer` instance, including endpoint configuration (UDP, DTLS) and resource registration.

### TbCoapDtlsSessionInMemoryStorage

Stores DTLS session information indexed by `TbCoapDtlsSessionKey` (derived from the peer's identity). Used to associate an incoming DTLS connection with a ThingsBoard device during authentication.

### TbCoapServerMessageDeliverer

Custom Californium `MessageDeliverer` that routes CoAP requests to the appropriate `CoapResource` based on URI path. Supports standard CoAP resource conventions:

| URI Path | Resource |
|----------|----------|
| `/api/v1/{token}/telemetry` | Telemetry upload |
| `/api/v1/{token}/attributes` | Attribute fetch/update |
| `/api/v1/{token}/rpc` | RPC request/response |
| `/fw/{token}` | OTA firmware download |

## Relationships

- **Depends on:** Californium (Eclipse CoAP framework), `common/data`, SLF4J
- **Depended on by:** `transport/coap` (concrete CoAP transport implementation)
- **Maven groupId:** `org.thingsboard.common`
- **Maven artifactId:** `coap-server`
