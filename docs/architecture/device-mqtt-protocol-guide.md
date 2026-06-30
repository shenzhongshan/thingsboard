# 设备 MQTT 接入协议指南

## 一、连接参数


| 参数         | 说明                          |
| ---------- | --------------------------- |
| 协议         | MQTT 3.1 / 3.1.1 / 5.0      |
| 端口         | `1883` (TCP) / `8883` (TLS) |
| Keep Alive | 建议 60s                      |
| QoS        | 支持 0 / 1 / 2                |


## 二、认证方式

### 2.1 Access Token（最常用）

```
MQTT CONNECT
  username = "设备访问令牌"
  clientId = 任意唯一字符串
```

获取方式：设备详情页 → 管理凭据 → Access Token。

### 2.2 MQTT Basic（用户名+密码）

```
MQTT CONNECT
  username = "设备MQTT用户名"
  password = "设备MQTT密码"
  clientId = 任意唯一字符串
```

在设备配置中启用 MQTT Basic 凭据类型。

### 2.3 X.509 证书

```
MQTT CONNECT over TLS
  clientId = 证书 CN
  # 服务端自动从证书提取设备身份
```

### 2.4 Provision（自动注册）

```
MQTT CONNECT
  username = "provision"
  # 或 clientId = "provision"
```

仅用于首次自动注册，成功后断开重连。

## 三、Topic 体系总览

### 3.1 V1 API（设备直连）


| Topic                                   | 方向  | 功能            |
| --------------------------------------- | --- | ------------- |
| `v1/devices/me/telemetry`               | ↑   | 上报遥测          |
| `v1/devices/me/attributes`              | ↑↓  | 上报属性 / 接收属性更新 |
| `v1/devices/me/attributes/request/{id}` | ↑   | 请求共享属性        |
| `v1/devices/me/attributes/response/+`   | ↓   | 接收属性应答        |
| `v1/devices/me/rpc/request/+`           | ↓   | 接收 RPC 命令     |
| `v1/devices/me/rpc/response/{id}`       | ↑   | 回复 RPC 结果     |
| `v1/devices/me/rpc/request/{id}`        | ↑   | 发起 RPC 请求     |
| `v1/devices/me/claim`                   | ↑   | 发起认领          |
| `v1/devices/me/rpc/response/{id}`       | ↓   | 接收回复 RPC      |


### 3.2 V2 API（精简版，支持 JSON/Protobuf）


| Topic                                     | 编码       | 功能         |
| ----------------------------------------- | -------- | ---------- |
| `v2/t`                                    | auto     | 遥测（自动检测格式） |
| `v2/t/j`                                  | JSON     | 遥测         |
| `v2/t/p`                                  | Protobuf | 遥测         |
| `v2/a`                                    | auto     | 属性上报       |
| `v2/a/j`                                  | JSON     | 属性上报       |
| `v2/a/p`                                  | Protobuf | 属性上报       |
| `v2/a/req/{id}`                           | -        | 请求属性       |
| `v2/a/res/+`                              | -        | 接收属性应答     |
| `v2/r/req/{id}`                           | -        | RPC 命令     |
| `v2/r/res/{id}`                           | -        | RPC 回复     |
| `v2/fw/request/{requestId}/chunk/{chunk}` | -        | 固件请求       |
| `v2/fw/response/+/chunk/+`                | -        | 固件数据       |
| `v2/fw/error`                             | -        | 固件错误       |


### 3.3 网关 API

网关通过一个 MQTT 连接代理多个子设备。子设备名在 **payload 的 JSON 字段**中区分，不在 topic 中。


| Topic                           | 方向  | 功能              |
| ------------------------------- | --- | --------------- |
| `v1/gateway/connect`            | ↑   | 子设备上线通知         |
| `v1/gateway/disconnect`         | ↑   | 子设备离线通知         |
| `v1/gateway/telemetry`          | ↑   | 批量上报子设备遥测       |
| `v1/gateway/attributes`         | ↑↓  | 批量上报属性 / 接收属性更新 |
| `v1/gateway/attributes/request` | ↑   | 批量请求子设备属性       |
| `v1/gateway/attributes/response`| ↓   | 接收属性请求应答        |
| `v1/gateway/rpc`                | ↑↓  | RPC 命令下发 / 回复    |
| `v1/gateway/claim`              | ↑   | 批量认领子设备         |


## 四、数据上报

### 4.1 遥测（Telemetry）

**Topic**: `v1/devices/me/telemetry`

#### `ts` 字段规则

`ts` 是**可选**字段。服务端默认用**收到消息时的时间**作为数据时间戳。


| 场景     | 是否传 ts    | 说明                    |
| ------ | --------- | --------------------- |
| 实时上报   | **不传**    | 服务端自动加盖收到时的时间         |
| 设备离线补传 | **必须传**   | 设备缓存数据，联网后带原始采集时间批量发送 |
| 批量历史数据 | **每条单独传** | 每条数据携带自己的 `ts`        |


**时间戳格式**：Unix 毫秒（如 `1719504000000`）。

#### 实时上报

不传 `ts`，直接发键值对：

```json
{
  "temperature": 25.6,
  "humidity": 68,
  "status": "running"
}
```

不传 `ts` 的批量格式——每条自动加盖服务端当前时间：

```json
[
  { "values": { "temperature": 25.6 } },
  { "values": { "temperature": 25.8 } }
]
```

#### 带时间戳上报

单条带 `ts`：

```json
{
  "ts": 1719504000000,
  "values": {
    "temperature": 25.6,
    "humidity": 68
  }
}
```

批量上报（离线补传历史数据）：

```json
[
  { "ts": 1719504000000, "values": { "temperature": 25.6 } },
  { "ts": 1719504001000, "values": { "temperature": 25.8 } },
  { "ts": 1719504002000, "values": { "temperature": 26.1 } }
]
```

### 4.2 属性（Attributes）

**上报客户端属性**:

Topic: `v1/devices/me/attributes`

```json
{
  "firmware_version": "1.2.3",
  "serial_number": "SN-001",
  "hardware_model": "ESP32-S3"
}
```

**请求共享属性**:

Topic: `v1/devices/me/attributes/request/1`

```json
{
  "sharedKeys": "target_temp,report_interval"
}
```

**接收属性响应** (设备主动请求的应答):

订阅 `v1/devices/me/attributes/response/+`

```json
{
  "id": 1,
  "device": "sensor-001",
  "client": {},
  "shared": {
    "target_temp": 25,
    "report_interval": 60
  }
}
```

**接收服务端主动推送的共享属性更新**:

当运维人员在仪表板或通过 REST API 修改共享属性时，服务端主动推送到所有在线设备。设备需订阅此 topic：

订阅 `v1/devices/me/attributes`

```json
// 收到更新 (与上报格式相同，但只含变更的 key)
{"target_temp": 30}

// 收到删除 (服务端删除属性时)
// 不会主动推送删除通知，需设备通过 attributes/request 重新查询
```

**两种下行通道对比**：


| 场景      | 设备发布                                    | 设备订阅                                  | 触发时机         |
| ------- | --------------------------------------- | ------------------------------------- | ------------ |
| 设备主动请求  | `v1/devices/me/attributes/request/{id}` | `v1/devices/me/attributes/response/+` | 设备需要时        |
| 服务端主动推送 | —                                       | `v1/devices/me/attributes`            | 仪表板修改属性时实时推送 |


> **注意**：两个通道使用不同的 topic，设备端必须**同时订阅**这两个 topic 才能完整接收所有属性更新。`v1/devices/me/attributes` 是双向 topic——设备用此 topic 上报属性，也用此 topic 接收服务端推送。

**完整初始化示例**：

```python
# 上线后必须订阅以下 topic
client.subscribe("v1/devices/me/attributes")           # 接收服务端主动推送
client.subscribe("v1/devices/me/attributes/response/+") # 接收属性请求应答
client.subscribe("v1/devices/me/rpc/request/+")         # 接收 RPC 命令

# 上报客户端属性
client.publish("v1/devices/me/attributes", json.dumps({
    "firmware_version": "1.2.3",
    "serial_number": "SN-001"
}))

# 请求最新共享属性
client.publish("v1/devices/me/attributes/request/1", json.dumps({
    "sharedKeys": "target_temp,report_interval"
}))
```

## 五、RPC（远程过程调用）

### Topic 约定

`request/` 和 `response/` 的命名规则：**谁发起请求谁往 `request/` 发，谁做响应谁往 `response/` 发**。

两个 RPC 场景使用相同的 topic 名称，但设备端的 publish/subscribe 角色相反：


| 场景           | `request/+`    | `response/+`   |
| ------------ | -------------- | -------------- |
| **服务端 → 设备** | 服务端发布，**设备订阅** | **设备发布**，服务端订阅 |
| **设备 → 服务端** | **设备发布**，服务端订阅 | 服务端发布，**设备订阅** |


> **关键**：无论哪种场景，设备都必须**同时订阅** `request/+` 和 `response/+` 两个通配符 topic，否则无法完整参与双向 RPC。

### 5.1 服务端 → 设备（Server-side RPC，服务端发起）

服务端下发命令给设备。

```
设备订阅:
  SUBSCRIBE v1/devices/me/rpc/request/+

收到命令:
  RECEIVE v1/devices/me/rpc/request/123
  {"method": "setTargetTemp", "params": { "value": 25 }}

设备执行后回复 (设备发布到 response):
  PUBLISH v1/devices/me/rpc/response/123
  25
```

### 5.2 设备 → 服务端（Client-side RPC，设备发起）

设备主动向服务端发起请求，服务端处理后返回结果。

```
设备订阅 (接收服务端应答):
  SUBSCRIBE v1/devices/me/rpc/response/+

设备发起请求 (设备发布到 request):
  PUBLISH v1/devices/me/rpc/request/1
  {"method": "getServerTime", "params": { "timezone": "Asia/Shanghai" }}

收到服务端应答:
  RECEIVE v1/devices/me/rpc/response/1
  "2026-06-29T15:30:00+08:00"
```

> **超时处理**：设备端 RPC 默认超时 60s。超时后服务端自动返回 `{"error":"timeout"}` 到 `response/{id}`。

## 六、OTA 固件升级

### 工作流程

```
1. 订阅响应通道
   SUBSCRIBE v2/fw/response/+/chunk/+
   SUBSCRIBE v2/fw/error

2. 请求第 0 块（触发服务端分配 OTA 包）
   PUBLISH v2/fw/request/0/chunk/0
   Payload: "4096"    ← chunkSize（字节数）

3. 循环接收数据块
   RECEIVE v2/fw/response/0/chunk/0  ← 第 0 块
   RECEIVE v2/fw/response/0/chunk/1  ← 第 1 块
   ...

   请求下一块:
   PUBLISH v2/fw/request/0/chunk/1
   Payload: "4096"

4. 传输完成（最后一块 < chunkSize）
   校验 → 烧录固件

5. 出错时
   PUBLISH v2/fw/error
   Payload: "校验失败：chunk 42 checksum mismatch"

6. 上报新版本 (遥测)
   PUBLISH v1/devices/me/telemetry
   { "current_fw_title": "ESP32 v2.0", "current_fw_version": "2.0.1" }
```

### 关键参数说明


| 参数          | 说明                                  |
| ----------- | ----------------------------------- |
| `requestId` | 设备自定义，区分多次 OTA 请求（如 `"0"`, `"1"`）   |
| `chunk`     | 块序号，从 0 递增。chunk=0 触发服务端查询分配的 OTA 包 |
| chunkSize   | Payload 为纯数字字符串，表示每块字节数。服务端按此切片返回   |
| 最后一个块       | `len(data) < chunkSize` 时判定为最后一块    |


## 七、设备配置（Provision）

用于新设备首次连接时自动获取凭证，无需手动在平台创建设备。

### 前置条件

**Step 1 — 配置 Device Profile**

进入 `设备配置 → 详情 → Device Provisioning`：


| 配置项                     | 值                  | 说明                      |
| ----------------------- | ------------------ | ----------------------- |
| Provision Type          | `允许创建新设备`          | 其他选项：`禁用`、`检查预置设备`      |
| Provision Device Secret | `my_secret_string` | 密钥，设备 Provision 请求时必须匹配 |


**Step 2 — 获取 provisionDeviceKey**

进入 `设备配置 → 详情`：


| 字段                       | 说明                                         |
| ------------------------ | ------------------------------------------ |
| **Provision Device Key** | 设备配置的唯一标识，**进入设备配置详情页即可看到**。此值由系统自动生成或手动设置 |


两个字段都在 **Device Profile（设备配置）** 中获取，不需要设备预先存在：

```
UI 路径:
  设备配置 (Device Profiles)
    → 选择目标配置 (如 "default")
      → 详情页:
          Provision Device Key:  "自动生成的唯一字符串"
          ↓
      → Device Provisioning 标签:
          Provision Type:        允许创建新设备
          Provision Device Secret:  自定义密钥
```

### Provision 流程

```
1. CONNECT
   username = "provision"
   （或 clientId = "provision"）

2. SUBSCRIBE /provision/response

3. PUBLISH /provision/request
   {
     "deviceName": "my-sensor-001",
     "provisionDeviceKey": "设备配置中的 Provision Device Key",
     "provisionDeviceSecret": "设备配置中配置的 Secret"
   }

4. RECEIVE /provision/response
   {
     "credentialsType": "ACCESS_TOKEN",
     "credentialsValue": "new_generated_token",
     "status": "SUCCESS"
   }

5. 断开连接 → 用返回的 credentialsValue 作为 Token 重新连接
```

### 字段说明


| 字段                      | 来源                              | 说明                              |
| ----------------------- | ------------------------------- | ------------------------------- |
| `deviceName`            | 设备自定义                           | 新设备的名称，需唯一                      |
| `provisionDeviceKey`    | 设备配置详情页                         | 设备配置的唯一 Provision Key，设备配置创建时生成 |
| `provisionDeviceSecret` | 设备配置 → Device Provisioning → 密钥 | 自定义的预共享密钥，验证设备端合法性              |


### 安全提示

- `provisionDeviceSecret` 不要硬编码在固件中，应通过产线烧录工具注入
- Provision 完成后设备获得自己的 Token，后续连接使用该 Token，`provision` 连接仅首次使用

## 八、设备认领（Claim）

将未分配客户的设备归属到指定客户名下。

### 前置条件

设备必须处于"可被认领"状态，满足以下条件之一：

**条件 A — 全局允许（默认关闭）**：

```yaml
security.claim.allowClaimingByDefault: true
```

开启后所有未分配客户的设备均可认领。

**条件 B — 设备属性控制**（`allowClaimingByDefault: false` 时）：
需要给设备设置 `SERVER_SCOPE` 属性：

```json
{
  "claimingAllowed": true,
  "claimingData": "{\"secretKey\":\"my_key\",\"expirationTime\":1719504000000}"
}
```

通过 `POST /api/plugins/telemetry/DEVICE/{deviceId}/SERVER_SCOPE` 设置。

### Claim 流程

Claim 分为两步：

**Step 1 — 设备端注册 Claim 信息**（设备通过 MQTT 发起）：

```
PUBLISH v1/devices/me/claim
{
  "secretKey": "claim_password",
  "durationMs": 86400000
}
```


| 字段           | 必填  | 说明                                                                   |
| ------------ | --- | -------------------------------------------------------------------- |
| `secretKey`  | 否   | 设备自定义的认领密钥。可传空字符串 `""`（双方都空也算匹配）                                     |
| `durationMs` | 否   | 认领窗口有效期（毫秒）。不填使用系统默认值（`security.claim.duration`，默认 86400000ms = 24h） |


设备发送后会调用 `registerClaimingInfo()`，将 `secretKey` + 过期时间写入缓存和 `SERVER_SCOPE` 属性。

**Step 2 — 客户通过 REST API 认领**：

```
POST /api/customer/device/{deviceName}/claim
Authorization: Bearer {customer_jwt}

{
  "secretKey": "claim_password"
}
```

客户提供的 `secretKey` 必须与设备端注册的一致（或双方均为空）。

### secretKey 获取方法

`secretKey` 由**设备端自定义**，不存在预配置值：


| 方式    | 说明                           |
| ----- | ---------------------------- |
| 固件内置  | 将 secretKey 写到设备固件中（如从序列号派生） |
| 动态生成  | 设备启动时根据硬件信息（MAC、芯片ID）计算      |
| 标签二维码 | 制造时将 secretKey 打印在设备标签上      |
| 空密钥   | 双方都为空 `""`，适用于内网可信环境         |


客户认领时需提供与设备相同的 `secretKey`，**产线需将每台设备的唯一 secretKey 同步给最终客户**（通过出货单、手工录入等渠道）。

### 网关代理子设备认领

```
PUBLISH v1/gateway/claim
{
  "device": "sub-device-001",
  "secretKey": "gateway_claim_key"
}
```

## 九、网关 API（Gateway）

网关通过一个 MQTT 连接代理多个子设备（如通过 Modbus、Zigbee、BLE 等协议接入的设备）。服务端根据网关连接的身份识别网关，通过 payload 中的 `device` 字段区分子设备。

### 9.1 网关初始化

网关用自己的 Token 连接，订阅下行 topic：

```python
# 网关连接
client.username_pw_set("gateway_access_token")
client.connect("thingsboard.example.com", 1883)

# 订阅子设备相关的下行 topic
client.subscribe("v1/gateway/attributes")          # 接收子设备属性更新
client.subscribe("v1/gateway/attributes/response")  # 接收子设备属性请求应答
client.subscribe("v1/gateway/rpc")                  # 接收子设备 RPC 命令
```

### 9.2 子设备在线管理

**子设备上线**：

```python
# Topic: v1/gateway/connect
client.publish("v1/gateway/connect", json.dumps({
    "device": "sensor-001",
    "type": "temperature"
}))
```

**子设备离线**：

```python
# Topic: v1/gateway/disconnect
client.publish("v1/gateway/disconnect", json.dumps({
    "device": "sensor-001"
}))
```

> **重要**：子设备在线状态完全由网关主动上报。网关自身断连时服务端自动标记该网关下所有子设备离线。

### 9.3 批量遥测上报

一次上报多个子设备的遥测数据：

```python
# Topic: v1/gateway/telemetry
client.publish("v1/gateway/telemetry", json.dumps({
    "sensor-001": [
        {"ts": 1719504000000, "values": {"temperature": 25.6, "humidity": 68}}
    ],
    "sensor-002": [
        {"ts": 1719504000000, "values": {"temperature": 31.2}}
    ],
    "actuator-003": [
        {"values": {"status": "running"}}   # 不传 ts，服务端加盖时间
    ]
}))
```

Payload 结构：`{ "子设备名": [遥测数组], "子设备名2": [...] }`。每个子设备的遥测数组格式与直连设备完全相同。

### 9.4 批量属性上报

```python
# Topic: v1/gateway/attributes
client.publish("v1/gateway/attributes", json.dumps({
    "sensor-001": {
        "firmware_version": "1.2.3",
        "serial_number": "SN-001"
    },
    "sensor-002": {
        "firmware_version": "1.2.3",
        "serial_number": "SN-002"
    }
}))
```

Payload 结构：`{ "子设备名": {键值对对象} }`。

### 9.5 接收子设备属性更新

当服务端修改子设备的共享属性时，网关收到：

```
Topic: v1/gateway/attributes
Payload:
{
  "device": "sensor-001",
  "data": {"target_temp": 30}
}
```

`device` 字段指示目标子设备，网关负责将 `data` 中的属性下发到对应子设备。

### 9.6 请求子设备共享属性

网关替子设备主动拉取最新共享属性：

```python
# Topic: v1/gateway/attributes/request
client.publish("v1/gateway/attributes/request", json.dumps({
    "id": 1,
    "device": "sensor-001",
    "clientKeys": "",
    "sharedKeys": "target_temp,report_interval"
}))
```

| 字段 | 说明 |
|------|------|
| `id` | 请求 ID，用于匹配响应 |
| `device` | 子设备名 |
| `clientKeys` | 逗号分隔的客户端属性 key（可为空） |
| `sharedKeys` | 逗号分隔的共享属性 key |

接收应答：

```
Subscribe: v1/gateway/attributes/response
{
  "id": 1,
  "device": "sensor-001",
  "shared": {
    "target_temp": 25,
    "report_interval": 60
  }
}
```

### 9.7 接收 RPC 命令并回复

**接收**子设备 RPC 命令：

```
Topic: v1/gateway/rpc
Payload:
{
  "id": 123,
  "device": "sensor-001",
  "data": {
    "method": "reboot",
    "params": {}
  }
}
```

**回复** RPC 结果：

```python
client.publish("v1/gateway/rpc", json.dumps({
    "id": 123,
    "device": "sensor-001",
    "data": {"success": True}
}))
```

### 9.8 子设备认领

```python
# Topic: v1/gateway/claim
client.publish("v1/gateway/claim", json.dumps({
    "device": "sensor-001",
    "secretKey": "claim_key_001"
}))
```

### 9.9 网关完整示例 (Python)

```python
import paho.mqtt.client as mqtt
import json
import time

THINGSBOARD_HOST = "192.168.1.100"
GATEWAY_TOKEN = "gateway_access_token"

# 模拟的子设备数据
sub_devices = {
    "sensor-001": {"temperature": 25.6, "humidity": 68},
    "sensor-002": {"temperature": 31.2, "humidity": 55}
}

def on_connect(client, userdata, flags, rc):
    print(f"Gateway connected (rc={rc})")
    # 订阅下行通道
    client.subscribe("v1/gateway/attributes")
    client.subscribe("v1/gateway/attributes/response")
    client.subscribe("v1/gateway/rpc")
    # 上报所有子设备上线
    for name in sub_devices:
        client.publish("v1/gateway/connect", json.dumps({"device": name}))

def on_message(client, userdata, msg):
    payload = json.loads(msg.payload.decode())
    topic = msg.topic
    device = payload.get("device", "")

    if topic == "v1/gateway/rpc":
        rpc_id = payload["id"]
        method = payload["data"]["method"]
        print(f"[RPC] device={device} method={method}")
        # 执行 RPC，回复结果
        client.publish("v1/gateway/rpc", json.dumps({
            "id": rpc_id, "device": device,
            "data": {"result": "ok"}
        }))

    elif topic == "v1/gateway/attributes":
        # 收到共享属性更新，转发给子设备
        data = payload["data"]
        print(f"[Attr] device={device} update={data}")

def on_disconnect(client, userdata, rc):
    # 网关断连时服务端自动标记所有子设备离线
    for name in sub_devices:
        print(f"Device offline: {name}")

client = mqtt.Client()
client.username_pw_set(GATEWAY_TOKEN)
client.on_connect = on_connect
client.on_message = on_message
client.on_disconnect = on_disconnect
client.connect(THINGSBOARD_HOST, 1883, 60)
client.loop_start()

try:
    while True:
        # 定期上报子设备遥测
        telemetry = {}
        for name, data in sub_devices.items():
            telemetry[name] = [{"values": data}]
            # 模拟温度波动
            data["temperature"] += (__import__("random").random() - 0.5) * 2.0

        client.publish("v1/gateway/telemetry", json.dumps(telemetry))
        time.sleep(10)

except KeyboardInterrupt:
    client.loop_stop()
    client.disconnect()
```

### 9.10 网关与直连设备对比

| | 直连设备 | 网关 |
|---|---|---|
| 每个设备一个 MQTT 连接 | 是 | 否，一个连接代理多设备 |
| 设备标识 | Token 绑定 | payload 中 `device` 字段 |
| 在线检测 | MQTT Keep Alive | 网关主动发 connect/disconnect |
| 遥测 topic | `v1/devices/me/telemetry` | `v1/gateway/telemetry` |
| RPC topic | `v1/devices/me/rpc/request/+` | `v1/gateway/rpc` |

## 十、完整代码示例

### 直连设备 — ESP32 (Arduino)

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* ssid = "WiFi-SSID";
const char* password = "WiFi-Password";
const char* mqtt_server = "192.168.1.100";
const int mqtt_port = 1883;
const char* token = "your_device_access_token";

WiFiClient espClient;
PubSubClient client(espClient);

void setup_wifi() {
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(500);
}

void mqtt_subscribe() {
  // 订阅 RPC 命令
  client.subscribe("v1/devices/me/rpc/request/+");
  // 订阅属性更新
  client.subscribe("v1/devices/me/attributes");
  // 订阅属性请求响应
  client.subscribe("v1/devices/me/attributes/response/+");
}

void send_telemetry(float temp, float humid) {
  StaticJsonDocument<200> doc;
  doc["temperature"] = temp;
  doc["humidity"] = humid;
  
  char buffer[256];
  serializeJson(doc, buffer);
  client.publish("v1/devices/me/telemetry", buffer);
}

void send_attribute(const char* key, const char* value) {
  StaticJsonDocument<128> doc;
  doc[key] = value;
  char buffer[128];
  serializeJson(doc, buffer);
  client.publish("v1/devices/me/attributes", buffer);
}

void handle_rpc(byte* payload, unsigned int length, int requestId) {
  StaticJsonDocument<256> doc;
  deserializeJson(doc, payload, length);
  
  const char* method = doc["method"];
  
  if (strcmp(method, "reboot") == 0) {
    // 回复 RPC
    char topic[128];
    snprintf(topic, sizeof(topic), "v1/devices/me/rpc/response/%d", requestId);
    client.publish(topic, "{\"result\":\"rebooting\"}");
    ESP.restart();
  }
}

// 从 topic 中提取 requestId
int extract_request_id(char* topic) {
  char* lastSlash = strrchr(topic, '/');
  return lastSlash ? atoi(lastSlash + 1) : 0;
}

void callback(char* topic, byte* payload, unsigned int length) {
  if (strncmp(topic, "v1/devices/me/rpc/request/", 27) == 0) {
    int requestId = extract_request_id(topic);
    handle_rpc(payload, length, requestId);
  } else if (strcmp(topic, "v1/devices/me/attributes") == 0) {
    // 处理属性更新
    StaticJsonDocument<256> doc;
    deserializeJson(doc, payload, length);
    if (doc.containsKey("target_temp")) {
      float target = doc["target_temp"];
      Serial.printf("New target temperature: %.1f\n", target);
    }
  }
}

void reconnect() {
  while (!client.connected()) {
    if (client.connect("ESP32-001", token, "")) {
      mqtt_subscribe();
    } else {
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();
  
  static unsigned long last = 0;
  if (millis() - last > 10000) {
    send_telemetry(25.6, 68);
    last = millis();
  }
}
```

### 直连设备 — Python (paho-mqtt)

```python
import paho.mqtt.client as mqtt
import json
import time
import random

THINGSBOARD_HOST = "192.168.1.100"
ACCESS_TOKEN = "your_device_access_token"

def on_connect(client, userdata, flags, rc):
    print("Connected with result code", rc)
    # 订阅 RPC 命令
    client.subscribe("v1/devices/me/rpc/request/+")
    # 订阅属性更新
    client.subscribe("v1/devices/me/attributes")

def on_message(client, userdata, msg):
    topic = msg.topic
    payload = json.loads(msg.payload.decode())
    
    if topic.startswith("v1/devices/me/rpc/request/"):
        request_id = topic.split("/")[-1]
        method = payload.get("method")
        params = payload.get("params", {})
        
        if method == "setValue":
            response = {"result": "ok", "value": params.get("value")}
        else:
            response = {"error": f"Unknown method: {method}"}
        
        client.publish(
            f"v1/devices/me/rpc/response/{request_id}",
            json.dumps(response)
        )
    
    elif topic == "v1/devices/me/attributes":
        print(f"Attribute update: {payload}")

def on_disconnect(client, userdata, rc):
    print("Disconnected. Reconnecting...")
    time.sleep(1)
    client.reconnect()

client = mqtt.Client()
client.username_pw_set(ACCESS_TOKEN)
client.on_connect = on_connect
client.on_message = on_message
client.on_disconnect = on_disconnect

client.connect(THINGSBOARD_HOST, 1883, 60)
client.loop_start()

try:
    while True:
        telemetry = {
            "temperature": 25 + random.uniform(-2, 2),
            "humidity": 60 + random.uniform(-5, 5)
        }
        client.publish("v1/devices/me/telemetry", json.dumps(telemetry))
        time.sleep(10)
except KeyboardInterrupt:
    client.loop_stop()
    client.disconnect()
```

### C (ESP-IDF / Linux 嵌入式)

```c
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <time.h>
#include "mqtt_client.h"  // ESP-MQTT

// 发送遥测
void send_telemetry(esp_mqtt_client_handle_t client, 
                     float temp, float humid) {
    char payload[128];
    snprintf(payload, sizeof(payload),
        "{\"temperature\":%.1f,\"humidity\":%.0f}", temp, humid);
    
    esp_mqtt_client_publish(client, "v1/devices/me/telemetry",
        payload, 0, 1, 0);
}

// 发送属性
void send_attribute(esp_mqtt_client_handle_t client,
                     const char *key, const char *value) {
    char payload[128];
    snprintf(payload, sizeof(payload), "{\"%s\":\"%s\"}", key, value);
    
    esp_mqtt_client_publish(client, "v1/devices/me/attributes",
        payload, 0, 1, 0);
}

// 处理 RPC
void handle_rpc(esp_mqtt_client_handle_t client,
                 const char *topic, const char *data, int data_len) {
    // 提取 requestId (topic 最后一段)
    const char *last_slash = strrchr(topic, '/');
    int request_id = last_slash ? atoi(last_slash + 1) : 0;
    
    // 简单解析 method
    char method[32] = {0};
    const char *m = strstr(data, "\"method\"");
    if (m) {
        m = strchr(m, ':') + 2; // 跳过 `:" `
        const char *end = strchr(m, '"');
        int len = end - m;
        if (len < sizeof(method)) {
            memcpy(method, m, len);
        }
    }
    
    char resp_topic[64];
    snprintf(resp_topic, sizeof(resp_topic),
        "v1/devices/me/rpc/response/%d", request_id);
    
    if (strcmp(method, "getStatus") == 0) {
        esp_mqtt_client_publish(client, resp_topic,
            "{\"status\":\"running\"}", 0, 1, 0);
    } else if (strcmp(method, "reboot") == 0) {
        esp_mqtt_client_publish(client, resp_topic,
            "{\"result\":\"ok\"}", 0, 1, 0);
    }
}

// 连接后订阅
static void mqtt_event_handler(void *arg, esp_event_base_t base,
                                int32_t event_id, void *event_data) {
    esp_mqtt_event_handle_t event = event_data;
    switch (event->event_id) {
        case MQTT_EVENT_CONNECTED:
            // 订阅 RPC 命令和属性更新
            esp_mqtt_client_subscribe(event->client,
                "v1/devices/me/rpc/request/+", 0);
            esp_mqtt_client_subscribe(event->client,
                "v1/devices/me/attributes", 0);
            break;
        case MQTT_EVENT_DATA:
            if (strncmp(event->topic, "v1/devices/me/rpc/request/", 27) == 0) {
                handle_rpc(event->client, event->topic,
                    event->data, event->data_len);
            }
            break;
        case MQTT_EVENT_DISCONNECTED:
            break;
    }
}

// 启动示例
void mqtt_app_start(void) {
    esp_mqtt_client_config_t cfg = {
        .broker.address.uri = "mqtt://192.168.1.100:1883",
        .credentials = {
            .username = "your_device_access_token",
        },
    };
    esp_mqtt_client_handle_t client = esp_mqtt_client_init(&cfg);
    esp_mqtt_client_register_event(client, ESP_EVENT_ANY_ID,
        mqtt_event_handler, NULL);
    esp_mqtt_client_start(client);
}
```

## 十一、常见问题排查


| 问题            | 排查方法                                                |
| ------------- | --------------------------------------------------- |
| 连接被拒绝         | 检查 Token 是否复制正确（无多余空格）                              |
| 数据上报成功但仪表板不显示 | 检查规则链是否有 `Save Timeseries` 节点                       |
| RPC 命令无响应     | 检查设备是否订阅了 `v1/devices/me/rpc/request/+`             |
| OTA 升级失败      | 确认订阅了 `v2/fw/response/+/chunk/+`；chunk 0 触发分配       |
| 属性请求超时        | `attributes/request` 的 requestId 需与 `response/+` 匹配 |


## 附录：V2 精简 Topic 快速参考


| 操作     | V1 Topic                                | V2 Topic          |
| ------ | --------------------------------------- | ----------------- |
| 遥测     | `v1/devices/me/telemetry`               | `v2/t` 或 `v2/t/j` |
| 属性上报   | `v1/devices/me/attributes`              | `v2/a` 或 `v2/a/j` |
| 请求属性   | `v1/devices/me/attributes/request/{id}` | `v2/a/req/{id}`   |
| RPC 回复 | `v1/devices/me/rpc/response/{id}`       | `v2/r/res/{id}`   |
| 发起 RPC | `v1/devices/me/rpc/request/{id}`        | `v2/r/req/{id}`   |
| 认领     | `v1/devices/me/claim`                   | —                 |


---

文档版本: v1.0 | 2026-06-29