# ThingsBoard MQTT 协议 Topic 全量分析

## 一、Topic 总体架构

ThingsBoard MQTT 传输层共有 **四套 Topic 体系**：

| 体系 | 版本 | 命名空间 | 适用场景 | 编码 |
|------|------|----------|----------|------|
| **V1 设备 API** | v1 | `v1/devices/me/...` | 设备直连 | JSON |
| **V2 设备 API** | v2 | `v2/...` | 设备直连 (精简) | JSON / Protobuf |
| **V1 网关 API** | v1 | `v1/gateway/...` | 网关代理子设备 | JSON |
| **Sparkplug B** | spBv1.0 | `spBv1.0/...` | IIoT Edge 场景 | Protobuf (Sparkplug 规范) |

加上独立的 **Provision** 和 **OTA 固件** 主题通道。

---

## 二、V1 设备直连 API — `v1/devices/me/...`

### 2.1 设备发布 (Device → ThingsBoard)

| Topic | 功能 | 说明 |
|-------|------|------|
| `v1/devices/me/telemetry` | **上报遥测** | POST JSON 键值对，如 `{"temperature": 25}` |
| `v1/devices/me/attributes` | **上报属性** | POST JSON，客户端属性或上报服务端属性 |
| `v1/devices/me/attributes/request/{requestId}` | **请求共享属性** | 设备主动拉取服务端属性，订阅 `v1/devices/me/attributes/response/+` 等回复 |
| `v1/devices/me/rpc/response/{requestId}` | **回复 RPC** | 设备收到 RPC 请求后，在此 topic 返回执行结果 |
| `v1/devices/me/claim` | **认领设备** | 设备端发起 Claim 流程，POST 密钥完成归属转移 |
| `v1/devices/me/rpc/request/{requestId}` | **发起 RPC** | 设备向服务端发送 RPC 请求 (少数场景) |

### 2.2 设备订阅 (ThingsBoard → Device, 下行)

| Topic | 功能 | 说明 |
|-------|------|------|
| `v1/devices/me/attributes` | **接收属性更新** | 服务端推送共享属性变更 |
| `v1/devices/me/attributes/response/+` | **接收属性应答** | 服务端返回 `attributes/request` 的应答 |
| `v1/devices/me/rpc/request/+` | **接收 RPC 请求** | 服务端下发 RPC 命令 (如开关控制) |
| `v1/devices/me/rpc/response/+` | **接收 RPC 应答** | 服务端返回 `rpc/request` 的应答 |

---

## 三、V2 设备直连 API — `v2/...`

V2 是 V1 的精简版，Topic 路径更短，支持 JSON **和** Protobuf 两种编码。

### 3.1 遥测 (Telemetry)

| Topic | 编码 | 说明 |
|-------|------|------|
| `v2/t` | auto | 自动检测 JSON 或 Protobuf |
| `v2/t/j` | JSON | 强制 JSON，值同上 V1 遥测 |
| `v2/t/p` | Protobuf | `TelemetryUploadPayload` 消息体 |

### 3.2 属性 (Attributes)

| Topic | 方向 | 编码 | 说明 |
|-------|------|------|------|
| `v2/a` | 上行 | auto | 上报属性 |
| `v2/a/j` | 上行 | JSON | JSON 属性上报 |
| `v2/a/p` | 上行 | Protobuf | Protobuf 属性上报 |
| `v2/a/req/` | 上行 | — | 请求属性 (前缀) |
| `v2/a/req/j/` | 上行 | JSON | JSON 格式请求属性 |
| `v2/a/req/p/` | 上行 | Protobuf | Protobuf 请求属性 |
| `v2/a/res/+` | 下行 | auto | 属性响应 (订阅通配符) |
| `v2/a/res/j/+` | 下行 | JSON | JSON 属性响应 |
| `v2/a/res/p/+` | 下行 | Protobuf | Protobuf 属性响应 |

### 3.3 RPC

| Topic | 方向 | 编码 | 说明 |
|-------|------|------|------|
| `v2/r/req/{id}` | 下行 | auto | 服务端下发 RPC |
| `v2/r/req/j/{id}` | 下行 | JSON | JSON 格式 RPC 请求 |
| `v2/r/req/p/{id}` | 下行 | Protobuf | Protobuf 格式 RPC 请求 |
| `v2/r/req/+` | 订阅 | auto | 设备订阅 RPC 请求 (通配) |
| `v2/r/res/{id}` | 上行 | auto | 设备回复 RPC 结果 |
| `v2/r/res/j/{id}` | 上行 | JSON | JSON 格式 RPC 应答 |
| `v2/r/res/p/{id}` | 上行 | Protobuf | Protobuf 格式 RPC 应答 |
| `v2/r/res/+` | 订阅 | auto | 设备订阅 RPC 响应 |

### 3.4 OTA 固件/软件升级

| Topic | 方向 | 说明 |
|-------|------|------|
| `v2/fw/request/{requestId}/chunk/{chunk}` | 上行 | 设备按块请求固件数据 |
| `v2/fw/response/+/chunk/+` | 下行 | 服务端下发固件块 |
| `v2/fw/error` | 上行 | 设备上报固件升级错误 |
| `v2/sw/request/{requestId}/chunk/{chunk}` | 上行 | 设备按块请求软件升级包 |
| `v2/sw/response/+/chunk/+` | 下行 | 服务端下发软件块 |
| `v2/sw/error` | 上行 | 设备上报软件升级错误 |

OTA 工作流程：

```
设备订阅: v2/fw/response/+/chunk/+
  ↓
设备发布: v2/fw/request/0/chunk/0          ← 请求第 0 块
  ↓
服务端下发: v2/fw/response/0/chunk/0       ← 返回数据块
  ↓
设备发布: v2/fw/request/0/chunk/1          ← 请求下一块
  ...
  ↓
出错时: v2/fw/error                        ← 上报错误
```

---

## 四、V1 网关 API — `v1/gateway/...`

网关代理多个子设备的通信，所有子设备数据通过一个 MQTT 连接传输，子设备名在 **payload 内的 JSON 字段**中而非 topic 中。

### 4.1 网关上行 (Gateway → ThingsBoard)

| Topic | Payload 关键字段 | 功能 |
|-------|-----------------|------|
| `v1/gateway/connect` | `{"device": "sn-001"}` | 子设备上线通知 |
| `v1/gateway/disconnect` | `{"device": "sn-001"}` | 子设备离线通知 |
| `v1/gateway/telemetry` | `{"sn-001": [{"ts":..., "values":{...}}]}` | 上报子设备遥测 |
| `v1/gateway/attributes` | `{"sn-001": {"attr1": "val1"}}` | 上报子设备属性 |
| `v1/gateway/attributes/request` | `{"id": 1, "device": "sn-001", "clientKeys": "key1"}` | 请求子设备属性 |
| `v1/gateway/rpc` | `{"id": 1, "device": "sn-001", "data": {...}}` | 子设备 RPC 应答 |
| `v1/gateway/claim` | `{"device": "sn-001", "secretKey": "..."}` | 认领子设备 |

### 4.2 网关下行 (ThingsBoard → Gateway)

| Topic | 功能 |
|-------|------|
| `v1/gateway/attributes` | 推送子设备属性更新 |
| `v1/gateway/attributes/response` | 返回子设备属性请求应答 |
| `v1/gateway/rpc` | 下发子设备 RPC 命令 |

---

## 五、设备配置 — Provision Topics

设备在**首次连接时**可以通过 Provision 流程自动获取凭证。

| Topic | 方向 | 说明 |
|-------|------|------|
| `/provision/request` | 上行 | 设备发送配置请求 (含设备名/密钥等) |
| `/provision/response` | 下行 | 服务端返回生成的设备凭证 |

**特殊行为**：当设备在 MQTT CONNECT 中使用 `provision` 作为 username 时，设备会话进入 Provision-Only 模式——只能订阅 `/provision/response`，不能做任何其他操作。配置成功后需要断开重连。

---

## 六、Sparkplug B — IIoT 协议

### 6.1 Topic 模式

```
spBv1.0/{group_id}/{message_type}/{edge_node_id}[/{device_id}]
                ↑
           NCMD / DCMD / NDATA / DDATA / NBIRTH / NDEATH / DBIRTH / DDEATH / STATE
```

| Segment 数量 | Topic 模板 | 用途 |
|-------------|-----------|------|
| 4 | `spBv1.0/{groupId}/{msgType}/{edgeNodeId}` | 边缘节点级消息 |
| 5 | `spBv1.0/{groupId}/{msgType}/{edgeNodeId}/{deviceId}` | 设备级消息 |
| 3 | `spBv1.0/STATE/{hostAppId}` | 状态消息 |

### 6.2 MessageType 对应功能

| MessageType | 方向 | 功能 |
|-------------|------|------|
| `NBIRTH` | Edge→Server | 边缘节点上线注册 (带节点元数据) |
| `NDEATH` | Edge→Server (Will) | 边缘节点下线 |
| `NDATA` | Edge→Server | 边缘节点级遥测数据 |
| `NCMD` | Server→Edge | 边缘节点级指令 |
| `DBIRTH` | Edge→Server | 子设备上线注册 (带设备元数据) |
| `DDEATH` | Edge→Server | 子设备下线 |
| `DDATA` | Edge→Server | 子设备遥测数据 |
| `DCMD` | Server→Edge | 子设备级指令 |
| `STATE` | Server→Host | 主应用在线状态 |
| `DRECORD` | Edge→Server | 设备记录数据 |
| `NRECORD` | Edge→Server | 节点记录数据 |

### 6.3 订阅主题

```
spBv1.0/{group_id}/NCMD/{edge_node_id}                  ← 边缘节点 RPC
spBv1.0/{group_id}/DCMD/{edge_node_id}/{device_id}      ← 子设备 RPC
spBv1.0/STATE/{host_application_id}                      ← 状态消息
```

Discovery 模式也支持订阅 `spBv1.0/{group_id}/DDATA/{edge_node_id}` 和 `spBv1.0/G1/DDATA/E1/#` 等通配形式。

---

## 七、TopicType 枚举 — 版本间映射

代码中 `TopicType.java` 枚举将 version + encoding 组合为四个构建 topic 的函数：

```java
V1:      attributeResponse=v1/devices/me/attributes/response/
         attributesSub=v1/devices/me/attributes
         rpcSubscribe=v1/devices/me/rpc/request/+

V2:      attributeResponse=v2/a/res/
         attributesSub=v2/a
         rpcSubscribe=v2/r/req/+

V2_JSON: attributeResponse=v2/a/res/j/
         attributesSub=v2/a/j
         rpcSubscribe=v2/r/req/j/+

V2_PROTO:attributeResponse=v2/a/res/p/
         attributesSub=v2/a/p
         rpcSubscribe=v2/r/req/p/+
```

---

## 八、自定义设备 Topic 过滤器

设备配置 `MqttDeviceProfileTransportConfiguration` 支持为单个设备配置自定义 topic：

```java
// 默认值:
deviceTelemetryTopic        = "v1/devices/me/telemetry"
deviceAttributesTopic       = "v1/devices/me/attributes"
deviceAttributesSubscribeTopic = "v1/devices/me/attributes"
```

通过 `MqttTopicFilterFactory` 将字符串转换为过滤器：
- `#` → 匹配全部
- `v1/sensor/+/telemetry` → 正则匹配
- `v1/sensor/telemetry` → 精确匹配

---

## 九、MQTT Publish → Transport 路由逻辑

`MqttTransportHandler.processDevicePublish()` 按以下顺序匹配上行 Topic：

```
1. v1/devices/me/attributes | v2/a           → 属性上报
2. v1/devices/me/telemetry                    → V1 遥测
3. v1/devices/me/attributes/request/{id}     → V1 属性请求
4. v1/devices/me/rpc/response/{id}           → V1 RPC 回复
5. v1/devices/me/rpc/request/{id}            → V1 RPC 请求 (to-server)
6. v1/devices/me/claim                        → 认领
7. v2/fw/request/{id}/chunk/{chunk}          → 固件请求 (regex)
8. v2/sw/request/{id}/chunk/{chunk}          → 软件请求 (regex)
9. v2/t                                       → V2 遥测
10. v2/a                                      → V2 属性
11. v2/r/res/{id}                             → V2 RPC 回复
12. v2/r/req/{id}                             → V2 RPC 请求 (to-server)
13. v2/a/req/{id}                             → V2 属性请求
14. v1/gateway/*                              → 委托 GatewaySessionHandler
15. spBv1.0/*                                 → 委托 SparkplugSessionHandler
```

---

## 十、MQTT Subscribe 校验

`processSubscribe()` 中设备只能订阅以下 topic：

```
V1: v1/devices/me/attributes
     v1/devices/me/rpc/request/+
     v1/devices/me/rpc/response/+
     v1/devices/me/attributes/response/+

V2: v2/a, v2/a/j, v2/a/p
     v2/r/req/+, v2/r/req/j/+, v2/r/req/p/+
     v2/r/res/+, v2/r/res/j/+, v2/r/res/p/+
     v2/a/res/+, v2/a/res/j/+, v2/a/res/p/+

OTA: v2/fw/response/+/chunk/+
      v2/fw/error
      v2/sw/response/+/chunk/+
      v2/sw/error

Gateway: v1/gateway/attributes
         v1/gateway/rpc
         v1/gateway/attributes/response

Provision: /provision/response (仅 provision-only 模式)

Sparkplug: spBv1.0/STATE/...
           spBv1.0/{group}/{DATA type}/{edgeNode}
```

---

## 十一、Topic 速查表

### 设备端 (Device)

| 方向 | Topic | 功能 |
|------|-------|------|
| ↑ | `v1/devices/me/telemetry` | V1 遥测上报 |
| ↑ | `v1/devices/me/attributes` | V1 属性上报 |
| ↑ | `v1/devices/me/attributes/request/{id}` | V1 请求属性 |
| ↑ | `v1/devices/me/rpc/response/{id}` | V1 RPC 回复 |
| ↑ | `v1/devices/me/rpc/request/{id}` | V1 发起 RPC |
| ↑ | `v1/devices/me/claim` | V1 认领设备 |
| ↑ | `v2/t`, `v2/t/j`, `v2/t/p` | V2 遥测上报 |
| ↑ | `v2/a`, `v2/a/j`, `v2/a/p` | V2 属性上报 |
| ↑ | `v2/a/req/{id}`, `v2/a/req/j/{id}`, `v2/a/req/p/{id}` | V2 请求属性 |
| ↑ | `v2/r/res/{id}`, `v2/r/res/j/{id}`, `v2/r/res/p/{id}` | V2 RPC 回复 |
| ↑ | `v2/r/req/{id}`, `v2/r/req/j/{id}`, `v2/r/req/p/{id}` | V2 发起 RPC |
| ↑ | `v2/fw/request/{id}/chunk/{n}` | 固件块请求 |
| ↑ | `v2/sw/request/{id}/chunk/{n}` | 软件块请求 |
| ↑ | `v2/fw/error`, `v2/sw/error` | OTA 错误 |
| ↓ | `v1/devices/me/attributes` | 属性更新推送 |
| ↓ | `v1/devices/me/attributes/response/+` | 属性请求应答 |
| ↓ | `v1/devices/me/rpc/request/+` | RPC 命令 |
| ↓ | `v1/devices/me/rpc/response/+` | RPC 应答 |
| ↓ | `v2/a/res/+`, `v2/a/res/j/+`, `v2/a/res/p/+` | V2 属性应答 |
| ↓ | `v2/r/req/+`, `v2/r/req/j/+`, `v2/r/req/p/+` | V2 RPC 命令 |
| ↓ | `v2/r/res/+`, `v2/r/res/j/+`, `v2/r/res/p/+` | V2 RPC 应答 |
| ↓ | `v2/fw/response/+/chunk/+` | 固件数据块 |
| ↓ | `v2/sw/response/+/chunk/+` | 软件数据块 |

### 网关 (Gateway)

| 方向 | Topic | 功能 |
|------|-------|------|
| ↑ | `v1/gateway/connect` | 子设备上线 |
| ↑ | `v1/gateway/disconnect` | 子设备离线 |
| ↑ | `v1/gateway/telemetry` | 批量遥测 |
| ↑ | `v1/gateway/attributes` | 批量属性 |
| ↑ | `v1/gateway/attributes/request` | 请求属性 |
| ↑ | `v1/gateway/rpc` | RPC 回复 |
| ↑ | `v1/gateway/claim` | 认领子设备 |
| ↓ | `v1/gateway/attributes` | 属性推送 |
| ↓ | `v1/gateway/attributes/response` | 属性应答 |
| ↓ | `v1/gateway/rpc` | RPC 命令 |

### 配置 & 固件 & Sparkplug

| 方向 | Topic | 功能 |
|------|-------|------|
| ↑ | `/provision/request` | 设备配置请求 |
| ↓ | `/provision/response` | 配置应答 |
| - | `spBv1.0/{g}/{type}/{node}` | Sparkplug 节点消息 |
| - | `spBv1.0/{g}/{type}/{node}/{dev}` | Sparkplug 设备消息 |
| - | `spBv1.0/STATE/{host}` | Sparkplug 状态 |

---

## 十二、关键源文件索引

| 文件 | 内容 |
|------|------|
| `common/data/src/main/java/.../MqttTopics.java` | 所有 Topic 常量定义 (核心文件) |
| `common/transport/mqtt/src/main/java/.../TopicType.java` | V1/V2/V2_JSON/V2_PROTO 分组枚举 |
| `common/transport/mqtt/src/main/java/.../MqttTransportHandler.java` | Publish/Subscribe 路由分发 |
| `common/transport/mqtt/src/main/java/.../MqttTransportAdaptor.java` | 下行消息→MQTT Publish 转换 |
| `common/transport/mqtt/src/main/java/.../GatewaySessionHandler.java` | 网关会话处理 |
| `common/transport/mqtt/src/main/java/.../AbstractGatewaySessionHandler.java` | 网关 Topic 到子设备路由 |
| `common/transport/mqtt/src/main/java/.../SparkplugTopic.java` | Sparkplug Topic 解析/构造 |
| `common/transport/mqtt/src/main/java/.../SparkplugMessageType.java` | Sparkplug 消息类型枚举 |
| `common/transport/mqtt/src/main/java/.../MqttTopicFilterFactory.java` | Topic 过滤器工厂 |
| `common/data/src/main/java/.../MqttDeviceProfileTransportConfiguration.java` | 设备配置中的可自定义 Topic 过滤器 |

---

文档生成日期: 2026-06-18
