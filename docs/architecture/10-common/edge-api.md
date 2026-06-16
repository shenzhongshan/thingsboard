# Common Edge API (`common/edge-api`)

**Maven artifact:** `org.thingsboard.common:edge-api`

The `common/edge-api` module provides the gRPC-based communication protocol for ThingsBoard Edge instances. Edge is a lightweight ThingsBoard distribution that runs at remote locations (factories, stores, vehicles) and synchronizes data with a central ThingsBoard server.

## Architecture

Edge instances communicate with the central ThingsBoard platform via a bidirectional gRPC streaming connection. The Edge acts as a gRPC client, connecting to the server's `EdgeRpcService`. Messages flow in both directions:

- **Uplink** (Edge -> Cloud) -- Telemetry, attributes, events, device connectivity
- **Downlink** (Cloud -> Edge) -- Entity configurations, rule chains, dashboards, device profiles

### Proto Definition

The gRPC service and messages are defined in `edge.proto` (located at `common/edge-api/src/main/proto/edge.proto`):

```protobuf
service EdgeRpcService {
    rpc handleMsgs(stream RequestMsg) returns (stream ResponseMsg) {}
}
```

Generated Java classes: `org.thingsboard.server.gen.edge.v1.EdgeProtos`

### EdgeVersion

The `EdgeVersion` enum tracks protocol compatibility across versions:

| Version | ThingsBoard release |
|---------|-------------------|
| `V_3_3_0` | 3.3.0 |
| `V_3_4_0` | 3.4.0 |
| `V_3_6_0` | 3.6.0 |
| `V_3_7_0` | 3.7.0 |
| `V_3_8_0` | 3.8.0 |
| `V_3_9_0` | 3.9.0 |
| `V_4_0_0` | 4.0.0 |
| `V_4_1_0` | 4.1.0 |
| `V_4_2_0` | 4.2.0 |
| `V_4_3_0` | 4.3.0 |
| `V_4_4_0` | 4.4.0 |

`V_LATEST` (= 99999) always points to the newest version.

### Message Types

#### RequestMsg (Edge -> Cloud)

| MsgType | Purpose |
|---------|---------|
| `CONNECT_RPC_MESSAGE` | Initial connection handshake with Edge metadata |
| `UPLINK_RPC_MESSAGE` | Device telemetry, attributes, events pushed to cloud |
| `DOWNLINK_RPC_RESPONSE_MESSAGE` | Edge acknowledges cloud downlink messages |
| `SYNC_REQUEST_RPC_MESSAGE` | Edge requests entity sync from cloud |

#### ResponseMsg (Cloud -> Edge)

| Type | Purpose |
|------|---------|
| `ConnectResponseMsg` | Connection accepted/denied with sync configuration |
| `UplinkResponseMsg` | Acknowledgment of uplink messages |
| `DownlinkMsg` | Entity configurations pushed to Edge (rule chains, dashboards, devices, assets, etc.) |
| `EdgeUpdateMsg` | Edge configuration/software updates |

### Sync Protocol

After connecting, the Edge sends a `SyncRequestMsg`. The cloud responds with a stream of `DownlinkMsg` items that represent the full state an Edge needs:

1. **Tenant** configuration
2. **Device profiles** assigned to the Edge
3. **Asset profiles**
4. **Rule chains** (edge-specific and root)
5. **Dashboards**
6. **Device/Asset** definitions
7. **Relations** between entities
8. **Widgets bundles**
9. **Notification rules**

Each downlink message includes:
- `downlinkMsgId` (int64) -- Monotonically increasing ID for ordering
- `syncCompleted` (bool) -- Whether this is the last sync message
- `entityType` + `entityDataProto` -- Entity type and serialized entity data
- `entityIdProto` + `customerIdProto` -- Ownership information

## Java Side

### Core Classes

| Class | Purpose |
|-------|---------|
| `EdgeRpcClient` | Interface for the Edge gRPC client |
| `EdgeGrpcClient` | gRPC implementation of EdgeRpcClient using the protobuf service stub |
| `EdgeVersionComparator` | Compares Edge version strings for compatibility checks |
| `EdgeConnectionException` | Exception for Edge connectivity issues |

### EdgeRpcClient Interface

```java
public interface EdgeRpcClient {
    CompletableFuture<Void> connect(...);
    void disconnect(String reason);
    void sendSyncRequest(SyncRequestMsg request);
    void sendUplinkMsg(UplinkMsg msg);
    CompletableFuture<Void> onDownlinkResponse(DownlinkResponseMsg response);
}
```

### EdgeGrpcClient

The gRPC implementation manages:
- Channel lifecycle (connecting, reconnecting, disconnecting)
- Bidirectional streaming via `handleMsgs`
- Response correlation (mapping responses to requests)
- Reconnection with exponential backoff
- Stream observer management

## Relationships

- **Depends on:** `common/data` (entity types, IDs), `common/proto` (transport protobuf via import), gRPC/protobuf libraries
- **Depended on by:** Edge microservice, `application` (server-side Edge handler)
- **Maven groupId:** `org.thingsboard.common`
- **Maven artifactId:** `edge-api`
