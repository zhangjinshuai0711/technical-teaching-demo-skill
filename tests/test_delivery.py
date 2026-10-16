"""Standard-library checks for serving and distributing the static demo."""
import hashlib
from pathlib import Path
import selectors
import signal
import subprocess
import sys
import tempfile
import unittest
from urllib.error import HTTPError
from urllib.request import urlopen
import zipfile

REPO = Path(__file__).resolve().parents[1]
DEMO = REPO / "technical-teaching-demo" / "assets" / "minimal-demo"


def start_server(folder, port=0):
    process = subprocess.Popen(
        [sys.executable, str(folder / "serve.py"), "--port", str(port)],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
    )
    selector = selectors.DefaultSelector()
    try:
        selector.register(process.stdout, selectors.EVENT_READ)
        if not selector.select(timeout=10):
            raise AssertionError("Server did not report readiness within 10 seconds")
        line = process.stdout.readline().strip()
        if not line.startswith("http://127.0.0.1:"):
            raise AssertionError(f"Server failed to start: {line}")
        return process, line
    except BaseException:
        process.kill()
        process.communicate()
        raise
    finally:
        selector.close()


def stop_server(process):
    process.send_signal(signal.SIGINT)
    process.communicate(timeout=10)
    if process.returncode != 0:
        raise AssertionError(f"Server exit status: {process.returncode}")


class DeliveryTests(unittest.TestCase):
    def test_http_resources_restart_and_isolation(self):
        with tempfile.TemporaryDirectory() as scratch:
            root = Path(scratch)
            folder = root / "demo"
            folder.mkdir()
            for source in DEMO.iterdir():
                if source.is_file():
                    (folder / source.name).write_bytes(source.read_bytes())
            secret = root / "private.txt"
            secret.write_text("must not be served")
            (folder / "outside.txt").symlink_to(secret)
            (folder / "empty").mkdir()
            (folder / "linked-index").mkdir()
            (folder / "linked-index" / "index.html").symlink_to(secret)
            process, address = start_server(folder)
            port = int(address.rstrip("/").rsplit(":", 1)[1])
            try:
                for name in ("index.html", "style.css", "demo.js"):
                    with urlopen(address + name, timeout=5) as response:
                        self.assertEqual(response.status, 200)
                        self.assertEqual(response.read(), (folder / name).read_bytes())
                for name, status in (("outside.txt", 403), ("linked-index/", 403), ("empty/", 404), ("../private.txt", 404)):
                    with self.assertRaises(HTTPError) as caught:
                        urlopen(address + name, timeout=5)
                    self.assertEqual(caught.exception.code, status)
                    caught.exception.close()
                conflict = subprocess.run(
                    [sys.executable, str(folder / "serve.py"), "--port", str(port)],
                    capture_output=True, text=True, timeout=5,
                )
                self.assertNotEqual(conflict.returncode, 0)
                self.assertIn("--port", conflict.stderr)
            finally:
                stop_server(process)
            process, restarted = start_server(folder, port)
            try:
                self.assertEqual(restarted, address)
                with urlopen(restarted, timeout=5) as response:
                    self.assertIn(b"<!doctype html>", response.read())
            finally:
                stop_server(process)

    def test_zip_crc_hash_and_extracted_server(self):
        with tempfile.TemporaryDirectory() as scratch:
            root = Path(scratch)
            archive = root / "demo.zip"
            source_files = [p for p in DEMO.iterdir() if p.is_file()]
            self.assertGreaterEqual(len(source_files), 4)
            with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as package:
                for source in source_files:
                    package.write(source, "minimal-demo/" + source.name)
            with zipfile.ZipFile(archive) as package:
                self.assertIsNone(package.testzip())
                package.extractall(root / "extracted")
            folder = root / "extracted" / "minimal-demo"
            for source in source_files:
                self.assertEqual(hashlib.sha256(source.read_bytes()).digest(),
                                 hashlib.sha256((folder / source.name).read_bytes()).digest())
            process, address = start_server(folder)
            try:
                with urlopen(address, timeout=5) as response:
                    self.assertEqual(response.status, 200)
            finally:
                stop_server(process)


if __name__ == "__main__":
    unittest.main()
