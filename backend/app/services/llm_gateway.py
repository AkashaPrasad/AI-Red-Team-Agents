"""
LLM Gateway — unified interface for calling any configured model provider.

All LLM calls (judge, augmentation, scope analysis, firewall) route through
this gateway to centralise credential management, error handling, and logging.
"""

from __future__ import annotations

from typing import Any

import httpx
from openai import AsyncOpenAI

from app.config import settings
from app.services.encryption import decrypt_value


class LLMGateway:
    """Thin wrapper that routes LLM calls to the appropriate provider."""

    def __init__(
        self,
        provider_type: str,
        encrypted_api_key: str | None = None,
        endpoint_url: str | None = None,
        model: str | None = None,
        *,
        api_key: str | None = None,
    ) -> None:
        self.provider_type = provider_type
        # Accept either an already-decrypted key or an encrypted one
        if api_key:
            self.api_key = api_key
        elif encrypted_api_key:
            self.api_key = decrypt_value(encrypted_api_key)
        else:
            raise ValueError("Either api_key or encrypted_api_key is required")
        self.endpoint_url = endpoint_url
        self._model = model  # raw value; each provider picks its own default

    @property
    def model(self) -> str:
        """Return the configured model, falling back to a provider-appropriate default."""
        if self._model:
            return self._model
        if self.provider_type == "groq":
            return "llama-3.3-70b-versatile"
        return settings.llm_judge_model

    # ----- public API ---------------------------------------------------------

    async def chat(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float | None = None,
        max_tokens: int | None = None,
        response_format: dict | None = None,
    ) -> str:
        """Send a chat-completion request and return the assistant content."""
        temp = temperature if temperature is not None else settings.llm_judge_temperature
        tokens = max_tokens or settings.llm_judge_max_tokens

        if self.provider_type == "openai":
            return await self._call_openai(messages, temp, tokens, response_format)
        elif self.provider_type == "azure_openai":
            return await self._call_azure(messages, temp, tokens, response_format)
        elif self.provider_type == "groq":
            return await self._call_groq(messages, temp, tokens, response_format)
        else:
            raise ValueError(f"Unsupported provider type: {self.provider_type}")

    async def validate_credentials(self) -> tuple[bool, str | None]:
        """Lightweight probe to verify credentials are working.
        
        Returns (is_valid, error_message) tuple.
        """
        try:
            await self.chat(
                [{"role": "user", "content": "Say OK"}],
                max_tokens=5,
            )
            return True, None
        except Exception as exc:
            return False, str(exc)

    # ----- private ------------------------------------------------------------

    async def _call_openai(
        self,
        messages: list[dict[str, str]],
        temperature: float,
        max_tokens: int,
        response_format: dict | None,
    ) -> str:
        client = AsyncOpenAI(
            api_key=self.api_key,
            timeout=httpx.Timeout(settings.llm_request_timeout, connect=10),
        )
        kwargs: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if response_format:
            kwargs["response_format"] = response_format
        response = await client.chat.completions.create(**kwargs)
        return response.choices[0].message.content or ""

    async def _call_groq(
        self,
        messages: list[dict[str, str]],
        temperature: float,
        max_tokens: int,
        response_format: dict | None,
    ) -> str:
        """Groq uses an OpenAI-compatible API."""
        client = AsyncOpenAI(
            api_key=self.api_key,
            base_url=self.endpoint_url or "https://api.groq.com/openai/v1",
            timeout=httpx.Timeout(settings.llm_request_timeout, connect=10),
        )
        kwargs: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if response_format:
            kwargs["response_format"] = response_format
        response = await client.chat.completions.create(**kwargs)
        return response.choices[0].message.content or ""

    async def _call_azure(
        self,
        messages: list[dict[str, str]],
        temperature: float,
        max_tokens: int,
        response_format: dict | None,
    ) -> str:
        if not self.endpoint_url:
            raise ValueError("Azure OpenAI requires an endpoint_url")
        client = AsyncOpenAI(
            api_key=self.api_key,
            base_url=self.endpoint_url,
            timeout=httpx.Timeout(settings.llm_request_timeout, connect=10),
        )
        kwargs: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if response_format:
            kwargs["response_format"] = response_format
        response = await client.chat.completions.create(**kwargs)
        return response.choices[0].message.content or ""
