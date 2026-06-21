from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models import ConsentimentoLGPD, Membro
from app.utils import new_id


def get_politica_privacidade_html() -> str:
    """HTML da Política de Privacidade — versão definida em settings.LGPD_VERSAO_TERMO."""
    dpo = settings.LGPD_DPO_EMAIL or "a definir"
    controladora = settings.LGPD_CONTROLADORA_NOME
    cnpj = settings.LGPD_CONTROLADORA_CNPJ or "a definir"
    endereco = settings.LGPD_CONTROLADORA_ENDERECO or "a definir"
    retencao = settings.LGPD_RETENCAO_MESES
    versao = settings.LGPD_VERSAO_TERMO

    return f"""
<section class="prose max-w-3xl mx-auto p-6">
  <h1 class="text-2xl font-bold mb-4">Política de Privacidade</h1>
  <p class="text-sm text-gray-500 mb-6">Versão {versao} — atualizada em 20/06/2026</p>

  <h2 class="text-lg font-semibold mt-6 mb-2">1. Controladora dos dados</h2>
  <p><strong>{controladora}</strong></p>
  <p>CNPJ: {cnpj}</p>
  <p>Endereço: {endereco}</p>
  <p>Encarregado de dados (DPO): <a href="mailto:{dpo}" class="text-blue-600">{dpo}</a></p>

  <h2 class="text-lg font-semibold mt-6 mb-2">2. Dados coletados</h2>
  <ul class="list-disc pl-6 space-y-1">
    <li><strong>Identificação:</strong> nome, CPF, RG, data de nascimento, foto, naturalidade.</li>
    <li><strong>Contato:</strong> e-mail, telefone, WhatsApp, endereço.</li>
    <li><strong>Familiares:</strong> nome dos pais, cônjuge, número de filhos, estado civil.</li>
    <li><strong>Saúde (dado sensível — Art. 11 LGPD):</strong> tipo sanguíneo, alergias, medicações, necessidades especiais, contato de emergência.</li>
    <li><strong>Eclesiásticos:</strong> data de conversão, batismo, batismo no Espírito Santo, cargo, ministérios, cursos de formação teológica, consagração, transferências.</li>
    <li><strong>Uso do sistema:</strong> e-mail, foto (Google), IP, User-Agent, logs de auditoria.</li>
  </ul>

  <h2 class="text-lg font-semibold mt-6 mb-2">3. Finalidades e base legal</h2>
  <ul class="list-disc pl-6 space-y-1">
    <li>Administração de membros e obreiros — <em>consentimento</em> e <em>legítimo interesse</em> (Art. 7º, IX).</li>
    <li>Comunicação institucional (avisos, eventos, aniversários) — <em>consentimento</em>.</li>
    <li>Emissão de carteirinhas e documentos internos — <em>consentimento</em>.</li>
    <li>Cumprimento de obrigações legais e regulatórias — <em>obrigação legal</em> (Art. 7º, II).</li>
    <li>Segurança e auditoria de acesso — <em>legítimo interesse</em>.</li>
  </ul>

  <h2 class="text-lg font-semibold mt-6 mb-2">4. Compartilhamento</h2>
  <p>Os dados não são compartilhados com terceiros, exceto quando exigido por lei ou com autorização expressa do titular. A Kairos Tecnologia atua como <strong>operadora</strong> sob confidencialidade.</p>

  <h2 class="text-lg font-semibold mt-6 mb-2">5. Armazenamento e segurança</h2>
  <ul class="list-disc pl-6 space-y-1">
    <li>Servidor em datacenter com controle de acesso físico e lógico.</li>
    <li>Conexão HTTPS (TLS 1.2+).</li>
    <li>Autenticação via Google OAuth (sem senhas fracas).</li>
    <li>Controle de acesso por perfil (sede, pastor, secretário, líder de ministério).</li>
    <li>Mascaramento de dados sensíveis por perfil.</li>
    <li>Logs de auditoria para todos os acessos a dados pessoais.</li>
    <li>Backup criptografado.</li>
  </ul>

  <h2 class="text-lg font-semibold mt-6 mb-2">6. Prazo de retenção</h2>
  <p>Os dados são mantidos por <strong>{retencao} meses</strong> após o desligamento do membro, salvo obrigação legal de retenção por prazo superior. Após esse período, são anonimizados ou excluídos.</p>

  <h2 class="text-lg font-semibold mt-6 mb-2">7. Direitos do titular (Art. 18 LGPD)</h2>
  <ul class="list-disc pl-6 space-y-1">
    <li>Confirmação de tratamento e acesso aos dados.</li>
    <li>Correção de dados incompletos ou inexatos.</li>
    <li>Anonimização, bloqueio ou eliminação de dados desnecessários.</li>
    <li>Portabilidade dos dados a outro fornecedor.</li>
    <li>Eliminação dos dados pessoais tratados com consentimento.</li>
    <li>Informação sobre compartilhamento.</li>
    <li>Revogação do consentimento.</li>
  </ul>
  <p>Para exercer seus direitos, use o formulário em <a href="/solicitar-exclusao-de-dados" class="text-blue-600">/solicitar-exclusao-de-dados</a> ou envie e-mail ao DPO.</p>

  <h2 class="text-lg font-semibold mt-6 mb-2">8. Mudanças nesta política</h2>
  <p>Esta política pode ser atualizada. A versão atual está indicada no topo. Mudanças materiais exigem novo consentimento.</p>

  <h2 class="text-lg font-semibold mt-6 mb-2">9. Contato</h2>
  <p>Encarregado de dados (DPO): <a href="mailto:{dpo}" class="text-blue-600">{dpo}</a></p>
</section>
"""


def get_termos_uso_html() -> str:
    versao = settings.LGPD_VERSAO_TERMO
    controladora = settings.LGPD_CONTROLADORA_NOME
    return f"""
<section class="prose max-w-3xl mx-auto p-6">
  <h1 class="text-2xl font-bold mb-4">Termos de Uso</h1>
  <p class="text-sm text-gray-500 mb-6">Versão {versao} — 20/06/2026</p>

  <h2 class="text-lg font-semibold mt-6 mb-2">1. Aceitação</h2>
  <p>Ao usar este sistema, você concorda com estes Termos e com a <a href="/politica-de-privacidade" class="text-blue-600">Política de Privacidade</a>. Se não concordar, não utilize o sistema.</p>

  <h2 class="text-lg font-semibold mt-6 mb-2">2. Descrição do serviço</h2>
  <p>Plataforma de gestão de membros, obreiros, congregações, agenda e patrimônio da {controladora}, fornecida pela Kairos Tecnologia.</p>

  <h2 class="text-lg font-semibold mt-6 mb-2">3. Acesso e credenciais</h2>
  <ul class="list-disc pl-6 space-y-1">
    <li>Acesso liberado apenas para usuários previamente cadastrados pela sede.</li>
    <li>Autenticação via Google OAuth.</li>
    <li>É proibido compartilhar credenciais.</li>
    <li>O usuário responde por atividades realizadas com sua conta.</li>
  </ul>

  <h2 class="text-lg font-semibold mt-6 mb-2">4. Responsabilidades do usuário</h2>
  <ul class="list-disc pl-6 space-y-1">
    <li>Cadastrar apenas dados verdadeiros e necessários.</li>
    <li>Obter consentimento do titular antes de inserir dados pessoais.</li>
    <li>Não usar os dados para finalidades alheias às da igreja.</li>
    <li>Não exportar dados sem autorização da sede.</li>
  </ul>

  <h2 class="text-lg font-semibold mt-6 mb-2">5. Responsabilidades da plataforma</h2>
  <ul class="list-disc pl-6 space-y-1">
    <li>Manter disponibilidade, sem garantia absoluta.</li>
    <li>Preservar confidencialidade dos dados conforme LGPD.</li>
    <li>Notificar incidentes de segurança conforme a lei.</li>
  </ul>

  <h2 class="text-lg font-semibold mt-6 mb-2">6. Propriedade intelectual</h2>
  <p>O código, design e marcas são propriedade da Kairos Tecnologia. Os dados inseridos pertencem à {controladora}.</p>

  <h2 class="text-lg font-semibold mt-6 mb-2">7. Suspensão</h2>
  <p>A sede pode suspender o acesso de qualquer usuário a qualquer tempo, mediante comunicação.</p>

  <h2 class="text-lg font-semibold mt-6 mb-2">8. Legislação aplicável</h2>
  <p>Leis brasileiras. Fórum da comarca da sede da {controladora}.</p>
</section>
"""


def get_consentimento_membro_html() -> str:
    """Termo exibido no formulário de cadastro de membro."""
    versao = settings.LGPD_VERSAO_TERMO
    return f"""
<div class="prose max-w-2xl mx-auto text-sm">
  <h3 class="text-lg font-bold">Termo de Consentimento para Tratamento de Dados Pessoais</h3>
  <p class="text-xs text-gray-500">Versão {versao}</p>
  <p>Ao marcar a caixa abaixo, o titular dos dados (ou seu representante legal) autoriza a {settings.LGPD_CONTROLADORA_NOME} a tratar seus dados pessoais (nome, CPF, RG, data de nascimento, foto, contato, endereço, dados familiares, dados de saúde, dados eclesiásticos) para as finalidades de:</p>
  <ul class="list-disc pl-6 space-y-1">
    <li>Administração do cadastro de membros e obreiros;</li>
    <li>Comunicação institucional;</li>
    <li>Emissão de carteirinhas e documentos internos;</li>
    <li>Registro eclesiástico (batismos, cargos, transferências, ministérios).</li>
  </ul>
  <p>O consentimento pode ser revogado a qualquer momento por meio de solicitação ao DPO ou via o formulário de direitos do titular.</p>
  <p>Consulte a <a href="/politica-de-privacidade" class="text-blue-600" target="_blank">Política de Privacidade</a> completa.</p>
</div>
"""


def registrar_aceite_membro(
    db: Session,
    membro: Membro,
    ip: Optional[str],
    user_agent: Optional[str],
    finalidade: str = "cadastro_membro",
) -> None:
    """Registra o aceite LGPD do membro:
    1. Atualiza campos lgpd_* no próprio Membro.
    2. Cria linha em ConsentimentoLGPD para histórico.
    """
    versao = settings.LGPD_VERSAO_TERMO
    agora = datetime.now(timezone.utc)

    # 1. Atualiza o Membro
    membro.lgpd_aceite = True
    membro.lgpd_data_aceite = agora
    membro.lgpd_ip = ip
    membro.lgpd_user_agent = (user_agent or "")[:500]
    membro.lgpd_versao_termo = versao

    # 2. Cria histórico em ConsentimentoLGPD
    consentimento = ConsentimentoLGPD(
        id=new_id(),
        tenant_id=membro.tenant_id,
        membro_id=membro.id,
        versao_termo=versao,
        finalidade=finalidade,
        aceito=True,
        data_aceite=agora,
        ip=ip,
        user_agent=(user_agent or "")[:500],
    )
    db.add(consentimento)


def precisa_reaceite(membro: Membro) -> bool:
    """True se o membro aceitou uma versão antiga do termo e precisa reaceitar."""
    if not membro.lgpd_aceite:
        return True
    return membro.lgpd_versao_termo != settings.LGPD_VERSAO_TERMO
