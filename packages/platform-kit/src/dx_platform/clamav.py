# SPDX-License-Identifier: Apache-2.0
# SPDX-FileCopyrightText: 2026 Desktiny contributors
"""Minimal clamd client (INSTREAM over TCP). No third-party dependency."""

import socket
import struct

CHUNK = 64 * 1024


class ScanUnavailable(Exception):
    """clamd could not be reached or answered with an error (callers fail closed)."""


class ScanInfected(Exception):
    def __init__(self, signature: str):
        self.signature = signature
        super().__init__(signature)


def scan_bytes(host: str, port: int, data: bytes, timeout: float = 10.0) -> None:
    """Return None if clean; raise ScanInfected or ScanUnavailable otherwise."""
    try:
        with socket.create_connection((host, port), timeout=timeout) as sock:
            sock.settimeout(timeout)
            sock.sendall(b"zINSTREAM\0")
            for start in range(0, len(data), CHUNK):
                chunk = data[start : start + CHUNK]
                sock.sendall(struct.pack(">I", len(chunk)) + chunk)
            sock.sendall(struct.pack(">I", 0))
            reply = b""
            while not reply.endswith(b"\0") and len(reply) < 4096:
                part = sock.recv(1024)
                if not part:
                    break
                reply += part
    except OSError as exc:  # includes timeouts and connection resets
        raise ScanUnavailable(str(exc)) from exc
    text = reply.rstrip(b"\0\n").decode("utf-8", "replace").strip()
    if text.endswith("OK") and text.startswith("stream:"):
        return
    if text.endswith("FOUND"):
        signature = text.removeprefix("stream:").removesuffix("FOUND").strip()
        raise ScanInfected(signature or "unknown")
    raise ScanUnavailable(text or "empty reply")
