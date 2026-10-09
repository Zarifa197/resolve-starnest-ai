#!/bin/zsh
set -eu
cd "${0:A:h}/.."
read -rs 'resolve_secret?Paste your Shopify client secret and press Enter (input is hidden): '
printf '\n'
if [[ "$resolve_secret" != shpss_* || "$resolve_secret" == *[^a-zA-Z0-9_]* ]]; then
  printf 'Invalid key format. Nothing was changed.\n'
  exit 1
fi
umask 077
resolve_tmp=$(mktemp .dev.vars.XXXXXX)
trap 'rm -f "$resolve_tmp"' EXIT
if [[ -f .dev.vars ]]; then
  while IFS= read -r resolve_line || [[ -n "$resolve_line" ]]; do
    [[ "$resolve_line" == SHOPIFY_CLIENT_SECRET=* ]] || printf '%s\n' "$resolve_line" >> "$resolve_tmp"
  done < .dev.vars
fi
printf 'SHOPIFY_CLIENT_SECRET="%s"\n' "$resolve_secret" >> "$resolve_tmp"
unset resolve_secret
mv "$resolve_tmp" .dev.vars
printf 'The new key was saved locally. You can close this window.\n'
