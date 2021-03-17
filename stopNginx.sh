cd "C:\nginx"
nginx -s stop
cmd "/C taskkill /f /IM "nginx.exe""
exit 0