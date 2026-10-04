"""Servicio local de redacción de PII (Presidio) para transcripciones es/en."""
import os

import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel
from presidio_analyzer import AnalyzerEngine, Pattern, PatternRecognizer, RecognizerRegistry
from presidio_analyzer.nlp_engine import NlpEngineProvider
from presidio_analyzer.predefined_recognizers import (
    CreditCardRecognizer,
    EmailRecognizer,
    EsNieRecognizer,
    EsNifRecognizer,
    IbanRecognizer,
    IpRecognizer,
    PhoneRecognizer,
    SpacyRecognizer,
)
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig, RecognizerResult

LANGUAGES = ["es", "en"]
SCORE_THRESHOLD = 0.5

PLACEHOLDERS = {
    "PERSON": "[PERSONA]",
    "EMAIL_ADDRESS": "[EMAIL]",
    "IBAN_CODE": "[IBAN]",
    "PHONE_NUMBER": "[TELEFONO]",
    "CREDIT_CARD": "[TARJETA]",
    "ES_NIF": "[ID]",
    "ES_NIE": "[ID]",
    "IP_ADDRESS": "[IP]",
}

NLP_CONFIG = {
    "nlp_engine_name": "spacy",
    "models": [
        {"lang_code": "es", "model_name": "es_core_news_md"},
        {"lang_code": "en", "model_name": "en_core_web_sm"},
    ],
    "ner_model_configuration": {
        # Solo nos interesan personas; el resto de etiquetas NER se ignoran
        "model_to_presidio_entity_mapping": {"PER": "PERSON", "PERSON": "PERSON"},
        "low_confidence_score_multiplier": 0.4,
        "low_score_entity_names": [],
        "labels_to_ignore": ["LOC", "GPE", "ORG", "MISC", "NORP", "FAC", "DATE", "TIME",
                             "MONEY", "PERCENT", "QUANTITY", "CARDINAL", "ORDINAL",
                             "PRODUCT", "EVENT", "WORK_OF_ART", "LAW", "LANGUAGE"],
    },
}

# Teléfonos españoles: 9 dígitos empezando por 6-9, con prefijo +34/0034 opcional
ES_PHONE = PatternRecognizer(
    supported_entity="PHONE_NUMBER",
    supported_language="es",
    name="EsPhoneRecognizer",
    patterns=[Pattern("es_phone", r"(?<![\w+])(?:(?:\+|00)34[\s.-]?)?[6789](?:[\s.-]?\d){8}(?!\d)", 0.6)],
    context=["teléfono", "telefono", "móvil", "movil", "llamar", "llámame", "número", "whatsapp"],
)


def build_registry(nlp_engine) -> RecognizerRegistry:
    registry = RecognizerRegistry(supported_languages=LANGUAGES)
    for lang in LANGUAGES:
        registry.add_recognizer(SpacyRecognizer(supported_language=lang, supported_entities=["PERSON"]))
        registry.add_recognizer(EmailRecognizer(supported_language=lang))
        registry.add_recognizer(IbanRecognizer(supported_language=lang))
        registry.add_recognizer(CreditCardRecognizer(supported_language=lang))
        registry.add_recognizer(IpRecognizer(supported_language=lang))
        registry.add_recognizer(PhoneRecognizer(supported_language=lang, supported_regions=("ES", "US", "GB", "MX", "AR", "CO")))
        # DNI/NIE también en inglés (un hablante puede dictarlo igual)
        registry.add_recognizer(EsNifRecognizer(supported_language=lang))
        registry.add_recognizer(EsNieRecognizer(supported_language=lang))
    registry.add_recognizer(ES_PHONE)
    return registry


nlp_engine = NlpEngineProvider(nlp_configuration=NLP_CONFIG).create_engine()
analyzer = AnalyzerEngine(nlp_engine=nlp_engine, registry=build_registry(nlp_engine), supported_languages=LANGUAGES)
anonymizer = AnonymizerEngine()
OPERATORS = {k: OperatorConfig("replace", {"new_value": v}) for k, v in PLACEHOLDERS.items()}


def resolve_overlaps(results):
    # Nos quedamos con la detección de mayor score (y mayor longitud) en cada solape
    kept = []
    for r in sorted(results, key=lambda r: (-r.score, -(r.end - r.start))):
        if all(r.end <= k.start or r.start >= k.end for k in kept):
            kept.append(r)
    return sorted(kept, key=lambda r: r.start)


app = FastAPI(title="presidio-redactor")


class AnonymizeRequest(BaseModel):
    text: str = ""
    language: str = "es"


@app.get("/health")
def health():
    return {"ok": True, "languages": LANGUAGES}


@app.post("/anonymize")
def anonymize(req: AnonymizeRequest):
    lang = req.language if req.language in LANGUAGES else "es"
    if not req.text or not req.text.strip():
        return {"text": req.text, "entities": []}
    results = analyzer.analyze(
        text=req.text,
        language=lang,
        entities=list(PLACEHOLDERS),
        score_threshold=SCORE_THRESHOLD,
    )
    results = resolve_overlaps(results)
    redacted = anonymizer.anonymize(
        text=req.text,
        analyzer_results=[RecognizerResult(r.entity_type, r.start, r.end, r.score) for r in results],
        operators=OPERATORS,
    )
    return {
        "text": redacted.text,
        "entities": [
            {"type": r.entity_type, "start": r.start, "end": r.end, "score": round(r.score, 2)}
            for r in results
        ],
    }


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=int(os.environ.get("PRESIDIO_PORT", "5002")))
