#!/bin/bash
# Sets up automatic deploys on the server. Run as root after pulling this file:
#   /home/kikk/KIKK-timetable/deploy/install.sh
# Safe to run again, e.g. after changing the unit files.
set -euo pipefail

user=kikk
repo=/home/kikk/KIKK-timetable
units=(kikk-timetable-deploy.service kikk-timetable-deploy.timer)

if [ "$(id -u)" != 0 ]; then
  echo "Run this as root." >&2
  exit 1
fi

# The timer has no SSH agent, so fetch over HTTPS (the repo is public). Git runs as the
# owner, as root it would refuse the repo.
runuser -u "$user" -- git -C "$repo" remote set-url origin \
  https://github.com/peteruithoven/KIKK-timetable.git
runuser -u "$user" -- git -C "$repo" fetch --quiet origin main

# Branch previews (previews.sh) write their Caddy config here and reload Caddy.
caddy_file=/etc/caddy/sites/previews.kikk.avecsans.studio.caddy
if [ ! -e "$caddy_file" ]; then
  install -m 644 -o "$user" -g "$user" /dev/null "$caddy_file"
fi

for unit in "${units[@]}"; do
  install -m 644 "$repo/deploy/$unit" /etc/systemd/system/
done
systemctl daemon-reload
systemctl enable --now kikk-timetable-deploy.timer

systemctl list-timers --no-pager kikk-timetable-deploy.timer
echo
echo "Installed. The first run deploys within a minute, follow it with:"
echo "  journalctl -u kikk-timetable-deploy -f"
