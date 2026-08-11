# Pi Dev Studio — Deployment Path Audit

```text
Purpose: Document how this repository is intended to deploy to a real beta environment.
Scope: Audit only. No deploy. No Phase 16. No production activation. No payments enablement.
Release context: 0.1.0-rc.10 (Phases 1–15 complete; Phase 15 LIVE soak NOT EXECUTED)
Date evidence collected: 2026-08-11
Branch / authority: actual repository paths + this agent environment tool inventory
```

## Verdict (audit only)

```text
COMPLETE AWS BETA DEPLOYMENT MECHANISM — EXISTS in repository
LIVE BETA DEPLOYMENT FROM THIS ENVIRONMENT — NOT AVAILABLE HERE
PHASE 15 LIVE BETA SOAK FROM THIS ENVIRONMENT — NOT AVAILABLE HERE
```

A full OpenSail AWS EKS beta path already exists (`scripts/aws-deploy.sh` +
`k8s/overlays/aws-beta` + Terraform). This Cursor agent VM does **not** have the
tools or credentials to execute it. No new deployment platform is required for
beta — an operator with AWS/EKS access must run the existing path.

---

## 1. Existing deployment mechanism

| Mechanism | Status | Evidence |
|-----------|--------|----------|
| Docker Compose (local / self-host) | **EXISTS** | `docker-compose.yml`, `docker-compose.prod.yml`, `docker-compose.cloudflare-tunnel.yml`, `docker-compose.test.yml` |
| Dockerfiles | **EXISTS** | `orchestrator/Dockerfile`, `orchestrator/Dockerfile.devserver`, `app/Dockerfile`, `app/Dockerfile.prod`, `packages/tesslate-marketplace/Dockerfile`, plus services/seeds Dockerfiles |
| Kubernetes + Kustomize | **EXISTS** | `k8s/base/`, overlays under `k8s/overlays/` |
| Helm charts for OpenSail app | **NOT FOUND** | No `Chart.yaml` for the app; Helm used only via Terraform for cluster addons (`k8s/terraform/aws/helm.tf`) |
| AWS EKS Terraform | **EXISTS** | `k8s/terraform/aws/`, `k8s/terraform/shared/` |
| Azure AKS Terraform | **EXISTS** | `k8s/terraform/azure/`, `scripts/azure-deploy.sh` |
| AWS deploy helper | **EXISTS** | `scripts/aws-deploy.sh` |
| Azure deploy helper | **EXISTS** | `scripts/azure-deploy.sh` |
| Minikube helper | **EXISTS** | `scripts/minikube.sh`, `k8s/overlays/minikube/` |
| GitHub Actions auto-deploy to beta/prod | **NOT FOUND** | `.github/workflows/` has `ci.yml`, desktop, Claude workflows only; documented `deploy-production.yml` is absent |
| DigitalOcean / GKE overlays | **EXISTS** (partial / legacy) | `k8s/overlays/digitalocean/`, `k8s/overlays/gke/` |

### Intended primary cloud beta path (AWS)

```text
shared Terraform (ECR / platform)
        ↓
per-env Terraform beta (tesslate-beta-eks + secrets)
        ↓
docker buildx → ECR tags :beta
        ↓
kubectl apply -k k8s/overlays/aws-beta   (via aws-deploy.sh deploy-k8s beta)
        ↓
deploy-compute beta (btrfs CSI + Volume Hub)
        ↓
DEPLOYMENT_ENV=beta → loads orchestrator/feature_flags/beta.yaml
```

Authority: `docs/guides/aws-deployment.md`, `docs/infrastructure/kubernetes/overlays/aws-beta.md`,
`scripts/aws-deploy.sh`, `k8s/overlays/aws-beta/env-patch.yaml` (`DEPLOYMENT_ENV=beta`).

---

## 2. Existing beta / staging environment

| Item | Status | Detail |
|------|--------|--------|
| AWS beta overlay | **EXISTS** | `k8s/overlays/aws-beta/` (on `aws-base`) |
| Cluster name (docs) | **EXISTS** (documented) | `tesslate-beta-eks` |
| kubectl context (docs) | **EXISTS** (documented) | `tesslate-beta-eks` |
| ECR image tags | **EXISTS** | `:beta` in `k8s/overlays/aws-beta/kustomization.yaml` |
| `DEPLOYMENT_ENV` | **EXISTS** | `beta` in `k8s/overlays/aws-beta/env-patch.yaml` |
| Pi feature-flag overlay | **EXISTS** | `orchestrator/feature_flags/beta.yaml` (Stage 3 ON; payments OFF) |
| Marketplace staging-like env | **EXISTS** | `OPENSAIL_ENV=staging` in aws-beta `env-patch.yaml` |
| Azure beta overlay | **EXISTS** | `k8s/overlays/azure-beta/` |
| Live beta cluster reachable from here | **NOT AVAILABLE HERE** | No `aws` / `kubectl` / credentials |

Beta is a **first-class environment** in this repo, not inventable infrastructure.

---

## 3. Existing production environment

| Item | Status | Detail |
|------|--------|--------|
| AWS production overlay | **EXISTS** | `k8s/overlays/aws-production/` |
| Cluster / context (docs) | **EXISTS** (documented) | `tesslate-production-eks` |
| ECR tags | **EXISTS** | `:production` |
| Feature flags | **EXISTS** | `orchestrator/feature_flags/production.yaml` + defaults → Pi Stage 0 |
| Azure production | **EXISTS** | `k8s/overlays/azure-production/` |

**This audit does not activate or mutate production.**

---

## 4. Required services

### Platform workloads (K8s `tesslate` namespace — base)

Documented / present under `k8s/base/`:

- Backend (`tesslate-backend`)
- Frontend
- ARQ worker
- Gateway
- Postgres (in-cluster, or external RDS when Terraform enables it)
- Redis (in-cluster base; AWS may use ElastiCache via Terraform)
- Marketplace
- Ingress (NGINX)
- Volume Hub + btrfs CSI / compute pool (compute overlay)
- CronJobs (cleanup / hibernation)

### AWS per-environment stack also provisions (docs)

- VPC, EKS, S3, IRSA roles
- NGINX Ingress + NLB, cert-manager, external-dns, Cloudflare DNS
- LiteLLM (optional RDS)
- Shared stack: ECR repos, platform EKS tooling

### Local Docker Compose dependencies

- Traefik, Postgres, Redis, orchestrator, worker, gateway, app (`docker-compose.yml`)

---

## 5. Required environment variables

### Deployment-mode / overlay selection (critical for Pi)

| Variable | Role | Evidence |
|----------|------|----------|
| `DEPLOYMENT_MODE` | `kubernetes` on AWS overlays | aws-base backend patches / docs |
| `DEPLOYMENT_ENV` | Selects `orchestrator/feature_flags/{env}.yaml` | aws-beta sets `DEPLOYMENT_ENV=beta` |

With `DEPLOYMENT_ENV=beta`, resolved Pi flags come from `beta.yaml`
(Stage 3 ON, `pi_payments_template` OFF). Production overlay keeps Pi Stage 0.

### App / domain / K8s (representative — not exhaustive)

Documented across `docs/guides/aws-deployment.md`, `docs/guides/environment-variables.md`,
Terraform `kubernetes.tf`, and overlays:

- `APP_DOMAIN`, `APP_BASE_URL`, `COOKIE_DOMAIN`, `CORS_ORIGINS`, `ALLOWED_HOSTS`
- `DATABASE_URL`, `REDIS_URL`
- `K8S_DEVSERVER_IMAGE`, `K8S_INGRESS_DOMAIN` (alias of `APP_DOMAIN`)
- `LITELLM_*`
- Marketplace: `OPENSAIL_ENV`, `BUNDLE_STORAGE_BACKEND`, `S3_BUCKET`, …

Local Docker: `.env.example` / `.env.prod.example`.

---

## 6. Required secrets

| Mechanism | Status | Notes |
|-----------|--------|-------|
| AWS Secrets Manager tfvars | **EXISTS** | `scripts/terraform/secrets.sh` → `tesslate/terraform/{beta,production,shared}` |
| Terraform → K8s secrets | **EXISTS** | `k8s/terraform/aws/kubernetes.tf` creates `tesslate-app-secrets`, `postgres-secret`, `s3-credentials`, marketplace / CSI secrets, etc. |
| Azure Key Vault tfvars | **EXISTS** | `scripts/terraform/azure-secrets.sh` |
| Minikube secret examples | **EXISTS** | `k8s/overlays/minikube/secrets/*.example.yaml` |
| In-repo live tfvars | **NOT FOUND** (by design) | `terraform.beta.tfvars` gitignored; download via `secrets.sh` |
| AWS backend HCL files | **NOT FOUND** in tree | Docs/scripts expect `k8s/terraform/aws/backend-beta.hcl` / `backend-production.hcl`; absent on disk (operator must supply or restore) |
| `scripts/generate-secrets-from-env.sh` | **NOT FOUND** | Referenced by `k8s/.env.example` but file missing |
| Credentials in this agent env | **NOT AVAILABLE HERE** | No `AWS_*` / `KUBE*` env vars observed |

Representative secret material (names only): `SECRET_KEY`, OAuth client secrets, Stripe keys,
`INTERNAL_API_SECRET`, LiteLLM keys, Cloudflare API token (for DNS/TLS), Postgres passwords.

---

## 7. Existing deployment commands / scripts

### AWS beta (canonical)

```bash
# Infra (first time / changes)
./scripts/terraform/secrets.sh download shared
./scripts/aws-deploy.sh init shared && ./scripts/aws-deploy.sh apply shared
./scripts/terraform/secrets.sh download beta
./scripts/aws-deploy.sh terraform beta

# App images + manifests
./scripts/aws-deploy.sh build beta
./scripts/aws-deploy.sh deploy-k8s beta
./scripts/aws-deploy.sh deploy-compute beta

# Direct apply (docs)
kubectl --context=tesslate-beta-eks apply -k k8s/overlays/aws-beta
```

Authority: `docs/guides/aws-deployment.md`, `docs/infrastructure/kubernetes/overlays/aws-beta.md`.

### Other existing paths

| Path | Commands / entry |
|------|------------------|
| Local Docker | `docker compose up --build -d` — `docs/guides/docker-setup.md` |
| Minikube | `kubectl apply -k k8s/overlays/minikube` — `docs/guides/minikube-setup.md` |
| Azure | `./scripts/azure-deploy.sh …` — Terraform README |

### Doc drift (observed)

- Some older docs still say `kubectl apply -k k8s/overlays/aws` — directory **NOT FOUND**; use `aws-beta` / `aws-production`.
- CI docs mention `deploy-production.yml` — workflow file **NOT FOUND**.

---

## 8. Existing healthcheck commands

| Check | Status | Command / surface |
|-------|--------|-------------------|
| Orchestrator HTTP health | **EXISTS** | `/health`, `/ready` on backend |
| Compose service healthchecks | **EXISTS** | postgres / redis / orchestrator / app in compose |
| Pi ops health (static / flag resolve) | **EXISTS** | `./scripts/pi-ops-healthcheck.sh` |
| Pi Stage 3 dry-run | **EXISTS** | `./scripts/pi-stage3-activation-validate.sh` |
| Pi beta activation validate | **EXISTS** | `./scripts/pi-beta-activation-validate.sh` |
| Pi Phase 15 soak package | **EXISTS** | `./scripts/pi-live-beta-soak-validate.sh` |
| Live cluster pod health | **REQUIRES OPERATOR ACCESS** | e.g. `kubectl --context=tesslate-beta-eks get pods -n tesslate` |
| Live `GET /api/feature-flags` on beta URL | **REQUIRES OPERATOR ACCESS** | Needs deployed beta domain + network |

Pi scripts in this environment validate **repository flag resolution**, not a live EKS endpoint.

---

## 9. Whether this environment can perform a beta deployment

```text
NOT AVAILABLE HERE
```

| Prerequisite | Status here |
|--------------|-------------|
| `aws` CLI | **NOT AVAILABLE HERE** |
| `kubectl` | **NOT AVAILABLE HERE** |
| `docker` / buildx | **NOT AVAILABLE HERE** |
| `terraform` | **NOT AVAILABLE HERE** |
| `helm` | **NOT AVAILABLE HERE** |
| AWS credentials / Secrets Manager access | **NOT AVAILABLE HERE** |
| kubeconfig for `tesslate-beta-eks` | **NOT AVAILABLE HERE** |
| Ability to push ECR `:beta` images | **NOT AVAILABLE HERE** |

`scripts/aws-deploy.sh` and overlays **EXIST** in the repo; they cannot be executed from this VM.

---

## 10. Missing credentials / tools (this environment)

```text
NOT AVAILABLE HERE:
  aws, kubectl, docker, helm, terraform
  AWS account credentials / assumed EKS team roles
  kubeconfig contexts tesslate-beta-eks / tesslate-production-eks
  downloaded terraform.beta.tfvars
  Cloudflare token (if operator is provisioning DNS/TLS)

EXISTS in repo but may be missing on operator workstation until restored:
  k8s/terraform/aws/backend-beta.hcl
  k8s/terraform/aws/backend-production.hcl
  scripts/generate-secrets-from-env.sh (referenced, file absent)
```

---

## 11. Exact minimum operator prerequisites for a real beta deployment

Operator machine / account must have:

1. **Tools:** AWS CLI v2, Terraform ≥ 1.5, kubectl (EKS-compatible), Docker with buildx (`linux/amd64`), Helm v3 (addon ops).
2. **IAM:** Access to download `tesslate/terraform/{shared,beta}` via `./scripts/terraform/secrets.sh`; ability to assume least-privilege EKS team role (see `docs/guides/eks-cluster-access.md`); ECR push for `:beta` tags.
3. **Backend config files:** Working `backend-beta.hcl` for Terraform state (not present in this checkout — operator must provide).
4. **Existing or provisionable beta stack:** Shared ECR + `tesslate-beta-eks` (or run first-time Terraform order from `aws-deployment.md`).
5. **Network/DNS:** Domain + Cloudflare token if applying ingress/TLS via the documented stack.
6. **Deploy sequence (minimum for app refresh when cluster already exists):**
   ```bash
   ./scripts/aws-deploy.sh build beta
   ./scripts/aws-deploy.sh deploy-k8s beta
   # optional compute stack if not already applied:
   ./scripts/aws-deploy.sh deploy-compute beta
   ```
7. **Verify Pi Stage 3 without enabling payments:**
   ```bash
   kubectl --context=tesslate-beta-eks -n tesslate \
     exec deploy/tesslate-backend -- env | grep DEPLOYMENT_ENV
   # expect DEPLOYMENT_ENV=beta
   curl -sS https://<beta-app-domain>/api/feature-flags
   # expect pi_knowledge/skills/templates true; pi_payments_template false
   ./scripts/pi-ops-healthcheck.sh   # repo-side still useful
   ```
8. **Do not** set `pi_payments_template: true`. **Do not** merge Stage 3 into `production.yaml` in this step.

Status: **REQUIRES OPERATOR ACCESS**

---

## 12. Can Phase 15 LIVE BETA SOAK run from the current environment?

```text
NO — NOT AVAILABLE HERE
PHASE 15 LIVE BETA SOAK — NOT EXECUTED (unchanged)
```

Phase 15 LIVE soak needs:

- Reachable beta API / app (**NOT AVAILABLE HERE**)
- Deployed revision with `DEPLOYMENT_ENV=beta` (**NOT AVAILABLE HERE** to confirm)
- Create-project / marketplace / flag E2E against that deployment (**NOT AVAILABLE HERE**)
- Live rollback drill against that cluster (**NOT AVAILABLE HERE**)

What **is** available here:

```text
SIMULATED SOAK — PASS   (Phase 15 package / pi_ops_health --phase15-soak)
STATIC FLAG CONTRACTS — PASS
```

---

## Label summary

| Question | Label |
|----------|-------|
| AWS beta deploy mechanism in repo | **EXISTS** |
| Complete operator runbook in docs | **EXISTS** (`docs/guides/aws-deployment.md`) |
| Helm app charts | **NOT FOUND** |
| CI auto-deploy workflow | **NOT FOUND** |
| Terraform backend-beta.hcl in checkout | **NOT FOUND** |
| Tools to deploy from this VM | **NOT AVAILABLE HERE** |
| Credentials for beta | **NOT AVAILABLE HERE** / **REQUIRES OPERATOR ACCESS** |
| Phase 15 LIVE soak here | **NOT AVAILABLE HERE** |

---

## Intentionally not done (this task)

- No deployment executed
- No AWS / Kubernetes resources created
- No Docker/K8s architecture added
- No feature-flag changes
- No production activation
- No `pi_payments_template` enablement
- Phase 16 **not** started

## Operator next step (after this audit)

1. Use an operator workstation with AWS/EKS tools and credentials.
2. Deploy/refresh **beta only** via existing `./scripts/aws-deploy.sh … beta`.
3. Confirm `DEPLOYMENT_ENV=beta` and public feature flags (payments OFF).
4. Execute Phase 15 **LIVE** soak + rollback on that beta.
5. Only then consider human-approved production Stage 3 (separate decision).

```text
STOP. Do not start Phase 16 from this audit.
```
