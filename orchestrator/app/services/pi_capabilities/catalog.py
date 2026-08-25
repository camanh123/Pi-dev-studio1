"""Canonical Pi capability catalog (Phase 2 baseline).

Entries encode *verified Pi Network platform facts* only. Every record
ships with ``studio_status=NOT_IMPLEMENTED`` until a later phase adds
an actual Studio tool. Do not invent REST paths beyond
``GET https://api.minepi.com/v2/me``.
"""

from __future__ import annotations

from app.services.pi_capabilities.models import (
    PHASE2_BASELINE_DATE,
    PI_USER_ME_URL,
    CapabilityId,
    CapabilityRecord,
    CapabilityStatus,
    Environment,
    PiScope,
    PlatformApiCategory,
    SecretExposure,
    SecretName,
    SecretRef,
    StudioImplementationStatus,
)

_BACKEND_API_KEY = SecretRef(SecretName.PI_API_KEY, SecretExposure.BACKEND_ONLY)
_APP_WALLET_SEED = SecretRef(SecretName.APP_WALLET_PRIVATE_SEED, SecretExposure.BACKEND_ONLY)

_KNOWN_SCOPES = (PiScope.USERNAME, PiScope.PAYMENTS, PiScope.WALLET_ADDRESS)

_NO_FRONTEND_SECRETS = (
    "Never expose server API keys, application wallet seeds, or other "
    "developer secrets to frontend code or the Pi JavaScript SDK."
)


def _record(**kwargs: object) -> CapabilityRecord:
    kwargs.setdefault("last_verified", PHASE2_BASELINE_DATE)
    kwargs.setdefault("studio_status", StudioImplementationStatus.NOT_IMPLEMENTED)
    return CapabilityRecord(**kwargs)  # type: ignore[arg-type]


CAPABILITIES: tuple[CapabilityRecord, ...] = (
    _record(
        id=CapabilityId.PI_BROWSER_AUTH,
        status=CapabilityStatus.SUPPORTED,
        environments=(Environment.PI_BROWSER, Environment.BACKEND),
        frontend_required=True,
        backend_required=True,
        blockchain_required=False,
        available_scopes=_KNOWN_SCOPES,
        frontend_api="Pi.authenticate(scopes, onIncompletePaymentFound)",
        backend_api=f"GET {PI_USER_ME_URL}",
        generation_requirements=(
            "Pi Browser runtime",
            "frontend Pi.authenticate(scopes, onIncompletePaymentFound)",
            f"backend verification via GET {PI_USER_ME_URL} with the user Bearer access token",
        ),
        related_capability_ids=(
            CapabilityId.USER_VERIFICATION,
            CapabilityId.INCOMPLETE_PAYMENT_RECOVERY,
            CapabilityId.PI_BROWSER_RUNTIME,
        ),
        official_reference=(
            "Pi JavaScript SDK Pi.authenticate; backend GET "
            f"{PI_USER_ME_URL} with the user's Bearer access token"
        ),
        security_notes=(
            "Verify the access token on the backend; do not trust frontend-only identity.",
            "The user access token is not a developer server API key.",
            _NO_FRONTEND_SECRETS,
        ),
        limitations=(
            "Requires the Pi Browser runtime. Do not assume this is equivalent to Pi.signIn on normal web.",
        ),
    ),
    _record(
        id=CapabilityId.PI_SIGN_IN,
        status=CapabilityStatus.SUPPORTED,
        environments=(Environment.NORMAL_WEB,),
        frontend_required=True,
        backend_required=True,
        blockchain_required=False,
        available_scopes=_KNOWN_SCOPES,
        frontend_api="Pi.signIn(...)",
        generation_requirements=(
            "normal web runtime (not Pi Browser authentication)",
            "OAuth-style Pi.signIn with clientId, redirectUri, scopes, and state",
        ),
        related_capability_ids=(CapabilityId.WALLET_ADDRESS, CapabilityId.USER_VERIFICATION),
        official_reference=(
            "Pi JavaScript SDK Pi.signIn(...) OAuth-style flow "
            "(clientId, redirectUri, scopes, state)"
        ),
        security_notes=(
            "Validate OAuth state on the backend. Do not embed developer server API keys in the frontend.",
            _NO_FRONTEND_SECRETS,
        ),
        limitations=(
            "Pi Sign-in targets normal web. Do not assume identical runtime constraints to Pi.authenticate in Pi Browser.",
            "Known authenticate() scopes are listed as available; they are not independently re-specified for signIn in this baseline.",
        ),
    ),
    _record(
        id=CapabilityId.USER_TO_APP_PAYMENT,
        status=CapabilityStatus.SUPPORTED,
        environments=(
            Environment.PI_BROWSER,
            Environment.BACKEND,
            Environment.TESTNET,
            Environment.MAINNET,
        ),
        frontend_required=True,
        backend_required=True,
        blockchain_required=False,
        required_scopes=(PiScope.PAYMENTS,),
        available_scopes=(PiScope.PAYMENTS,),
        required_secrets=(_BACKEND_API_KEY,),
        frontend_api="Pi.createPayment(...)",
        platform_api_categories=(
            PlatformApiCategory.PAYMENT_APPROVAL,
            PlatformApiCategory.PAYMENT_COMPLETION,
        ),
        generation_requirements=(
            "payments scope",
            "server-side payment approval",
            "server-side payment completion",
        ),
        related_capability_ids=(
            CapabilityId.SERVER_SIDE_PAYMENT_APPROVAL,
            CapabilityId.SERVER_SIDE_PAYMENT_COMPLETION,
            CapabilityId.INCOMPLETE_PAYMENT_RECOVERY,
            CapabilityId.PI_BROWSER_RUNTIME,
        ),
        official_reference="Pi JavaScript SDK Pi.createPayment(...); Pi Platform API payment approval and completion",
        security_notes=(
            "Server API key is required for approval and completion and must stay on the backend.",
            _NO_FRONTEND_SECRETS,
        ),
        limitations=(
            "Frontend starts the payment; the payment is not complete without backend approval and completion.",
        ),
    ),
    _record(
        id=CapabilityId.APP_TO_USER_PAYMENT,
        status=CapabilityStatus.LIMITED,
        environments=(
            Environment.BACKEND,
            Environment.BLOCKCHAIN,
            Environment.TESTNET,
        ),
        frontend_required=False,
        backend_required=True,
        blockchain_required=True,
        required_secrets=(_BACKEND_API_KEY, _APP_WALLET_SEED),
        platform_api_categories=(PlatformApiCategory.PAYMENT_COMPLETION,),
        generation_requirements=(
            "Pi backend API",
            "developer server API key",
            "application wallet/private seed",
            "blockchain transaction construction/signing/submission",
            "payment completion via Pi API",
        ),
        related_capability_ids=(
            CapabilityId.BLOCKCHAIN_TRANSACTION,
            CapabilityId.SERVER_SIDE_PAYMENT_COMPLETION,
            CapabilityId.PI_TESTNET,
            CapabilityId.PLATFORM_API,
        ),
        official_reference="Pi Platform API App-to-User payments (official documentation currently describes A2U as Testnet-only)",
        security_notes=(
            "Application wallet private seed and server API key are backend-only.",
            "Never construct, sign, or submit A2U blockchain transactions in frontend code.",
            _NO_FRONTEND_SECRETS,
        ),
        limitations=(
            "Official documentation currently describes App-to-User payments as Testnet-only.",
            "Not marked Mainnet production-ready in this baseline.",
            "LIMITED must not be treated as fully SUPPORTED.",
        ),
    ),
    _record(
        id=CapabilityId.USER_VERIFICATION,
        status=CapabilityStatus.SUPPORTED,
        environments=(Environment.BACKEND,),
        frontend_required=False,
        backend_required=True,
        blockchain_required=False,
        backend_api=f"GET {PI_USER_ME_URL}",
        platform_api_categories=(PlatformApiCategory.USER_ME,),
        generation_requirements=(
            f"backend GET {PI_USER_ME_URL}",
            "Authorization: Bearer <user access token>",
        ),
        related_capability_ids=(CapabilityId.PI_BROWSER_AUTH, CapabilityId.PLATFORM_API),
        official_reference=f"GET {PI_USER_ME_URL} using the user's Bearer access token",
        security_notes=(
            "Use the user access token, not the developer server API key, for /me.",
            "Perform verification on the backend only.",
            _NO_FRONTEND_SECRETS,
        ),
    ),
    _record(
        id=CapabilityId.WALLET_ADDRESS,
        status=CapabilityStatus.SUPPORTED,
        environments=(Environment.PI_BROWSER, Environment.NORMAL_WEB),
        frontend_required=True,
        backend_required=False,
        blockchain_required=False,
        required_scopes=(PiScope.WALLET_ADDRESS,),
        available_scopes=(PiScope.WALLET_ADDRESS,),
        consent_required=True,
        generation_requirements=(
            "wallet_address scope",
            "user consent",
        ),
        related_capability_ids=(CapabilityId.PI_BROWSER_AUTH, CapabilityId.PI_SIGN_IN),
        official_reference="Pi JavaScript SDK scope wallet_address (supported with user consent)",
        security_notes=(
            "Request wallet_address only when the app needs it. Treat the address as user-consented data.",
        ),
        limitations=(
            "SUPPORTED WITH CONSENT. The wallet address is not available unless the user grants the wallet_address scope.",
        ),
    ),
    _record(
        id=CapabilityId.PLATFORM_API,
        status=CapabilityStatus.SUPPORTED,
        environments=(Environment.BACKEND,),
        frontend_required=False,
        backend_required=True,
        blockchain_required=False,
        required_secrets=(_BACKEND_API_KEY,),
        backend_api="Pi Platform API (server-side)",
        platform_api_categories=(
            PlatformApiCategory.USER_ME,
            PlatformApiCategory.PAYMENT_CREATION,
            PlatformApiCategory.PAYMENT_LOOKUP,
            PlatformApiCategory.PAYMENT_APPROVAL,
            PlatformApiCategory.PAYMENT_COMPLETION,
        ),
        generation_requirements=(
            "backend-only Platform API access",
            "developer server API key for server-authenticated payment endpoints",
        ),
        related_capability_ids=(
            CapabilityId.USER_VERIFICATION,
            CapabilityId.SERVER_SIDE_PAYMENT_APPROVAL,
            CapabilityId.SERVER_SIDE_PAYMENT_COMPLETION,
        ),
        official_reference=(
            "Pi Platform API categories: GET /me, payment creation, "
            "payment lookup, payment approval, payment completion"
        ),
        security_notes=(
            "Do not expose server API keys to frontend code.",
            "GET /me uses the user Bearer access token; server-authenticated payment operations use the developer API key.",
            _NO_FRONTEND_SECRETS,
        ),
        limitations=(
            "This baseline models known *categories*, not additional invented REST paths. "
            f"The only fully specified URL is GET {PI_USER_ME_URL}.",
        ),
    ),
    _record(
        id=CapabilityId.PI_TESTNET,
        status=CapabilityStatus.SUPPORTED,
        environments=(Environment.TESTNET,),
        frontend_required=False,
        backend_required=False,
        blockchain_required=False,
        related_capability_ids=(CapabilityId.APP_REGISTRATION, CapabilityId.PI_MAINNET),
        official_reference="Pi Developer Portal — app network selection (Testnet)",
        limitations=(
            "Network is app configuration selected at registration, not a freely switchable runtime toggle.",
        ),
    ),
    _record(
        id=CapabilityId.PI_MAINNET,
        status=CapabilityStatus.SUPPORTED,
        environments=(Environment.MAINNET,),
        frontend_required=False,
        backend_required=False,
        blockchain_required=False,
        related_capability_ids=(CapabilityId.APP_REGISTRATION, CapabilityId.PI_TESTNET),
        official_reference="Pi Developer Portal — app network selection (Mainnet)",
        limitations=(
            "Network is app configuration selected at registration, not a freely switchable runtime toggle.",
            "App-to-User payments remain LIMITED / Testnet-only independently of Mainnet existing.",
        ),
    ),
    _record(
        id=CapabilityId.BLOCKCHAIN_TRANSACTION,
        status=CapabilityStatus.SUPPORTED,
        environments=(
            Environment.BACKEND,
            Environment.BLOCKCHAIN,
            Environment.TESTNET,
            Environment.MAINNET,
        ),
        frontend_required=False,
        backend_required=True,
        blockchain_required=True,
        required_secrets=(_APP_WALLET_SEED,),
        generation_requirements=(
            "backend signing environment",
            "Pi blockchain APIs compatible with Stellar SDK mechanics",
        ),
        related_capability_ids=(
            CapabilityId.APP_TO_USER_PAYMENT,
            CapabilityId.PI_TESTNET,
            CapabilityId.PI_MAINNET,
        ),
        official_reference="Pi blockchain transaction APIs compatible with Stellar SDK mechanics",
        security_notes=(
            "Construct, sign, and submit transactions on the backend only.",
            "Application wallet private seed must never reach the frontend.",
            "Testnet and Mainnet are separate networks; do not mix endpoints or keys.",
            _NO_FRONTEND_SECRETS,
        ),
        limitations=(
            "SUPPORTED WITH ENVIRONMENT/SECURITY REQUIREMENTS.",
            "Availability of blockchain mechanics does not make App-to-User payments Mainnet-ready.",
        ),
    ),
    _record(
        id=CapabilityId.SERVER_SIDE_PAYMENT_APPROVAL,
        status=CapabilityStatus.SUPPORTED,
        environments=(Environment.BACKEND, Environment.TESTNET, Environment.MAINNET),
        frontend_required=False,
        backend_required=True,
        blockchain_required=False,
        required_secrets=(_BACKEND_API_KEY,),
        platform_api_categories=(PlatformApiCategory.PAYMENT_APPROVAL,),
        generation_requirements=("backend payment approval via Pi Platform API",),
        related_capability_ids=(
            CapabilityId.USER_TO_APP_PAYMENT,
            CapabilityId.PLATFORM_API,
            CapabilityId.SERVER_SIDE_PAYMENT_COMPLETION,
        ),
        official_reference="Pi Platform API — payment approval (server-side)",
        security_notes=(
            "Developer server API key stays on the backend.",
            _NO_FRONTEND_SECRETS,
        ),
    ),
    _record(
        id=CapabilityId.SERVER_SIDE_PAYMENT_COMPLETION,
        status=CapabilityStatus.SUPPORTED,
        environments=(Environment.BACKEND, Environment.TESTNET, Environment.MAINNET),
        frontend_required=False,
        backend_required=True,
        blockchain_required=False,
        required_secrets=(_BACKEND_API_KEY,),
        platform_api_categories=(PlatformApiCategory.PAYMENT_COMPLETION,),
        generation_requirements=("backend payment completion via Pi Platform API",),
        related_capability_ids=(
            CapabilityId.USER_TO_APP_PAYMENT,
            CapabilityId.APP_TO_USER_PAYMENT,
            CapabilityId.PLATFORM_API,
        ),
        official_reference="Pi Platform API — payment completion (server-side)",
        security_notes=(
            "Developer server API key stays on the backend.",
            _NO_FRONTEND_SECRETS,
        ),
    ),
    _record(
        id=CapabilityId.INCOMPLETE_PAYMENT_RECOVERY,
        status=CapabilityStatus.SUPPORTED,
        environments=(Environment.PI_BROWSER, Environment.BACKEND),
        frontend_required=True,
        backend_required=True,
        blockchain_required=False,
        required_scopes=(PiScope.PAYMENTS,),
        required_secrets=(_BACKEND_API_KEY,),
        frontend_api="onIncompletePaymentFound callback of Pi.authenticate",
        generation_requirements=(
            "onIncompletePaymentFound handler in Pi.authenticate",
            "server-side payment approval of recovered payments",
            "server-side payment completion of recovered payments",
        ),
        related_capability_ids=(
            CapabilityId.PI_BROWSER_AUTH,
            CapabilityId.USER_TO_APP_PAYMENT,
            CapabilityId.SERVER_SIDE_PAYMENT_APPROVAL,
            CapabilityId.SERVER_SIDE_PAYMENT_COMPLETION,
        ),
        official_reference="Pi JavaScript SDK Pi.authenticate(..., onIncompletePaymentFound)",
        security_notes=(
            "Recovered payments still require backend approval and completion with a backend-only API key.",
            _NO_FRONTEND_SECRETS,
        ),
        limitations=(
            "Apps that use payments must handle incomplete payments; skipping recovery is not supported.",
        ),
    ),
    _record(
        id=CapabilityId.APP_REGISTRATION,
        status=CapabilityStatus.SUPPORTED,
        environments=(Environment.TESTNET, Environment.MAINNET),
        frontend_required=False,
        backend_required=False,
        blockchain_required=False,
        generation_requirements=(
            "register the app in the Pi Developer Portal",
            "select Testnet or Mainnet at registration (app configuration, not a runtime toggle)",
        ),
        related_capability_ids=(CapabilityId.PI_TESTNET, CapabilityId.PI_MAINNET),
        official_reference="Pi Developer Portal — application registration and network selection",
        limitations=(
            "Apps are registered via the Pi Developer Portal.",
            "An app selects its network (Testnet or Mainnet) at registration.",
            "Treat the network as app configuration, not a freely switchable runtime toggle.",
        ),
    ),
    _record(
        id=CapabilityId.PI_BROWSER_RUNTIME,
        status=CapabilityStatus.SUPPORTED,
        environments=(Environment.PI_BROWSER,),
        frontend_required=True,
        backend_required=False,
        blockchain_required=False,
        generation_requirements=("Pi Browser runtime",),
        related_capability_ids=(
            CapabilityId.PI_BROWSER_AUTH,
            CapabilityId.USER_TO_APP_PAYMENT,
        ),
        official_reference="Pi Browser — required runtime for Pi.authenticate and Pi.createPayment",
        limitations=(
            "Distinct from normal web. Pi.signIn targets normal web and must not be assumed to share this runtime.",
        ),
    ),
)


CANONICAL_CAPABILITY_IDS: tuple[CapabilityId, ...] = tuple(record.id for record in CAPABILITIES)
