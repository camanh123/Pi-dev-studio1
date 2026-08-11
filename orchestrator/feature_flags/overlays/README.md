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

### Apply (operator)

1. Confirm `./scripts/pi-ops-healthcheck.sh` is green.
2. Confirm Phase 13 gate tests pass.
3. Merge keys from `pi-stage3-activation.yaml` into the target `{env}.yaml`
   (typically `beta.yaml` first, then `production.yaml` after soak).
4. Redeploy / restart orchestrator so flags reload.
5. Verify `GET /api/feature-flags` shows the expected public values.
6. Re-run `./scripts/pi-ops-healthcheck.sh` and smoke Create Project / Marketplace.

### Rollback

Remove the Pi keys from `{env}.yaml` (or set all four to `false`) and redeploy/restart.

Emergency baseline:

```text
pi_knowledge = false
pi_skills = false
pi_templates = false
pi_payments_template = false
```

### Validate without applying

```bash
./scripts/pi-stage3-activation-validate.sh
```

This dry-runs the merge in memory and refuses Stage 4 payments ON.
