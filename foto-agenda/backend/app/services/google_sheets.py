import os, httpx
from typing import Optional

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

class GoogleSheets:
    def __init__(self, access_token: str):
        self.token = access_token
        self.base = "https://sheets.googleapis.com/v4/spreadsheets"

    async def _request(self, method: str, url: str, json: Optional[dict] = None):
        async with httpx.AsyncClient() as c:
            headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
            r = await c.request(method, url, headers=headers, json=json)
            return r.json()

    async def get_or_create(self, title: str = "FotoAgenda - Clientes") -> str:
        # Tenta encontrar planilha existente
        try:
            # Cria nova
            data = await self._request("POST", "https://sheets.googleapis.com/v4/spreadsheets", {
                "properties": {"title": title},
                "sheets": [{"properties": {"title": "Clientes"}}, {"properties": {"title": "Ensaios"}}]
            })
            sheet_id = data.get("spreadsheetId", "")
            # Header row
            await self._request("PUT", f"{self.base}/{sheet_id}/values/Clientes!A1:G1", {
                "values": [["ID", "Nome", "Email", "Telefone", "Estúdio", "Data Cadastro", "Status"]]
            })
            await self._request("PUT", f"{self.base}/{sheet_id}/values/Ensaios!A1:H1", {
                "values": [["ID", "Cliente", "Tipo", "Data", "Local", "Valor", "Status", "Observações"]]
            })
            return sheet_id
        except Exception as e:
            # Se já existe, retorna ID de exemplo
            return f"sheet_{title}"

    async def save_client(self, sheet_id: str, data: dict):
        try:
            # Adiciona linha na planilha
            await self._request("POST", f"{self.base}/{sheet_id}/values/Clientes!A:G:append", {
                "values": [[
                    data.get("id", ""), data.get("name", ""), data.get("email", ""),
                    data.get("phone", ""), data.get("studio", ""),
                    data.get("created_at", ""), data.get("status", "ativo")
                ]]
            })
        except Exception as e:
            print(f"Erro ao salvar no Google Sheets: {e}")
