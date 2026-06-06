-- =====================================================
-- Table: foaming_transfer_reports
-- Mục đích: Ghi nhận giao hàng từ công đoạn Đổ sang Tách
-- Tạo: 2026-06-06
-- =====================================================

CREATE TABLE IF NOT EXISTS foaming_transfer_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pour_date     DATE NOT NULL,
  shift         TEXT NOT NULL CHECK (shift IN ('Ca 1', 'Ca 2', 'Ca 3', 'Ca HC')),
  machine_id    TEXT NOT NULL,
  actual_bun_qty INTEGER NOT NULL CHECK (actual_bun_qty > 0),
  recorder_id   UUID NOT NULL REFERENCES users(id),
  report_date   DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_transfer_reports_pour_date   ON foaming_transfer_reports(pour_date);
CREATE INDEX IF NOT EXISTS idx_transfer_reports_recorder_id ON foaming_transfer_reports(recorder_id);
CREATE INDEX IF NOT EXISTS idx_transfer_reports_created_at  ON foaming_transfer_reports(created_at DESC);

-- Row Level Security
ALTER TABLE foaming_transfer_reports ENABLE ROW LEVEL SECURITY;

-- Policy: cho phép người dùng đã xác thực đọc toàn bộ
CREATE POLICY "Allow authenticated read" ON foaming_transfer_reports
  FOR SELECT TO authenticated USING (true);

-- Policy: chỉ cho phép insert bởi người dùng đã đăng nhập
CREATE POLICY "Allow authenticated insert" ON foaming_transfer_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = recorder_id::text);

-- Policy: chỉ admin có thể xoá (hồi lại)
CREATE POLICY "Allow admin delete" ON foaming_transfer_reports
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.msnv IN ('02075', '02603', '04820', '04127')
    )
  );
