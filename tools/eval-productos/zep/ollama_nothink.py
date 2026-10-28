# Cliente LLM para Graphiti que habla con Ollama en modo NATIVO con think=False (apaga el "pensar" de Qwen3) y usa salida
# estructurada por esquema JSON. Por el endpoint /v1 no se puede desactivar el pensar; por aqui si -> ~5x mas rapido.
import json
import ollama
from graphiti_core.llm_client.openai_client import OpenAIClient
from graphiti_core.llm_client.config import ModelSize


class OllamaNoThinkClient(OpenAIClient):
    def __init__(self, config, host: str = 'http://localhost:11434'):
        super().__init__(config=config)
        self._oa = ollama.AsyncClient(host=host)

    async def _generate_response(self, messages, response_model=None, max_tokens=None,
                                 model_size: ModelSize = ModelSize.medium, *, model=None):
        omsgs = self._convert_messages_to_openai_format(messages)
        resolved = self._get_model_for_size(model_size, model=model)
        fmt = response_model.model_json_schema() if response_model else 'json'
        mt = max_tokens or self.max_tokens
        resp = await self._oa.chat(model=resolved, messages=omsgs, think=False, format=fmt,
                                   options={'temperature': self.temperature or 0, 'num_predict': mt, 'seed': 7})
        content = ((resp.get('message') or {}).get('content') or '{}').strip()
        return json.loads(content), int(resp.get('prompt_eval_count') or 0), int(resp.get('eval_count') or 0)
