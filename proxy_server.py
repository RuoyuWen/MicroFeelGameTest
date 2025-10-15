#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI RPG 测试系统 - 带 OpenAI 代理的本地服务器
解决浏览器直接调用 OpenAI API 的 CORS 限制
"""

import http.server
import socketserver
import json
import urllib.request
import urllib.error
import webbrowser
import os
import sys
import socket
from urllib.parse import urlparse, parse_qs

# 尝试的端口列表
PORTS_TO_TRY = [8000, 8080, 8888, 3000, 5000, 9000]

def find_free_port(ports):
    """查找可用的端口"""
    for port in ports:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('', port))
                return port
        except OSError:
            continue
    return None

PORT = find_free_port(PORTS_TO_TRY)
if PORT is None:
    print("错误：所有常用端口都被占用")
    print(f"尝试的端口: {PORTS_TO_TRY}")
    sys.exit(1)

class ProxyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """带 OpenAI API 代理功能的 HTTP 请求处理器"""
    
    def end_headers(self):
        # 添加 CORS 头
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()
    
    def do_OPTIONS(self):
        """处理 OPTIONS 预检请求"""
        self.send_response(200)
        self.end_headers()
    
    def do_POST(self):
        """处理 POST 请求 - 代理 OpenAI API"""
        if self.path == '/api/openai':
            self.proxy_openai_request()
        else:
            self.send_error(404, "Not Found")
    
    def proxy_openai_request(self):
        """代理 OpenAI API 请求"""
        try:
            # 读取请求体
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            request_data = json.loads(post_data.decode('utf-8'))
            
            # 提取 API Key
            api_key = request_data.pop('api_key', None)
            if not api_key:
                self.send_error(400, "Missing API Key")
                return
            
            # 准备转发到 OpenAI 的请求
            openai_url = 'https://api.openai.com/v1/chat/completions'
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}'
            }
            
            # 创建请求
            req = urllib.request.Request(
                openai_url,
                data=json.dumps(request_data).encode('utf-8'),
                headers=headers,
                method='POST'
            )
            
            # 发送请求并获取响应
            with urllib.request.urlopen(req, timeout=60) as response:
                response_data = response.read()
                
                # 返回响应
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(response_data)
                
        except urllib.error.HTTPError as e:
            # OpenAI API 错误
            error_body = e.read().decode('utf-8')
            self.send_response(e.code)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(error_body.encode('utf-8'))
            
        except Exception as e:
            # 其他错误
            self.send_error(500, f"Proxy Error: {str(e)}")
    
    def log_message(self, format, *args):
        """自定义日志输出"""
        # 过滤掉静态文件请求的日志
        if self.path.startswith('/api/'):
            print(f"[API] {format % args}")

def main():
    print("=" * 60)
    print("  AI RPG 测试系统 - 代理服务器")
    print("=" * 60)
    print()
    
    # 切换到脚本所在目录
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    try:
        with socketserver.TCPServer(("", PORT), ProxyHTTPRequestHandler) as httpd:
            url = f"http://localhost:{PORT}"
            print(f"[OK] 服务器已启动")
            print(f"[OK] 使用端口: {PORT}")
            print(f"[OK] 服务器地址: {url}")
            print()
            print(f"请在浏览器中打开: {url}")
            print()
            print("[OK] OpenAI API 代理已启用（解决 CORS 问题）")
            print()
            print("按 Ctrl+C 可停止服务器")
            print("=" * 60)
            print()
            
            # 尝试自动打开浏览器
            try:
                webbrowser.open(url)
                print("[OK] 已在浏览器中打开")
            except:
                print("[WARN] 无法自动打开浏览器，请手动访问上述地址")
            
            print()
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n")
        print("=" * 60)
        print("服务器已停止")
        print("=" * 60)
        sys.exit(0)

if __name__ == "__main__":
    main()

