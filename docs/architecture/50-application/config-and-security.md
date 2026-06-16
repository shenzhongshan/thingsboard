# Configuration and Security

The ThingsBoard application server is configured through `thingsboard.yml` and secured via Spring Security with JWT tokens, RBAC, OAuth2, and two-factor authentication.

## Configuration File: `thingsboard.yml`

The main configuration file is located at:

```
application/src/main/resources/thingsboard.yml
```

It follows a structured YAML hierarchy with extensive environment variable override support. All property values use the `${ENV_VARIABLE:default}` pattern.

### Configuration Sections

| Section | Environment Variable Prefix | Purpose |
|---------|---------------------------|---------|
| `server` | `HTTP_`, `SSL_`, `TB_SERVER_` | HTTP(S) bind address, port, SSL, WebSocket, REST API settings, compression, rate limits |
| `app` | (build-time) | Application version string |
| `zk` | `ZOOKEEPER_` | ZooKeeper service discovery and cluster coordination |
| `cluster.stats` | `TB_CLUSTER_` | Inter-node message statistics |
| `plugins` | `PLUGINS_` | Classpath scan packages for extension plugins |
| `security` | `SECURITY_`, `JWT_` | JWT tokens, API keys, user login, device claiming, OAuth2, CA certs, HTTP security headers |
| `mail` | `MAIL_` | Mail service OAuth2 token refresh, rate limits |
| `usage.stats` | `USAGE_STATS_`, `DEVICES_STATS_` | API usage statistics collection and reporting |
| `ui` | `UI_`, `DASHBOARD_` | Dashboard data limits, help base URL |
| `database` | `DATABASE_` | TS storage type selection (sql/cassandra/timescale) |
| `cassandra` | `CASSANDRA_`, `TS_KV_` | Cassandra driver: cluster, keyspace, SSL, credentials, socket, query |
| `sql` | `SQL_` | SQL database connection settings |
| `sql.postgres` | `POSTGRES_` | PostgreSQL-specific settings |
| `sql.ts` | `SQL_TS_` | SQL time-series storage settings |
| `sql.ts_latest` | `SQL_TS_LATEST_` | SQL latest values storage |
| `cache` | `CACHE_` | Cache configuration (type, specs) |
| `queue` | `TB_QUEUE_` | Queue type (kafka/pub-sub/aws-sqs/etc.) and settings |
| `actors` | (actors.*) | Actor system settings (see [actors.md](actors.md)) |
| `transport` | `TRANSPORT_` | Transport service settings |
| `edges` | `EDGES_` | Edge functionality settings |
| `rate_limits` | `TB_RATE_LIMITS_` | Global rate limit configurations |
| `audit_log` | `AUDIT_LOG_` | Audit log settings |
| `notification` | `NOTIFICATION_` | Notification system settings |
| `install` | `INSTALL_` | Installation and upgrade settings |
| `state` | `STATE_` | System state persistence settings |

### Key Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_TS_TYPE` | `sql` | Time-series storage backend: `sql`, `cassandra`, or `timescale` |
| `DATABASE_TS_LATEST_TYPE` | `sql` | Latest values storage backend |
| `TB_QUEUE_TYPE` | `kafka` | Message queue type |
| `CACHE_TYPE` | `caffeine` | Cache implementation: `caffeine` (local) or `redis` |
| `ZOOKEEPER_ENABLED` | `false` | Enable ZooKeeper for cluster coordination |
| `HTTP_BIND_ADDRESS` | `0.0.0.0` | Server bind address |
| `HTTP_BIND_PORT` | `8080` | Server bind port |
| `SSL_ENABLED` | `false` | Enable HTTPS |
| `JWT_TOKEN_EXPIRATION_TIME` | `9000` | JWT access token TTL (seconds) |
| `JWT_REFRESH_TOKEN_EXPIRATION_TIME` | `604800` | JWT refresh token TTL (seconds) |
| `JWT_TOKEN_SIGNING_KEY` | `thingsboardDefaultSigningKey` | JWT signing key (Base64) |

## Spring Configuration Classes

Located in `application/src/main/java/org/thingsboard/server/config/`:

| Class | Purpose |
|-------|---------|
| `ThingsboardSecurityConfiguration` | Main security configuration -- filter chain, authentication providers, CORS, rate limiting filters |
| `ThingsboardMessageConfiguration` | Message/queue-related bean configuration |
| `WebConfig` | Web MVC configuration (message converters, async support) |
| `WebSocketConfiguration` | WebSocket endpoint registration |
| `SchedulingConfiguration` | Task scheduler configuration |
| `SwaggerConfiguration` | OpenAPI/Swagger UI configuration |
| `CryptoConfig` | Cryptographic utilities (BCrypt, AES) |
| `MvcCorsProperties` | CORS mapping configuration properties |
| `HttpSecurityHeadersCustomizer` | HTTP security response headers |
| `HttpSecurityHeadersProperties` | Security header property bindings |
| `RateLimitProcessingFilter` | Rate limiting servlet filter |
| `CustomOAuth2AuthorizationRequestResolver` | OAuth2 authorization request customization |
| `TbHttpClientSettingsComponent` | HTTP client settings for external rule node calls |
| `TbRuleEngineSecurityConfiguration` | Rule-engine-specific security settings |
| `config/mqtt/MqttClientSettingsComponent` | MQTT client configuration |
| `config/mqtt/MqttClientRetransmissionSettingsComponent` | MQTT retransmission settings |
| `config/annotations/ApiOperation` | Custom annotation for API operation metadata |

## Security Architecture

### Authentication Flow

The security system is built on Spring Security with a stateless architecture (`SessionCreationPolicy.STATELESS`). The main filter chain in `ThingsboardSecurityConfiguration` defines these entry points:

1. **Unauthenticated paths** (`/api/noauth/**`, static resources, WebSocket): Permit all
2. **Login endpoints** (`/api/auth/login`, `/api/auth/login/public`): Processed by `RestLoginProcessingFilter` / `RestPublicLoginProcessingFilter`
3. **Token refresh** (`/api/auth/token`): Processed by `RefreshTokenProcessingFilter`
4. **Protected API** (`/api/**`): Requires authentication via JWT or API key
5. **WebSocket** (`/api/ws/**`): Authenticated via token query parameter
6. **Device API** (`/api/v1/**`): Authenticated via device credentials (handled separately)

### Authentication Providers

The `AuthenticationManager` aggregates four providers in order:

| Provider | Purpose |
|----------|---------|
| `RestAuthenticationProvider` | Username/password login |
| `JwtAuthenticationProvider` | JWT bearer token validation |
| `ApiKeyAuthenticationProvider` | API key validation (for programmatic access) |
| `RefreshTokenAuthenticationProvider` | Refresh token processing |

### JWT Token System

Located in `service/security/model/token/`:

| Class | Purpose |
|-------|---------|
| `JwtTokenFactory` | Creates and validates JWT access + refresh token pairs |
| `AccessJwtToken` | Wrapper for access JWT |
| `RawAccessJwtToken` | Raw JWT token representation |
| `OAuth2AppTokenFactory` | OAuth2 application token creation |
| `ApiKeyAuthRequest` | API key authentication request model |

Token flow:
1. **Login**: `POST /api/auth/login` with username/password -> returns access token + refresh token
2. **Authenticated requests**: Include `Authorization: Bearer <token>` or `X-Authorization: Bearer <token>` header
3. **Token refresh**: `POST /api/auth/token` with refresh token -> returns new token pair
4. **Token expiration**: Access tokens expire after `JWT_TOKEN_EXPIRATION_TIME` seconds (default 9000 = 2.5 hours)
5. **Refresh tokens**: Expire after `JWT_REFRESH_TOKEN_EXPIRATION_TIME` seconds (default 604800 = 1 week)

Token extractors (in `service/security/auth/extractor/`):
- `JwtHeaderTokenExtractor` -- Extracts JWT from HTTP headers
- `JwtQueryTokenExtractor` -- Extracts JWT from query parameters (WebSocket)
- `ApiKeyHeaderTokenExtractor` -- Extracts API key from HTTP headers

### RBAC Model

Role-Based Access Control is implemented through Spring Security authorities:

| Authority | Description |
|-----------|-------------|
| `SYS_ADMIN` | System administrator -- full platform access |
| `TENANT_ADMIN` | Tenant administrator -- manages entities within a tenant |
| `CUSTOMER_USER` | Customer user -- limited access to assigned entities |

Additional authority types:
- `MFA_CONFIGURATION_TOKEN` -- Used during two-factor auth configuration flow
- Various permission-based authorities for fine-grained access

The `AccessControlService` (implemented by `DefaultAccessControlService`) enforces permissions using the `Resource` + `Operation` model:

- **Resources**: `DEVICE`, `ASSET`, `ALARM`, `CUSTOMER`, `TENANT`, `USER`, `DASHBOARD`, `RULE_CHAIN`, `DEVICE_PROFILE`, `ASSET_PROFILE`, `TENANT_PROFILE`, `ENTITY_VIEW`, `EDGE`, `WIDGET_TYPE`, `WIDGETS_BUNDLE`, `TB_RESOURCE`, `OTA_PACKAGE`, `QUEUE`, `OAUTH2_CLIENT`, `DOMAIN`, `MOBILE_APP`, `MOBILE_APP_BUNDLE`, `NOTIFICATION`, `CALCULATED_FIELD`, `AI_MODEL`, `API_KEY`, and more
- **Operations**: `READ`, `WRITE`, `CREATE`, `DELETE`, `ASSIGN_TO_CUSTOMER`, `UNASSIGN_FROM_CUSTOMER`, `ASSIGN_TO_TENANT`, `CLAIM_DEVICES`, `READ_CREDENTIALS`, `WRITE_CREDENTIALS`, etc.

Permission classes define which authorities have which operations on which resources:
- `SysAdminPermissions` -- System admin has full access
- `TenantAdminPermissions` -- Tenant admin manages their tenant's entities
- `CustomerUserPermissions` -- Customer user has read/limited access to assigned entities
- `MfaConfigurationPermissions` -- MFA configuration permissions

The `PermissionChecker` interface allows dynamic permission checks (e.g., checking entity ownership).

### OAuth2 Integration

OAuth2 support allows login via external identity providers. Key components:

| Component | Purpose |
|-----------|---------|
| `OAuth2Configuration` | OAuth2 client configuration from database |
| `CustomOAuth2AuthorizationRequestResolver` | Customizes authorization requests |
| `HttpCookieOAuth2AuthorizationRequestRepository` | Stores OAuth2 state in cookies |
| `OAuth2Controller` | REST endpoints for OAuth2 client management |
| `OAuth2ConfigTemplateController` | OAuth2 config templates for common providers |
| `OAuth2ClientService` (DAO) | Persists OAuth2 client configurations |

The OAuth2 login flow:
1. Tenant admin configures OAuth2 clients
2. Login page displays OAuth2 provider buttons
3. User is redirected to the external provider
4. On callback, ThingsBoard creates/links the user account
5. OAuth2 `loginProcessingUrl` is configurable (default: `/login/oauth2/code/`)

### Two-Factor Authentication (2FA)

Two-factor authentication is implemented in `service/security/auth/mfa/`:

| Class | Purpose |
|-------|---------|
| `TwoFactorAuthService` | 2FA service interface |
| `DefaultTwoFactorAuthService` | 2FA implementation |
| `TwoFaConfigManager` | 2FA configuration management |
| `DefaultTwoFaConfigManager` | 2FA config persistence |

Provider implementations in `mfa/provider/impl/`:
- `TotpTwoFaProvider` -- Time-based One-Time Password (TOTP) via authenticator apps
- `EmailTwoFaProvider` -- One-time codes sent via email
- `SmsTwoFaProvider` -- One-time codes sent via SMS
- `BackupCodeTwoFaProvider` -- Pre-generated backup codes

### API Key Authentication

API keys allow programmatic access without JWT tokens. Managed via `ApiKeyController`:

- Keys are prefixed with a configurable string (default: `tb_`)
- Key value length is configurable (default: 64 bytes)
- Keys are associated with a user and have configurable expiration
- Authentication via `X-Authorization: ApiKey <key>` header

## Installation Profile and Initialization

The `install/` service package handles database initialization:

1. **Schema creation**: `SqlEntityDatabaseSchemaService` creates the SQL schema; `CassandraKeyspaceService` creates the Cassandra keyspace
2. **System data**: `DefaultSystemDataLoaderService` creates the system administrator, default tenant profiles, default device/asset profiles, system rule chains, widget bundles, and other seed data
3. **Upgrades**: `SqlDatabaseUpgradeService` and `AbstractCassandraDatabaseUpgradeService` handle version-to-version schema migrations
4. **Data migrations**: `CassandraTsLatestToSqlMigrateService` handles cross-database data migration

The installation process runs automatically on first startup or after an upgrade, controlled by the `install` configuration section.

## Related Documents

- [README](README.md) -- Application module overview
- [Controllers](controllers.md) -- REST API controllers with auth annotations
- [Services](services.md) -- Service layer including security services
- [Actors](actors.md) -- Actor system configuration
