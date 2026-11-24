# DXOS V3 — Những thay đổi so với V2

**V2** = bản 0.2.2 (tag `v0.2.2`, commit `44a0873`, 31/10/2026): hoàn thiện hồ sơ kho mã cho chấm PoF, chức
năng giữ như V1. **V3** = bản 3.0.0 (tag `v3.0.0`, 15/11/2026): thêm chức năng lớn (quy trình trên canvas, gói
ngành, plugin kết nối, tính năng AI), giữ nguyên toàn bộ quy trình quản lý giấy phép, biên dịch, phát hành và
tài liệu đã dựng ở V2. Chi tiết từng thay đổi: [CHANGELOG.md](../CHANGELOG.md), mục `[3.0.0]`.

Số phiên bản nhảy từ 0.2.2 lên 3.0.0 để khớp tên gọi V3 (V1 = 0.1.0, V2 = 0.2.x). Theo SemVer, đổi số chính là
hợp lệ vì V3 có migration xóa cột (`workspace_0014`) và contract API mới. Gói tách riêng giữ số phiên bản của
chính chúng: `dx-flowkit` 0.2.0, `desktiny-plugin` 0.2.0, `dx-piivn` 0.1.0.

## 1. Tóm tắt

| Hạng mục | V2 (0.2.2) | V3 (3.0.0) |
|---|---|---|
| Chức năng | Core + Workspace: hồ sơ, biểu mẫu, Drive, phê duyệt, trợ lý AI | + quy trình hồ sơ vẽ trên canvas, phiên bản quy trình, hạn theo từng bước, gói ngành `desktiny-pack/1`, plugin kết nối `desktiny-plugin/1` (API bản 2), hỏi đáp AI về hồ sơ, trợ lý công việc, hồ sơ cá nhân, đính kèm tệp cho công việc, chuỗi băm nhật ký kiểm toán (Core) |
| Migration CSDL | Core `core_0002`, Workspace `workspace_0013` | + `core_0003`, `workspace_0014`–`workspace_0027` |
| Contract API | `core.openapi.json`, `workspace.openapi.json` | + `plugin.openapi.json` |
| Gói tách riêng | `dx-platform-kit`, `dx-flowkit` | + `desktiny-plugin` (SDK và CLI cho plugin), `dx-piivn` (nhận diện thông tin cá nhân tiếng Việt) |
| Kiểm thử tự động | pytest 108, vitest 45 (lượt chạy 27/10) | pytest 351, vitest 83 (lượt chạy 15/11) |
| Khai báo thành phần ngoài | `THIRD_PARTY.md`: 309 npm, 54 Python | `THIRD_PARTY.md`: 310 npm, 63 Python, 0 gói cần duyệt; sinh lại khớp lockfile |
| Người đóng góp (commit, không tính merge) | Chủ yếu `Dking2007`; `Raphael-Fug` qua PR #32 | Từ `v0.2.2` đến `v3.0.0`: `Dking2007` 51, `Raphael-Fug` 28, `Mai1174` 17 |
| Pull Request | #29–#33 | + #34–#38 đã merge trên GitHub |
| Phát hành | tag `v0.1.0`, `v0.2.0`, `v0.2.1`, `v0.2.2` | + tag `v3.0.0`; workflow `release.yml` tạo `.tar.gz` + `SHA256SUMS` khi tag được push |

Quy mô thay đổi so với `v0.2.2`: khoảng 300 tệp, +53 000 / −8 600 dòng.

## 2. Nội dung bản 3.0.0 lấy từ đâu

| Nguồn | Trạng thái | Ghi chú |
|---|---|---|
| `main` đến PR #38 (`9d39f72`) | Có | Gồm PR #34–#36 và mọi commit sau `v0.2.2` |
| Gói ngành, PR #37 (`c94a6e5`) | Có, **áp dụng lại** | PR #38 đã revert PR #37 trên `main`. V3 áp dụng lại (commit `Reapply "Merge pull request #37…"`) vì `feat/plugin-ket-noi` xây trên commit này; thiếu nó thì plugin kết nối không build được |
| `feat/plugin-ket-noi` (`c305138`, Mai1174) | Có | 12 commit: sự kiện, API ghi có phạm vi, tệp, bước quy trình chạy lâu, khung giao diện, công cụ cho trợ lý AI, SDK |
| Commit `1f57e43` của `feat/plugin-dong-goi` (Raphael-Fug) | Có, cherry-pick | Sửa `web.Dockerfile` để image web build được khi có plugin mẫu (mục 5) |
| Phần còn lại của `feat/plugin-dong-goi` (Mai1174) | **Không** | Plugin cài bằng tệp `.zip` và đổi tên "Gói ngành" thành "Gói giao diện". Để lại cho bản sau |

## 3. Đối chiếu 6 tiêu chí PoF

| # | Tiêu chí (điểm) | Trạng thái V2 | Việc đã làm ở V3 | Còn lại / cần người |
|---|---|---|---|---|
| 1 | Quản lý mã nguồn (5) | Có commit của 2 tài khoản | 3 tài khoản có commit riêng (`Dking2007`, `Raphael-Fug`, `Mai1174`); thay đổi đi qua nhánh tính năng và PR #34–#38 | Merge `release/v3.0.0` bằng PR trên GitHub để có dấu vết duyệt; xóa các nhánh đã merge |
| 2 | Cấp phép OSI (10) | SPDX 180 tệp, `reuse lint` đạt | Tệp mới đều có header SPDX hoặc nằm trong `REUSE.toml`; `add_spdx_headers --check` đạt; `reuse lint` đạt (xem mục 4) | ScanCode vẫn chưa chạy |
| 3 | Release (5) | Tag SemVer + Release tự động | Tag `v3.0.0`, CHANGELOG mục `[3.0.0]` kèm lý do đổi số chính | Push tag để workflow tạo Release; kiểm `.tar.gz` và `SHA256SUMS` trên GitHub |
| 4 | Cài đặt & biên dịch (10) | `BUILD.md`, `Makefile`, `make install PREFIX=` | Build Docker Compose từ code V3 và chạy migration trên CSDL có sẵn dữ liệu (mục 4) | Chạy `make up` trên máy sạch (`.gitattributes` đã có, LF thống nhất) |
| 5 | Thư viện & gói (10) | `THIRD_PARTY.md` đầy đủ | Sinh lại `THIRD_PARTY.md` từ lockfile, không có khác biệt; 0 gói cần duyệt | `pip-licenses` cho 63 gói Python (xem mục 4) |
| 6 | Tài liệu & giao tiếp (10) | CHANGELOG, CONTRIBUTING, mẫu issue/PR | CHANGELOG `[3.0.0]`, tài liệu này, `docs/plugins.md`, `docs/packs.md`, `SELF_REVIEW.md` cập nhật | Thành viên ký `SELF_REVIEW.md` |

## 4. Đã kiểm ngày 15/11/2026

Trên nhánh `release/v3.0.0`, máy Windows 11 có Docker Desktop. Kết quả đúng như in ra từ lệnh.

- `npm run typecheck`: `workspace-web`, `core-admin` không lỗi.
- `npm test` (vitest): 20 tệp, 83/83 đạt.
- `ruff check packages services scripts tests examples infra`: không lỗi.
- `pytest -q`: 351 đạt. Chạy trong container `python:3.13-slim` có `libpq5`, CSDL `postgres:17.5-alpine`, đúng cấu
  hình job `backend` của CI. Không chạy trực tiếp trên Windows được vì thiếu libpq (xem mục 5).
- `node scripts/add_spdx_headers.mjs --check`: mọi tệp đã có header SPDX.
- `node scripts/audit_repo.mjs`: kho sạch, 439 tệp, 1 tệp compose được kiểm.
- `node scripts/gen_third_party.mjs`: 310 npm (67 prod, 243 dev), 63 Python, 0 gói cần duyệt; `THIRD_PARTY.md`
  không thay đổi sau khi sinh lại.
- `reuse lint` (bản clone trong container): 434/434 tệp có thông tin bản quyền và giấy phép, đạt REUSE 3.3.
- `pip-licenses` trên `requirements.lock`: trong các gói của dự án chỉ `psycopg` là LGPL-3.0 (đã khai báo trong
  `THIRD_PARTY.md`). `python-debian` (GPL-2.0+) chỉ có mặt vì cài công cụ `reuse` để kiểm.
- Docker Compose (`--profile workspace`) build từ code V3: build image thành công sau khi sửa `web.Dockerfile` (mục 5); trên CSDL đang có dữ liệu ở `workspace_0021` (bản `main` trước đó), migration `workspace_0022`–`workspace_0027` chạy thành công; tất cả dịch vụ lên, `/` và `/console/` trả 200, `/workspace/v1/auth/login` chuyển hướng 302 sang Keycloak. Chưa kiểm nâng cấp trực tiếp từ CSDL của `v0.2.2`.

## 5. Rủi ro đã nhận diện

- **Image web của `feat/plugin-ket-noi` không build được** (đã sửa). Test `flow/pluginNodes.test.ts` đọc manifest
  trong `examples/plugins`, nhưng `web.Dockerfile` không copy thư mục này nên `vue-tsc` báo lỗi. Đã cherry-pick bản
  sửa `1f57e43`. Bài học: CI hiện chạy typecheck trên máy runner, không build image, nên lỗi này lọt qua CI.
- **npm bỏ qua gói tùy chọn khi tải lỗi.** Một lượt build image thiếu `@rollup/rollup-linux-x64-musl` dù lockfile có
  đủ; build lại với `--no-cache` thì đạt. Nếu gặp lại, xóa cache build của image web.
- **Gói ngành bị revert rồi áp dụng lại.** `main` revert PR #37 ở PR #38 ngày 14/11; V3 đưa lại vì plugin kết
  nối phụ thuộc vào nó, và `main` đã áp dụng lại (commit `5045637`).
- **Xuống dòng CRLF trên Windows.** Kho đã có `.gitattributes` (LF thống nhất), nên máy đặt `core.autocrlf=true`
  vẫn checkout `infra/compose/init-databases.sh` với LF và Postgres tạo được user CSDL.
- **Test Python trên Windows.** `psycopg` thuần Python cần libpq của hệ điều hành; Windows không có sẵn nên phải
  chạy pytest trong container như CI.
- **Nhảy số phiên bản.** Người đọc lịch sử tag sẽ thấy `v0.2.2` → `v3.0.0`. Lý do được ghi ở CHANGELOG và đầu tài
  liệu này.
