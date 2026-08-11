# Pi Dev Studio — Phase 15.1 Beta Deployment Runbook

```text
Purpose: Exact operator commands to deploy THIS repository to REAL AWS BETA.
Scope: Runbook only. Do NOT execute from the Cursor agent environment unless
       the operator explicitly chooses to on a credentialed workstation.
Release: 0.1.0-rc.10 (Phases 1–15 validation ready; LIVE soak not yet executed)
Safety: beta only · payments OFF · production untouched · Phase 16 not started
```

Classification legend (every requirement below):

| Label | Meaning |
|-------|---------|
| **EXISTS IN REPO** | Command, file, or value is present in the repository / scripts / docs |
| **REQUIRED FROM OPERATOR** | Credentials, profiles, live secrets, or confirmation only the operator can supply |
| **UNKNOWN / NOT DOCUMENTED** | Repo does not safely specify the value; do not guess |

---

## 0. Preconditions (operator workstation)

| Requirement | Classification | Notes |
|-------------|----------------|-------|
| AWS CLI v2 | **REQUIRED FROM OPERATOR** | Must pass `aws sts get-caller-identity` |
| Docker + buildx | **REQUIRED FROM OPERATOR** | Builds target `linux/amd64` |
| kubectl | **REQUIRED FROM OPERATOR** | Used by `aws-deploy.sh` |
| Terraform ≥ 1.5 | **REQUIRED FROM OPERATOR** | Only if infra/secrets apply needed |
| IAM access to assume beta EKS team role | **REQUIRED FROM OPERATOR** | See `docs/guides/eks-cluster-access.md` |
| Access to Secrets Manager `tesslate/terraform/beta` (if downloading tfvars) | **REQUIRED FROM OPERATOR** | Via `scripts/terraform/secrets.sh` |
| Checkout of branch containing Phase 14/15 Pi artifacts | **REQUIRED FROM OPERATOR** | Must include `orchestrator/feature_flags/beta.yaml` Stage 3 |
| `scripts/aws-deploy.sh` | **EXISTS IN REPO** | Canonical helper |
| `k8s/overlays/aws-beta/` | **EXISTS IN REPO** | Kustomize overlay |
| `orchestrator/feature_flags/beta.yaml` | **EXISTS IN REPO** | Pi Stage 3 + payments OFF |

**Do not run any of the following from an environment without AWS/kubectl/docker.**

---

## 1. Exact command(s) to build the beta deployment

**EXISTS IN REPO** — preferred one-shot (build + push + apply + rollout):

```bash
./scripts/aws-deploy.sh build beta
```

Optional variants (**EXISTS IN REPO** script header / `docs/guides/aws-deployment.md`):

```bash
./scripts/aws-deploy.sh build beta --cached
./scripts/aws-deploy.sh build beta backend frontend
./scripts/aws-deploy.sh build beta backend frontend marketplace
./scripts/aws-deploy.sh build beta --role deployer
```

Default images when none listed: `backend frontend devserver` (**EXISTS IN REPO** in `aws-deploy.sh`).

Platform is always `--platform linux/amd64` (**EXISTS IN REPO**).

---

## 2. Exact command(s) to push images

Push is **bundled inside** `build` via `docker buildx … --push` after ECR login (**EXISTS IN REPO**).

ECR login (performed by script):

```bash
aws ecr get-login-password --region us-east-1 \
  | docker login --username AWS --password-stdin <ECR_REGISTRY>
```

Registry construction in script (**EXISTS IN REPO**, placeholder account id):

```text
ECR_ACCOUNT="<AWS_ACCOUNT_ID>"
ECR_REGISTRY="${ECR_ACCOUNT}.dkr.ecr.us-east-1.amazonaws.com"
Tag: :beta
```

| Item | Classification |
|------|----------------|
| Region `us-east-1` | **EXISTS IN REPO** |
| Tag `:beta` | **EXISTS IN REPO** |
| Literal account ID / resolved ECR hostname | **REQUIRED FROM OPERATOR** — script uses placeholder `<AWS_ACCOUNT_ID>`; operator must ensure script/registry match their account (same placeholder convention used throughout repo docs) |
| Manual push example | **EXISTS IN REPO** in `aws-deployment.md` §7 |

Standalone push without `build` is possible with the manual `docker buildx … --push` example in docs, but the supported path is `./scripts/aws-deploy.sh build beta`.

---

## 3. Exact command(s) to deploy to beta

### A. App manifests (after images exist)

**EXISTS IN REPO:**

```bash
./scripts/aws-deploy.sh deploy-k8s beta
```

This runs `kubectl apply -k k8s/overlays/aws-beta` after configuring kubeconfig (**EXISTS IN REPO**).

Equivalent direct apply (**EXISTS IN REPO** docs / overlay comment):

```bash
kubectl apply -k k8s/overlays/aws-beta --context=tesslate-beta-eks
```

### B. Compute layer (CSI + Volume Hub) — if not already applied

**EXISTS IN REPO:**

```bash
./scripts/aws-deploy.sh deploy-compute beta
```

### C. Reload after config-only change (e.g. feature-flag YAML already in image)

**EXISTS IN REPO:**

```bash
./scripts/aws-deploy.sh reload beta
./scripts/aws-deploy.sh reload beta backend worker
```

### D. First-time / infra refresh (only if cluster/secrets need Terraform)

**EXISTS IN REPO** (docs):

```bash
./scripts/terraform/secrets.sh download beta
./scripts/aws-deploy.sh terraform beta
```

| Gap | Classification |
|-----|----------------|
| `k8s/terraform/aws/backend-beta.hcl` present in this checkout | **UNKNOWN / NOT DOCUMENTED** as present — prior audit: **NOT FOUND** on disk; operator must supply before `terraform` subcommands |

---

## 4. Required AWS account / region / profile variables

| Item | Value / source | Classification |
|------|----------------|----------------|
| Region | `us-east-1` | **EXISTS IN REPO** (`aws-deploy.sh`, docs) |
| Cluster name | `tesslate-beta-eks` | **EXISTS IN REPO** (`tesslate-${ENVIRONMENT}-eks`) |
| Environment arg | `beta` | **EXISTS IN REPO** |
| Account ID | `<AWS_ACCOUNT_ID>` placeholder in scripts/docs | **REQUIRED FROM OPERATOR** to map to real account |
| `AWS_PROFILE` | e.g. `tesslate-beta-debugger` / deployer profiles in `eks-cluster-access.md` | **REQUIRED FROM OPERATOR** |
| `AWS_EKS_ROLE_ARN` | Optional override of assume-role | **EXISTS IN REPO** (optional env) |
| `--role` | `observer` \| `deployer` \| `debugger` \| `admin` \| `eks-deployer` | **EXISTS IN REPO**; default for mutating ops is `admin` (`team-admin`) |
| Default role ARN pattern | `arn:aws:iam::${ACCOUNT_ID}:role/tesslate-beta-eks-team-${role}` | **EXISTS IN REPO** |

There is **no** committed `.env` that sets `AWS_PROFILE` for beta. Operator must export profile/credentials locally.

---

## 5. Required Kubernetes context / namespace

| Item | Value | Classification |
|------|-------|----------------|
| Context / alias | `tesslate-beta-eks` | **EXISTS IN REPO** |
| Namespace (platform) | `tesslate` | **EXISTS IN REPO** |
| Compute / CSI namespace | `kube-system` (Volume Hub / CSI) | **EXISTS IN REPO** (docs) |
| Context switching | **Banned for agents**; operators may use profiles but every kubectl should use `--context=tesslate-beta-eks` | **EXISTS IN REPO** (`docs/infrastructure/kubernetes/CLAUDE.md`) |

`aws-deploy.sh ensure_kubectl_context` sets alias to the cluster name for the environment arg (**EXISTS IN REPO**).

---

## 6. Required environment variables / secrets

### Established by overlay / Terraform (not set ad hoc by this runbook)

| Item | Classification |
|------|----------------|
| Terraform-managed K8s secrets `tesslate-app-secrets`, `postgres-secret`, `s3-credentials`, marketplace/CSI secrets | **EXISTS IN REPO** (`kubernetes.tf` + aws-deployment.md) |
| Pod `envFrom` mounts those secrets | **EXISTS IN REPO** (aws-base pattern) |
| Live values of `APP_DOMAIN`, Stripe, OAuth, `SECRET_KEY`, etc. | **REQUIRED FROM OPERATOR** (in Secrets Manager tfvars / live cluster secrets) |
| Exact beta public hostname | **UNKNOWN / NOT DOCUMENTED** as a concrete FQDN — docs use `your-domain.com` placeholder; operator must use the domain from their `terraform.beta.tfvars` / live Ingress |

### Pi-relevant (in image + overlay)

| Item | Classification |
|------|----------------|
| `DEPLOYMENT_ENV=beta` on backend | **EXISTS IN REPO** (`k8s/overlays/aws-beta/env-patch.yaml`) |
| `orchestrator/feature_flags/beta.yaml` baked into backend image | **EXISTS IN REPO** (must be in the built commit) |

---

## 7. How `DEPLOYMENT_ENV=beta` is established

**EXISTS IN REPO** chain:

1. `k8s/overlays/aws-beta/env-patch.yaml` sets container env:
   ```yaml
   - name: DEPLOYMENT_ENV
     value: "beta"
   ```
2. Backend settings field `deployment_env` (`orchestrator/app/config.py`) reads that env (default `"docker"` only if unset).
3. `get_feature_flags()` → `load_feature_flags(settings.deployment_env)` merges:
   - `orchestrator/feature_flags/defaults.yaml`
   - `orchestrator/feature_flags/beta.yaml`

No separate env-var bypass of the YAML flag system.

---

## 8. How the four Pi feature flags resolve in beta

From **EXISTS IN REPO** `orchestrator/feature_flags/beta.yaml` (after `DEPLOYMENT_ENV=beta`):

```text
pi_knowledge = true   → ON
pi_skills = true      → ON
pi_templates = true   → ON
pi_payments_template = false → OFF
```

Defaults remain OFF; production overlay does not enable Pi (**EXISTS IN REPO**).  
Payments seed may exist in marketplace data; flag OFF keeps Stage 4 inactive (**EXISTS IN REPO** UX helpers gate payments starter on `pi_payments_template`).

---

## 9. How to verify deployed service health

**EXISTS IN REPO** patterns (adapt context to beta):

```bash
kubectl --context=tesslate-beta-eks get nodes
kubectl --context=tesslate-beta-eks get pods -n tesslate -o wide
kubectl --context=tesslate-beta-eks get pods -n kube-system \
  -l 'app in (tesslate-btrfs-csi-node,tesslate-volume-hub)'
kubectl --context=tesslate-beta-eks get ingress -A
kubectl --context=tesslate-beta-eks rollout status deployment/tesslate-backend -n tesslate --timeout=300s
kubectl --context=tesslate-beta-eks rollout status deployment/tesslate-frontend -n tesslate --timeout=300s
kubectl --context=tesslate-beta-eks rollout status deployment/tesslate-worker -n tesslate --timeout=300s
```

HTTP health (**EXISTS IN REPO** route `/health`; production example uses `/api/health`):

```bash
# Replace host — concrete beta FQDN is REQUIRED FROM OPERATOR
curl -sI "https://<BETA_APP_DOMAIN>/api/health"
# or
curl -sS "https://<BETA_APP_DOMAIN>/health"
```

| Exact beta URL path that is live | Classification |
|----------------------------------|----------------|
| Whether probe is `/health` vs `/api/health` on the public edge | **UNKNOWN / NOT DOCUMENTED** for beta specifically — try both; backend defines `/health` and `/ready` |
| `<BETA_APP_DOMAIN>` | **REQUIRED FROM OPERATOR** |

Repo-side (does **not** prove live cluster):

```bash
./scripts/pi-ops-healthcheck.sh
./scripts/pi-live-beta-soak-validate.sh
```

Classification: **EXISTS IN REPO** but live soak ≠ these scripts alone.

---

## 10. How to verify Pi flags ON/ON/ON/OFF

**EXISTS IN REPO** public API:

```bash
curl -sS "https://<BETA_APP_DOMAIN>/api/feature-flags"
```

Expect JSON shaped like:

```json
{
  "env": "beta",
  "flags": {
    "pi_knowledge": true,
    "pi_skills": true,
    "pi_templates": true,
    "pi_payments_template": false
  }
}
```

(`env` and exact flag subset follow `get_feature_flags().public_flags` — **EXISTS IN REPO**.)

In-cluster confirmation (**EXISTS IN REPO** patterns):

```bash
kubectl --context=tesslate-beta-eks -n tesslate \
  exec deploy/tesslate-backend -- printenv DEPLOYMENT_ENV
# expect: beta
```

Optional: confirm `beta.yaml` content inside the running image/filesystem if the operator knows the image layout — exact in-image path layout is **UNKNOWN / NOT DOCUMENTED** in this runbook; prefer `/api/feature-flags`.

---

## 11. Exact LIVE SOAK checks after deployment

Perform only against **beta** (`tesslate-beta-eks` / `<BETA_APP_DOMAIN>`).  
Label results `LIVE SOAK — EXECUTED` only if these run against the real deployment.

| # | Check | How | Classification |
|---|-------|-----|----------------|
| 1 | Flag resolution | `GET /api/feature-flags` → knowledge/skills/templates true; payments false | **EXISTS IN REPO** API |
| 2 | Knowledge | In UI/API, Pi knowledge surfaces available; catalog provenance intact | **REQUIRED FROM OPERATOR** to exercise UI; corpus **EXISTS IN REPO** |
| 3 | Skills | Seven Pi skills discoverable; assignment still required (not auto-run) | **REQUIRED FROM OPERATOR** |
| 4 | Templates | Web + Auth starters visible; payments starter **not** treated as payment activation | **EXISTS IN REPO** gating helpers |
| 5 | Create-project E2E | Create Project → Pi starter → orphan `base/pi-*` branch → setup/checklist | **REQUIRED FROM OPERATOR** |
| 6 | Auth safety (Auth starter) | If exercised: token not logged; not OpenSail `/api/auth/*`; no Server API Key in frontend | **EXISTS IN REPO** starter contracts; live exercise **REQUIRED FROM OPERATOR** |
| 7 | Payment negative | Confirm `pi_payments_template=false`; no Mainnet; no fake completes | **EXISTS IN REPO** flag + Phase 9 protections |
| 8 | No secret leakage | Logs/UI lack access tokens / Server API Keys | **REQUIRED FROM OPERATOR** log review |
| 9 | OpenSail baseline | Login / Stripe billing paths still work for non-Pi flows | **REQUIRED FROM OPERATOR** |

Do **not** invent soak duration; none is mandated in-repo for beta.

---

## 12. Exact LIVE ROLLBACK procedure (beta → Stage 0)

**EXISTS IN REPO** operator procedure (feature-flag overlay rollback):

1. Edit `orchestrator/feature_flags/beta.yaml`: remove the four Pi keys **or** set all to `false`:
   ```yaml
   pi_knowledge: false
   pi_skills: false
   pi_templates: false
   pi_payments_template: false
   ```
2. Rebuild/redeploy backend so the image (or mounted config) picks up the change, then restart:
   ```bash
   ./scripts/aws-deploy.sh build beta backend
   # or, if flags are already in a rebuilt image / reload path applies:
   ./scripts/aws-deploy.sh reload beta backend
   ```
3. Do **not** edit `production.yaml` or `defaults.yaml` for this drill.
4. Do **not** enable `pi_payments_template`.

| Detail | Classification |
|--------|----------------|
| Rollback = YAML + redeploy/restart | **EXISTS IN REPO** (`beta.yaml` comments, overlays README, Phase 14/15 docs) |
| Whether flags can hot-reload without rebuild | **UNKNOWN / NOT DOCUMENTED** — treat rebuild/reload of backend as required |
| DB wipe for rollback | **EXISTS IN REPO** guidance: not required |

In-memory simulation scripts (`--simulate-beta-rollback`) are **not** live rollback.

---

## 13. Exact commands to verify rollback → Stage 0

```bash
curl -sS "https://<BETA_APP_DOMAIN>/api/feature-flags"
```

Expect all Pi public flags `false` and ideally `"env":"beta"`.

```bash
kubectl --context=tesslate-beta-eks get pods -n tesslate
# platform still healthy
```

Repo-side after restoring Stage 3 later:

```bash
./scripts/pi-ops-healthcheck.sh
```

Classification: API verify **EXISTS IN REPO**; domain **REQUIRED FROM OPERATOR**.

---

## 14. Commands that can affect production or another environment

**Dangerous / multi-env — do not use for this runbook’s beta soak:**

| Command / pattern | Risk | Classification |
|-------------------|------|----------------|
| `./scripts/aws-deploy.sh … production` | Mutates **production** | **EXISTS IN REPO** |
| `./scripts/aws-deploy.sh … shared` | Shared ECR / platform stack | **EXISTS IN REPO** |
| `kubectl … --context=tesslate-production-eks` | Production cluster | **EXISTS IN REPO** |
| `kubectl config use-context` / `./scripts/kctx.sh` | Context race → wrong cluster | **EXISTS IN REPO** (banned for agents) |
| `./scripts/aws-deploy.sh destroy beta` | Destroys beta infra | **EXISTS IN REPO** |
| `./scripts/aws-deploy.sh destroy production` | Destroys production | **EXISTS IN REPO** |
| Editing `orchestrator/feature_flags/production.yaml` or `defaults.yaml` Pi keys | Changes global/production defaults | **EXISTS IN REPO** files — **do not** |
| Setting `pi_payments_template: true` | Stage 4 activation | **Forbidden** for Phase 15.1 |
| `terraform apply` / `aws-deploy.sh terraform production` | Production infra | **EXISTS IN REPO** |

**Safe pattern for this runbook:** always pass environment argument `beta` and always use `--context=tesslate-beta-eks` on manual kubectl.

---

## Recommended operator sequence (beta only)

```text
1. export AWS_PROFILE=<beta deployer/admin profile>     # REQUIRED FROM OPERATOR
2. Confirm: aws sts get-caller-identity
3. ./scripts/aws-deploy.sh build beta --role deployer   # or admin if required
4. ./scripts/aws-deploy.sh deploy-k8s beta              # if not already applied by build
5. Verify pods + /api/feature-flags (Stage 3, payments OFF)
6. LIVE SOAK checks (§11)
7. LIVE ROLLBACK (§12–13) then restore Stage 3 if continuing beta
8. STOP — do not start Phase 16; do not activate production
```

---

## BETA DEPLOYMENT READINESS

```text
REQUIRES OPERATOR INPUT
```

**Reason:**

- Deploy commands, overlays, `DEPLOYMENT_ENV=beta`, and Pi Stage 3 flag files **EXIST IN REPO**.
- Live account ID resolution, AWS profile/credentials, concrete `<BETA_APP_DOMAIN>`, and ability to run aws/kubectl/docker are **REQUIRED FROM OPERATOR**.
- Terraform `backend-beta.hcl` was **NOT FOUND** in a prior checkout audit — treat infra-first `terraform` as blocked until the operator confirms backend config.
- Exact public health URL path for beta is partially **UNKNOWN / NOT DOCUMENTED** (use `/api/feature-flags` + try `/api/health` and `/health`).

This runbook is **ready for an operator to execute** on a credentialed workstation.  
It is **not** an authorization to deploy from the agent VM, and it does **not** claim LIVE SOAK has been executed.

```text
Do not deploy from this document automatically.
Do not enable pi_payments_template.
Do not modify production.
Do not start Phase 16.
STOP.
```
