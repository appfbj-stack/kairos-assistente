import os, httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/google", tags=["google"])

CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "")

@router.get("/auth-url")
def get_auth_url():
    if not CLIENT_ID: raise HTTPException(400, "Google OAuth não configurado")
    url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={CLIENT_ID}&"
        f"redirect_uri={REDIRECT_URI}&"
        f"response_type=code&"
        f"scope=https://www.googleapis.com/auth/userinfo.email%20"
        f"https://www.googleapis.com/auth/userinfo.profile%20"
        f"https://www.googleapis.com/auth/spreadsheets&"
        f"access_type=offline&prompt=consent"
    )
    return {"url": url}

class TokenIn(BaseModel):
    code: str

@router.post("/callback")
async def google_callback(payload: TokenIn):
    if not CLIENT_ID or not CLIENT_SECRET: raise HTTPException(400, "Google OAuth não configurado")

    # Trocar code por tokens
    async with httpx.AsyncClient() as c:
        r = await c.post("https://oauth2.googleapis.com/token", data={
            "code": payload.code,
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "redirect_uri": REDIRECT_URI,
            "grant_type": "authorization_code",
        })
        tokens = r.json()
        if "access_token" not in tokens: raise HTTPException(400, "Falha na autenticação")

        # Pegar info do usuário
        r2 = await c.get("https://www.googleapis.com/oauth2/v2/userinfo", headers={
            "Authorization": f"Bearer {tokens['access_token']}"
        })
        user_info = r2.json()

    return {
        "user": user_info,
        "access_token": tokens["access_token"],
        "refresh_token": tokens.get("refresh_token", ""),
    }
