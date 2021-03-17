cd "C:\nginx"
cmd "/C taskkill /f /IM "node.exe""
cmd "/C taskkill /f /IM "nginx.exe""
start nginx
cd "C:\Users\PC\Desktop\niso"
start redis-server
npm start