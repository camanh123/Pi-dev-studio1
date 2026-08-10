# Marketplace base sources (monorepo)

Official MarketplaceBases are registered in
`packages/tesslate-marketplace/app/seeds/bases.json` and acquired by
create-project via `git clone` of `git_repo_url`.

## Pi Web Starter

| Field | Value |
|-------|-------|
| Slug | `pi-web-starter` |
| In-repo source | `bases/pi-web-starter/` |
| Clone URL | `https://github.com/camanh123/Pi-dev-studio1.git` |
| Clone branch | `base/pi-web-starter` |

```bash
./scripts/publish-pi-web-starter-base.sh
```

## Pi Auth Starter

| Field | Value |
|-------|-------|
| Slug | `pi-auth-starter` |
| In-repo source | `bases/pi-auth-starter/` |
| Clone URL | `https://github.com/camanh123/Pi-dev-studio1.git` |
| Clone branch | `base/pi-auth-starter` |

```bash
./scripts/publish-pi-auth-starter-base.sh
```

Extends Web Starter with generated-app `Pi.authenticate` + backend
`GET /v2/me` verification. Not OpenSail authentication. Payments deferred.

Both bases keep the existing MarketplaceBase git-acquisition path without
inventing a second template system.
