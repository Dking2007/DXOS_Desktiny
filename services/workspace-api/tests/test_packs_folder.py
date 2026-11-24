# SPDX-License-Identifier: Apache-2.0
# SPDX-FileCopyrightText: 2026 Desktiny contributors
"""Tìm thư mục gói ngành: mã nguồn, bản cài `make install`, cấu hình tường minh."""

from types import SimpleNamespace

from dx_workspace import packs


def _installed_module(prefix):
    module = prefix / "lib" / "python3.13" / "site-packages" / "dx_workspace" / "packs.py"
    module.parent.mkdir(parents=True)
    module.write_text("")
    return module


def test_installed_layout_finds_share_packs(tmp_path, monkeypatch):
    module = _installed_module(tmp_path)
    (tmp_path / "share" / "desktiny" / "packs").mkdir(parents=True)
    monkeypatch.setattr(packs, "__file__", str(module))
    found = packs.packs_folder(SimpleNamespace(packs_dir=""))
    assert found == tmp_path / "share" / "desktiny" / "packs"


def test_source_layout_wins_over_share(tmp_path, monkeypatch):
    module = _installed_module(tmp_path)
    (tmp_path / "packs").mkdir()
    (tmp_path / "share" / "desktiny" / "packs").mkdir(parents=True)
    monkeypatch.setattr(packs, "__file__", str(module))
    assert packs.packs_folder(SimpleNamespace(packs_dir="")) == tmp_path / "packs"


def test_settings_packs_dir_has_priority(tmp_path, monkeypatch):
    module = _installed_module(tmp_path)
    (tmp_path / "packs").mkdir()
    custom = tmp_path / "custom"
    custom.mkdir()
    monkeypatch.setattr(packs, "__file__", str(module))
    assert packs.packs_folder(SimpleNamespace(packs_dir=str(custom))) == custom


def test_candidates_order(tmp_path):
    module = _installed_module(tmp_path)
    root = module.resolve().parents[4]
    assert packs._pack_candidates(module) == [
        str(root / "packs"),
        str(root / "share" / "desktiny" / "packs"),
        "/app/packs",
    ]
