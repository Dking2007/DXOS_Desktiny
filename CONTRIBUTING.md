# Đóng góp cho Desktiny

Cảm ơn bạn đã quan tâm. Tài liệu này mô tả cách báo lỗi, đề xuất và gửi mã.

## Quy trình

Mỗi thay đổi đi qua cùng một vòng đời:

1. **Issue**: tìm hoặc tạo issue (mẫu bug / tính năng), gắn **label** và **milestone**, tự gán (assign) mình làm.
2. **Nhánh** tạo từ `main`: `feat/<số-issue>-<mô-tả>`, `fix/<số-issue>-<mô-tả>` hoặc `docs/<số-issue>-<mô-tả>`.
3. **Commit** nhỏ, theo [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `chore:`.
   **Dùng tài khoản và email của chính bạn** để lịch sử phản ánh đúng người làm.
   Trước commit đầu tiên: `git config user.name "Tên của bạn"` và `git config user.email "email-gắn-với-tài-khoản-GitHub"`
   (đừng để git dùng tên mặc định như `unknown`). Kiểm tra: `git log --format="%an <%ae>" -3`. Nếu cùng một người xuất hiện
   dưới nhiều tên, thêm một dòng vào [.mailmap](.mailmap).
4. **Pull Request** có `Fixes #<số-issue>` trong mô tả, điền checklist của [mẫu PR](.github/pull_request_template.md), và
   cập nhật [CHANGELOG.md](CHANGELOG.md) mục `[Unreleased]` trong **cùng PR**.
5. **Duyệt**: CI xanh (lint, test, build, `compliance`) và ít nhất **một người khác** duyệt; không tự duyệt PR của mình.
6. **Merge** vào `main` rồi **xóa nhánh**.
7. Khi xong một phạm vi (milestone), làm **phát hành** theo mục dưới.

## Phát hành

Chỉ làm khi phạm vi của milestone đã xong. Mọi bước dưới đây chạy ở thư mục gốc kho.

1. Tạo nhánh `release/x.y.z` từ `main` và đặt số phiên bản mới ở **mọi** chỗ sau (hiện là `3.1.0`):
   - `package.json`
   - `apps/core-admin/package.json`, `apps/shared/package.json`, `apps/workspace-web/package.json`; trong hai tệp
     `apps/core-admin` và `apps/workspace-web` còn phải sửa phụ thuộc `"@dx/web-shared"`
   - `package-lock.json`: không sửa tay, chạy `npm install --package-lock-only`
   - `packages/platform-kit/pyproject.toml`
   - `services/core-api/pyproject.toml` và `services/workspace-api/pyproject.toml`; trong cả hai còn phải sửa
     `dx-platform-kit==x.y.z`
   - `version=` trong `services/core-api/src/dx_core/main.py` và `services/workspace-api/src/dx_workspace/main.py`
     (đây là phiên bản hiện trong OpenAPI)
2. Sinh lại hợp đồng API và kiểu TypeScript: `python scripts/export_contracts.py` (ghi `contracts/*.openapi.json`),
   rồi `npm run generate:api`.
3. Chuyển mục `[Unreleased]` của [CHANGELOG.md](CHANGELOG.md) thành `## [x.y.z] - ngày`; workflow phát hành lấy ghi chú
   từ chính mục này.
4. Chạy `python scripts/check_version.py --tag vx.y.z --since v<bản trước>`: mọi tệp khai cùng một số, CHANGELOG có
   mục của bản này, loại tăng số đủ so với thay đổi API. Workflow phát hành cũng chạy lệnh này và dừng nếu sai.
5. Chạy `make check` (lint và test) phải xanh, mở PR `release/x.y.z`, duyệt và merge vào `main`.
6. Gắn tag `vx.y.z` trên `main` rồi đẩy tag. Workflow [release.yml](.github/workflows/release.yml) tự tạo Release kèm
   `dxos-x.y.z.tar.gz`, SBOM (`sbom-*.cdx.json`) và `SHA256SUMS`.
7. Kiểm bản phát hành: tải các tệp vào cùng thư mục và chạy `sha256sum -c SHA256SUMS`, phải báo `OK` cho từng tệp.

### Quy tắc đánh số (SemVer)

| Thay đổi | Tăng |
|---|---|
| Sửa lỗi, không đổi hành vi công khai | PATCH (`x.y.Z`) |
| Tính năng mới tương thích ngược | MINOR (`x.Y.0`) |
| Phá vỡ tương thích: bỏ API hoặc cột, đổi định dạng dữ liệu | MAJOR (`X.0.0`) |

"API công khai" gồm ba hợp đồng trong `contracts/`, định dạng gói `desktiny-pack/1`, `desktiny-plugin/1` và `/2`,
và dữ liệu đã lưu (migration). Xóa thao tác, bỏ thuộc tính hoặc thêm trường bắt buộc mới vào hợp đồng là phá tương
thích. Tăng MAJOR thì MINOR và PATCH về 0; tăng MINOR thì PATCH về 0. Chỉ đặt tag dạng `vX.Y.Z` cho bản phát hành;
mốc sao lưu dùng nhánh, không dùng tag.

Phiên bản kế tiếp là **3.2.0**. Không bao giờ gắn lại (re-tag) hay xóa một tag đã đẩy, và không bao giờ lùi số phiên bản;
nếu bản phát hành có lỗi thì sửa và phát hành số mới.

Các gói Python tách riêng giữ số phiên bản **riêng**, không đi theo số của nền tảng: `dx-flowkit` (`packages/flowkit`,
hiện 0.2.0), `desktiny-plugin` (`packages/desktiny-plugin`, hiện 0.3.0), `dx-piivn` (`packages/pii-vn`, hiện 0.1.0).
Chỉ tăng khi chính gói đó đổi; nếu `dx-flowkit` đổi số thì sửa cả ràng buộc `dx-flowkit==` trong
`services/core-api/pyproject.toml` và `services/workspace-api/pyproject.toml`.

## Môi trường và kiểm tra cục bộ

Xem [BUILD.md](BUILD.md). Trước khi gửi PR:

```bash
make lint test
node scripts/add_spdx_headers.mjs --check   # mọi tệp mới phải có header SPDX
reuse lint                                  # pipx install reuse
```

## Quy tắc giấy phép (bắt buộc)

- Mã mới dùng **Apache-2.0**: chạy `node scripts/add_spdx_headers.mjs` để thêm header
  (dòng định danh giấy phép Apache-2.0 và dòng bản quyền "2026 Desktiny contributors").
- **Không** sao chép mã từ web, từ đầu ra AI hay từ dự án khác khi chưa kiểm tra nguồn và giấy phép.
- **Không** commit thư viện (`node_modules/`, `vendor/`, `.jar`, `.so`…). Thêm phụ thuộc qua manifest + lockfile,
  rồi chạy `make licenses` và commit `THIRD_PARTY.md`. Chỉ nhận giấy phép OSI; không dùng SSPL, BSL, Elastic, RSAL…
- Cần sửa thư viện ngoài: gửi bản vá lên upstream hoặc fork công khai và ghi trong THIRD_PARTY.md.

## Báo lỗi bảo mật

Không mở issue công khai; xem [SECURITY.md](SECURITY.md).

Tham gia cộng đồng theo [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
