# SPDX-License-Identifier: Apache-2.0
# SPDX-FileCopyrightText: 2026 Desktiny contributors
"""ClamAV INSTREAM client against a fake clamd on a real localhost socket."""

import socket
import struct
import threading
from types import SimpleNamespace

import pytest
from dx_core.storage import scan_malware
from dx_platform.clamav import ScanInfected, ScanUnavailable, scan_bytes
from dx_platform.errors import AppError

# Test-file marker assembled at runtime so scanners do not quarantine this source file.
MARKER = b"EICAR-" + b"STANDARD-" + b"ANTIVIRUS-" + b"TEST-FILE"
SIGNATURE = "Win.Test.EICAR_HDB-1"


def fake_clamd(reply_for):
    server = socket.socket()
    server.bind(("127.0.0.1", 0))
    server.listen(1)
    received = {}

    def recv_exact(conn, n):
        buf = b""
        while len(buf) < n:
            part = conn.recv(n - len(buf))
            assert part
            buf += part
        return buf

    def serve():
        conn, _ = server.accept()
        with conn:
            assert recv_exact(conn, 10) == b"zINSTREAM\0"
            body = b""
            while True:
                (size,) = struct.unpack(">I", recv_exact(conn, 4))
                if size == 0:
                    break
                body += recv_exact(conn, size)
            received["body"] = body
            conn.sendall(reply_for(body))
        server.close()

    threading.Thread(target=serve, daemon=True).start()
    return server.getsockname()[1], received


def settings_for(port, host="127.0.0.1"):
    return SimpleNamespace(clamav_host=host, clamav_port=port, clamav_timeout_seconds=2)


def test_clean_file_passes_and_is_streamed_whole():
    port, got = fake_clamd(lambda body: b"stream: OK\0")
    data = b"a" * 200_000
    scan_bytes("127.0.0.1", port, data, timeout=5)
    assert got["body"] == data


def test_infected_file_is_rejected_with_signature():
    reply = lambda body: f"stream: {SIGNATURE} FOUND\0".encode()  # noqa: E731
    port, _ = fake_clamd(reply)
    with pytest.raises(ScanInfected) as err:
        scan_bytes("127.0.0.1", port, MARKER, timeout=5)
    assert err.value.signature == SIGNATURE
    port, _ = fake_clamd(reply)
    with pytest.raises(AppError) as app_err:
        scan_malware(settings_for(port), MARKER)
    assert app_err.value.status == 422 and app_err.value.code == "malware_detected"


def test_unreachable_clamd_fails_closed():
    probe = socket.socket()
    probe.bind(("127.0.0.1", 0))
    port = probe.getsockname()[1]
    probe.close()
    with pytest.raises(ScanUnavailable):
        scan_bytes("127.0.0.1", port, b"x", timeout=1)
    with pytest.raises(AppError) as err:
        scan_malware(settings_for(port), b"x")
    assert err.value.status == 503 and err.value.code == "malware_scan_unavailable"


def test_clamd_error_reply_fails_closed_and_empty_host_disables():
    port, _ = fake_clamd(lambda body: b"INSTREAM size limit exceeded. ERROR\0")
    with pytest.raises(ScanUnavailable):
        scan_bytes("127.0.0.1", port, b"x", timeout=5)
    scan_malware(settings_for(3310, host=""), MARKER)
