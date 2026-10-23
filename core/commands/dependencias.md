---
description: Revisa la cadena de suministro — paquetes con malware o typosquatting y skills de terceros maliciosas
---

Uso: `/dependencias` — sin argumento, revisa todo el proyecto.

Pasa el escaner de cadena de suministro de Senzu (supply-scan) sobre el proyecto y explica lo que encuentre. Es la revision a fondo A PETICION; el muro supply-guard ya vigila solo al instalar un paquete y al hacer commit.

1. Localiza el escaner: en un proyecto instalado esta en `.claude/hooks/supply-scan.mjs` (o `.agents/hooks/supply-scan.mjs`); en el repo de Senzu, en `core/hooks/supply-scan.mjs`.
2. Ejecutalo y lee la salida: `node RUTA/supply-scan.mjs --root . --json` (en PowerShell igual). RUTA es la del paso 1.
3. Resume por severidad:
   - high (grave): paquetes en denylist de malware conocido, scripts de instalacion con red o shell (postinstall con curl/bash), skills de terceros con inyeccion de prompt, exfiltracion, ofuscacion o caracteres unicode ocultos, y servidores MCP que descargan y ejecutan.
   - med (aviso): typosquatting (un nombre casi calcado a uno famoso) y URLs con IP literal o acortadas.
4. Por cada hallazgo di QUE es y COMO se arregla: confirmar que el paquete es el real (no uno casi identico), fijar una version segura, quitar el script de instalacion, o revisar y quitar la skill. Si de verdad es un falso positivo y el usuario lo aprueba, el muro deja seguir con SENZU_ALLOW_SUPPLY=1.
5. No instales, actualices ni borres nada tu: propon los cambios y que el usuario decida.

## Al terminar
Si hubo hallazgos high, no sigas con el deploy ni cierres la sesion hasta resolverlos o que el usuario los apruebe. Despues, el paso siguiente del metodo lo dice /siguiente, o /verificar antes de cerrar.
