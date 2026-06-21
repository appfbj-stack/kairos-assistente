import httpx
from app.core.config import settings

async def verify_license() -> dict:
    if not settings.KAIROS_ADMIN_URL or not settings.KAIROS_CLIENT_ID:
        return {"valid": True, "status": "unknown", "message": "Kairos Admin não configurado"}
    url = f"{settings.KAIROS_ADMIN_URL}/api/license/verify"
    params = {"client_id": settings.KAIROS_CLIENT_ID, "app_slug": settings.APP_SLUG}
    auth = (
        settings.KAIROS_ADMIN_BASIC_USER,
        settings.KAIROS_ADMIN_BASIC_PASSWORD,
    ) if settings.KAIROS_ADMIN_BASIC_USER else None
    try:
        async with httpx.AsyncClient(timeout=10.0, auth=auth) as client:
            res = await client.get(url, params=params)
            data = res.json()
            if res.is_error or not data.get("valid"):
                print(f"⚠ Licença inválida ou erro: {data}")
                return {"valid": False, "status": "error", "message": data.get("error", "Licença inválida")}
            return data
    except Exception as e:
        print(f"DEBUG license error: {type(e).__name__}: {e}")
        return {"valid": True, "status": "unknown", "message": "Kairos Admin inacessível"}
