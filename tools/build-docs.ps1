#requires -Version 5.1
<#
.SYNOPSIS
  Genera la documentacion derivada de las fuentes de verdad (registro, core\commands, core\hooks, stacks\):
    - docs\skills.md    (las 41 skills por grupo, con enrutamiento)
    - docs\comandos.md  (los comandos slash con flujos tipicos)
    - docs\hooks.md     (muros y hooks, con escapes)
    - docs\stacks.md    (stacks, perfiles de front, bundles)
    - REFERENCIA.md     (todo lo anterior en UNA pagina)
.DESCRIPTION
  El README es el hub que enlaza estos docs. Se regeneran en el pre-commit (como plugins/):
  editar las fuentes, nunca estos archivos a mano.
#>
. (Join-Path $PSScriptRoot '_lib.ps1')
$root = Get-StandardsRoot
Ensure-Dir (Join-Path $root 'docs')

function Clean-Keywords([string]$k, [int]$Max = 8) {
    # Convierte la regex de keywords en una muestra legible de señales ("landing, web, hero, ...").
    if (-not $k) { return '' }
    $s = $k -replace '\(\?i\)', '' -replace '\\b', ''
    $s = $s.Trim()
    if ($s.StartsWith('(') -and $s.EndsWith(')')) { $s = $s.Substring(1, $s.Length - 2) }
    # colapsar grupos anidados a su primera alternativa: test(s|ing|ea)? -> tests · revis(a|ar|ion) -> revisa
    for ($i = 0; $i -lt 3; $i++) { $s = $s -replace '\(([^()|]*)\|[^()]*\)\??', '$1' }
    $clean = @(); $parts = @($s -split '\|')
    foreach ($p in $parts) {
        $t = $p -replace '\(\?[=!][^\)]*\)', '' -replace '\[([a-zA-Z0-9áéíóúñ])[^\]]*\]', '$1' -replace '\\w\*?', '' -replace '\\s\+?', ' ' -replace '\\[.d]\+?', ' ' -replace '[\\^\$\(\)\?\:\+\*\{\}]', ''
        $t = ($t -replace '\s+', ' ').Trim(' ', ',', '.')
        if ($t -and $t.Length -ge 3 -and $t.Length -le 28 -and $clean -notcontains $t) { $clean += $t }
        if ($clean.Count -ge $Max) { break }
    }
    return ($clean -join ', ') + $(if ($parts.Count -gt $Max) { '…' } else { '' })
}

$GEN = '<!-- GENERADO por tools/build-docs.ps1 desde core/skills-registry.json, core/commands/, core/hooks/ y stacks/. NO editar a mano. -->'

# ============================================================ SKILLS + ENRUTAMIENTO
function Get-SkillsBody {
    $L = New-Object System.Collections.Generic.List[string]
    $L.Add('El agente decide solo, en tres capas automáticas:')
    $L.Add('1. **Al arrancar la sesión** (hook SessionStart): estado del proyecto (stack, versiones+EOL, si es nuevo o')
    $L.Add('   existente, design system, plan, devlog, convenciones) + puertas de entrada: UI → `ui-ux-pro-max` ·')
    $L.Add('   lógica → `code-quality` · proyecto nuevo → `project-planner` · duda → `skill-router`.')
    $L.Add('2. **En cada petición** (hook UserPromptSubmit): las *señales* de las tablas de abajo sugieren la skill')
    $L.Add('   (máx. 2, una vez por skill y sesión). Los *entrypoints* van primero; a igual match gana la prioridad mayor.')
    $L.Add('3. **Tablas de activación** (`skill-router` y `front-activation`, generadas del registro): el agente las')
    $L.Add('   consulta cuando duda; `references/decision-trees.md` tiene los árboles de decisión completos.')
    $L.Add('')
    $total = @($script:Registry.skills).Count
    $L.Add(('Total: **{0} skills**. Fuente única: `core/skills-registry.json` (grupo, cuándo, señales, prioridad, dependencias).' -f $total))
    $L.Add('')
    foreach ($g in @($script:Registry.groups.PSObject.Properties.Name)) {
        $skills = @($script:Registry.skills | Where-Object { $_.group -eq $g } | Sort-Object -Property @{Expression = { [bool]$_.entrypoint }; Descending = $true }, @{Expression = { $_.priority }; Descending = $true }, name)
        if (-not $skills.Count) { continue }
        $label = $script:Registry.groups.$g
        $L.Add(('### {0} (grupo `{1}`, {2} skill{3})' -f $label, $g, $skills.Count, $(if ($skills.Count -eq 1) { '' } else { 's' })))
        $L.Add('')
        $L.Add('| Skill | Prio | Cuándo usarla | Señales que la activan (muestra) |')
        $L.Add('|---|---|---|---|')
        foreach ($s in $skills) {
            $name = if ($s.entrypoint) { "**``$($s.name)``** (entrada)" } else { "``$($s.name)``" }
            $L.Add("| $name | $($s.priority) | $($s.when) | $(Clean-Keywords $s.keywords) |")
        }
        $L.Add('')
    }
    return $L
}

# ============================================================ COMANDOS
function Get-CommandsBody {
    $L = New-Object System.Collections.Generic.List[string]
    $L.Add('Atajos opcionales: hablar en llano activa lo mismo vía enrutador. `plan/siguiente/verificar/desplegar/adoptar`')
    $L.Add('se instalan SIEMPRE; el resto solo en stacks con perfil de front.')
    $L.Add('')
    $L.Add('| Comando | Argumento | Qué hace |')
    $L.Add('|---|---|---|')
    $always = @('plan', 'siguiente', 'verificar', 'desplegar', 'adoptar')
    $cmds = Get-ChildItem (Join-Path $root 'core\commands') -Filter *.md | Sort-Object { $always.IndexOf($_.BaseName) -lt 0 }, { $always.IndexOf($_.BaseName) }, Name
    foreach ($f in $cmds) {
        $txt = Read-Utf8 $f.FullName
        $desc = ''; $hint = ''
        if ($txt -match '(?s)^---(.*?)---') {
            $fmBlock = $Matches[1]
            if ($fmBlock -match '(?m)^description:\s*(.+)$') { $desc = $Matches[1].Trim() }
        }
        # La pista de uso vive en la linea "Uso: `/cmd <args>`" (sin argument-hint: Codex no migra comandos con argumentos)
        if ($txt -match '(?m)^Uso: `/\S+\s*([^`]*)`') { $hint = $Matches[1].Trim()
        }
        $L.Add("| ``/$($f.BaseName)`` | $hint | $desc |")
    }
    $L.Add('')
    $L.Add('### Flujos típicos')
    $L.Add('- **Proyecto nuevo con web**: `/brief` (entrevista en llano) → `/propuestas` (blueprint + maquetas A/B) →')
    $L.Add('  `/design-system` → construir con checkpoints → `/revisar-ui` → `/lanzar` → `/desplegar`.')
    $L.Add('- **Cualquier feature**: `/plan` → `/siguiente` (una tarjeta cada vez) → `/verificar` antes de cerrar.')
    $L.Add('- **Proyecto nuevo sin interfaz** (API, backend, agente): `/plan` directamente; `/brief` es para lo que tiene pantallas.')
    $L.Add('- **Proyecto heredado**: `/adoptar` la primera sesión (analiza y sella sus convenciones) y después lo normal.')
    $L.Add('- `/instalar` y `/adoptar` los exige el muro `arranque-guard` antes de la primera línea de código; plan y brief no se imponen: si no está claro qué se hace, el agente pregunta.')
    $L.Add('- **Efecto concreto** ("quiero un parallax/marquee/cursor"): `/efecto <nombre>` va directo al catálogo con receta y coste móvil.')
    return $L
}

# ============================================================ HOOKS / MUROS
function Get-HooksBody {
    $L = New-Object System.Collections.Generic.List[string]
    $L.Add('Hooks en Node (`.mjs`, agnósticos de OS: funcionan igual en Windows/macOS/Linux). Los que BLOQUEAN salen')
    $L.Add('con exit 2 y el motivo; el resto solo informa. Solo Claude Code ejecuta hooks: en Codex/Cursor/Windsurf el')
    $L.Add('trabajo lo hacen las tablas de activación de las reglas generadas y los githooks (`sync.ps1 -GitHooks`).')
    $L.Add('')
    $hookInfo = [ordered]@{
        'session-start.mjs'        = @('SessionStart', 'Inyecta estado: si Senzu está DESACTUALIZADO (qué hacer y qué se pierde, de core/novedades.json), stack/perfil, el SIGUIENTE PASO del método que falta (/instalar, /adoptar; sin plan, saber qué se hace o preguntarlo), idioma, diario propio detectado, versiones con aviso EOL, convenciones adoptadas, git, design system, plan, devlog y protocolo de skills.')
        'prompt-router.mjs'        = @('UserPromptSubmit', 'Sugiere la skill que encaja con la petición (señales de docs/skills.md), una vez por skill y sesión.')
        'guard.mjs'                = @('PreToolUse Bash/PowerShell', 'Mira lo que se EJECUTA, no lo citado (mensajes de commit, heredocs a un archivo, echo, grep). BLOQUEA: git push a una rama principal, forzado o sin ver a qué rama va (a las de trabajo, sí), escribir, mover, borrar o restaurar las convenciones selladas desde la terminal (sin escape para el agente), destructivos de BD/git, rm -rf, deploy a prod sin aprobación (escape `SENZU_ALLOW_DEPLOY=1`), generadores de logos con logo ya elegido (`SENZU_ALLOW_LOGO=1`), jQuery/Bootstrap (`SENZU_ALLOW_LIB=1`), devops peligroso (curl\|bash, chmod 777, dd, mkfs, docker prune, parar servicios, vaciar firewall, crontab -r); commits: rama protegida, Conventional ≤72, sin co-autores.')
        'supply-guard.mjs'         = @('PreToolUse Bash/PowerShell', 'Muro de cadena de suministro. En un comando de instalación (npm/pip/composer…) mira los NOMBRES de paquete (typosquatting, denylist de malware conocido) antes de que entren; al hacer `git commit` escanea lo que entra (manifests de dependencias, archivos de skills/plugins y `.mcp.json`) buscando scripts de instalación con red/shell, inyección de prompt, exfiltración (lee secretos y abre red), ofuscación (eval/base64/hex), caracteres unicode ocultos y servidores MCP que descargan y ejecutan. BLOQUEA lo grave, AVISA del resto. «Citar no es hacer»: mira lo que se ejecuta, no el texto citado, y también DENTRO de un script que el comando ejecuta (bash x.sh, python x.py…). Offline y determinista (listas en `core/hooks/data/`). No se puede apagar. Escape tras verificar: `SENZU_ALLOW_SUPPLY=1`.')
        'pentest-guard.mjs'        = @('PreToolUse Bash/PowerShell', 'Muro de ALCANCE de pentesting. BLOQUEA ejecutar herramientas de seguridad ofensiva: escaneo de red (nmap, masscan, hping3), descubrimiento y fuzzing web (gobuster, ffuf, nikto, wpscan, nuclei, wfuzz), inyección y explotación (sqlmap, commix, metasploit/msfconsole/msfvenom), fuerza bruta de credenciales (hydra, medusa, ncrack), cracking (hashcat, john) y enumeración o post-explotación de red o AD (enum4linux, crackmapexec, responder, evil-winrm, wifi). «Citar no es hacer»: mira lo que se ejecuta, no el texto citado, y también DENTRO de un script que el comando ejecuta (bash x.sh, ./x.sh…). Senzu ayuda con pentesting AUTORIZADO: con permiso por escrito y alcance documentados en el devlog, escape `SENZU_ALLOW_PENTEST=1`. No se puede apagar.')
        'protect-files.mjs'        = @('PreToolUse Edit/Write', 'BLOQUEA editar: generados por Senzu, secretos (.env, *.pem, credentials), dependencias/artefactos, migraciones versionadas, conventions.md/json sellados (no se puede apagar), maestros del logo elegido (logos/final/) y `protectedPaths` del proyecto.')
        'secrets-guard.mjs'        = @('PreToolUse Edit/Write', 'BLOQUEA escribir credenciales reales (AWS, GitHub, Stripe, OpenAI/Anthropic, PEM, JWT, cadenas con password); ignora placeholders.')
        'code-hygiene.mjs'         = @('PreToolUse Edit/Write', 'BLOQUEA introducir (no en scripts de la carpeta temporal del agente): console.log/debugger/dd()/var_dump/ray, términos vetados en `gustos.md` §No, marcadores de conflicto de git, `.only`/`.skip`/xit en tests, y la lista negra anti-IA (badges de disponibilidad, numeración de secciones). Escape puntual: comentario `senzu-allow`.')
        'conventions-guard.mjs'    = @('PreToolUse Edit/Write', 'BLOQUEA código que viole las reglas ejecutables de `conventions.json` (/adoptar): la convención del proyecto gana. No se puede apagar. La ruta se normaliza (C:\, C:/, /c/ de Git Bash, relativa) antes de aplicar las reglas.')
        'arquitectura-guard.mjs'   = @('PreToolUse Edit/Write', 'Solo si el proyecto DECLARA su arquitectura (senzu/arquitectura/capas.json, de /adoptar o /plan). BLOQUEA lo que introduce: una capa que usa otra que no puede (dominio con framework u ORM, aplicación con HTTP), un contexto de DDD que usa otro por dentro y el controlador que habla con la base de datos. AVISA del array de la petición pasado en vez de un DTO y del código nuevo fuera de las carpetas declaradas. Imports reales: use + PSR-4, import + alias de tsconfig, módulos de Python. No se puede apagar.')
        'backend-guard.mjs'        = @('PreToolUse Edit/Write', 'BLOQUEA introducir: migraciones destructivas en la parte que se aplica (borrar o renombrar columnas o tablas: patrón expandir → contraer), `env()` fuera de `config/` en Laravel, datos personales en logs (request completa, cuerpos, contraseñas o tokens), migraciones sin down() honesto, asignación masiva (la request entera al modelo) y errores tragados (catch vacío, except: pass). AVISA de varias escrituras en la misma función sin transacción y de consultas en bucle (N+1). Escape: `senzu-allow` con el motivo.')
        'security-guard.mjs'       = @('PreToolUse Edit/Write', 'AVISA (no bloquea; una vez por archivo y sesión) de puntos de inyección que se introducen en el código: XSS (dangerouslySetInnerHTML, v-html, set:html, {@html}, Blade `{!! $x !!}`, innerHTML/insertAdjacentHTML/document.write con una variable), SQL injection (Prisma `$queryRawUnsafe`, `DB::raw`/`whereRaw` de Laravel con `$`, `execute` con f-string o concatenación en Python) e inyección de comando o ejecución dinámica (exec/execSync/shell_exec/os.system con variable, `shell=True`, `eval`). Solo mira lo introducido y el código sin comentarios. Escape por línea: `senzu-allow`.')
        'pool-guard.mjs'           = @('PreToolUse Edit/Write', 'AVISA (no bloquea; una vez por archivo y sesión) de lo que agota el pool de conexiones a la BD en Node/TS y Python: `new PrismaClient()` sin singleton global (en serverless abre una conexión por invocación), y crear un pool/cliente/engine dentro de código por petición (rutas, controladores, endpoints). PHP-FPM queda fuera. Receta: `code-quality/references/database-design.md` (§Conexiones y pool).')
        'back-skill-reminder.mjs'  = @('PreToolUse Edit/Write (backend)', 'Primera edición de backend en la sesión: recuerda la receta del stack, las convenciones selladas y la versión real del framework. No bloquea.')
        'depurar-coach.mjs'        = @('PostToolUse Bash/PowerShell', 'Si falla un test, build o verificación que se EJECUTA (no al leer un archivo de test), activa el método de la skill depurar (reproducir, test que falla, hipótesis, acotar, arreglar la causa). Como mucho una vez cada 20 minutos.')
        'front-skill-reminder.mjs' = @('PreToolUse Edit/Write (front)', 'Primera edición de UI: BLOQUEA una vez si no hay design system NI brief (obliga a preguntar); después recuerda ui-ux-pro-max, el set de iconos del MASTER y las reglas duras de UI.')
        'format-on-save.mjs'       = @('PostToolUse', 'Formatea el archivo guardado con la herramienta del stack (Pint/Prettier/ruff) si existe. Nunca bloquea.')
        'edit-tracker.mjs'         = @('PostToolUse', 'Apunta cada archivo que toca la sesión (para cierre-limpio) y marca que se editó código (stop-guard exige verificación posterior).')
        'memoria-viva.mjs'         = @('UserPromptSubmit', 'Si dices una regla o una corrección («no vuelvas a…», «te dije…», «a partir de ahora…»), pide al agente apuntarla en la memoria del proyecto o en la tuya (todos tus proyectos). Guarda tus últimas peticiones para /retomar.')
        'memoria-archivo.mjs'      = @('PreToolUse Edit/Write', 'La primera vez que se va a tocar un archivo, le pasa al agente lo que la memoria y el devlog dicen de él (decisiones, lo que no funcionó). No bloquea.')
        'estado-sesion.mjs'        = @('Stop · PreCompact', 'Guarda en qué se quedó la sesión (peticiones, archivos, lo que quedó sin commitear, tarea en curso) para la siguiente y para /retomar. Al cerrar, BLOQUEA una vez si diste una regla o corrección y no quedó apuntada en la memoria.')
        'arranque-guard.mjs'       = @('PreToolUse Edit/Write (código y manifiestos)', 'BLOQUEA, una vez por paso y sesión, la primera edición de código si falta instalar Senzu o /adoptar (proyecto con código sin convenciones). Sin plan NO bloquea: recuerda que hay que saber qué se va a hacer y, si no está claro, hablarlo con el usuario; /plan o /brief solo si es grande. Nunca para senzu/, CLAUDE.md, AGENTS.md ni la documentación. El usuario puede quitar un paso con init.mjs --omitir-paso.')
        'tarjeta-guard.mjs'        = @('PreToolUse Edit/Write (senzu/plan/PLAN.md)', 'BLOQUEA pasar una tarjeta a [done] sin «Verificado:» (la evidencia real), «Cumple:» (cómo cumple su «Para qué»: el objetivo del usuario o el hallazgo de la auditoría que resuelve) y un «Devlog:» que exista. Vale igual para las tarjetas del plan y las de /auditar.')
        'feature-guard.mjs'        = @('Stop · PostToolUse Bash', 'Backend. BLOQUEA el cierre (una vez por conjunto de archivos) si la sesión tocó código de backend y ningún test, si creó o tocó migraciones sin ejecutarlas o sin probar su rollback (apunta los migrate que se ejecutan), o si el código usa variables de entorno nuevas que no están en .env.example.')
        'cierre-limpio.mjs'        = @('Stop', 'BLOQUEA el cierre (una vez) si dejas sin commitear archivos que tocaste en esta sesión: o terminas y commiteas (en una rama), o commiteas y dices qué falta. Los cambios que NO tocaste (otro agente como Codex, otra sesión o el usuario) solo los avisa: no se commitean ni se descartan sin preguntar.')
        'stop-guard.mjs'           = @('Stop', 'BLOQUEA el cierre (una vez) si falta: devlog del día, verify-build tras editar código, o ui-verify móvil tras tocar UI. Además avisa de assets pesados añadidos en las últimas 24 h (imágenes de más de 500 KB, fuentes sin woff2, vídeos grandes).')
        'pre-compact.mjs'          = @('PreCompact', 'Re-inyecta lo esencial (stack, versiones, design system, plan, reglas) para sobrevivir a la compactación de contexto.')
        'session-end.mjs'          = @('SessionEnd', 'Limpia los marcadores de sesión.')
        'lib.mjs'                  = $null
        'messages.mjs'             = $null
        'supply-scan.mjs'          = $null
        'secret-patterns.mjs'      = $null
    }
    $L.Add('| Hook | Evento | Qué hace |')
    $L.Add('|---|---|---|')
    foreach ($f in (Get-ChildItem (Join-Path $root 'core\hooks') -Filter *.mjs | Sort-Object { @($hookInfo.Keys).IndexOf($_.Name) })) {
        if (-not $hookInfo.Contains($f.Name)) { throw "build-docs: hook '$($f.Name)' sin descripcion en hookInfo (añadela)" }
        $info = $hookInfo[$f.Name]
        if ($null -eq $info) { continue }   # lib.mjs
        $L.Add("| ``$($f.Name)`` | $($info[0]) | $($info[1]) |")
    }
    $L.Add('')
    $L.Add('### Escapes (siempre con aprobación explícita del usuario, documentada en el devlog)')
    $L.Add('- `SENZU_ALLOW_DEPLOY=1` — deploy a producción tras la aprobación del checklist `/desplegar`.')
    $L.Add('- `SENZU_ALLOW_LIB=1` — instalar una librería vetada (jQuery/Bootstrap) si el usuario lo pide.')
    $L.Add('- Comentario `senzu-allow` en la línea — excepción puntual de code-hygiene (script CLI con console.log, test .skip justificado, patrón anti-IA pedido por su nombre).')
    $L.Add('- Convenciones selladas: se cambian borrando `conventions.*` y re-ejecutando `/adoptar` (decisión del usuario).')
    return $L
}

# ============================================================ STACKS Y BUNDLES
function Get-StacksBody {
    $L = New-Object System.Collections.Generic.List[string]
    $L.Add('Cada stack define systemprompt evolutivo, mejores prácticas, prohibiciones, comandos de verificación,')
    $L.Add('formateadores, permisos y (en los de front) el perfil del buscador de diseño. `init-project.ps1 -Stack <n>`.')
    $L.Add('')
    $L.Add('| Stack | Qué es | Perfil de front |')
    $L.Add('|---|---|---|')
    foreach ($d in (Get-ChildItem (Join-Path $root 'stacks') -Directory | Sort-Object Name)) {
        $meta = (Read-Utf8 (Join-Path $d.FullName 'stack.json')) | ConvertFrom-Json
        $fp = if ($meta.frontProfile) { $meta.frontProfile.label } else { '— (backend)' }
        $L.Add("| ``$($d.Name)`` | $($meta.label) | $fp |")
    }
    $L.Add('')
    $L.Add('Lenguajes sin stack propio (referencias de `code-quality`, el router los enruta igual): **Go** (`go.md`),')
    $L.Add('**Java/Spring** (`java.md`), **C#/.NET** (`csharp.md`).')
    $L.Add('')
    $bundles = Get-Bundles
    $L.Add('### Bundles opcionales (`init.mjs --bundle <nombre>` o `sync.ps1 -Bundle <nombre>`)')
    $L.Add('')
    $L.Add('| Bundle | Skills |')
    $L.Add('|---|---|')
    foreach ($b in ($bundles.Keys | Sort-Object)) { $L.Add("| ``$b`` | $(@($bundles[$b]) -join ', ') |") }
    return $L
}

# ============================================================ EN INGLES (docs\*.en.md)
# Las mismas tablas para la UI inglesa: nombre del comando de core/i18n/commands.json, descripcion de
# core/i18n/command-descriptions.json y, para hooks y pistas de uso, las traducciones de aqui. Si falta una,
# el build falla (como en castellano): al añadir o cambiar un hook o un comando, se traduce a la vez.
$script:CmdEn = (Read-Utf8 (Join-Path $root 'core\i18n\commands.json') | ConvertFrom-Json).comandos
$script:CmdDescEn = (Read-Utf8 (Join-Path $root 'core\i18n\command-descriptions.json') | ConvertFrom-Json).descripciones
function Get-CmdEn([string]$es) {
    $en = $script:CmdEn.$es
    if (-not $en) { throw "build-docs: comando '$es' sin nombre en core/i18n/commands.json" }
    return $en
}

function Get-CommandsBodyEn {
    $argEn = @{
        'adoptar'       = '[optional notes, e.g. "backend only" or "the official language is English"]'
        'auditar'       = '[optional area, e.g. "payments", "public API" or "before production"]'
        'brief'         = '[type of business if already known, e.g. "restaurant"]'
        'dependencias'  = ''
        'depurar'       = '[symptom or error, e.g. "checkout returns 500 with coupons"]'
        'design-system' = '[product/industry, e.g. "invoicing saas for freelancers"]'
        'desplegar'     = '[environment or target, e.g. "production" or "staging"]'
        'efecto'        = '<effect name> [where, e.g. "marquee in the logos footer"]'
        'entregar'      = '[project or client]'
        'estimar'       = '[what to estimate, e.g. "the restaurant website" or "phase 2"]'
        'instalar'      = '[optional stack, e.g. "laravel"]'
        'lanzar'        = '[preview/production url]'
        'mapa'          = '[optional area, e.g. "payments"]'
        'plan'          = '[description of the project or feature]'
        'propuestas'    = '[page, e.g. "home" or "landing"]'
        'recordar'      = '[what, e.g. "commits always without co-author"]'
        'refactor'      = '<goal, e.g. "move the pricing logic out of OrderController">'
        'repaso'        = '[url or page, e.g. "http://localhost:4321" or "the home page"]'
        'retomar'       = ''
        'revisar-ui'    = '[url or path of the view, e.g. http://localhost:5173 or Pages/Home.vue]'
        'ronda'         = '[your opinion of the previous round, or the text the mockups panel copies]'
        'seguridad'     = '[optional area, e.g. "auth" or "the checkout"]'
        'siguiente'     = '[optional task id, e.g. F1-T3]'
        'verificar'     = ''
    }
    $c = { param($es) "``/$(Get-CmdEn $es)``" }
    $L = New-Object System.Collections.Generic.List[string]
    $L.Add('Optional shortcuts: asking in plain words triggers the same thing through the router. ' + "$(& $c 'plan')/$(& $c 'siguiente')/$(& $c 'verificar')/$(& $c 'desplegar')/$(& $c 'adoptar')")
    $L.Add('are ALWAYS installed; the rest only in stacks with a front profile. Each command also has a Spanish name')
    $L.Add('(last column): the one it has in a Spanish install.')
    $L.Add('')
    $L.Add('| Command | Argument | What it does | In Spanish |')
    $L.Add('|---|---|---|---|')
    $always = @('plan', 'siguiente', 'verificar', 'desplegar', 'adoptar')
    $cmds = Get-ChildItem (Join-Path $root 'core\commands') -Filter *.md | Sort-Object { $always.IndexOf($_.BaseName) -lt 0 }, { $always.IndexOf($_.BaseName) }, Name
    foreach ($f in $cmds) {
        $es = $f.BaseName
        if (-not $argEn.ContainsKey($es)) { throw "build-docs: comando '$es' sin pista de uso en ingles (argEn)" }
        $desc = $script:CmdDescEn.$es.en
        if (-not $desc) { throw "build-docs: comando '$es' sin descripcion en ingles en core/i18n/command-descriptions.json" }
        $L.Add("| $(& $c $es) | $($argEn[$es]) | $desc | ``/$es`` |")
    }
    $L.Add('')
    $L.Add('### Typical flows')
    $L.Add("- **New project with a website**: $(& $c 'brief') (plain-language interview) → $(& $c 'propuestas') (blueprint + A/B mockups) →")
    $L.Add("  $(& $c 'design-system') → build with checkpoints → $(& $c 'revisar-ui') → $(& $c 'lanzar') → $(& $c 'desplegar').")
    $L.Add("- **Any feature**: $(& $c 'plan') → $(& $c 'siguiente') (one card at a time) → $(& $c 'verificar') before closing.")
    $L.Add("- **New project without a UI** (API, backend, agent): $(& $c 'plan') straight away; $(& $c 'brief') is for things with screens.")
    $L.Add("- **Inherited project**: $(& $c 'adoptar') in the first session (it analyzes and seals its conventions), then business as usual.")
    $L.Add("- $(& $c 'instalar') and $(& $c 'adoptar') are required by the ``arranque-guard`` wall before the first line of code; plan and brief are not imposed: if it is not clear what is being done, the agent asks.")
    $L.Add("- **A specific effect** (`"I want a parallax/marquee/cursor`"): $(& $c 'efecto') ``<name>`` goes straight to the catalog with its recipe and mobile cost.")
    return $L
}

function Get-HooksBodyEn {
    $L = New-Object System.Collections.Generic.List[string]
    $L.Add('Hooks in Node (`.mjs`, OS-agnostic: they work the same on Windows/macOS/Linux). The ones that BLOCK exit')
    $L.Add('with code 2 and the reason; the rest only inform. Only Claude Code runs hooks: in Codex/Cursor/Windsurf the')
    $L.Add('job is done by the activation tables of the generated rules and the githooks (`sync.ps1 -GitHooks`).')
    $L.Add('Their messages come out in English, or in Spanish with `--lang es` (see [INSTALL](../INSTALL.en.md#language)).')
    $L.Add('')
    $hookInfoEn = [ordered]@{
        'session-start.mjs'        = @('SessionStart', 'Injects the state: whether Senzu is OUTDATED (what to do and what you lose, from core/novedades.json), stack/profile, the NEXT STEP of the method that is missing (/install, /adopt; without a plan, knowing what is being done or asking about it), language, own diary detected, versions with an EOL warning, adopted conventions, git, design system, plan, devlog and the skills protocol.')
        'prompt-router.mjs'        = @('UserPromptSubmit', 'Suggests the skill that fits the request, in English or Spanish (signals from docs/skills.md), once per skill and session.')
        'guard.mjs'                = @('PreToolUse Bash/PowerShell', 'Looks at what is EXECUTED, not what is quoted (commit messages, heredocs to a file, echo, grep). BLOCKS: git push to a main branch, forced or without seeing which branch it goes to (to working branches, yes), writing, moving, deleting or restoring the sealed conventions from the terminal (no escape for the agent), destructive DB/git commands, rm -rf, deploy to prod without approval (escape `SENZU_ALLOW_DEPLOY=1`), logo generators once a logo is chosen (`SENZU_ALLOW_LOGO=1`), jQuery/Bootstrap (`SENZU_ALLOW_LIB=1`), dangerous devops (curl\|bash, chmod 777, dd, mkfs, docker prune, stopping services, flushing the firewall, crontab -r); commits: protected branch, Conventional ≤72, no co-authors.')
        'supply-guard.mjs'         = @('PreToolUse Bash/PowerShell', 'Supply-chain wall. On an install command (npm/pip/composer…) it checks the package NAMES (typosquatting, known-malware denylist) before they land; on `git commit` it scans what is staged (dependency manifests, skill/plugin files and `.mcp.json`) for install scripts with network/shell, prompt injection, exfiltration (reads secrets and opens the network), obfuscation (eval/base64/hex), hidden unicode characters and MCP servers that download and execute. BLOCKS the serious ones, WARNS about the rest. "Quoting is not doing": it looks at what is executed, not quoted text, and also INSIDE a script the command runs (bash x.sh, python x.py…). Offline and deterministic (lists in `core/hooks/data/`). Cannot be turned off. Escape after verifying: `SENZU_ALLOW_SUPPLY=1`.')
        'pentest-guard.mjs'        = @('PreToolUse Bash/PowerShell', 'Pentesting SCOPE wall. BLOCKS running offensive-security tools: network scanning (nmap, masscan, hping3), web discovery and fuzzing (gobuster, ffuf, nikto, wpscan, nuclei, wfuzz), injection and exploitation (sqlmap, commix, metasploit/msfconsole/msfvenom), credential brute force (hydra, medusa, ncrack), cracking (hashcat, john) and network or AD enumeration and post-exploitation (enum4linux, crackmapexec, responder, evil-winrm, wifi). "Quoting is not doing": it looks at what is executed, not quoted text, and also INSIDE a script the command runs (bash x.sh, ./x.sh…). Senzu helps with AUTHORIZED pentesting: with written permission and scope recorded in the devlog, escape `SENZU_ALLOW_PENTEST=1`. Cannot be turned off.')
        'protect-files.mjs'        = @('PreToolUse Edit/Write', 'BLOCKS editing: files generated by Senzu, secrets (.env, *.pem, credentials), dependencies/build artifacts, versioned migrations, sealed conventions.md/json (cannot be turned off), masters of the chosen logo (logos/final/) and the project''s `protectedPaths`.')
        'secrets-guard.mjs'        = @('PreToolUse Edit/Write', 'BLOCKS writing real credentials (AWS, GitHub, Stripe, OpenAI/Anthropic, PEM, JWT, strings with a password); ignores placeholders.')
        'code-hygiene.mjs'         = @('PreToolUse Edit/Write', 'BLOCKS introducing (except in scripts in the agent''s temp folder): console.log/debugger/dd()/var_dump/ray, terms banned in `gustos.md` §No, git conflict markers, `.only`/`.skip`/xit in tests, and the anti-AI blacklist (availability badges, numbered sections). One-off escape: a `senzu-allow` comment.')
        'conventions-guard.mjs'    = @('PreToolUse Edit/Write', 'BLOCKS code that breaks the executable rules in `conventions.json` (/adopt): the project''s convention wins. Cannot be turned off. The path is normalized (C:\, C:/, Git Bash /c/, relative) before the rules apply.')
        'arquitectura-guard.mjs'   = @('PreToolUse Edit/Write', 'Only if the project DECLARES its architecture (senzu/arquitectura/capas.json, from /adopt or /plan). BLOCKS what it introduces: a layer that uses one it may not (domain with framework or ORM, application with HTTP), a DDD context that reaches inside another, and the controller that talks to the database. WARNS about the request array passed instead of a DTO and new code outside the declared folders. Real imports: use + PSR-4, import + tsconfig aliases, Python modules. Cannot be turned off.')
        'backend-guard.mjs'        = @('PreToolUse Edit/Write', 'BLOCKS introducing: destructive migrations in the part that gets applied (dropping or renaming columns or tables: expand → contract pattern), `env()` outside `config/` in Laravel, personal data in logs (whole request, bodies, passwords or tokens), migrations without an honest down(), mass assignment (the whole request into the model) and swallowed errors (empty catch, except: pass). WARNS about several writes in the same function without a transaction and about a query inside a loop (N+1). Escape: `senzu-allow` with the reason.')
        'security-guard.mjs'       = @('PreToolUse Edit/Write', 'WARNS (does not block; once per file and session) about injection sinks introduced into the code: XSS (dangerouslySetInnerHTML, v-html, set:html, {@html}, Blade `{!! $x !!}`, innerHTML/insertAdjacentHTML/document.write with a variable), SQL injection (Prisma `$queryRawUnsafe`, Laravel `DB::raw`/`whereRaw` with `$`, `execute` with an f-string or concatenation in Python) and command injection or dynamic execution (exec/execSync/shell_exec/os.system with a variable, `shell=True`, `eval`). It only looks at what is introduced and at code without comments. Per-line escape: `senzu-allow`.')
        'pool-guard.mjs'           = @('PreToolUse Edit/Write', 'WARNS (does not block; once per file and session) about what exhausts the database connection pool in Node/TS and Python: `new PrismaClient()` without a global singleton (in serverless it opens one connection per invocation), and creating a pool/client/engine inside per-request code (routes, controllers, endpoints). PHP-FPM is out of scope. Recipe: `code-quality/references/database-design.md` (§Conexiones y pool).')
        'back-skill-reminder.mjs'  = @('PreToolUse Edit/Write (backend)', 'First backend edit in the session: reminds of the stack recipe, the sealed conventions and the real framework version. Does not block.')
        'depurar-coach.mjs'        = @('PostToolUse Bash/PowerShell', 'If a test, build or check that is EXECUTED fails (not when reading a test file), it switches on the method of the depurar skill (reproduce, failing test, hypothesis, narrow down, fix the cause). At most once every 20 minutes.')
        'front-skill-reminder.mjs' = @('PreToolUse Edit/Write (front)', 'First UI edit: BLOCKS once if there is no design system NOR brief (it forces asking); afterwards it reminds of ui-ux-pro-max, the MASTER icon set and the hard UI rules.')
        'format-on-save.mjs'       = @('PostToolUse', 'Formats the saved file with the stack''s tool (Pint/Prettier/ruff) if it exists. Never blocks.')
        'edit-tracker.mjs'         = @('PostToolUse', 'Records every file the session touches (for cierre-limpio) and marks that code was edited (stop-guard then requires verification).')
        'memoria-viva.mjs'         = @('UserPromptSubmit', 'If you state a rule or a correction ("never again…", "I told you…", "from now on…"), it asks the agent to note it in the project memory or in yours (all your projects). Keeps your last requests for /resume.')
        'memoria-archivo.mjs'      = @('PreToolUse Edit/Write', 'The first time a file is about to be touched, it gives the agent what the memory and the devlog say about it (decisions, what did not work). Does not block.')
        'estado-sesion.mjs'        = @('Stop · PreCompact', 'Saves where the session left off (requests, files, what was left uncommitted, task in progress) for the next session and for /resume. On close, BLOCKS once if you gave a rule or a correction and it was not noted in the memory.')
        'arranque-guard.mjs'       = @('PreToolUse Edit/Write (code and manifests)', 'BLOCKS, once per step and session, the first code edit if Senzu is not installed or /adopt is missing (a project with code and no conventions). Without a plan it does NOT block: it reminds that you need to know what is going to be done and, if it is not clear, to talk it over with the user; /plan or /brief only if it is big. Never for senzu/, CLAUDE.md, AGENTS.md or the documentation. The user can drop a step with init.mjs --omitir-paso.')
        'tarjeta-guard.mjs'        = @('PreToolUse Edit/Write (senzu/plan/PLAN.md)', 'BLOCKS moving a card to [done] without «Verificado:» (verified: the real evidence), «Cumple:» (meets: how it meets its «Para qué», the user''s goal or the audit finding it solves) and a «Devlog:» that exists. The same for plan cards and /audit cards.')
        'feature-guard.mjs'        = @('Stop · PostToolUse Bash', 'Backend. BLOCKS closing (once per set of files) if the session touched backend code and no test, if it created or touched migrations without running them or without testing their rollback (it records the migrate commands that run), or if the code uses new environment variables that are not in .env.example.')
        'cierre-limpio.mjs'        = @('Stop', 'BLOCKS closing (once) if you leave uncommitted files you touched in this session: either finish and commit (on a branch), or commit and say what is missing. Changes you did NOT touch (another agent such as Codex, another session or the user) are only reported: they are neither committed nor discarded without asking.')
        'stop-guard.mjs'           = @('Stop', 'BLOCKS closing (once) if something is missing: the day''s devlog, verify-build after editing code, or mobile ui-verify after touching UI. It also warns about heavy assets added in the last 24 h (images over 500 KB, fonts without woff2, large videos).')
        'pre-compact.mjs'          = @('PreCompact', 'Re-injects the essentials (stack, versions, design system, plan, rules) to survive context compaction.')
        'session-end.mjs'          = @('SessionEnd', 'Cleans up the session markers.')
        'lib.mjs'                  = $null
        'messages.mjs'             = $null
        'supply-scan.mjs'          = $null
        'secret-patterns.mjs'      = $null
    }
    $L.Add('| Hook | Event | What it does |')
    $L.Add('|---|---|---|')
    foreach ($f in (Get-ChildItem (Join-Path $root 'core\hooks') -Filter *.mjs | Sort-Object { @($hookInfoEn.Keys).IndexOf($_.Name) })) {
        if (-not $hookInfoEn.Contains($f.Name)) { throw "build-docs: hook '$($f.Name)' sin descripcion en ingles en hookInfoEn (añadela)" }
        $info = $hookInfoEn[$f.Name]
        if ($null -eq $info) { continue }   # lib.mjs, messages.mjs
        $L.Add("| ``$($f.Name)`` | $($info[0]) | $($info[1]) |")
    }
    $L.Add('')
    $L.Add('### Escapes (always with the user''s explicit approval, recorded in the devlog)')
    $deploy = Get-CmdEn 'desplegar'
    $L.Add("- ``SENZU_ALLOW_DEPLOY=1`` — deploy to production after the ``/$deploy`` checklist is approved.")
    $L.Add('- `SENZU_ALLOW_LIB=1` — install a banned library (jQuery/Bootstrap) if the user asks for it.')
    $L.Add('- A `senzu-allow` comment on the line — a one-off exception to code-hygiene (CLI script with console.log, justified test .skip, anti-AI pattern requested by name).')
    $L.Add("- Sealed conventions: they are changed by deleting ``conventions.*`` and running ``/$(Get-CmdEn 'adoptar')`` again (the user's decision).")
    return $L
}

function Get-StacksBodyEn {
    # Etiquetas con texto en castellano en stack.json; el resto son nombres propios y se quedan igual
    $labelEn = @{
        'WordPress / PHP clásico'                                = 'WordPress / classic PHP'
        'WordPress + theme a medida (child theme) + CSS propio' = 'WordPress + custom theme (child theme) + own CSS'
    }
    $tr = { param($s) if ($labelEn.ContainsKey($s)) { $labelEn[$s] } else { $s } }
    $L = New-Object System.Collections.Generic.List[string]
    $L.Add('Each stack defines an evolving system prompt, best practices, prohibitions, verification commands,')
    $L.Add('formatters, permissions and (in the front ones) the profile for the design search. `init-project.ps1 -Stack <n>`.')
    $L.Add('')
    $L.Add('| Stack | What it is | Front profile |')
    $L.Add('|---|---|---|')
    foreach ($d in (Get-ChildItem (Join-Path $root 'stacks') -Directory | Sort-Object Name)) {
        $meta = (Read-Utf8 (Join-Path $d.FullName 'stack.json')) | ConvertFrom-Json
        $fp = if ($meta.frontProfile) { & $tr $meta.frontProfile.label } else { '— (backend)' }
        $L.Add("| ``$($d.Name)`` | $(& $tr $meta.label) | $fp |")
    }
    $L.Add('')
    $L.Add('Languages without their own stack (`code-quality` references; the router routes them all the same): **Go** (`go.md`),')
    $L.Add('**Java/Spring** (`java.md`), **C#/.NET** (`csharp.md`).')
    $L.Add('')
    $bundles = Get-Bundles
    $L.Add('### Optional bundles (`init.mjs --bundle <name>` or `sync.ps1 -Bundle <name>`)')
    $L.Add('')
    $L.Add('| Bundle | Skills |')
    $L.Add('|---|---|')
    foreach ($b in ($bundles.Keys | Sort-Object)) { $L.Add("| ``$b`` | $(@($bundles[$b]) -join ', ') |") }
    return $L
}

# Grupos y «cuándo usarla» de cada skill en inglés (core/i18n/skills.json). Si falta uno, avisa y cae al
# castellano (test-i18n exige que estén todos); el contenido de las skills no se traduce: lo lee el agente.
$script:SkillsEn = (Read-Utf8 (Join-Path $root 'core\i18n\skills.json') | ConvertFrom-Json)
function Get-SkillGroupEn([string]$g) {
    $en = $script:SkillsEn.grupos.$g
    if (-not $en) { Write-Warning "build-docs: grupo '$g' sin nombre en ingles en core/i18n/skills.json"; return $script:Registry.groups.$g }
    return $en
}
function Get-SkillWhenEn($s) {
    $en = $script:SkillsEn.when.($s.name)
    if (-not $en) { Write-Warning "build-docs: skill '$($s.name)' sin 'when' en ingles en core/i18n/skills.json"; return $s.when }
    return $en
}

# Señales en inglés: las del inglés van al final de la regex (keywords union, 2.22), así que la muestra se toma
# desde el final; misma limpieza que Clean-Keywords
function Clean-KeywordsEn([string]$k, [int]$Max = 8) {
    if (-not $k) { return '' }
    $s = ($k -replace '\(\?i\)', '' -replace '\\b', '').Trim()
    if ($s.StartsWith('(') -and $s.EndsWith(')')) { $s = $s.Substring(1, $s.Length - 2) }
    for ($i = 0; $i -lt 3; $i++) { $s = $s -replace '\(([^()|]*)\|[^()]*\)\??', '$1' }
    $clean = @(); $parts = @($s -split '\|'); [array]::Reverse($parts)
    foreach ($p in $parts) {
        $t = $p -replace '\(\?[=!][^\)]*\)', '' -replace '\[([a-zA-Z0-9áéíóúñ])[^\]]*\]', '$1' -replace '\\w\*?', '' -replace '\\s\+?', ' ' -replace '\\[.d]\+?', ' ' -replace '[\\^\$\(\)\?\:\+\*\{\}]', ''
        $t = ($t -replace '\s+', ' ').Trim(' ', ',', '.')
        if ($t -and $t.Length -ge 3 -and $t.Length -le 28 -and $clean -notcontains $t) { $clean += $t }
        if ($clean.Count -ge $Max) { break }
    }
    [array]::Reverse($clean)
    return $(if ($parts.Count -gt $Max) { '…' } else { '' }) + ($clean -join ', ')
}

function Get-SkillsBodyEn {
    $L = New-Object System.Collections.Generic.List[string]
    $L.Add('The agent decides on its own, in three automatic layers:')
    $L.Add('1. **When the session starts** (SessionStart hook): project state (stack, versions+EOL, whether it is new or')
    $L.Add('   existing, design system, plan, devlog, conventions) + entry points: UI → `ui-ux-pro-max` ·')
    $L.Add('   logic → `code-quality` · new project → `project-planner` · in doubt → `skill-router`.')
    $L.Add('2. **On every request** (UserPromptSubmit hook): the *signals* in the tables below suggest the skill')
    $L.Add('   (max. 2, once per skill and session), in English or Spanish. *Entrypoints* go first; on an equal match the higher priority wins.')
    $L.Add('3. **Activation tables** (`skill-router` and `front-activation`, generated from the registry): the agent')
    $L.Add('   checks them when in doubt; `references/decision-trees.md` has the full decision trees.')
    $L.Add('')
    $total = @($script:Registry.skills).Count
    $L.Add(('Total: **{0} skills**. Single source: `core/skills-registry.json` (group, when, signals, priority, dependencies).' -f $total))
    $L.Add('The skills themselves are written for the agent, which answers in your language: only this catalog is translated.')
    $L.Add('')
    foreach ($g in @($script:Registry.groups.PSObject.Properties.Name)) {
        $skills = @($script:Registry.skills | Where-Object { $_.group -eq $g } | Sort-Object -Property @{Expression = { [bool]$_.entrypoint }; Descending = $true }, @{Expression = { $_.priority }; Descending = $true }, name)
        if (-not $skills.Count) { continue }
        $L.Add(('### {0} (group `{1}`, {2} skill{3})' -f (Get-SkillGroupEn $g), $g, $skills.Count, $(if ($skills.Count -eq 1) { '' } else { 's' })))
        $L.Add('')
        $L.Add('| Skill | Prio | When to use it | Signals that trigger it (sample) |')
        $L.Add('|---|---|---|---|')
        foreach ($s in $skills) {
            $name = if ($s.entrypoint) { "**``$($s.name)``** (entry)" } else { "``$($s.name)``" }
            $L.Add("| $name | $($s.priority) | $(Get-SkillWhenEn $s) | $(Clean-KeywordsEn $s.keywords) |")
        }
        $L.Add('')
    }
    return $L
}

# ============================================================ EMISION
function Emit([string]$Path, [string]$Title, [string]$Intro, $Body) {
    $L = New-Object System.Collections.Generic.List[string]
    $L.Add($GEN); $L.Add(''); $L.Add("# $Title"); $L.Add('')
    if ($Intro) { $L.Add($Intro); $L.Add('') }
    foreach ($x in $Body) { $L.Add($x) }
    Write-Utf8 (Join-Path $root $Path) ($L -join "`n")
    Write-Host "  [docs] $Path"
}

$skillsBody = Get-SkillsBody
$cmdsBody = Get-CommandsBody
$hooksBody = Get-HooksBody
$stacksBody = Get-StacksBody
$volver = '[← Volver al README](../README.md)'

Emit 'docs\skills.md' 'Skills y enrutamiento' "$volver`n`nQué skill existe, cuándo salta cada una y con qué señales. Las de terceros van vendorizadas con capa propia en español (ver [arquitectura](arquitectura.md))." $skillsBody
Emit 'docs\comandos.md' 'Comandos slash' "$volver" $cmdsBody
Emit 'docs\hooks.md' 'Muros y hooks' "$volver`n`nLo que el agente NO puede hacer aunque quiera — y lo que se le recuerda solo." $hooksBody
Emit 'docs\stacks.md' 'Stacks y bundles' "$volver" $stacksBody

# Las mismas páginas en inglés (la web las publica en /en/docs/; en GitHub, junto a las de castellano)
$back = '[← Back to README](../README.md)'
Emit 'docs\comandos.en.md' 'Slash commands' "$back" (Get-CommandsBodyEn)
Emit 'docs\hooks.en.md' 'Walls and hooks' "$back`n`nWhat the agent can NOT do even if it wants to — and what it is reminded of on its own." (Get-HooksBodyEn)
Emit 'docs\stacks.en.md' 'Stacks and bundles' "$back" (Get-StacksBodyEn)
$skillsBodyEn = Get-SkillsBodyEn
Emit 'docs\skills.en.md' 'Skills and routing' "$back`n`nWhich skills exist, when each one kicks in and on which signals. Third-party ones are vendored with Senzu's own layer on top (see [architecture](arquitectura.en.md))." $skillsBodyEn

# REFERENCIA.md: todo en una pagina (para leer del tiron o imprimir)
$R = New-Object System.Collections.Generic.List[string]
$R.Add($GEN); $R.Add(''); $R.Add('# Referencia completa de Senzu'); $R.Add('')
$R.Add('Todo el catálogo en una página. Por temas: [skills](docs/skills.md) · [comandos](docs/comandos.md) · [hooks](docs/hooks.md) · [stacks](docs/stacks.md) · [arquitectura](docs/arquitectura.md). Guías: [README](README.md) · [INSTALL](INSTALL.md) · [USO](USO.md).')
$R.Add('')
$R.Add('## 1. Skills y enrutamiento'); $R.Add('')
foreach ($x in $skillsBody) { $R.Add($x) }
$R.Add('## 2. Comandos slash'); $R.Add('')
foreach ($x in $cmdsBody) { $R.Add($x) }
$R.Add(''); $R.Add('## 3. Muros y hooks'); $R.Add('')
foreach ($x in $hooksBody) { $R.Add($x) }
$R.Add(''); $R.Add('## 4. Stacks y bundles'); $R.Add('')
foreach ($x in $stacksBody) { $R.Add($x) }
Write-Utf8 (Join-Path $root 'REFERENCIA.md') ($R -join "`n")
Write-Host "  [docs] REFERENCIA.md ($($R.Count) lineas)"

# REFERENCIA.en.md: lo mismo en inglés
$R = New-Object System.Collections.Generic.List[string]
$R.Add($GEN); $R.Add(''); $R.Add('# Senzu full reference'); $R.Add('')
$R.Add('The whole catalog on one page. By topic: [skills](docs/skills.en.md) · [commands](docs/comandos.en.md) · [hooks](docs/hooks.en.md) · [stacks](docs/stacks.en.md) · [architecture](docs/arquitectura.en.md). Guides: [README](README.en.md) · [INSTALL](INSTALL.en.md) · [USO](USO.en.md).')
$R.Add('')
$R.Add('## 1. Skills and routing'); $R.Add('')
foreach ($x in $skillsBodyEn) { $R.Add($x) }
$R.Add('## 2. Slash commands'); $R.Add('')
foreach ($x in (Get-CommandsBodyEn)) { $R.Add($x) }
$R.Add(''); $R.Add('## 3. Walls and hooks'); $R.Add('')
foreach ($x in (Get-HooksBodyEn)) { $R.Add($x) }
$R.Add(''); $R.Add('## 4. Stacks and bundles'); $R.Add('')
foreach ($x in (Get-StacksBodyEn)) { $R.Add($x) }
Write-Utf8 (Join-Path $root 'REFERENCIA.en.md') ($R -join "`n")
Write-Host "  [docs] REFERENCIA.en.md ($($R.Count) lines)"

# ============================================================ README: bloque GEN:resumen (badges + numeros vivos)
$readmePath = Join-Path $root 'README.md'
if (Test-Path $readmePath) {
    $md = Read-Utf8 $readmePath
    $nSkills = @($script:Registry.skills).Count
    $nStacks = @(Get-ChildItem (Join-Path $root 'stacks') -Directory).Count
    $nHooks = @(Get-ChildItem (Join-Path $root 'core\hooks') -Filter *.mjs | Where-Object { $_.Name -ne 'lib.mjs' -and $_.Name -ne 'messages.mjs' -and $_.Name -ne 'supply-scan.mjs' -and $_.Name -ne 'secret-patterns.mjs' }).Count
    $nCmds = @(Get-ChildItem (Join-Path $root 'core\commands') -Filter *.md).Count
    $nPlugins = @(Get-ChildItem (Join-Path $root 'plugins') -Directory -ErrorAction SilentlyContinue).Count
    # Misma versión que los plugins (SENZU_RELEASE o el manifiesto recién generado): el último tag aún no existe
    # al commitear una release, y el CI regenera con la del manifiesto
    $ver = if ($env:SENZU_RELEASE) { "v$($env:SENZU_RELEASE)" } elseif ($env:DEV_STANDARDS_RELEASE) { "v$($env:DEV_STANDARDS_RELEASE)" } else { '' }   # compat-dev-standards
    $manifiesto = Join-Path $root 'plugins\senzu-core\.claude-plugin\plugin.json'
    if (-not $ver -and (Test-Path $manifiesto)) { try { $ver = 'v' + ((Read-Utf8 $manifiesto) | ConvertFrom-Json).version } catch {} }
    if (-not $ver) { try { $ver = ((git -C $root describe --tags --abbrev=0 2>$null) | Out-String).Trim() } catch {} }
    $B = New-Object System.Collections.Generic.List[string]
    $verBadge = if ($ver) { "![Version](https://img.shields.io/badge/version-$ver-black) " } else { '' }
    $B.Add("$verBadge![Skills](https://img.shields.io/badge/skills-$nSkills-blue) ![Stacks](https://img.shields.io/badge/stacks-$nStacks-green) ![Plugins](https://img.shields.io/badge/plugins_Claude-$nPlugins-purple) ![Muros](https://img.shields.io/badge/muros-${nHooks}_hooks-red) ![Comandos](https://img.shields.io/badge/comandos-$nCmds-orange) ![Idioma](https://img.shields.io/badge/idioma-espa%C3%B1ol-yellow) ![Clones](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fpetersonsenadevs%2Fsenzu%2Fstats%2Fbadge-clones.json)")
    $B.Add('')
    $B.Add('| Grupo | Skills | Entra por |')
    $B.Add('|---|---|---|')
    foreach ($g in @($script:Registry.groups.PSObject.Properties.Name)) {
        $skills = @($script:Registry.skills | Where-Object { $_.group -eq $g })
        if (-not $skills.Count) { continue }
        $entry = @($skills | Where-Object { $_.entrypoint } | ForEach-Object { "``$($_.name)``" })
        $names = @($skills | Sort-Object name | Select-Object -First 4 | ForEach-Object { $_.name })
        $sample = ($names -join ', ') + $(if ($skills.Count -gt 4) { '…' } else { '' })
        $B.Add("| **$($script:Registry.groups.$g)** ($($skills.Count)) | $sample | $(if ($entry.Count) { $entry -join ', ' } else { 'router' }) |")
    }
    $block = $B -join "`n"
    $md2 = [regex]::Replace($md, '(?s)(<!-- GEN:resumen -->).*?(<!-- /GEN:resumen -->)', ('${1}' + "`n$block`n" + '${2}'))
    if ($md2 -ne $md) { Write-Utf8 $readmePath $md2; Write-Host '  [docs] README.md (bloque GEN:resumen)' }
}

# README.en.md: el mismo bloque en inglés (mismas cifras de arriba)
$readmeEnPath = Join-Path $root 'README.en.md'
if ((Test-Path $readmePath) -and (Test-Path $readmeEnPath)) {
    $md = Read-Utf8 $readmeEnPath
    $B = New-Object System.Collections.Generic.List[string]
    $B.Add("$verBadge![Skills](https://img.shields.io/badge/skills-$nSkills-blue) ![Stacks](https://img.shields.io/badge/stacks-$nStacks-green) ![Plugins](https://img.shields.io/badge/plugins_Claude-$nPlugins-purple) ![Walls](https://img.shields.io/badge/walls-${nHooks}_hooks-red) ![Commands](https://img.shields.io/badge/commands-$nCmds-orange) ![Language](https://img.shields.io/badge/language-English%20%7C%20Espa%C3%B1ol-yellow) ![Clones](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fpetersonsenadevs%2Fsenzu%2Fstats%2Fbadge-clones.json)")
    $B.Add('')
    $B.Add('| Group | Skills | Entry point |')
    $B.Add('|---|---|---|')
    foreach ($g in @($script:Registry.groups.PSObject.Properties.Name)) {
        $skills = @($script:Registry.skills | Where-Object { $_.group -eq $g })
        if (-not $skills.Count) { continue }
        $entry = @($skills | Where-Object { $_.entrypoint } | ForEach-Object { "``$($_.name)``" })
        $names = @($skills | Sort-Object name | Select-Object -First 4 | ForEach-Object { $_.name })
        $sample = ($names -join ', ') + $(if ($skills.Count -gt 4) { '…' } else { '' })
        $B.Add("| **$(Get-SkillGroupEn $g)** ($($skills.Count)) | $sample | $(if ($entry.Count) { $entry -join ', ' } else { 'router' }) |")
    }
    $block = $B -join "`n"
    $md2 = [regex]::Replace($md, '(?s)(<!-- GEN:resumen -->).*?(<!-- /GEN:resumen -->)', ('${1}' + "`n$block`n" + '${2}'))
    if ($md2 -ne $md) { Write-Utf8 $readmeEnPath $md2; Write-Host '  [docs] README.en.md (GEN:resumen block)' }
}

# ============================================================ CHANGELOG.en.md desde core/novedades.json
# El CHANGELOG en castellano sale del devlog (privado, entrada a entrada); en inglés, una línea por versión en llano
# (el campo `en` de cada novedad, que test-i18n exige).
$nov = (Read-Utf8 (Join-Path $root 'core\novedades.json') | ConvertFrom-Json).novedades
$C = New-Object System.Collections.Generic.List[string]
$C.Add('<!-- GENERADO por tools/build-docs.ps1 desde core/novedades.json (campo en). NO editar a mano. -->')
$C.Add(''); $C.Add('# Changelog'); $C.Add('')
$C.Add('What each version brings, in plain words (newest first). The entry-by-entry log, in Spanish, is in [CHANGELOG.md](CHANGELOG.md).')
$C.Add('')
foreach ($n in $nov) {
    $txt = if ($n.en) { $n.en } else { Write-Warning "build-docs: novedad $($n.version) sin 'en' en core/novedades.json"; $n.texto }
    $C.Add("## v$($n.version)"); $C.Add('')
    $C.Add("- $($txt.Substring(0, 1).ToUpper() + $txt.Substring(1))")
    $C.Add('')
}
Write-Utf8 (Join-Path $root 'CHANGELOG.en.md') ($C -join "`n")
Write-Host "  [docs] CHANGELOG.en.md ($(@($nov).Count) versions)"

# ============================================================ CHANGELOG.md desde devlog/INDEX.md
$idxPath = Join-Path $root 'devlog\INDEX.md'
if (Test-Path $idxPath) {
    $rows = @()
    foreach ($line in ((Read-Utf8 $idxPath) -split "`r?`n")) {
        if ($line -match '^\|\s*(\d{3})\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*([^|]+?)\s*\|\s*(\w+)\s*\|') {
            $rows += [pscustomobject]@{ N = $Matches[1]; Fecha = $Matches[2]; Titulo = $Matches[3]; Tipo = $Matches[4] }
        }
    }
    # Lo de una rama EXPERIMENTAL (la entrada dice «rama exp/…») solo sale si esa rama ya está en el historial de
    # HEAD (algún commit «(exp)»): un parche desde main no anuncia en el CHANGELOG público lo que no se ha publicado
    # (el 2.19.1 se llevó las entradas 098-099 de Hemispheric; el 2.19.2 iba a llevarse de la 100 a la 129).
    $hayExp = $false
    try { $hayExp = [bool](& git -C $root log HEAD --grep='(exp)$' -n 1 --format='%h' 2>$null) } catch {}
    if (-not $hayExp) {
        $rows = @($rows | Where-Object {
            $f = Get-ChildItem -Path (Join-Path $root "devlog\$($_.Fecha)") -Filter "$($_.N)-*.md" -ErrorAction SilentlyContinue | Select-Object -First 1
            -not ($f -and ((Read-Utf8 $f.FullName) -match 'rama exp/'))
        })
    }
    # El devlog es privado (no se versiona) y el CHANGELOG es público: devlog/privado.txt (también privado)
    # lista sustituciones "nombre ==> genérico" que se aplican a los títulos, para que ningún nombre de
    # cliente o proyecto llegue al CHANGELOG.
    $privado = Join-Path $root 'devlog\privado.txt'
    if (Test-Path $privado) {
        $subs = @((Read-Utf8 $privado) -split "`r?`n" | Where-Object { $_ -match '\S\s*==>\s*' -and $_ -notmatch '^\s*#' })
        foreach ($r in $rows) {
            foreach ($s in $subs) { $par = $s -split '\s*==>\s*', 2; $r.Titulo = [regex]::Replace($r.Titulo, [regex]::Escape($par[0].Trim()), $par[1].Trim(), 'IgnoreCase') }
        }
    }
    # Seguridad: ninguna ruta local absoluta (D:/…, C:\…) llega al CHANGELOG publico, venga de donde venga.
    # El lookbehind evita romper URLs (la "s" de https: va precedida de letra; una unidad "D:" no).
    foreach ($r in $rows) { $r.Titulo = ([regex]::Replace($r.Titulo, '\s*(?<![A-Za-z])[A-Za-z]:[\\/][^\s)\|]*', '')).Trim() }
    $C = New-Object System.Collections.Generic.List[string]
    $C.Add('<!-- GENERADO por tools/build-docs.ps1 desde el devlog interno del proyecto. -->')
    $C.Add(''); $C.Add('# Changelog'); $C.Add('')
    $C.Add('Resumen por fecha (lo nuevo arriba). El detalle de cada entrada vive en el diario interno del proyecto.')
    $C.Add('')
    foreach ($fecha in ($rows | Group-Object Fecha | Sort-Object Name -Descending)) {
        $C.Add("## $($fecha.Name)")
        $C.Add('')
        foreach ($r in ($fecha.Group | Sort-Object N -Descending)) { $C.Add(('- **{0}** — {1} (entrada {2})' -f $r.Tipo, $r.Titulo, $r.N)) }
        $C.Add('')
    }
    Write-Utf8 (Join-Path $root 'CHANGELOG.md') ($C -join "`n")
    Write-Host "  [docs] CHANGELOG.md ($($rows.Count) entradas)"
}

# Créditos de terceros (CREDITOS.md) desde los manifiestos de vendor y efectos
& node (Join-Path $root 'tools\build-creditos.mjs')

# Catálogo de efectos público (docs/efectos.md + docs/efectos.json, el contrato que consume la web)
& node (Join-Path $root 'tools\build-efectos.mjs')
if ($LASTEXITCODE -ne 0) { throw 'build-efectos: una demo sin ficha o una receta que no existe (ver arriba)' }
