<!--
SPDX-License-Identifier: Apache-2.0
SPDX-FileCopyrightText: 2026 Desktiny contributors
-->

# Kịch bản demo 15 phút

Dùng dữ liệu giả do bootstrap/seed tạo. Không nhập hồ sơ thật hoặc credential production. Không chiếu
`.env` hay `infra/identity/generated/demo-credentials.txt`. Mỗi vai dùng một browser profile riêng để không
nhầm phiên SSO.

Tài khoản demo (do `python scripts/bootstrap.py` tạo, mật khẩu ngẫu nhiên nằm trong file credential local, không
ghi ở đây): `director` (ban giám đốc), `manager` (trưởng phòng), `staff` (nhân viên), `manager-b` / `staff-b`
(phòng B, để chứng minh không lộ dữ liệu chéo), `technical-admin` (Core admin, Keycloak).

Mọi bước phải chạy ổn 3 lần liên tiếp khi dượt mới đưa vào buổi trình diễn.

## Chuẩn bị chạy không cần mạng

Làm xong từ trước, kiểm lại trên đúng máy sẽ trình diễn:

1. **Image Docker**: chạy một lần `docker compose --env-file .env -f infra/compose/compose.yaml --profile workspace
   --profile office --profile antivirus pull` (bỏ profile không dùng), rồi `up --build -d` lúc có mạng để mọi image
   và lớp build nằm sẵn trong máy. Kiểm bằng cách ngắt mạng và `docker compose ... up -d` lại.
2. **Model Ollama**: cài Ollama trên máy trình diễn, `ollama pull` model chat đã chọn (đã thử `gpt-oss:20b`) và model
   vector `bge-m3` nếu muốn trình bày tìm theo ý nghĩa. Chạy thử một câu để model nằm sẵn trong bộ nhớ (một lần gọi
   khoảng 50 giây khi nguội; xem [ai-features.md](ai-features.md)).
3. **Seed**: `python scripts/seed.py --confirm-demo` rồi tạo trước một biểu mẫu mẫu có text/number/date/select và
   quy trình hồ sơ để không phải dựng từ đầu trên sân khấu.
4. **Keycloak cục bộ**: Keycloak nằm trong Compose, đăng nhập đi qua `http://localhost:8080/identity/`, không cần
   dịch vụ SSO ngoài. Đăng nhập sẵn các vai trong các browser profile, kiểm token chưa hết hạn ngay trước giờ diễn.
5. **ClamAV** (bước 5): cần profile `antivirus` đã bật và đã tải xong cơ sở dữ liệu virus trước khi ngắt mạng; chuẩn
   bị sẵn tệp EICAR (chuỗi thử chuẩn của EICAR, vô hại) trong một thư mục.
6. **Tắt thông báo**: bật "Không làm phiền" của hệ điều hành, đóng ứng dụng chat/email, tắt cập nhật tự động và
   thông báo trình duyệt; để trình duyệt ở chế độ toàn màn hình, thu phóng 110–125%.
7. Cuối: `docker compose ... ps` thấy mọi dịch vụ `healthy`, mở sẵn các tab, cổng `8080` chỉ do Compose dùng.

## Luồng 15 phút

| Phút | Nội dung | Vai |
|---|---|---|
| 0:00–1:30 | Bước 0: ranh giới nền tảng | `technical-admin` |
| 1:30–4:00 | Bước 1: vẽ, mô phỏng, so sánh tác động quy trình | `director` hoặc `technical-admin` |
| 4:00–7:00 | Bước 2: biểu mẫu, hồ sơ, phê duyệt, giao việc | `staff`, `manager` |
| 7:00–9:00 | Bước 3: hạn xử lý, thống kê, nhật ký băm chuỗi | `manager`, `technical-admin` |
| 9:00–11:00 | Bước 4: trợ lý AI chạy Ollama cục bộ | `manager` |
| 11:00–12:00 | Bước 5: tệp EICAR bị ClamAV chặn (chỉ khi bật profile) | `staff` |
| 12:00–13:30 | Bước 6: plugin / gói ngành không sửa mã lõi | `technical-admin` |
| 13:30–15:00 | Bước 7: tắt Workspace, Core vẫn phục vụ | dòng lệnh |

### Bước 0 (1,5 phút): ranh giới hai tầng

Chỉ sơ đồ ở [architecture.md](architecture.md): Core chỉ có API (`/core/v1/docs`), không biết phòng ban hay hồ sơ;
Workspace là ứng dụng đứng trên Core, không đọc SQL của Core. Mỗi tầng có database riêng. Mở `/console/` để cho
thấy Core admin cũng chỉ là một client của API.

### Bước 1 (2,5 phút): quy trình, mô phỏng, so sánh tác động

- Vào `/processes`, tab **Quy trình hồ sơ**, mở một quy trình (hoặc **Tạo quy trình** từ một trong 17 mẫu của gói
  `desktiny.core`). Kéo thả bước Duyệt, Xin ý kiến, Điều kiện, nối dây; lỗi cấu hình hiện ngay trên node.
- Thêm một **kịch bản thử** (hồ sơ mẫu + quyết định từng bước + kết quả mong đợi) và chạy: kịch bản chạy qua bản nháp
  ở chế độ `dry_run`, không tạo nhiệm vụ hay thông báo thật. Nhắc rằng lõi mô phỏng là gói độc lập `dx-flowkit`
  ([`packages/flowkit`](../packages/flowkit)), cùng gói Core dùng để kiểm tra đồ thị.
- Sửa quy trình (ví dụ thêm một bước duyệt hoặc đổi điều kiện), rồi mở **So sánh tác động**: liệt kê bước thêm/bỏ/đổi
  và kịch bản nào đổi kết quả; sau đó **Phát hành** (cần kịch bản đạt trên đúng bản nháp). Mô tả đầy đủ ở
  [process-packages.md](process-packages.md). Nút trên giao diện: **So sánh**, rồi **Phát hành**.

### Bước 2 (3 phút): biểu mẫu, hồ sơ, phê duyệt, giao việc

- `staff` tạo hồ sơ từ biểu mẫu đã chuẩn bị, chọn quy trình, điền, đính kèm tệp, đặt hạn xử lý, mức ưu tiên và người
  phụ trách. Nếu Office bật, mở tài liệu, sửa và chờ lưu trước khi trình.
- `staff` trình hồ sơ. `manager` mở **Phê duyệt**, trả lại có lý do; `staff` sửa và trình lại; `manager` duyệt. Tab
  **Quy trình** trong hồ sơ cho thấy hồ sơ đang ở bước nào, chờ ai, ai quyết định gì; tab tài liệu cho thấy đúng
  phiên bản đã trình.
- **Giao việc** (`/tasks`): tạo việc và chọn người nhận bằng bộ chọn người có ô tìm kiếm (chỉ liệt kê người trong
  phạm vi được giao). Cũng chọn người bằng bộ chọn này khi cấu hình bước quy trình và khi chuyển xử lý hồ sơ.

### Bước 3 (2 phút): hạn xử lý, thống kê, nhật ký chuỗi băm

- Trang chủ **Việc cần làm hôm nay** xếp quá hạn lên đầu; `/reports` cho việc theo trạng thái, quá hạn, hoàn tất trễ,
  hồ sơ theo trạng thái, số lần trả lại. Worker quét hạn quá hạn mỗi `OVERDUE_SWEEP_SECONDS` (mặc định 300 giây) và
  phát sự kiện `case.overdue`, `task.overdue`; không chờ trọn chu kỳ trên sân khấu, dùng dữ liệu đã quá hạn từ seed
  hoặc hạn tạo trước.
- Nhật ký: **Thiết lập › Nhật ký hoạt động** (Workspace, quyền `audit.read`) và **Nhật ký hệ thống** trong Core
  admin. Core nối băm các dòng audit; gọi `GET /core/v1/audit-logs/verify` (quyền quản trị) để xác minh chuỗi còn
  nguyên vẹn (ý tưởng: sửa/xoá một dòng làm kết quả đổi). Giao diện chưa có nút xác minh: gọi API qua Swagger ở `/core/v1/docs` hoặc `curl`.

### Bước 4 (2 phút): trợ lý AI chạy Ollama cục bộ

Không cần Internet. Theo [ai-features.md](ai-features.md): mọi tính năng AI mặc định tắt và AI chỉ đề xuất.

1. `director` hoặc `technical-admin` (quyền `assistant.manage`) vào `/assistant`, tab **Dịch vụ AI**, thêm dịch vụ
   loại Ollama với địa chỉ máy chạy Ollama (gốc máy chủ, ví dụ cổng 11434; địa chỉ riêng tư/HTTP được phép cho
   Ollama và vLLM, link-local vẫn bị chặn). Địa chỉ nhìn từ container `workspace-api`, không phải `localhost` của
   trình duyệt: Ollama chạy trên máy host thì dùng `http://host.docker.internal:11434` (compose đã map sẵn `host-gateway`).
2. Tab **Tính năng AI**: bật vài tính năng, chọn dịch vụ Ollama và model đã `pull`.
3. Trình diễn **Hỏi AI về hồ sơ** (nút ở đầu trang hồ sơ) hoặc **Tóm tắt hồ sơ cho người duyệt**; nhấn mạnh trả lời kèm
   nguồn và chỉ dùng dữ liệu người hỏi được xem. Lần gọi đầu có thể chậm, đã làm nóng ở phần chuẩn bị.

### Bước 5 (1 phút): EICAR bị ClamAV chặn (chỉ khi bật profile `antivirus`)

Bật trước khi lên sân khấu: thêm `CLAMAV_HOST=clamav` vào `.env`, chạy compose kèm `--profile antivirus` và chờ
`clamav` healthy (lần đầu tải chữ ký mất vài phút). Tải lên tệp `.txt` chứa chuỗi kiểm thử EICAR: Core trả 422
`malware_detected` ("Tệp bị từ chối vì phát hiện mã độc ...") và ghi audit `file.upload.malware_blocked`. Xem
[security.md](security.md).

```bash
docker compose --env-file .env -f infra/compose/compose.yaml --profile workspace --profile antivirus up -d
```

Tải một tệp thường lên Kho tài liệu: được nhận. Tải tệp EICAR: bị từ chối và có dòng audit. Không mở tệp EICAR bằng
phần mềm khác trên máy trình diễn (máy diệt virus có thể xoá tệp).

### Bước 6 (1,5 phút): plugin và gói ngành, không sửa mã lõi

- **Gói ngành**: `POST /workspace/v1/packs/preview` hoặc giao diện **Gói giao diện**: xem trước gói mẫu `truong-hoc`
  (giao diện xanh dương, từ ngữ nhà trường, quy trình xin nghỉ phép), cài, đổi giao diện, rồi gỡ; xem
  [packs.md](packs.md).
- **Plugin**: **Quản trị › Plugin**: tải `desktiny-plugin.json` từ [`examples/plugins`](../examples/plugins) (`mot-cua-mau`
  hoặc `tra-cuu-mst`), xem quyền plugin xin, duyệt quyền, bật; plugin cần `PLUGIN_ALLOWED_HOSTS` chứa máy chủ của nó.
  Xem [plugins.md](plugins.md). Cả hai không sửa dòng mã lõi nào.

### Bước 7 (1,5 phút): tắt Workspace, Core vẫn chạy

```bash
docker compose --env-file .env -f infra/compose/compose.yaml stop workspace-api workspace-worker
# Core, Keycloak, gateway vẫn chạy; muốn tắt cả giao diện Workspace thì thêm workspace-web
export DX_CORE_TOKEN=<access token audience dx-core, lấy từ client core-example>
python examples/core-client/main.py
```

Ví dụ tạo schema, record có validation, tải tệp và workflow chờ human task qua Core, không chạm Workspace; secret
của client `core-example` nằm trong `.env`, không chiếu. Không chạy `down -v`. Sau đó `start` lại Workspace.

## Phương án dự phòng

- **Video quay sẵn** từng bước (mỗi đoạn 1–2 phút, có phụ đề), lưu trên máy trình diễn và USB, không phụ thuộc
  Compose. Nếu một bước hỏng quá 30 giây thì chuyển sang video bước đó rồi đi tiếp.
- **Máy dự phòng** đã bootstrap, seed, kéo image và model Ollama giống máy chính, cùng phiên bản (`git rev-parse HEAD`),
  đã đăng nhập sẵn các vai.
- Giữ ảnh chụp màn hình các kết quả chính (quy trình, so sánh tác động, nhật ký, EICAR bị chặn).
- Mất mạng/Keycloak lỗi: dùng `docker compose ... restart`; nếu vẫn lỗi, chuyển máy dự phòng.
- Luôn nêu giới hạn đúng sự thật: bản pilot, các mục còn cần nghiệm thu ở [acceptance.md](acceptance.md), không khẳng
  định tuân thủ hay hiệu quả khi chưa đo.
