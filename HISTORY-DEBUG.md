# 🔍 History Debugging Guide

## Status: Table exists ✅

Run these commands on your production server:

```bash
# 1. Check table structure
mysql -u bakeandgrill -p bakeandgrill_tv -e "DESCRIBE watch_history;"

# 2. Check if any history records exist
mysql -u bakeandgrill -p bakeandgrill_tv -e "SELECT COUNT(*) as total FROM watch_history;"

# 3. Check recent records (if any)
mysql -u bakeandgrill -p bakeandgrill_tv -e "SELECT * FROM watch_history ORDER BY watched_at DESC LIMIT 5;"

# 4. Check server logs for history API calls
tail -100 ~/tv-server.log | grep -i history

# 5. Test the history API endpoint directly
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:4000/api/history

# 6. Try to manually insert a test record
mysql -u bakeandgrill -p bakeandgrill_tv -e "INSERT INTO watch_history (user_id, playlist_id, channel_id, channel_name, duration_seconds) VALUES (1, 1, 'test123', 'Test Channel', 60);"

# 7. Check if that worked
mysql -u bakeandgrill -p bakeandgrill_tv -e "SELECT * FROM watch_history ORDER BY watched_at DESC LIMIT 1;"
```

---

## 📱 Test on Mobile Browser

1. Open **https://tv.bakeandgrill.mv** on your phone
2. Go to a playlist and watch a channel
3. Wait at least 6-7 seconds
4. Then check production database again:

```bash
mysql -u bakeandgrill -p bakeandgrill_tv -e "SELECT * FROM watch_history ORDER BY watched_at DESC LIMIT 3;"
```

---

## 🔍 Common Issues

### Issue 1: No records being created
**Cause:** JavaScript error preventing API call
**Fix:** Check browser console for errors

### Issue 2: Records created but user_id mismatch
**Cause:** Production user has different ID than local
**Fix:** Check which user_id you're logged in as

### Issue 3: API endpoint not working
**Cause:** Route not registered or middleware blocking
**Fix:** Check server logs when watching

---

## Next Steps

Please run commands 1-7 above and send me the results!

