# Pi feature-flag overlays (operator-applied)

These YAML fragments are **not** loaded automatically.

`load_feature_flags(deployment_env)` only reads:

```text
orchestrator/feature_flags/defaults.yaml
orchestrator/feature_flags/{deployment_env}.yaml
```

## Stage 3 activation (knowledge + skills + templates)

File: `pi-stage3-activation.yaml`

Enables:

```text
pi_knowledge = ON
pi_skills = ON
pi_templates = ON
pi_payments_template = OFF
```

### Phase 14 — beta applied

As of Phase 14, the Stage 3 contract is merged into:

```text
orchestrator/feature_flags/beta.yaml
```

Resolved `deployment_env=beta` therefore activates knowledge / skills / templates
while keeping `pi_payments_template=false`.

`defaults.yaml` and `production.yaml` remain Stage 0 (all Pi flags OFF).

### Apply to another environment (operator)

1. Confirm `./scripts/pi-ops-healthcheck.sh` is green.
2. Confirm Phase 14 gate tests pass.
3. Merge keys from `pi-stage3-activation.yaml` into the target `{env}.yaml`
   (production only after explicit human soak approval).
4. Redeploy / restart orchestrator so flags reload.
5. Verify `GET /api/feature-flags` shows the expected public values.
6. Re-run `python -m app.services.pi_ops_health --env <env>` (or `./scripts/pi-ops-healthcheck.sh` for production resolution).

### Rollback

Remove the Pi keys from `{env}.yaml` (or set all four to `false`) and redeploy/restart.

Emergency baseline:

```text
pi_knowledge = false
pi_skills = false
pi_templates = false
pi_payments_template = false
```

### Validate without mutating production

```bash
./scripts/pi-stage3-activation-validate.sh
./scripts/pi-beta-activation-validate.sh
```

Beta validation resolves live `beta.yaml` Stage 3 and prints an in-memory
rollback simulation. It refuses Stage 4 payments ON and does not mutate
`production.yaml`.
