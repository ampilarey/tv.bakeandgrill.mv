# 🎮 Remote Control Guide

## Overview
The IPTV Player includes a complete remote control system for managing cafe display screens from the admin panel.

## Features

### ✅ Working on ALL Devices
1. **Change Channel** - Switch what's playing on the display
2. **Mute** - Instantly silence the display
3. **Unmute** - Restore audio to the display
4. **Group Filter** - Filter channels by group before selecting

### ⚠️ Volume Control Limitations

#### Works on:
- ✅ Android devices
- ✅ Desktop/Laptop computers
- ✅ Smart TVs with web browsers
- ✅ **iPad** (iOS Safari) ✨

#### Does NOT work on:
- ❌ **iPhone** (iOS Safari)

**Why?** Apple restricts web volume control on iPhones for security reasons. However, iPads allow web applications to control video volume through the `video.volume` JavaScript property.

**Solution for iPhone displays:** Use the device's physical volume buttons to adjust volume, and use Mute/Unmute buttons for quick control from admin panel.

**Great for iPads!** If your cafe displays are iPads, you can fully control volume remotely! 🎉

---

## How to Use Remote Control

### Step 1: Access Admin Panel
```
http://your-domain.com/admin/displays
```

### Step 2: Open Remote Control
Click the **"Remote Control"** button next to any active display.

### Step 3: Select a Channel
1. Use the **"Filter by Group"** dropdown to narrow down channels
2. Select a channel from the list (shows channel name and group)
3. Click **"Switch Channel Now"**

**Result:** Within 1-2 seconds, the display will switch to the selected channel.

### Step 4: Adjust Volume (iPad/Desktop/Android)
1. **Simply drag the volume slider** to your desired level
2. The command sends automatically 0.5 seconds after you stop dragging
3. Display volume adjusts within 1-2 seconds

### Step 5: Quick Audio Control

- Click **"🔇 Mute"** - Display mutes within 1-2 seconds
- Click **"🔊 Unmute"** - Display unmutes within 1-2 seconds

**Works on ALL devices including iPhones!**

---

## Technical Details

### Command Polling
- Displays poll for commands every **2 seconds** (fast response)
- Commands are queued in the database
- Once executed, commands are marked as complete
- Average command execution time: 1-2 seconds

### Visual Feedback on Display
When a remote command is received, the display shows:
- **Yellow pulsing box** in top-left corner
- Command type and time
- Example: "🎮 set_volume (75%) 14:30:25"

### Network Requirements
- Admin panel and displays must both have internet access
- Both connect to your server (not direct P2P)
- Video streams directly from IPTV provider (not through your server)

---

## Use Cases

### Morning Cafe Opening (iPad Display)
```
1. Turn on display (iPad mounted on wall)
2. Display auto-loads and starts playing first channel
3. From admin panel on your phone:
   - Open Remote Control
   - Drag volume slider to comfortable level (e.g., 60%)
   - Volume adjusts automatically!
```

### Morning Cafe Opening (iPhone Display)
```
1. Turn on display (iPhone mounted on wall)
2. Display auto-loads and starts playing first channel
3. Use iPhone physical volume buttons to set comfortable level
4. From admin panel, you can still Mute/Unmute remotely
```

### Customer Request Different Content
```
1. Customer asks to watch news instead of music videos
2. Pull out your phone
3. Open Admin Panel → Displays → Remote Control
4. Select "News" from group filter
5. Pick a news channel
6. Click "Switch Channel Now"
7. Within 1-2 seconds, TV switches to news
```

### Emergency Silence
```
1. Important announcement needed in cafe
2. Click "Mute" button
3. All displays mute within 1-2 seconds
4. Make announcement
5. Click "Unmute" when done
```

---

## Troubleshooting

### "Commands not reaching display"
**Check:**
1. Display is online (green dot in admin panel)
2. Display has internet connection
3. Display token is valid
4. Wait up to 2 seconds (polling interval)

### "Volume control not working on iPhone"
**This is expected!** iPhones block web volume control. 
- **iPad users:** Volume control works! ✅
- **iPhone users:** Use device volume buttons or Mute/Unmute buttons

### "Display shows yellow command box but nothing happens"
**Check display console logs:**
1. Open Safari Dev Tools (desktop Mac + iPhone)
2. Look for error messages
3. Check if `videoRef.current` exists
4. Verify channel ID is valid

---

## API Endpoints

### For Admin Panel
```
POST /api/displays/:id/control
Body: {
  action: 'change_channel' | 'set_volume' | 'mute' | 'unmute',
  channel_id?: number,
  volume?: number
}
```

### For Displays (Public)
```
GET /api/displays/commands/:token
Returns: { commands: [...] }

PATCH /api/displays/commands/:id/execute
Marks command as executed
```

---

## Best Practices for Cafe

1. **Set up displays during slow hours** - Test remote control when few customers are present
2. **Choose iPads over iPhones** - iPads support full remote volume control, iPhones don't
3. **Pre-adjust iPhone volume** - If using iPhones, set volume buttons to comfortable level before mounting
4. **Use Mute for emergencies** - Near-instant way to silence without walking to display (1-2 seconds)
5. **Group channels** - Organize playlists by type (Music, News, Sports) for easier remote selection
6. **Fast response** - 2-second polling provides near-instant control

---

## Future Enhancements (Not Yet Implemented)

- [ ] Schedule automatic channel changes
- [ ] Volume presets (Morning: 30%, Evening: 50%)
- [ ] Multi-display control (change all displays at once)
- [ ] Display screenshots in admin panel
- [ ] WebSocket for truly instant commands (currently 1-2 second polling is sufficient)

---

## Summary

✅ **What Works Everywhere:**
- Change channel remotely (1-2 second response)
- Mute/Unmute remotely (1-2 second response)
- Group filtering
- Fast 2-second polling for near-instant control

⚠️ **iPhone Limitation:**
- Volume adjustment requires device buttons (iPhones only)
- **iPads:** Full volume control works! ✅
- Mute/Unmute works perfectly on all devices

🎯 **Perfect for Cafes:**
- Control displays from anywhere in the cafe
- No need to physically touch wall-mounted devices
- Quick response to customer requests

