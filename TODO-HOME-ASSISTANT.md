# Home Assistant CORS Fix Required

## The Problem
The wall display on Netlify can't fetch entities from Home Assistant due to CORS blocking.
New fans won't appear until this is fixed.

## The Fix

1. Edit your Home Assistant `configuration.yaml`:

```yaml
http:
  cors_allowed_origins:
    - https://walldisplay1.netlify.app
```

2. Restart Home Assistant:
   - Go to Settings > System > Restart
   - Or run: `docker restart homeassistant`

3. Refresh the wall display - all fans should now appear!

## Verify It's Working

Open browser console (F12) on the wall display and look for:
```
[HA] Found fans: ["fan.master_bedroom", "fan.ellas_room", "fan.living_room", ...]
[HA] Matched fans with extras: [...]
```

If you see the CORS error instead, double-check the config and restart HA again.

---
Delete this file once the fix is applied.
