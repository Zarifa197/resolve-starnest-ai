#!/bin/zsh
set -eu
setopt extendedglob
cd "${0:A:h}/.."
read -rs 'resolve_secret?Paste your Resend API key and press Enter (input is hidden): '
printf '\n'
resolve_secret="${resolve_secret##[[:space:]]#}"
resolve_secret="${resolve_secret%%[[:space:]]#}"
if [[ "$resolve_secret" != re_* || "$resolve_secret" == *[^a-zA-Z0-9_-]* ]]; then
 printf 'Copy the full API key from Resend. The file was not changed.\n'; exit 1
fi
read -r 'resolve_email?Enter the email address used for your Resend account: '
resolve_email="${resolve_email##[[:space:]]#}"
resolve_email="${resolve_email%%[[:space:]]#}"
if [[ "$resolve_email" != ?*@?*.?* || "$resolve_email" == *[^a-zA-Z0-9_.+@-]* ]]; then
 printf 'Check the email address. The file was not changed.\n'; exit 1
fi
umask 077
resolve_tmp=$(mktemp .dev.vars.XXXXXX)
trap 'rm -f "$resolve_tmp"' EXIT
if [[ -f .dev.vars ]]; then
 while IFS= read -r resolve_line || [[ -n "$resolve_line" ]]; do
  if [[ "$resolve_line" != RESEND_API_KEY=* && "$resolve_line" != EMAIL_TEST_TO=* ]]; then
   printf '%s\n' "$resolve_line" >> "$resolve_tmp"
  fi
 done < .dev.vars
fi
printf 'RESEND_API_KEY="%s"\nEMAIL_TEST_TO="%s"\n' "$resolve_secret" "$resolve_email" >> "$resolve_tmp"
unset resolve_secret
mv "$resolve_tmp" .dev.vars
printf 'Email configuration was saved. No email has been sent.\n'
