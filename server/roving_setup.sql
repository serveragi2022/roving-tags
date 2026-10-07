-- Roving Tags: route and checklist setup set by the Shift Miller, read by every phone.
-- Run once on the MMS PostgreSQL database.

-- One row per branch + date + mill + shift: the machines to rove.
CREATE TABLE IF NOT EXISTS roving_route (
    branch        text        NOT NULL,
    work_date     date        NOT NULL,
    mill          text        NOT NULL,
    shift         text        NOT NULL,
    machine_codes text[]      NOT NULL,
    updated_by    text,                          -- user_id of the Shift Miller
    updated_at    timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (branch, work_date, mill, shift)
);

-- One row per branch: all checklists and which machine uses which checklist.
-- The app edits them as a whole, so they are kept as JSON (last save wins).
CREATE TABLE IF NOT EXISTS roving_config (
    branch        text        PRIMARY KEY,
    checklists    jsonb       NOT NULL,          -- [{ id, name, operating: [...], housekeeping: [...] }]
    checklist_map jsonb       NOT NULL,          -- { "M22-A": "checklist_123", ... }
    updated_by    text,
    updated_at    timestamptz NOT NULL DEFAULT now()
);
