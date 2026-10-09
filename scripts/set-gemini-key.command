#!/bin/zsh
set -eu
setopt extendedglob
cd "${0:A:h}/.."
read -rs 'resolve_secret?Paste your Gemini API key and press Enter (input is hidden): '
printf '\n'
# Remove only surrounding whitespace; do not assume a provider-specific prefix.
resolve_secret="${resolve_secret##[[:space:]]#}"
resolve_secret="${resolve_secret%%[[:space:]]#}"
if (( ${#resolve_secret} < 20 || ${#resolve_secret} > 16384 )) || [[ "$resolve_secret" == *[^a-zA-Z0-9_.=+/-]* ]]; then
  printf 'Input is empty, too short, or contains whitespace or quotation marks. Use Copy key to copy the full key. Nothing was changed.\n'
  exit 1
fi
umask 077
resolve_tmp=$(mktemp .dev.vars.XXXXXX)
trap 'rm -f "$resolve_tmp"' EXIT
if [[ -f .dev.vars ]]; then
  while IFS= read -r resolve_line || [[ -n "$resolve_line" ]]; do
    [[ "$resolve_line" == GEMINI_API_KEY=* ]] || printf '%s\n' "$resolve_line" >> "$resolve_tmp"
  done < .dev.vars
fi
printf 'GEMINI_API_KEY="%s"\n' "$resolve_secret" >> "$resolve_tmp"
unset resolve_secret
mv "$resolve_tmp" .dev.vars
printf 'The new key was saved locally. You can close this window.\n'
