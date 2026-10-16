#!/usr/bin/env python3
"""Serve only this demo directory on loopback; Python 3.9+, no dependencies."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent


class DemoHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        resolved = Path(super().translate_path(path)).resolve()
        if not resolved.is_relative_to(ROOT):
            raise PermissionError("Path leaves the demo directory")
        if resolved.is_dir():
            for name in ("index.html", "index.htm"):
                index = resolved / name
                if index.is_file():
                    if not index.resolve().is_relative_to(ROOT):
                        raise PermissionError("Index leaves the demo directory")
                    break
        return str(resolved)

    def send_head(self):
        try:
            return super().send_head()
        except PermissionError:
            self.send_error(403, "Outside demo directory")
            return None

    def list_directory(self, path):
        self.send_error(404, "Directory listing disabled")
        return None


def main():
    parser = argparse.ArgumentParser(description="本地教学页面预览，只监听 127.0.0.1")
    parser.add_argument("--port", type=int, default=8765, help="端口，默认 8765；0 自动分配")
    args = parser.parse_args()
    if not 0 <= args.port <= 65535:
        parser.error("端口必须在 0–65535 之间")
    try:
        server = ThreadingHTTPServer(("127.0.0.1", args.port), partial(DemoHandler, directory=str(ROOT)))
    except OSError as error:
        parser.exit(1, f"启动失败：{error}。尝试 --port 8766 或 --port 0。\n")
    with server:
        print(f"http://127.0.0.1:{server.server_port}/", flush=True)
        print("保持此进程运行；按 Ctrl+C 停止。重启时重新运行相同命令。", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
