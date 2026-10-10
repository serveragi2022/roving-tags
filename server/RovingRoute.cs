using System;

#nullable disable

namespace mmsapi.Models
{
    // One route per branch + date + shift. A route can have machines from any area, so there is no Mill.
    public partial class RovingRoute
    {
        public string Branch { get; set; }
        public DateTime WorkDate { get; set; }
        public string Shift { get; set; }
        public string[] MachineCodes { get; set; }
        public string UpdatedBy { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}

// In mmsContext (OnModelCreating): remove the Mill property mapping of RovingRoute and make the key
//   entity.HasKey(e => new { e.Branch, e.WorkDate, e.Shift });
// (CreatedBy / ModifiedBy of RovingRoute stay in your own partial class with [NotMapped], as you already have.)
