import httpx
from app.core.config import settings

async def verify_license() -> dict:
    """Verifica se a licença do app está ativa no Kairos Admin (fail-open se indisponível)."""
    if not settings.KAIROS_ADMIN_URL or not settings.KAIROS_CLIENT_ID:
        return {"valid": True, "status": "unknown", "message": "Kairos Admin não configurado"}
    url = f"{settings.KAIROS_ADMIN_URL}/api/license/verify"
    params = {"client_id": settings.KAIROS_CLIENT_ID, "app_slug": settings.APP_SLUG}
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get(url, params=params)
            return res.json()
    except Exception:
        return {"valid": True, "status": "unknown", "message": "Kairos Admin inacessível"}
