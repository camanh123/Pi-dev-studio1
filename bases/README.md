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

Publish/update the orphan clone branch:

```bash
./scripts/publish-pi-web-starter-base.sh
```

This keeps the existing MarketplaceBase git-acquisition path without inventing
a second template system. A future standalone TesslateAI repo name would be
`Studio-Pi-Web-Starter-Base`.
