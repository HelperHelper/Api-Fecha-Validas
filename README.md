# Business Days API (TypeScript)

API that calculates business dates/times in Colombia (America/Bogota) and returns result in UTC.

---

# API de Días Hábiles (TypeScript)

API que calcula fechas/horas hábiles en Colombia (zona horaria **America/Bogota**) y devuelve el resultado en UTC.

---

## 📑 Table of Contents / Índice de Contenidos

- [English Version](#english-version)
  - [Requirements](#requirements)
  - [Installation](#installation)
  - [Run (development)](#run-development)
  - [Build & Run (production)](#build--run-production)
  - [Endpoint](#endpoint)
  - [Response (success)](#response-success)
  - [Errors (example)](#errors-example)
  - [Notes](#notes)
  - [Examples (curl)](#examples-curl)
- [Versión en Español](#versión-en-español)
  - [Requisitos](#requisitos)
  - [Instalación](#instalación)
  - [Ejecución (desarrollo)](#ejecución-desarrollo)
  - [Compilar y Ejecutar (producción)](#compilar-y-ejecutar-producción)
  - [Endpoint](#endpoint-1)
  - [Respuesta (éxito)](#respuesta-éxito)
  - [Errores (ejemplo)](#errores-ejemplo)
  - [Notas](#notas-1)
  - [Ejemplos (curl)](#ejemplos-curl)

---

## English Version

### Requirements
- Node.js 18+ (recommended)
- npm

### Installation
```bash
cd business-days-api
npm install
```

### Run (development)
```bash
npm run dev
```

This uses `ts-node` to run the TypeScript directly (no build step).

### Build & Run (production)
```bash
npm run build
npm start
```

### Endpoint
`GET /` (root)

Query parameters (exact names required):
- `days` (optional, integer >= 0)
- `hours` (optional, integer >= 0)
- `date` (optional, UTC ISO8601 **with trailing Z**) — if provided will be used as the starting point

At least one of `days` or `hours` must be provided.

### Response (success)
Content-Type: application/json  
HTTP 200
```json
{ "date": "2025-08-01T14:00:00Z" }
```

### Errors (example)
HTTP 400 / 503:
```json
{ "error": "InvalidParameters", "message": "Detail of the error" }
```

### Notes
- The service attempts to fetch the official holidays JSON from:  
  `https://content.capta.co/Recruitment/WorkingDays.json`  
  on first request and caches it in memory. If the fetch fails, the endpoint will return 503 with a clear error message.
- All time calculations are done in `America/Bogota` timezone using `luxon`. The final result is returned in UTC with `Z`.

### Examples (curl)
```bash

# Add 1 business hour from now (Colombia time):
curl "http://localhost:3000/?hours=1"

# Provide a date (UTC with Z) and add days+hours
curl "http://localhost:3000/?date=2025-04-10T15:00:00.000Z&days=5&hours=4"
```


## Versión en Español

### Requisitos
- Node.js 18+ (recomendado)
- npm

### Instalación
```bash
cd business-days-api
npm install
```

### Ejecución (desarrollo)
```bash
npm run dev
```

Esto utiliza `ts-node` para ejecutar directamente TypeScript (sin paso de compilación).

### Compilar y Ejecutar (producción)
```bash
npm run build
npm start
```

### Endpoint
`GET /` (raíz)

Parámetros de consulta (nombres exactos requeridos):
- `days` (opcional, entero >= 0)
- `hours` (opcional, entero >= 0)
- `date` (opcional, en formato UTC ISO8601 **con Z al final**) — si se proporciona, se usará como punto de inicio

Se debe enviar al menos uno de los parámetros: `days` o `hours`.

### Respuesta (éxito)
Content-Type: application/json  
HTTP 200
```json
{ "date": "2025-08-01T14:00:00Z" }
```

### Errores (ejemplo)
HTTP 400 / 503:
```json
{ "error": "InvalidParameters", "message": "Detalle del error" }
```

### Notas
- El servicio intenta obtener el JSON oficial de festivos desde:  
  `https://content.capta.co/Recruitment/WorkingDays.json`  
  en la primera petición y lo guarda en caché en memoria.  
  Si la descarga falla, el endpoint responderá con 503 y un mensaje de error claro.  
- Todos los cálculos de tiempo se realizan en la zona horaria `America/Bogota` utilizando `luxon`.  
  El resultado final siempre se devuelve en UTC con `Z`.

### Ejemplos (curl)
```bash

# Añadir 1 hora laboral a partir de ahora (hora de Colombia):
curl "http://localhost:3000/?hours=1"

# Indique una fecha (UTC con Z) y añada días + horas.
curl "http://localhost:3000/?date=2025-04-10T15:00:00.000Z&days=5&hours=4"
```
