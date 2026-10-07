-- Roving Tags: records sent by the phones (normal checklist inspections and urgent breakdown / callout).
-- Run once on the MMS PostgreSQL database.
-- The photo is saved in Google Cloud Storage (photo_path). The whole record from the phone is in "data".

CREATE TABLE IF NOT EXISTS roving_record (
    id            text        PRIMARY KEY,      -- id made by the app, so sending the same record again only updates it
    branch        text        NOT NULL,
    record_type   text        NOT NULL,         -- 'inspection' or 'urgent'
    work_date     date        NOT NULL,
    mill          text        NOT NULL,
    shift         text        NOT NULL,
    asset_code    text        NOT NULL,
    asset_name    text,
    location      text,
    operator_id   text,                         -- employee id from the phone
    operator_name text,                         -- first letter of the first name + last name, e.g. "J. Santos"
    recorded_at   timestamptz NOT NULL,         -- time the record was made on the phone
    photo_guid    text,
    photo_path    text,                         -- object name in the Google Cloud Storage bucket
    data          jsonb       NOT NULL,         -- answers, remarks, problem, approvals, gps, ...
    created_by    text,                         -- "J. Santos"
    created_at    timestamptz NOT NULL DEFAULT now(),
    modified_by   text,
    modified_at   timestamptz
);

CREATE INDEX IF NOT EXISTS ix_roving_record_day
    ON roving_record (branch, work_date, mill, shift);
CREATE INDEX IF NOT EXISTS ix_roving_record_asset
    ON roving_record (branch, asset_code, work_date);
