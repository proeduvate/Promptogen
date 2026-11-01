"""LangChain BaseChatModel adapter for Promptogen.

Provides a unified LangChain ChatModel interface wrapping Promptogen's LLM clients
(Gemini, Groq, OpenAI) with:
1. Strict Model Switching: The user-selected model is preserved exactly and never auto-changed.
2. Structured Output & JSON Extraction: Built-in `with_structured_output` supporting Pydantic schemas.
3. Observability: Token usage estimation, latency tracking, and LangSmith callback integration.
"""

import asyncio
import logging
import time
from typing import Any, Dict, List, Optional, Type, Union

from langchain_core.callbacks import (
    AsyncCallbackManagerForLLMRun,
    CallbackManagerForLLMRun,
)
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
)
from langchain_core.outputs import ChatGeneration, ChatResult
from langchain_core.runnables import Runnable, RunnableLambda
from pydantic import BaseModel, ConfigDict, Field

from core.config import settings
from utils.json_parser import parse_json_from_llm_response

logger = logging.getLogger("promptgen.clients.langchain_adapter")


class PromptogenChatModel(BaseChatModel):
    """Custom LangChain BaseChatModel wrapping Promptogen's native async LLM clients.
    
    Guarantees:
    - Zero auto-switching: `model_name` is strictly passed to the backend client.
    - Full structured output: `.with_structured_output(Schema)` returns typed Pydantic objects.
    - Non-blocking async execution.
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    model_name: str = Field(default_factory=lambda: getattr(settings, "gemini_model", "gemini-3.5-flash-lite"))
    provider: Optional[str] = None
    api_key: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    timeout: Optional[float] = None

    @property
    def _llm_type(self) -> str:
        return "promptogen-chat-model"

    @property
    def _identifying_params(self) -> Dict[str, Any]:
        return {
            "model_name": self.model_name,
            "provider": self.provider,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
        }

    def _get_underlying_client(self):
        """Resolves the client preserving the exact model without auto-switching."""
        prov = (self.provider or settings.llm_provider).lower()
        model = self.model_name

        if prov == "gemini" or (model and "gemini" in model.lower()):
            from clients.gemini_client import GeminiClient
            return GeminiClient(api_key=self.api_key, model=model, timeout=self.timeout)

        if prov == "groq" or (model and any(k in model.lower() for k in ["qwen", "llama", "mixtral", "gemma"])):
            from clients.groq_client import GroqClient
            return GroqClient(api_key=self.api_key, model=model, timeout=self.timeout)

        from clients.openai_client import OpenAIClient
        return OpenAIClient(api_key=self.api_key, model=model, timeout=self.timeout)

    def _convert_messages(self, messages: List[BaseMessage]) -> tuple[str, str]:
        """Convert LangChain messages list into (system_prompt, user_message)."""
        system_parts = []
        user_parts = []

        for msg in messages:
            content = msg.content if isinstance(msg.content, str) else str(msg.content)
            if isinstance(msg, SystemMessage):
                system_parts.append(content)
            elif isinstance(msg, HumanMessage):
                user_parts.append(content)
            elif isinstance(msg, AIMessage):
                user_parts.append(f"[Assistant Previous Output]:\n{content}")
            else:
                user_parts.append(f"[{msg.type.upper()}]:\n{content}")

        system_prompt = "\n\n".join(system_parts)
        user_message = "\n\n".join(user_parts)

        # Fallback if no user message was provided
        if not user_message and system_prompt:
            user_message = system_prompt
            system_prompt = ""

        return system_prompt, user_message

    async def chat_completion(
        self,
        system_prompt: str,
        user_message: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        response_format: Optional[dict] = None,
    ) -> str:
        """Compatibility method for services expecting a raw chat_completion client."""
        client = self._get_underlying_client()
        temp = temperature if temperature is not None else self.temperature
        tokens = max_tokens if max_tokens is not None else self.max_tokens
        return await client.chat_completion(
            system_prompt=system_prompt,
            user_message=user_message,
            temperature=temp,
            max_tokens=tokens,
            response_format=response_format,
        )

    def _estimate_tokens(self, text: str) -> int:
        """Rough 4-chars/token heuristic for observability metadata."""
        return max(1, len(text) // 4)

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        """Synchronous wrapper for async client execution."""
        return asyncio.run(self._agenerate(messages, stop=stop, run_manager=None, **kwargs))

    async def _agenerate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[AsyncCallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        """Asynchronously calls the underlying LLM client with full observability."""
        start_time = time.monotonic()
        system_prompt, user_message = self._convert_messages(messages)

        client = self._get_underlying_client()
        temp = kwargs.get("temperature", self.temperature)
        tokens = kwargs.get("max_tokens", self.max_tokens)

        logger.info(
            "[PromptogenChatModel] invoking model='%s' provider='%s' prompt_len=%d",
            self.model_name,
            getattr(client, "provider", self.provider or "auto"),
            len(system_prompt) + len(user_message),
        )

        try:
            raw_response = await client.chat_completion(
                system_prompt=system_prompt,
                user_message=user_message,
                temperature=temp,
                max_tokens=tokens,
            )
        except Exception as exc:
            logger.error("[PromptogenChatModel] invocation failed for '%s': %s", self.model_name, exc)
            raise

        elapsed = time.monotonic() - start_time
        prompt_tokens = self._estimate_tokens(system_prompt + user_message)
        completion_tokens = self._estimate_tokens(raw_response)
        total_tokens = prompt_tokens + completion_tokens

        usage_metadata = {
            "input_tokens": prompt_tokens,
            "output_tokens": completion_tokens,
            "total_tokens": total_tokens,
        }

        logger.info(
            "[PromptogenChatModel] completed in %.2fs | model='%s' est_tokens=%d",
            elapsed,
            self.model_name,
            total_tokens,
        )

        ai_message = AIMessage(
            content=raw_response,
            response_metadata={
                "model_name": self.model_name,
                "latency_sec": round(elapsed, 3),
                "token_usage": usage_metadata,
            },
            usage_metadata=usage_metadata,
        )

        generation = ChatGeneration(
            message=ai_message,
            generation_info={
                "model_name": self.model_name,
                "finish_reason": "stop",
            },
        )

        return ChatResult(
            generations=[generation],
            llm_output={
                "model_name": self.model_name,
                "token_usage": usage_metadata,
                "latency_sec": round(elapsed, 3),
            },
        )

    def with_structured_output(
        self,
        schema: Union[Type[BaseModel], dict],
        *,
        include_raw: bool = False,
        **kwargs: Any,
    ) -> Runnable:
        """Returns a Runnable pipeline that calls this model and extracts structured output.
        
        Guarantees robust JSON extraction using multi-strategy JSON repair and Pydantic validation.
        """
        def _parse(output: Any) -> Any:
            raw_content = output.content if hasattr(output, "content") else str(output)
            parsed_data = parse_json_from_llm_response(raw_content)

            if isinstance(schema, type) and issubclass(schema, BaseModel):
                validated = schema.model_validate(parsed_data)
                if include_raw:
                    return {"raw": output, "parsed": validated, "parsing_error": None}
                return validated

            if include_raw:
                return {"raw": output, "parsed": parsed_data, "parsing_error": None}
            return parsed_data

        return self | RunnableLambda(_parse)
