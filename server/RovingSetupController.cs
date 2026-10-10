using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using mmsapi.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace mmsapi.Controllers.Roving
{
    [ApiController]
    [Route("api")]
    public class RovingSetupController : ControllerBase
    {
        private const string SetupAccess = "Roving Tags Cleaning and Monitoring - Routes/Checklist";
        private readonly mmsContext _db;

        public record SaveRouteRequest(string Branch, DateTime WorkDate, string Shift, string[] MachineCodes, string UserId);
        public record SaveConfigRequest(string Branch, JToken Checklists, JToken ChecklistMap, string UserId);

        public RovingSetupController(mmsContext db) => _db = db;

        // GET /api/roving-routes?branch=&workDate=&shift=   (a route has machines from any area, so no mill)
        [HttpGet("roving-routes")]
        public async Task<IActionResult> GetRoute(string branch, DateTime workDate, string shift)
        {
            workDate = workDate.Date;
            var route = await _db.RovingRoute.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Branch == branch && x.WorkDate == workDate && x.Shift == shift);
            if (route == null) return NotFound();
            return Ok(new { machineCodes = route.MachineCodes, updatedBy = route.UpdatedBy, updatedAt = route.UpdatedAt });
        }

        // PUT /api/roving-routes  (needs the Routes/Checklist access)
        [HttpPut("roving-routes")]
        public async Task<IActionResult> SaveRoute([FromBody] SaveRouteRequest request)
        {
            var workDate = request.WorkDate.Date;
            if (request.MachineCodes == null || request.MachineCodes.Length == 0)
                return BadRequest("At least one machine is needed.");
            var who = await GetSetupUserNameAsync(request.UserId, request.Branch);
            if (who == null)
                return StatusCode(403, "No access to set the route.");

            var route = await _db.RovingRoute.FindAsync(request.Branch, workDate, request.Shift);
            if (route == null)
            {
                route = new RovingRoute
                {
                    Branch = request.Branch,
                    WorkDate = workDate,
                    Shift = request.Shift
                };
                _db.RovingRoute.Add(route);
            }
            route.MachineCodes = request.MachineCodes.Distinct().ToArray();
            route.UpdatedBy = who;   // "J. Santos", not the user id
            // used by the audit log (OnBeforeSaveChanges reads CreatedBy / ModifiedBy)
            route.CreatedBy = route.ModifiedBy = who;
            route.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // GET /api/roving-config?branch=
        [HttpGet("roving-config")]
        public async Task<IActionResult> GetConfig(string branch)
        {
            var config = await _db.RovingConfig.AsNoTracking().FirstOrDefaultAsync(x => x.Branch == branch);
            if (config == null) return NotFound();
            return Ok(new
            {
                checklists = JToken.Parse(config.Checklists),
                checklistMap = JToken.Parse(config.ChecklistMap),
                updatedAt = config.UpdatedAt,
            });
        }

        // PUT /api/roving-config  (needs the Routes/Checklist access)
        [HttpPut("roving-config")]
        public async Task<IActionResult> SaveConfig([FromBody] SaveConfigRequest request)
        {
            if (request.Checklists == null || request.Checklists.Type != JTokenType.Array
                || request.ChecklistMap == null || request.ChecklistMap.Type != JTokenType.Object)
                return BadRequest("checklists must be an array and checklistMap an object.");
            var who = await GetSetupUserNameAsync(request.UserId, request.Branch);
            if (who == null)
                return StatusCode(403, "No access to change the checklists.");

            var config = await _db.RovingConfig.FindAsync(request.Branch);
            if (config == null)
            {
                config = new RovingConfig { Branch = request.Branch };
                _db.RovingConfig.Add(config);
            }
            config.Checklists = request.Checklists.ToString(Formatting.None);
            config.ChecklistMap = request.ChecklistMap.ToString(Formatting.None);
            config.UpdatedBy = who;
            config.CreatedBy = config.ModifiedBy = who;
            config.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // The caller must be an active user of the branch with the Routes/Checklist access.
        // Returns the name to save ("J. Santos"), or null when the caller has no access.
        // Same source as /api/login: MainAccessRight.AccessModule through MainUseraccounts.AccessId.
        private async Task<string> GetSetupUserNameAsync(string userId, string branch)
        {
            var row = await (from ua in _db.MainUseraccounts
                             from ac in _db.MainAccessRight
                             where ac.Id == ua.AccessId && ua.UserId.ToString() == userId
                             select new { ua.Status, ua.Branch, ua.Firstname, ua.Lastname, ac.AccessModule })
                .AsNoTracking()
                .FirstOrDefaultAsync();
            if (row == null || row.Status != "Active" || row.Branch != branch || !HasAccess(row.AccessModule, SetupAccess))
                return null;
            return RovingNames.ShortName(row.Firstname, row.Lastname, userId);
        }

        // The access value is a list separated by , ; | or new lines (or a JSON array text).
        // Exact name match, so "Roving Tags Cleaning and Monitoring" alone does not give setup access.
        private static bool HasAccess(string accessModule, string accessName)
        {
            if (string.IsNullOrWhiteSpace(accessModule)) return false;
            var text = accessModule.Trim();
            IEnumerable<string> names;
            if (text.StartsWith("["))
            {
                try { names = JsonConvert.DeserializeObject<List<string>>(text) ?? new List<string>(); }
                catch (JsonException) { names = text.Split(',', ';', '|', '\n'); }
            }
            else
            {
                names = text.Split(',', ';', '|', '\n');
            }
            return names.Any(n => string.Equals(
                string.Join(" ", n.Split((char[])null, StringSplitOptions.RemoveEmptyEntries)),
                accessName, StringComparison.OrdinalIgnoreCase));
        }
    }
}
