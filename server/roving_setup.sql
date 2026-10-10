-- Roving Tags: route and checklist setup set by people with the Routes/Checklist access, read by every phone.
-- Run once on the MMS PostgreSQL database.

-- One row per branch + date + shift: the machines to rove.
-- A route can have machines from any area, so there is no mill column.
CREATE TABLE IF NOT EXISTS roving_route (
    branch        text        NOT NULL,
    work_date     date        NOT NULL,
    shift         text        NOT NULL,
    machine_codes text[]      NOT NULL,
    updated_by    text,                          -- "J. Santos"
    updated_at    timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (branch, work_date, shift)
);

-- ONLY if roving_route was already created with the mill column (old version), run this once instead:
--   ALTER TABLE roving_route DROP CONSTRAINT roving_route_pkey;
--   DELETE FROM roving_route a USING roving_route b          -- keep one route per day + shift (the newest)
--       WHERE a.branch = b.branch AND a.work_date = b.work_date AND a.shift = b.shift
--         AND a.updated_at < b.updated_at;
--   ALTER TABLE roving_route DROP COLUMN mill;
--   ALTER TABLE roving_route ADD PRIMARY KEY (branch, work_date, shift);

-- One row per branch: all checklists and which machine uses which checklist.
-- The app edits them as a whole, so they are kept as JSON (last save wins).
CREATE TABLE IF NOT EXISTS roving_config (
    branch        text        PRIMARY KEY,
    checklists    jsonb       NOT NULL,          -- [{ id, name, operating: [...], housekeeping: [...] }]
    checklist_map jsonb       NOT NULL,          -- { "M22-A": "checklist_123", ... }
    updated_by    text,
    updated_at    timestamptz NOT NULL DEFAULT now()
);
