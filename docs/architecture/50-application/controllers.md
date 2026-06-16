# REST API Controllers

The application exposes a comprehensive REST API through 63 controller classes, all located in `application/src/main/java/org/thingsboard/server/controller/`. All controllers are annotated with `@RestController`, `@TbCoreComponent`, and `@RequestMapping("/api")`.

## Base Classes

### BaseController

`BaseController.java` is the abstract superclass for almost all controllers. It provides:

- **Entity validation**: `checkDeviceId()`, `checkAssetId()`, `checkTenantId()`, `checkUserId()`, etc. -- fetches the entity, checks permissions, and returns it
- **Generic entity check**: `checkEntityId(EntityId, Operation)` -- dispatches to the correct check method based on `EntityType`
- **CRUD logging**: `doSaveAndLog()`, `doDeleteAndLog()` -- wraps entity save/delete with automatic audit logging via `EntityActionService`
- **User helpers**: `getCurrentUser()`, `getTenantId()` -- extracts the `SecurityUser` from the Spring Security context
- **Pagination**: `createPageLink()`, `createTimePageLink()` -- builds `PageLink` objects from request parameters
- **Exception handling**: `@ExceptionHandler` methods that convert exceptions to structured `ThingsboardException` responses
- **All DAO and service dependencies**: ~50 `@Autowired` fields for DAO services, entity services, cache services, queue producers, and more

### AbstractRpcController

`AbstractRpcController.java` extends `BaseController` and provides RPC-specific functionality for the `RpcV1Controller` and `RpcV2Controller`.

## Controller Catalog

### Entity CRUD

| Controller | URL Path | Entity | Auth |
|------------|----------|--------|------|
| `DeviceController` | `/api/device/**` | Device | TENANT_ADMIN, CUSTOMER_USER |
| `AssetController` | `/api/asset/**` | Asset | TENANT_ADMIN, CUSTOMER_USER |
| `AlarmController` | `/api/alarm/**` | Alarm | TENANT_ADMIN, CUSTOMER_USER |
| `AlarmCommentController` | `/api/alarm/{alarmId}/comment/**` | AlarmComment | TENANT_ADMIN, CUSTOMER_USER |
| `AlarmRuleController` | `/api/alarm/rule/**` | AlarmRule | TENANT_ADMIN |
| `EntityViewController` | `/api/entityView/**` | EntityView | TENANT_ADMIN, CUSTOMER_USER |
| `EntityRelationController` | `/api/relation/**` | EntityRelation | TENANT_ADMIN, CUSTOMER_USER |
| `CustomerController` | `/api/customer/**` | Customer | TENANT_ADMIN |
| `TenantController` | `/api/tenant/**` | Tenant | SYS_ADMIN |
| `UserController` | `/api/user/**` | User | SYS_ADMIN, TENANT_ADMIN |
| `DashboardController` | `/api/dashboard/**` | Dashboard | TENANT_ADMIN, CUSTOMER_USER |
| `WidgetTypeController` | `/api/widgetType/**` | WidgetType | TENANT_ADMIN |
| `WidgetsBundleController` | `/api/widgetsBundle/**` | WidgetsBundle | TENANT_ADMIN |
| `EdgeController` | `/api/edge/**` | Edge | TENANT_ADMIN |
| `OtaPackageController` | `/api/otaPackage/**` | OtaPackage | TENANT_ADMIN |
| `TbResourceController` | `/api/resource/**` | TbResource | TENANT_ADMIN |
| `AiModelController` | `/api/ai/model/**` | AiModel | TENANT_ADMIN |
| `ApiKeyController` | `/api/apiKey/**` | ApiKey | TENANT_ADMIN |
| `CalculatedFieldController` | `/api/calculatedField/**` | CalculatedField | TENANT_ADMIN |
| `DomainController` | `/api/domain/**` | Domain | TENANT_ADMIN |
| `MobileAppController` | `/api/mobileApp/**` | MobileApp | TENANT_ADMIN, CUSTOMER_USER |
| `MobileAppBundleController` | `/api/mobileAppBundle/**` | MobileAppBundle | TENANT_ADMIN |
| `NotificationTargetController` | `/api/notification/target/**` | NotificationTarget | TENANT_ADMIN |
| `NotificationTemplateController` | `/api/notification/template/**` | NotificationTemplate | TENANT_ADMIN |
| `NotificationRuleController` | `/api/notification/rule/**` | NotificationRule | TENANT_ADMIN |
| `NotificationController` | `/api/notification/**` | Notification | TENANT_ADMIN, CUSTOMER_USER |
| `JobController` | `/api/job/**` | Job | TENANT_ADMIN |
| `MailConfigTemplateController` | `/api/mail/config/template/**` | MailConfigTemplate | SYS_ADMIN |
| `OAuth2ConfigTemplateController` | `/api/oauth2/config/template/**` | OAuth2ConfigTemplate | SYS_ADMIN |

### Profiles

| Controller | URL Path | Entity | Auth |
|------------|----------|--------|------|
| `DeviceProfileController` | `/api/deviceProfile/**` | DeviceProfile | TENANT_ADMIN |
| `AssetProfileController` | `/api/assetProfile/**` | AssetProfile | TENANT_ADMIN |
| `TenantProfileController` | `/api/tenantProfile/**` | TenantProfile | SYS_ADMIN |

### User Management

| Controller | URL Path | Entity | Auth |
|------------|----------|--------|------|
| `UserController` | `/api/user/**` | User | SYS_ADMIN, TENANT_ADMIN |
| `CustomerController` | `/api/customer/**` | Customer | TENANT_ADMIN |
| `TenantController` | `/api/tenant/**` | Tenant | SYS_ADMIN |
| `AdminController` | `/api/admin/**` | System admin | SYS_ADMIN |

### System

| Controller | URL Path | Purpose | Auth |
|------------|----------|---------|------|
| `SystemInfoController` | `/api/system/**` | System info, version | All authenticated |
| `QueueController` | `/api/queues/**` | Queue management | SYS_ADMIN |
| `QueueStatsController` | `/api/queueStats/**` | Queue statistics | SYS_ADMIN |

### Communication

| Controller | URL Path | Purpose | Auth |
|------------|----------|---------|------|
| `TelemetryController` | `/api/plugins/telemetry/**` | Timeseries & attribute data | TENANT_ADMIN, CUSTOMER_USER |
| `RpcV1Controller` | `/api/rpc/**` | RPC (v1) | TENANT_ADMIN, CUSTOMER_USER |
| `RpcV2Controller` | `/api/rpc/v2/**` | RPC (v2, persistent) | TENANT_ADMIN, CUSTOMER_USER |
| `EntityQueryController` | `/api/entitiesQuery/**` | Entity data queries | TENANT_ADMIN, CUSTOMER_USER |

### Rule Engine & Component Configuration

| Controller | URL Path | Purpose | Auth |
|------------|----------|---------|------|
| `RuleChainController` | `/api/ruleChain/**` | Rule chain CRUD | TENANT_ADMIN |
| `RuleEngineController` | `/api/rule-engine/**` | Rule engine management | TENANT_ADMIN |
| `ComponentDescriptorController` | `/api/components/**` | Component descriptor catalog | TENANT_ADMIN |

### Authentication & OAuth2

| Controller | URL Path | Purpose | Auth |
|------------|----------|---------|------|
| `AuthController` | `/api/auth/**`, `/api/noauth/**` | Login, logout, password reset, activation | Mixed |
| `OAuth2Controller` | `/api/oauth2/**` | OAuth2 client management | SYS_ADMIN (config), TENANT_ADMIN (login) |
| `TwoFactorAuthController` | `/api/2fa/**` | Two-factor auth | TENANT_ADMIN, CUSTOMER_USER |
| `TwoFactorAuthConfigController` | `/api/2fa/config/**` | 2FA configuration | TENANT_ADMIN |

### Miscellaneous

| Controller | URL Path | Purpose | Auth |
|------------|----------|---------|------|
| `AuditLogController` | `/api/audit/logs/**` | Audit log queries | SYS_ADMIN, TENANT_ADMIN |
| `EdgeEventController` | `/api/edge/event/**` | Edge event management | TENANT_ADMIN |
| `EventController` | `/api/events/**` | Debug events | TENANT_ADMIN |
| `ImageController` | `/api/image/**` | Image upload/download | TENANT_ADMIN |
| `UiSettingsController` | `/api/ui/settings/**` | UI settings | TENANT_ADMIN, CUSTOMER_USER |
| `UsageInfoController` | `/api/usage/**` | API usage info | TENANT_ADMIN |
| `DeviceConnectivityController` | `/api/device-connectivity/**` | Device connectivity certs | Public |
| `Lwm2mController` | `/api/lwm2m/**` | LwM2M device management | TENANT_ADMIN |
| `QrCodeSettingsController` | `/api/qr-code/settings/**` | QR code settings | TENANT_ADMIN |
| `TrendzController` | `/api/trendz/**` | Trendz analytics | TENANT_ADMIN |
| `AutoCommitController` | `/api/auto-commit/**` | Auto-commit settings | SYS_ADMIN |
| `EntitiesVersionControlController` | `/api/entities/vc/**` | Entity version control | TENANT_ADMIN |

### WebSocket Plugin

The `controller/plugin/` subpackage contains WebSocket handler classes:

| Class | Purpose |
|-------|---------|
| `TbWebSocketHandler` | WebSocket connection handler for real-time telemetry, alarms, and notifications |
| `TbWebSocketMsg` | WebSocket message base class |
| `TbWebSocketMsgType` | WebSocket message type enum |
| `TbWebSocketPingMsg` | Ping message for keep-alive |
| `TbWebSocketTextMsg` | Text message payload |

## URL Pattern

All controllers use `@RequestMapping("/api")` at the class level. The URL path prefix for entity endpoints follows this convention:

| URL Pattern | Entity Type |
|-------------|-------------|
| `/api/device/**` | Device |
| `/api/asset/**` | Asset |
| `/api/alarm/**` | Alarm |
| `/api/customer/**` | Customer |
| `/api/tenant/**` | Tenant |
| `/api/user/**` | User |
| `/api/edge/**` | Edge |
| `/api/dashboard/**` | Dashboard |
| `/api/ruleChain/**` | RuleChain |
| `/api/deviceProfile/**` | DeviceProfile |
| `/api/assetProfile/**` | AssetProfile |
| `/api/tenantProfile/**` | TenantProfile |
| `/api/entityView/**` | EntityView |
| `/api/relation/**` | EntityRelation |
| `/api/widgetType/**` | WidgetType |
| `/api/widgetsBundle/**` | WidgetsBundle |
| `/api/otaPackage/**` | OtaPackage |
| `/api/resource/**` | TbResource |
| `/api/queues/**` | Queue |

Non-authenticated endpoints use `/api/noauth/**` (password reset, account activation). Device API endpoints use `/api/v1/**`.

## Common Controller Patterns

### Standard CRUD Endpoints

Each entity controller typically provides:
- `GET /api/{entity}/{id}` -- Get by ID
- `GET /api/{entity}/info/{id}` -- Get info (includes related entity names)
- `POST /api/{entity}` -- Create or update (upsert)
- `DELETE /api/{entity}/{id}` -- Delete
- `GET /api/tenant/{entity}s` -- List tenant entities (paginated)
- `GET /api/tenant/{entity}Infos` -- List tenant entity infos (paginated)
- `GET /api/customer/{customerId}/{entity}s` -- List customer entities (paginated)

### Authorization

Controllers use `@PreAuthorize` annotations with role-based access:
- `hasAuthority('SYS_ADMIN')` -- System administrator only
- `hasAuthority('TENANT_ADMIN')` -- Tenant administrator only
- `hasAuthority('CUSTOMER_USER')` -- Customer user only
- `hasAnyAuthority('TENANT_ADMIN', 'CUSTOMER_USER')` -- Tenant admin or customer user

Permission checks use `Operation` enum values: `READ`, `WRITE`, `CREATE`, `DELETE`, `ASSIGN_TO_CUSTOMER`, `UNASSIGN_FROM_CUSTOMER`, `CLAIM_DEVICES`, `READ_CREDENTIALS`, `WRITE_CREDENTIALS`, and more.

### Audit Logging

All entity mutations are automatically logged via `BaseController.doSaveAndLog()` and `doDeleteAndLog()`, which call `EntityActionService.logEntityAction()` and capture the user, entity, action type (ADDED, UPDATED, DELETED), and any exception.

### Async Responses

Long-running operations (RPC, claim device) use `DeferredResult<T>` with `ListenableFuture` callbacks, allowing the request thread to be freed while the operation completes asynchronously.

## Related Documents

- [README](README.md) -- Application module overview
- [Services](services.md) -- Service layer that controllers delegate to
- [Configuration and Security](config-and-security.md) -- Security architecture and JWT authentication
