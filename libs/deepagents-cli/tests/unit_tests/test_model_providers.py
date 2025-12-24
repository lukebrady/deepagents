"""Tests for model provider detection and creation."""

import importlib
from unittest.mock import patch

import pytest

from deepagents_cli import config as config_module


@pytest.fixture(autouse=True)
def reload_config_after_test():
    """Reload config after each test to reset global settings."""
    yield
    importlib.reload(config_module)


def test_detect_provider_supports_grok_models():
    """X.AI Grok family models should auto-detect as xai provider."""
    assert config_module._detect_provider("grok-4-1-fast-reasoning") == "xai"
    assert config_module._detect_provider("GROK-CODE-FAST-1") == "xai"
    assert (
        config_module._detect_provider("xai:grok-4-1-fast-non-reasoning") == "xai"
    )


def test_create_model_prefers_xai_when_available(monkeypatch):
    """XAI_API_KEY should take precedence and instantiate ChatXAI."""
    monkeypatch.setenv("XAI_API_KEY", "test-key")
    monkeypatch.setenv("XAI_MODEL", "grok-code-fast-1")
    for key in ("OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GOOGLE_API_KEY"):
        monkeypatch.delenv(key, raising=False)

    reloaded = importlib.reload(config_module)

    with patch("langchain_xai.ChatXAI") as mock_chat_xai:
        model = reloaded.create_model()

    mock_chat_xai.assert_called_once_with(model="grok-code-fast-1", temperature=0)
    assert model is mock_chat_xai.return_value
    assert reloaded.settings.model_provider == "xai"
    assert reloaded.settings.model_name == "grok-code-fast-1"
