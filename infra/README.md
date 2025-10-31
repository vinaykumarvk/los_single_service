Infra

Helm charts, K8s manifests, CI/CD pipelines, observability configs.

Local dev (Docker Compose)

- Requires Docker Desktop.
- From `infra/`: `docker compose up -d`
- Services:
  - Postgres: `localhost:5432` (los/los)
  - Redpanda (Kafka): broker `localhost:19092`
  - MinIO: S3 `http://localhost:9000` (minio/minio123), console `http://localhost:9001`
  - Keycloak: `http://localhost:8080` (admin/admin)

Environment examples (service .env):

```
DATABASE_URL=postgres://los:los@localhost:5432/los
KAFKA_BROKERS=localhost:19092
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minio
MINIO_SECRET_KEY=minio123
MINIO_REGION=us-east-1
MINIO_USE_SSL=false
MINIO_BUCKET=los-docs
KEYCLOAK_ISSUER_URL=http://localhost:8080/realms/los
KEYCLOAK_JWKS_URI=http://localhost:8080/realms/los/protocol/openid-connect/certs
KEYCLOAK_CLIENT_ID=los-ui
```

