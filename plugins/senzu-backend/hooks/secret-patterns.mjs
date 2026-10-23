// Patrones de secretos/credenciales reales, compartidos por secrets-guard (en edición) y supply-guard (lo que
// entra en un git commit): una sola definicion. No es un hook (no se registra): lib auxiliar, como lib.mjs.
// Ignora placeholders obvios (xxx, your-, example, changeme, <...>, ${...}, env('...'), process.env, os.environ).

// Patrones case-sensitive salvo los marcados (paridad con [regex]::Matches de PowerShell)
export const patterns = [
    { n: 'AWS Access Key',        p: /\bAKIA[0-9A-Z]{16}\b/g },
    { n: 'GitHub token',          p: /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{60,}\b/g },
    { n: 'GitLab token',          p: /\bglpat-[A-Za-z0-9\-_]{20,}\b/g },
    { n: 'Slack token',           p: /\bxox[baprs]-[A-Za-z0-9\-]{10,}\b/g },
    { n: 'Stripe key',            p: /\b(sk|rk)_(live|test)_[A-Za-z0-9]{16,}\b/g },
    { n: 'Anthropic key',         p: /\bsk-ant-[A-Za-z0-9_\-]{32,}\b/g },
    { n: 'OpenAI key',            p: /\bsk-(proj-)?[A-Za-z0-9_\-]{32,}\b/g },
    { n: 'Google API key',        p: /\bAIza[0-9A-Za-z\-_]{35}\b/g },
    { n: 'PEM private key',       p: /-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g },
    { n: 'connection string with password', p: /\b(mysql|postgres(ql)?|mongodb(\+srv)?|redis|amqp):\/\/[^:\s/]+:[^@\s]{6,}@/gi },
    { n: 'JWT',                   p: /\beyJ[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}\b/g },
    { n: 'literal secret assignment', p: /\b(api[_-]?key|secret[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|password)\b\s*[:=]\s*["'][A-Za-z0-9/+_\-.=]{20,}["']/gi },
];
export const placeholder = /(xxx|your[-_]|example|changeme|placeholder|<[^>]+>|\$\{[^}]+\}|env\(|process\.env|os\.environ|getenv|import\.meta\.env|\bdummy\b|\bfake\b|\btest[-_]?key\b|\*{4,}|0{8,}|1{8,})/i;

// Tipos de secreto reales en el texto (sin placeholders), en orden de aparicion y sin repetir. [] si no hay.
// Mismo criterio que usaba secrets-guard: el contexto ±40 caracteres de la coincidencia no puede ser un placeholder.
export function scanSecrets(text) {
    const t = String(text || '');
    if (!t) return [];
    const out = [];
    for (const pt of patterns) {
        for (const m of t.matchAll(pt.p)) {
            const start = Math.max(0, m.index - 40);
            const ctx = t.substring(start, start + Math.min(120, t.length - start));
            if (placeholder.test(ctx)) continue;
            if (!out.includes(pt.n)) out.push(pt.n);
            break;   // un tipo basta: no se repite el mismo hallazgo
        }
    }
    return out;
}
