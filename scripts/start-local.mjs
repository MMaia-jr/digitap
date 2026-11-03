// Fail closed: CLI 3.0.0 published wildcard ports even on the loopback network.
// Resolve and verify binding before restoring automated startup.
console.error('Inicialização bloqueada: restrição a loopback ainda não comprovada na CLI 3.0.0. Consulte operations/incremento-1.md.');
process.exitCode = 1;
