const fs = require('fs');
const path = require('path');

const file = 'c:/Users/rohit/Downloads/tenantos/frontend/src/pages/tenant/TenantDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacements = [
  // Backgrounds
  [/bg-surface-950/g, "bg-[var(--bg)]"],
  [/bg-\[\#0a0a0a\]/g, "bg-[var(--bg)]"],
  [/bg-surface-900/g, "bg-[var(--surface)]"],
  [/bg-surface-800/g, "bg-[rgba(232,234,240,0.06)]"],
  [/bg-surface-700/g, "bg-[rgba(232,234,240,0.1)]"],
  [/bg-brand-600/g, "bg-[var(--primary)]"],
  
  // Borders
  [/border-surface-800/g, "border-[var(--border)]"],
  [/border-surface-700/g, "border-[var(--border)]"],
  
  // Text colors
  [/text-white/g, "text-[var(--ink)]"],
  [/text-surface-700/g, "text-[var(--ink-dim)]"],
  [/text-surface-600/g, "text-[var(--ink-dim)]"],
  [/text-surface-500/g, "text-[var(--ink-dim)]"],
  [/text-surface-400/g, "text-[var(--ink-dim)]"],
  [/text-surface-300/g, "text-[var(--ink-dim)]"],
  [/text-brand-400/g, "text-[var(--primary)]"],
  [/text-brand-300/g, "text-[var(--primary)]"],
  [/text-success-400/g, "text-[var(--accent)]"],
  [/text-danger-400/g, "text-[var(--danger)]"],
  [/text-warning-500/g, "text-[var(--warning)]"],
  
  // Hovers
  [/hover:bg-surface-800/g, "hover:bg-[rgba(232,234,240,0.06)]"],
  [/hover:border-surface-700/g, "hover:border-[rgba(232,234,240,0.15)]"],
  [/hover:text-white/g, "hover:text-[var(--ink)]"],
  [/hover:text-brand-300/g, "hover:text-[var(--primary)]"],
  [/hover:text-danger-400/g, "hover:text-[var(--danger)]"]
];

replacements.forEach(([regex, replacement]) => {
  content = content.replace(regex, replacement);
});

fs.writeFileSync(file, content);
console.log("Fixed TenantDashboard.tsx");
