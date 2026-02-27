"""
Converters package — prompt obfuscation / encoding converters.

Each converter transforms prompt text to bypass safety filters
through encoding, translation, or reformatting.
"""

from __future__ import annotations

from app.engine.converters.base import BaseConverter
from app.engine.converters.base64_converter import Base64Converter
from app.engine.converters.rot13_converter import ROT13Converter
from app.engine.converters.unicode_converter import UnicodeConverter
from app.engine.converters.payload_split import PayloadSplitConverter
from app.engine.converters.leetspeak import LeetspeakConverter
from app.engine.converters.translation import TranslationConverter
from app.engine.converters.jailbreak_wrapper import JailbreakWrapperConverter

# Registry: converter_name → Converter class
CONVERTER_REGISTRY: dict[str, type[BaseConverter]] = {
    "base64": Base64Converter,
    "rot13": ROT13Converter,
    "unicode_substitution": UnicodeConverter,
    "unicode": UnicodeConverter,
    "payload_split": PayloadSplitConverter,
    "leetspeak": LeetspeakConverter,
    "translation": TranslationConverter,
    "jailbreak_wrapper": JailbreakWrapperConverter,
}


def get_converter(name: str) -> BaseConverter:
    """Get converter instance by name."""
    cls = CONVERTER_REGISTRY.get(name)
    if cls is None:
        raise ValueError(f"Unknown converter: {name}")
    return cls()


def get_all_converters() -> list[BaseConverter]:
    """Get instances of all available converters."""
    return [cls() for cls in CONVERTER_REGISTRY.values()]


__all__ = [
    "BaseConverter",
    "CONVERTER_REGISTRY",
    "get_converter",
    "get_all_converters",
]
