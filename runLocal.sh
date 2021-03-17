cd "C:\Users\PC\Desktop\niso"
start redis-server
cmd "/C taskkill /f /IM "node.exe""
npm start