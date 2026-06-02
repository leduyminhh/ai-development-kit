# Configuration And Environment Rules

## When The Impact Section Is Mandatory

Always add `Important notes / breaking impact` when staged changes modify:

- `.env`
- `.env.example`
- runtime flags
- profiles
- ports
- URLs
- credentials placeholders
- feature toggles
- deployment configs
- Docker/K8s settings
- CI/CD variables
- FFmpeg/runtime parameters
- external service endpoints
- application configuration files

Examples:

- `application.yml`
- `application-*.yml`
- `config.yaml`
- `docker-compose.yml`

The note should explain:

- required migration/setup action
- backward compatibility risk
- deployment implications

## Mandatory Environment Disclosure

When a staged change introduces, removes, renames, or changes behavior of
required configuration values, the commit message must explicitly list every
affected variable.

This applies to:

- `.env`
- `.env.example`
- `application.yml`
- `application-*.yml`
- Docker/K8s runtime config
- CI/CD variables
- feature toggles
- runtime flags
- service endpoints
- ports
- credentials placeholders
- FFmpeg/runtime parameters

The commit must explain whether each variable is:

- new
- renamed
- removed
- optional
- required
- deprecated

Also mention deployment/setup impact when applicable. Mention default values
only when they truly exist in runtime behavior.

Avoid vague wording:

```text
- update env configuration
- add some new variables
```

Prefer explicit wording:

```text
Important notes / breaking impact:
- Thêm biến môi trường bắt buộc:
  • JWT_SECRET
  • JWT_EXPIRE_MINUTES
  • RTSP_RECONNECT_DELAY

- Đổi tên:
  • REDIS_HOST -> REDIS_URL

- Xóa:
  • LEGACY_AUTH_MODE

- Staging và production cần cập nhật `.env` trước khi deploy.
```

## Breaking Change Rule

If the application cannot run correctly without new configuration values, the
commit must include:

```text
Important notes / breaking impact:
```

This section becomes mandatory even if the rest of the change is small.

## Validation Rule

Before generating the final commit message:

- inspect staged config/environment changes
- detect newly added required keys
- detect renamed or removed keys
- include every affected key explicitly in the commit body

Never omit required environment variable names.
