---
description: Instala o actualiza Senzu en este proyecto (web, backend, front, agente de IA, librería o a medida)
---

Uso: `/instalar [stack opcional, p. ej. "laravel"]` — el argumento es opcional; si no llega, detecta el stack.

Aplica la skill `instalar-proyecto` paso a paso: localizar o clonar el paquete, detectar el stack,
confirmar con el usuario, preguntar qué es el proyecto (web, backend, front, agente de IA, librería o elegir a medida), ejecutar el
instalador y pedir una sesión nueva. Si el usuario indicó un stack tras el comando, úsalo.
