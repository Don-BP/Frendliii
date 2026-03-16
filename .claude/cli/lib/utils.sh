#!/bin/bash
# Shared utilities for CLI tools

log_info() { echo "[INFO] $*" >&2; }
log_warn() { echo "[WARN] $*" >&2; }
log_error() { echo "[ERROR] $*" >&2; }

success_response() {
    local data="$1"
    echo "$data"
}

error_response() {
    local message="$1"
    local code="${2:-ERROR}"
    echo "{\"error\": \"$message\", \"code\": \"$code\"}"
}

json_get() {
    local json="$1"
    local key="$2"
    node << NODEEOF 2>/dev/null
const d = JSON.parse(\`$json\`);
const query = 'd$key';
try {
  const val = eval(query);
  if (val === undefined || val === null) process.stdout.write('');
  else if (typeof val === 'object') process.stdout.write(JSON.stringify(val));
  else process.stdout.write(String(val));
} catch(e) { process.stdout.write(''); }
NODEEOF
}
