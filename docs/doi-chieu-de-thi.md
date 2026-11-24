# Đối chiếu đề thi OLP Phần mềm nguồn mở 2026

Desktiny đáp ứng yêu cầu bắt buộc của đề (Tầng 1 Core headless và ít nhất một ứng dụng Tầng 2) ở mức chạy được và kiểm được; bốn nguyên lý kiến trúc mới đạt một phần, trong đó data lake và IT/OT chưa làm. Bảng dưới ghi đúng hiện trạng, kèm cách tự kiểm.

Cú pháp `docker compose` xem [installation.md](installation.md); các bước demo chi tiết ở [demo.md](demo.md).

## Tầng 1: Core headless

| Yêu cầu của đề | Đáp ứng ở đâu | Cách kiểm | Trạng thái | Giới hạn |
|---|---|---|---|---|
| Core không giao diện (headless) | [main.py của core-api](../services/core-api/src/dx_core/main.py): chỉ API `/core/v1/`; [architecture.md](architecture.md#ranh-giới-core-headless) | Chạy profile `core` (không Workspace), gọi API bằng [examples/core-client](../examples/core-client/main.py) | Có | `/core/v1/docs` là Swagger tự sinh của FastAPI (tài liệu API, không phải giao diện nghiệp vụ); `/console/` ([apps/core-admin](../apps/core-admin/src)) là ứng dụng quản trị riêng, gọi API |
| Identity / SSO | Keycloak OIDC + PKCE, cấu hình ở [infra/identity](../infra/identity/README.md); Core kiểm issuer/audience; [security.md](security.md) | Đăng nhập một lần vào Workspace và Core admin; gọi API không token phải bị 401 | Có | Một tổ chức mỗi deployment, chưa SaaS đa tenant |
| API Gateway | [nginx.conf](../infra/gateway/nginx.conf): định tuyến, rate limit, CSP, chặn `/internal/` | `grep -n "limit_req\|internal" infra/gateway/nginx.conf`; gọi `/internal/...` qua gateway | Có | Nginx cấu hình tĩnh, chưa quản lý khóa API/gói dịch vụ; service vẫn tự kiểm token, không tin gateway |
| Dữ liệu có cấu trúc | Schema/record có phiên bản: [models.py](../services/core-api/src/dx_core/models.py) | `python -m pytest services/core-api/tests/test_core.py` | Có | PostgreSQL một instance ở cấu hình dev |
| Dữ liệu phi cấu trúc | Tệp có phiên bản qua RustFS/S3: [storage.py](../services/core-api/src/dx_core/storage.py) | `python -m pytest services/core-api/tests/test_storage_inspection.py` | Có | Lưu trữ nội bộ; chưa có tầng lưu trữ lạnh/lake |
| Workflow | [workflow.py](../services/core-api/src/dx_core/workflow.py), [worker.py](../services/core-api/src/dx_core/worker.py), [packages/flowkit](../packages/flowkit/README.md) | Các bước 2-5 phút trong [demo.md](demo.md); chạy test core-api | Có | Worker poll PostgreSQL; chưa có dispatcher sự kiện qua broker (xem architecture.md) |
| Core chạy độc lập khi tắt Tầng 2 | [compose.yaml](../infra/compose/compose.yaml) profile `core` | `docker compose ... --profile core up -d`, rồi chạy `examples/core-client` | Có | Tuyến tới module chưa bật không hoạt động, không có mock thay thế |

## Tầng 2: ứng dụng có giao diện (Workspace, H-P-D-I)

| Nhóm | Tính năng cụ thể | Đáp ứng ở đâu | Cách kiểm | Trạng thái | Giới hạn |
|---|---|---|---|---|---|
| H (con người, cộng tác) | Giao việc, nhắn tin, bảng tin, tìm kiếm, ủy quyền | [tasks.py](../services/workspace-api/src/dx_workspace/tasks.py), [messaging.py](../services/workspace-api/src/dx_workspace/messaging.py), [feed.py](../services/workspace-api/src/dx_workspace/feed.py), [delegations.py](../services/workspace-api/src/dx_workspace/delegations.py) | `python -m pytest services/workspace-api/tests/test_collaboration.py`; dùng UI sau khi đăng nhập | Có | Nhắn tin bằng polling REST, chưa WebSocket |
| P (quy trình) | Biểu mẫu, hồ sơ, phê duyệt tuần tự/điều kiện/trả lại, quy trình vẽ trên canvas, hạn bước | [processes.py](../services/workspace-api/src/dx_workspace/processes.py), [process_versions.py](../services/workspace-api/src/dx_workspace/process_versions.py), [process-packages.md](process-packages.md) | `python -m pytest services/workspace-api/tests/test_process_flows.py`; các bước 5-10 phút trong demo.md | Có | Chưa quorum; mỗi bước cần người quyết định là một human task Core |
| D (dữ liệu, báo cáo) | Báo cáo cơ bản, danh sách việc cần xử lý | [insights.py](../services/workspace-api/src/dx_workspace/insights.py) | Mở mục báo cáo sau khi seed demo | Một phần | Không phải dashboard phân tích tùy chỉnh; không có kho dữ liệu phân tích |
| I (trí tuệ) | 18 tính năng AI, chạy mô hình cục bộ Ollama/vLLM | [ai-features.md](ai-features.md), [ai.py](../services/workspace-api/src/dx_workspace/ai.py), [assistant.py](../services/workspace-api/src/dx_workspace/assistant.py) | `python -m pytest services/workspace-api/tests/test_ai.py services/workspace-api/tests/test_assistant.py` | Có | Mặc định tắt; cần tự cấp mô hình cục bộ; kết quả AI chỉ là gợi ý |

## Bốn nguyên lý

| Nguyên lý | Đáp ứng ở đâu | Cách kiểm | Trạng thái | Giới hạn |
|---|---|---|---|---|
| (i) Tách vòng đời dữ liệu, lịch sử xuống data lake | Chỉ có nền: record/tệp có phiên bản, snapshot hồ sơ bất biến ([architecture.md](architecture.md)) | Xem phiên bản record và tệp qua API Core | Chưa | Chưa có data lake, chưa có tiến trình đẩy lịch sử ra kho lạnh |
| (ii) Hội tụ IT/OT | Không có | Không áp dụng | Chưa | Chưa kết nối thiết bị/giao thức công nghiệp. `examples/core-client` (namespace `equipment`) chỉ minh họa cách ly client, không phải tích hợp OT |
| (iii) Quản trị dữ liệu: phả hệ, nguồn gốc, chất lượng | Phiên bản record/tệp, snapshot hồ sơ; audit chuỗi băm [audit_chain.py](../services/core-api/src/dx_core/audit_chain.py) | `python -m pytest services/core-api/tests/test_audit_chain.py`; `GET /core/v1/audit-logs/verify` ([security.md](security.md)) | Một phần | Có nguồn gốc và toàn vẹn thay đổi; chưa có đồ thị phả hệ giữa các tập dữ liệu, chưa đo chất lượng dữ liệu |
| (iv) Zero-Trust, GitOps, quét mã độc ở biên, hạ tầng bằng mã, tự phục hồi | OIDC mọi API, ACL, CSP/rate-limit ([nginx.conf](../infra/gateway/nginx.conf)); hạ tầng bằng Docker Compose ([compose.yaml](../infra/compose/compose.yaml)) có healthcheck và `restart`; quét mã độc ClamAV khi tải tệp lên Core, profile `antivirus` ([security.md](security.md)) | `python -m pytest infra/tests/test_deployment.py`; `docker compose ... ps` xem trạng thái health | Một phần | Chưa GitOps (không có bộ điều hòa kéo cấu hình từ Git); hạ tầng bằng mã chỉ ở mức Compose, chưa Terraform/Kubernetes; quét mã độc chỉ áp dụng khi tải lên, không quét lại tệp cũ; tự phục hồi dừng ở restart và đối soát worker |

Các giới hạn thực tế khác nằm ở [acceptance.md](acceptance.md) và [security.md](security.md).
