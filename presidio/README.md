# presidio — servicio local de redacción de PII

Servicio HTTP mínimo (FastAPI + Microsoft Presidio + spaCy) que redacta datos personales en
transcripciones en español e inglés antes de guardarlas.

## Instalación (Windows, Python 3.13)

```powershell
cd presidio
python -m venv .venv
.venv\Scripts\python -m pip install --upgrade pip
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python -m spacy download es_core_news_md
.venv\Scripts\python -m spacy download en_core_web_sm
```

## Arranque

```powershell
.venv\Scripts\python app.py          # escucha en 127.0.0.1:5002
$env:PRESIDIO_PORT=5010; .venv\Scripts\python app.py   # otro puerto
```

## API

- `GET /health` → `{"ok": true, "languages": ["es","en"]}`
- `POST /anonymize` con `{"text": "...", "language": "es"|"en"}` (por defecto `es`) →
  `{"text": "<texto redactado>", "entities": [{"type","start","end","score"}]}`
  (`start`/`end` referidos al texto ORIGINAL).

Placeholders: PERSON→`[PERSONA]`, EMAIL_ADDRESS→`[EMAIL]`, IBAN_CODE→`[IBAN]`,
PHONE_NUMBER→`[TELEFONO]`, CREDIT_CARD→`[TARJETA]`, ES_NIF/ES_NIE→`[ID]`, IP_ADDRESS→`[IP]`.
No se redactan lugares, fechas, organizaciones, URLs ni importes.

```bash
curl -s -X POST http://127.0.0.1:5002/anonymize -H "Content-Type: application/json" \
  -d '{"text":"Llámame al 612 345 678, soy Juan Pérez","language":"es"}'
```

## Limitaciones

- La detección de nombres depende del NER de spaCy: puede fallar con nombres en minúscula
  (típico de transcripciones de voz), nombres sueltos poco comunes o nombres que coinciden con palabras.
- El patrón de teléfono español redacta cualquier secuencia de 9 dígitos que empiece por 6-9.
