# 📺 Bake and Grill TV - User Guide

## Welcome to Bake and Grill TV! 🎉

Bake and Grill TV is a modern, web-based TV platform that allows you to stream live TV channels on any device. Whether you're watching on your phone, tablet, computer, or displaying on a TV screen, this platform provides a seamless viewing experience.

---

## 🌟 Key Features

### 📱 Multi-Device Support
- **Mobile Phones** - Watch TV on the go (iOS & Android)
- **Tablets** - Perfect for viewing at home
- **Desktop/Laptop** - Full-featured experience on your computer
- **Smart TVs** - Display TV channels on large screens for cafes, restaurants, or home use

### 🎬 Live TV Streaming
- Stream live TV channels in high quality
- Support for M3U playlist formats
- Organized channel groups (Sports, News, Entertainment, etc.)
- Channel logos and metadata

### 📺 Display Mode (Kiosk Mode)
- **Perfect for Businesses** - Display TV channels on screens in cafes, restaurants, lobbies
- **Automatic Playback** - Channels start playing automatically
- **Remote Control** - Control displays from your phone or admin panel
- **QR Code Pairing** - Easy connection setup

### 🎮 Remote Control
- **Change Channels** - Switch channels remotely from your phone
- **Volume Control** - Adjust volume, mute/unmute
- **Search Channels** - Find channels quickly by name
- **Filter by Group** - Browse channels by category

### 👥 User Management
- **Role-Based Access** - Admin, Staff, and User roles
- **Permission System** - Granular permissions for different features
- **Profile Management** - Update your profile and password

### 📊 Analytics & History
- Track viewing history
- Platform usage statistics (Admin only)
- Monitor display status

---

## 🚀 Getting Started

### Step 1: Create an Account

1. Visit **https://tv.bakeandgrill.mv** (or your server URL)
2. If you don't have an account, ask your administrator to create one for you
3. On first login, you'll be asked to complete your profile setup:
   - Update your phone number
   - Add or update your email (optional)
   - Set your name
   - Create a new password

### Step 2: Login

1. Open the login page
2. Enter your **Phone Number** (7 digits) OR **Email**
3. Enter your **Password**
4. Click **"Login"**

---

## 📺 How to Watch TV

### On Mobile/Tablet/Desktop

1. **After Login** - You'll see your dashboard with playlists
2. **Select a Playlist** - Click on any playlist card
3. **Choose a Channel** - Browse channels by group or search
4. **Start Watching** - Click on a channel to start streaming
5. **Player Controls**:
   - **Play/Pause** - Tap the video or use spacebar
   - **Volume** - Use your device volume buttons
   - **Fullscreen** - Tap the fullscreen button
   - **Channel List** - Tap to see all available channels
   - **Mute** - Use the mute button

### Channel Organization

- **Groups** - Channels are organized into groups (Sports, News, Movies, etc.)
- **Search** - Use the search bar to find channels by name
- **Grid View** - See channels in a visual grid with logos
- **List View** - See channels in a compact list format

### Now Playing Overlay

When a channel loads, you'll see a "Now Playing" overlay showing:
- Channel name
- Channel group
- Channel logo
- Current time

The overlay disappears after 6 seconds, or you can click on it to toggle.

---

## 📱 Display Feature - Setting Up a TV Display

The Display feature allows you to show TV channels on a physical TV screen (like in a cafe or restaurant). This is called "Kiosk Mode."

### What You Need

- A TV, monitor, or large display
- A device connected to the display (Android TV box, Raspberry Pi, computer, tablet, etc.) with a web browser
- An admin account with display management permissions

---

## 🔗 How to Connect a Display to a TV

### Method 1: QR Code Pairing (Easiest) ⭐ **Recommended**

This is the simplest method - perfect for quick setup!

#### Step 1: On the TV Screen

1. Open a web browser on the device connected to your TV
2. Navigate to: **https://tv.bakeandgrill.mv/#/pair**
3. You'll see two tabs: **"PIN Code"** and **"QR Code"**
4. Click the **"📱 QR Code"** tab
5. A **large QR code** will appear on the TV screen

#### Step 2: On Your Phone (Admin)

1. Open the Bake and Grill TV app on your phone
2. Login as an admin user
3. Go to **"Display Management"** (Admin menu)
4. Click **"Pair New Display"** button
5. Select the **"QR Code"** tab
6. **Scan the QR code** from the TV screen with your phone camera
   - Your phone camera will automatically detect it
   - You'll see an "Open" notification
   - Tap to open
7. The pairing page will open with the PIN pre-filled! ✨
8. Enter:
   - **Display Name** (e.g., "Main TV", "Cafe TV 1")
   - **Location** (e.g., "Main Hall", "Counter")
   - **Playlist** - Select which playlist to play on this display
9. Click **"Pair Display"**
10. The TV will automatically connect and start playing channels! 🎉

#### How It Works

- Your phone camera scans the QR code
- The QR code contains the pairing PIN
- The pairing page opens automatically with the PIN already filled in
- You just need to add the display name and playlist
- The display connects instantly

### Method 2: PIN Code Pairing

If QR code scanning doesn't work, you can use PIN pairing:

#### Step 1: On the TV Screen

1. Open a web browser on the device connected to your TV
2. Navigate to: **https://tv.bakeandgrill.mv/#/pair**
3. You'll see a **6-digit PIN code** (e.g., `123456`)
4. **Note this PIN** - it refreshes every 5 minutes

#### Step 2: On Your Phone/Computer (Admin)

1. Login to the Bake and Grill TV admin panel
2. Go to **"Display Management"**
3. Click **"Pair New Display"**
4. Select the **"PIN Code"** tab
5. Enter:
   - **PIN Code** (the 6-digit code from TV)
   - **Display Name** (e.g., "Main TV", "Cafe TV 1")
   - **Location** (e.g., "Main Hall", "Counter")
   - **Playlist** - Select which playlist to play on this display
6. Click **"Pair Display"**
7. The TV will automatically connect and start playing!

---

## 🎮 How to Use Remote Control

Once a display is paired, you can control it remotely from your phone or admin panel!

### Accessing Remote Control

1. Go to **"Display Management"** (Admin menu)
2. Find the display you want to control
3. Check the display status:
   - 🟢 **Green Badge** = Online (display is connected)
   - 🔴 **Red Badge** = Offline (display is disconnected)
4. Click the **"🎮 Remote Control"** button on an online display

### Remote Control Features

#### 🔍 Search Channels

- Type in the search box to find channels by name
- Results update as you type
- Click **"Clear search"** to reset

#### 📂 Filter by Group

- Select a group from the dropdown (Sports, News, Movies, etc.)
- See only channels in that category
- Select **"All Groups"** to see everything

#### 📺 Change Channel

1. Scroll through the channel list
2. **Click any channel** - It switches instantly! ⚡
3. No need to click a separate "Switch" button
4. The channel change happens automatically

#### 🔊 Audio Controls

- **🔇 Mute** - Mute the audio on the display
- **🔊 Unmute** - Unmute the audio on the display
- **Volume Slider** - Drag to adjust volume (0-100%)
  - Changes apply instantly as you drag
  - Note: iPhones ignore web volume control - use device buttons for iPhones
  - iPads work perfectly with the slider

#### 📱 Mobile Tips

- The remote control works great on mobile!
- Channels are displayed as clickable buttons (not dropdowns)
- Easy to scroll and tap channels
- Search works instantly

### Closing the Remote

- Click **"Close Remote"** at the bottom to exit
- The display keeps playing - you can reopen the remote anytime

---

## 📅 Channel Scheduling (Advanced)

Admins can schedule channels to play at specific times on displays:

1. Go to **"Display Management"**
2. Find your display
3. Click **"📅 Schedule"** button
4. **Add New Schedule**:
   - Select a channel
   - Choose day of week (or "Every Day")
   - Set start time
   - Set end time
5. The channel will automatically switch at the scheduled times

---

## 🏠 Using Display Mode (Kiosk Mode) on TV

Once a display is paired and connected:

### Automatic Features

- **Auto-Play** - Channels start playing automatically
- **Auto-Login** - Display remembers its connection
- **Status Updates** - Admin panel shows if display is online/offline
- **Error Handling** - Displays error messages if connection fails

### Display Controls on TV

- **Fullscreen Button** (top-left) - Toggle fullscreen mode
- **Exit Fullscreen** - Click to exit fullscreen
- **Channel Info** - Shows current channel name and display name

### What You'll See

- The current channel playing
- Channel name at the bottom
- Display name (if configured)
- Fullscreen button in the top corner

---

## 🆘 Troubleshooting

### Display Won't Connect

1. **Check Internet Connection** - Both TV and admin device need internet
2. **Verify PIN/QR Code** - Make sure PIN is correct and not expired (PINs refresh every 5 minutes)
3. **Check Permissions** - Make sure your account has "Display Management" permission
4. **Refresh TV Page** - Try refreshing the pairing page on the TV

### Display Shows as Offline

1. **Check TV Browser** - Make sure the browser is open and the display page is loaded
2. **Internet Connection** - Verify the TV device has internet
3. **Auto-Refresh** - Wait a few seconds - status updates every 5 seconds
4. **Refresh Admin Page** - Refresh the Display Management page

### Remote Control Not Working

1. **Check Display Status** - Make sure display shows as 🟢 Online (green badge)
2. **Open Remote Again** - Close and reopen the remote control modal
3. **Check Internet** - Both devices need active internet connection

### Channels Not Playing

1. **Check Playlist** - Verify the playlist has channels configured
2. **Try Different Channel** - Test with another channel
3. **Check Channel URL** - The channel stream URL might be invalid
4. **Browser Console** - Check for error messages (F12 key on desktop)

### Volume Control Not Working on iPhone

- **Known Issue**: iPhones ignore web volume control
- **Solution**: Use the device's physical volume buttons
- **Workaround**: iPads work perfectly with the web volume slider

---

## 💡 Tips & Best Practices

### For Displays

- **Bookmark the Display URL** - After pairing, bookmark the display page URL for easy access
- **Use QR Code Pairing** - It's faster and easier than PIN codes
- **Name Displays Clearly** - Use descriptive names like "Main TV - Counter" instead of "TV 1"
- **Check Display Status** - Regularly check that displays show as online (green badge)

### For Remote Control

- **Search First** - If you have many channels, use search to find what you want quickly
- **Use Groups** - Filter by group to narrow down channel selection
- **Mobile-Friendly** - Remote control works best on mobile devices
- **Instant Switching** - Just tap a channel to switch - no extra buttons needed!

### For Watching TV

- **Create Playlists** - Organize channels into playlists for easy access
- **Use Groups** - Organize channels into logical groups (Sports, News, etc.)
- **Grid View** - Use grid view to see channel logos easily
- **Now Playing** - Check the "Now Playing" overlay to see current channel info

---

## 📞 Support

If you encounter any issues:

1. Check this guide first
2. Check the troubleshooting section
3. Contact your system administrator
4. Check the server logs (if you have access)

---

## 🎉 Enjoy Your TV Experience!

Bake and Grill TV is designed to be simple, fast, and reliable. Whether you're watching at home, controlling displays in your business, or streaming on the go, we hope you enjoy the platform!

**Happy Watching! 📺✨**

---

*Last Updated: 2025-01-21*
*Version: 1.0.6*

