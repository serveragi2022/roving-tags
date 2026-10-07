using System;

#nullable disable

namespace mmsapi.Models
{
    public partial class RovingRecord
    {
        public string Id { get; set; }
        public string Branch { get; set; }
        public string RecordType { get; set; }
        public DateTime WorkDate { get; set; }
        public string Mill { get; set; }
        public string Shift { get; set; }
        public string AssetCode { get; set; }
        public string AssetName { get; set; }
        public string Location { get; set; }
        public string OperatorId { get; set; }
        public string OperatorName { get; set; }
        public DateTime RecordedAt { get; set; }
        public string PhotoGuid { get; set; }
        public string PhotoPath { get; set; }
        public string Data { get; set; }          // raw JSON (jsonb column)
        public string CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
        public string ModifiedBy { get; set; }
        public DateTime? ModifiedAt { get; set; }
    }
}

// Add to mmsContext:
//
//   public virtual DbSet<RovingRecord> RovingRecord { get; set; }
//
//   modelBuilder.Entity<RovingRecord>(entity =>
//   {
//       entity.ToTable("roving_record");
//       entity.HasKey(e => e.Id);
//       entity.Property(e => e.Id).HasColumnName("id");
//       entity.Property(e => e.Branch).HasColumnName("branch");
//       entity.Property(e => e.RecordType).HasColumnName("record_type");
//       entity.Property(e => e.WorkDate).HasColumnName("work_date").HasColumnType("date");
//       entity.Property(e => e.Mill).HasColumnName("mill");
//       entity.Property(e => e.Shift).HasColumnName("shift");
//       entity.Property(e => e.AssetCode).HasColumnName("asset_code");
//       entity.Property(e => e.AssetName).HasColumnName("asset_name");
//       entity.Property(e => e.Location).HasColumnName("location");
//       entity.Property(e => e.OperatorId).HasColumnName("operator_id");
//       entity.Property(e => e.OperatorName).HasColumnName("operator_name");
//       entity.Property(e => e.RecordedAt).HasColumnName("recorded_at");
//       entity.Property(e => e.PhotoGuid).HasColumnName("photo_guid");
//       entity.Property(e => e.PhotoPath).HasColumnName("photo_path");
//       entity.Property(e => e.Data).HasColumnName("data").HasColumnType("jsonb");
//       entity.Property(e => e.CreatedBy).HasColumnName("created_by");
//       entity.Property(e => e.CreatedAt).HasColumnName("created_at");
//       entity.Property(e => e.ModifiedBy).HasColumnName("modified_by");
//       entity.Property(e => e.ModifiedAt).HasColumnName("modified_at");
//   });
// (If your other tables use another naming style, follow that style here and in roving_record.sql.)
