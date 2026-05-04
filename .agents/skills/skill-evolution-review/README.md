# Skill Evolution Review Quick Guide

## Mục đích

`skill-evolution-review` dùng để:

- đọc feedback đã tích lũy
- phát hiện pattern drift lặp lại
- tạo proposal nâng cấp skill/agent
- tự apply proposal nhỏ nếu policy cho phép

## Điều kiện đầu vào

- Bật `skill_upgrade.enabled = true` trong `.codex/config.toml`
- Có feedback trong `audit/skill-feedback/*.jsonl`

## Luồng vận hành

### 1. Observe

- Đọc config `skill_upgrade.*`
- Đọc feedback từ `audit/skill-feedback`
- Nếu không có feedback: dừng với `observe/skipped/no_feedback`

### 2. Group

- Gom feedback theo `targetName` hoặc `agentName`
- Mỗi target được xử lý thành một vòng riêng

### 3. Propose

- Tạo snapshot tạm
- Gọi `write-skill-upgrade-proposal.py`
- Tính:
  - `patternCount`
  - `dominantEvidenceKey`
  - `recommendation`

### 4. Deduplicate

- Nếu đã có proposal cũ cho cùng `target + dominantEvidenceKey`
- Và proposal cũ có mức bằng chứng mạnh hơn hoặc tương đương
- Thì bỏ qua proposal mới với state `duplicate_proposal_skipped`

### 5. Decide

#### Manual review

- `recommendation = manual-review`
- State: `notify/pending/manual_review_required`

#### User approval

- Chưa đủ điều kiện auto-apply
- State: `notify/pending/user_approval_required`

#### Auto-apply

- `recommendation = safe-auto-apply`
- `skill_upgrade.autoApply = true`
- Cycle sẽ tự approve proposal rồi gọi apply script

### 6. Apply

`apply-skill-upgrade-proposal.py` sẽ:

- kiểm tra path có nằm trong repo không
- chặn `docs/` và `reports/`
- kiểm tra `allowed_paths`
- kiểm tra giới hạn patch
- ghi patch
- chạy validation commands

### 7. Rollback

- Nếu apply hoặc validation fail:
  - rollback file đã đổi
  - ghi `rollback/completed/proposal_updates_reverted`
  - ghi thêm `upgrade/failed/...`

### 8. Success

- Nếu pass:
  - proposal chuyển sang `approvalStatus = applied`
  - ghi `upgrade/completed/proposal_auto_applied` hoặc `proposal_applied`

## File cần nhớ

- `scripts/run-skill-upgrade-cycle.py`: điều phối toàn bộ flow
- `scripts/write-skill-upgrade-proposal.py`: tạo proposal từ feedback
- `scripts/apply-skill-upgrade-proposal.py`: apply proposal đã approve

## Rule nhanh

- Feedback yếu: không auto học
- Feedback lặp lại: tạo proposal
- Proposal nhỏ + đúng scope + pass validation: có thể auto-apply
- Mọi nhánh chính đều phải có state log để audit
