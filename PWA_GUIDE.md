# PWA Guide - Bake & Grill TV

## ✅ What Was Added

ChatGPT PWA recommendations have been implemented WITHOUT touching video playback code:

1. **PWA Icons** - 192×192, 512×512, maskable icons with B&G branding
2. **HTML Meta Tags** - iOS/Android PWA support
3. **Service Worker** - NEVER caches HLS streams (.m3u8, .ts)
4. **.htaccess** - HLS MIME types for mobile playback

## 📱 Install as PWA

**iPhone:**
1. Safari → https://tv.bakeandgrill.mv
2. Tap Share → Add to Home Screen

**Android:**
1. Chrome → https://tv.bakeandgrill.mv
2. Tap menu → Add to Home Screen

## 🎥 Video Playback

**Original system preserved:**
- M3U8 files fetched on-the-fly (no database storage)
- Channels parsed in real-time
- HLS.js for playback
- All existing functionality intact

## 🚀 Deploy

```bash
cd ~/tv.bakeandgrill.mv
git pull origin main
```

Then restart Node.js (use Node 18 as you recommended).

## ✅ Success Criteria

After deployment:
- ✅ Channel list should appear
- ✅ Videos should play
- ✅ Mobile scrolling works
- ✅ PWA can be installed

## 🔧 If Issues:

1. Use Node 18 (you're switching to this)
2. Hard refresh browser
3. Check that m3u8 URL is accessible: `curl -I https://haa.ovh/tv.m3u`

---

**Status: Safe PWA features added, video code unchanged**

