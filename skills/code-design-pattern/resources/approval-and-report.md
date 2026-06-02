# Approval And Report

Use this resource whenever the agent proposes or applies a design pattern.

## Approval Prompt

Before implementation:

```text
Pattern được đề xuất:
- Nhóm pattern:
- Pattern cụ thể:

Cơ sở lựa chọn:
- Vấn đề hiện tại:
- Vì sao pattern này phù hợp:
- Vì sao giải pháp đơn giản hơn không đủ:

Rủi ro nếu áp dụng không phù hợp:
- Over-engineering:
- Coupling mới phát sinh:
- Test/maintenance risk:

Yêu cầu phê duyệt: vui lòng xác nhận trước khi triển khai.
```

## Final Report

After implementation:

```text
Pattern đã áp dụng:
- Nhóm:
- Pattern:

Kết quả đạt được:
- Coupling giảm:
- Flow rõ hơn:
- Testability:

Files changed:

Verification:

Rủi ro / khuyến nghị tiếp theo:
```

## No-Pattern Report

When no pattern is appropriate:

```text
Không áp dụng design pattern.
Lý do:
Giải pháp đơn giản hơn:
Verification:
```
