# Common Data (`common/data`)

**Maven artifact:** `org.thingsboard.common:data`

The `common/data` module is the largest common module. It defines all entity models, data transfer objects (DTOs), entity IDs, enums, constants, and validation rules used by every layer of ThingsBoard. It is the foundational dependency of the entire project.

## Architecture

All classes reside under the base package `org.thingsboard.server.common.data`. The module is organized into subpackages by domain concern. Each major entity type gets its own subpackage containing the entity class, related DTOs, and associated types.

### Entity ID System

Every entity in ThingsBoard is identified by a UUID-based ID that implements the `EntityId` interface:

```java
public interface EntityId extends HasUUID, Serializable {
    UUID getId();
    EntityType getEntityType();
}
```

The `EntityIdFactory` deserializes IDs from a combination of `EntityType` enum and UUID. The `EntityId` interface uses `@JsonDeserialize`/`@JsonSerialize` custom annotations (`EntityIdDeserializer`, `EntityIdSerializer`) for polymorphic JSON serialization.

The `EntityType` enum defines 30+ entity types including: `TENANT`, `CUSTOMER`, `USER`, `DEVICE`, `ASSET`, `DASHBOARD`, `ALARM`, `RULE_CHAIN`, `RULE_NODE`, `DEVICE_PROFILE`, `ASSET_PROFILE`, `TENANT_PROFILE`, `ENTITY_VIEW`, `EDGE`, `WIDGETS_BUNDLE`, `WIDGET_TYPE`, `TB_RESOURCE`, `OTA_PACKAGE`, `NOTIFICATION`, `NOTIFICATION_TARGET`, `NOTIFICATION_TEMPLATE`, `NOTIFICATION_REQUEST`, `NOTIFICATION_RULE`, `QUEUE`, `QUEUE_STATS`, `RPC`, `API_USAGE_STATE`, `OAUTH2_CLIENT`, `DOMAIN`, `MOBILE_APP`, `MOBILE_APP_BUNDLE`, `CALCULATED_FIELD`, `JOB`, `ADMIN_SETTINGS`, `AI_MODEL`, `API_KEY`.

### DTO Pattern

Entity classes (e.g., `Device`, `Asset`, `Dashboard`) are serializable Java records/POJOs with Jackson annotations. They represent the persistent model. DTOs are separate from entities -- request DTOs (e.g., `DeviceInfo`) contain only the fields needed for API input/output, keeping the internal model decoupled from the REST contract.

## Package Structure

### Core Entity Subpackages

| Subpackage | Description | Key Files |
|-----------|-------------|-----------|
| `device/` | Device entities, credentials | `Device.java`, `DeviceInfo.java`, `DeviceTransportType.java` |
| `asset/` | Asset entities | `Asset.java`, `AssetInfo.java` |
| `alarm/` | Alarm entities, comments | `Alarm.java`, `AlarmComment.java`, `AlarmSeverity.java` |
| `tenant/` | Tenant entities, profiles | `Tenant.java`, `TenantProfile.java`, `DefaultTenantProfileConfiguration.java` |
| `customer/` | Customer entities | `Customer.java`, `CustomerInfo.java` |
| `user/` | User entities, credentials | `User.java`, `UserCredentials.java` |
| `dashboard/` | Dashboard entities | `Dashboard.java`, `DashboardInfo.java` |
| `rule/` | Rule chain, rule node entities | `RuleChain.java`, `RuleNode.java`, `RuleChainType.java` |
| `edge/` | Edge entities | `Edge.java`, `EdgeInfo.java` |
| `entityview/` | Entity View entities | `EntityView.java`, `EntityViewInfo.java` |
| `widget/` | Widget types and bundles | `WidgetType.java`, `WidgetsBundle.java` |
| `resource/` | Resource (JS, image, CSS) entities | `TbResource.java`, `TbResourceInfo.java` |
| `ota/` | OTA package entities | `OtaPackage.java`, `OtaPackageInfo.java` |
| `notification/` | Notification entities | Notification targets, templates, rules, requests |
| `ai/` | AI model entities | `AiModel.java` |
| `domain/` | Domain entities | `Domain.java` |
| `mobile/` | Mobile app entities | `MobileApp.java`, `MobileAppBundle.java` |

### Supporting Subpackages

| Subpackage | Description | Key Files |
|-----------|-------------|-----------|
| `id/` | 50+ entity ID classes | `EntityId.java`, `DeviceId.java`, `TenantId.java`, `EntityIdFactory.java` |
| `kv/` | Key-value data types for telemetry | `BaseTsKvQuery.java`, `TsKvEntry.java`, `AttributeKvEntry.java` |
| `query/` | Query definitions | `EntityDataQuery.java`, `EntityCountQuery.java`, `TsValue.java` |
| `relation/` | Entity relationship types | `EntityRelation.java`, `RelationTypeGroup.java` |
| `rpc/` | RPC message types | `Rpc.java`, `RpcStatus.java` |
| `event/` | Event types | `Event.java`, `EventType.java` |
| `exception/` | Common exceptions | `ThingsboardException.java`, `ThingsboardErrorCode.java` |
| `page/` | Pagination DTOs | `PageData.java`, `TimePageData.java`, `TimePageLink.java` |
| `audit/` | Audit log types | `AuditLog.java`, `ActionType.java` |
| `security/` | Security DTOs | `Authority.java`, `UserCredentials.java` |
| `oauth2/` | OAuth2 configuration types | `OAuth2ClientInfo.java`, `OAuth2ParamsInfo.java` |
| `permission/` | Permission definitions | `PermissionChecker.java` |
| `transport/` | Transport configuration DTOs | Device transport config enums |
| `script/` | Script metadata types | `ScriptLanguage.java` |
| `settings/` | Admin settings DTOs | `AdminSettings.java` |
| `sms/` | SMS configuration | `SmsProviderConfiguration.java` |
| `mail/` | Mail configuration | `MailConfiguration.java` |
| `queue/` | Queue configuration | `QueueConfig.java`, `QueueInfo.java` |
| `job/` | Job entities | `Job.java`, `JobInfo.java` |
| `pat/` | Personal access token types | `PersonalAccessToken.java` |
| `plugin/` | Plugin lifecycle types | `ComponentLifecycleEvent.java` |
| `housekeeper/` | Data cleanup housekeeping types | `HousekeeperTask.java` |
| `limit/` | Rate limiting types | `RateLimits.java` |
| `sync/` | Version control sync types | `GitSyncSettings.java` |
| `trendz/` | Trendz analytics types | Analytics-related data classes |
| `cf/` | Calculated field types | `CalculatedField.java`, `CalculatedFieldType.java` |
| `edqs/` | EDQS-specific data types | EDQS entity data classes |
| `lwm2m/` | LwM2M transport types | LwM2M-specific device profile configs |
| `debug/` | Debug/Debugging types | Debug configuration types |
| `validation/` | Validation utilities | Built-in validators |
| `util/` | Data utility classes | Data helpers |

## Enums

Key enums defined in this module:
- `EntityType` -- all entity types in the system
- `DeviceTransportType` -- `DEFAULT`, `MQTT`, `HTTP`, `COAP`, `LWM2M`, `SNMP`
- `AlarmSeverity` -- `CRITICAL`, `MAJOR`, `MINOR`, `WARNING`, `INDETERMINATE`
- `ComponentLifecycleEvent` -- `CREATED`, `STARTED`, `ACTIVATED`, `SUSPENDED`, `UPDATED`, `STOPPED`, `DELETED`, `FAILED`, `DEACTIVATED`
- `EntityViewType` -- view behavior types
- `ScriptLanguage` -- `TBEL`, `JS`
- `Authority` -- `SYS_ADMIN`, `TENANT_ADMIN`, `CUSTOMER_USER`

## Relationships

- **Depends on:** Nothing (no other common module) -- this is the root common module
- **Depended on by:** Every other module in the project (`common/message`, `common/cache`, `common/dao-api`, `common/queue`, `common/actor`, `common/cluster-api`, `common/script`, `common/transport`, `dao`, `application`, `rule-engine`, all transports)
- **Maven groupId:** `org.thingsboard.common`
- **Maven artifactId:** `data`
