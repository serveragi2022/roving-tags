using Google.Apis.Auth.OAuth2;
using Google.Cloud.Storage.V1;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using mmsapi.Class;   // TODO: change to the namespace where your GoogleCloudStorage class is
using mmsapi.Models;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace mmsapi.Controllers.Roving
{
    // How a person is written in the saved data: first letter of the first name + last name ("J. Santos")
    public static class RovingNames
    {
        public static string ShortName(string firstname, string lastname, string fallback)
        {
            var first = (firstname ?? "").Trim();
            var last = (lastname ?? "").Trim();
            if (first == "" && last == "") return fallback;
            if (first == "") return last;
            if (last == "") return first;
            return char.ToUpper(first[0]) + ". " + last;
        }
    }

    [ApiController]
    [Route("api")]
    public class RovingRecordController : ControllerBase
    {
        private readonly mmsContext _db;

        public RovingRecordController(mmsContext db) => _db = db;

        // POST /api/roving-records
        // multipart/form-data:  "data" = the record as JSON,  "photo" = the live photo (JPEG)
        // Sending the same record again (same id) only updates it, so the phone can retry safely.
        [HttpPost("roving-records")]
        public async Task<IActionResult> Upload([FromForm] string data, IFormFile photo)
        {
            if (string.IsNullOrWhiteSpace(data)) return BadRequest("No record data.");

            // Dates stay as text (no automatic date conversion)
            JObject json;
            try
            {
                using (var reader = new JsonTextReader(new StringReader(data)) { DateParseHandling = DateParseHandling.None })
                {
                    json = JObject.Load(reader);
                }
            }
            catch (JsonException)
            {
                return BadRequest("The record is not valid JSON.");
            }

            string Text(string name) => ((string)json[name])?.Trim();

            var id = Text("id");
            var type = Text("type");
            var assetCode = Text("assetCode");
            var mill = Text("mill");
            var shift = Text("shift");
            var userIdText = Text("userId");

            if (new[] { id, type, assetCode, mill, shift, userIdText }.Any(string.IsNullOrEmpty))
                return BadRequest("The record needs id, type, assetCode, mill, shift and userId.");
            if (type != "inspection" && type != "urgent")
                return BadRequest("Unknown record type.");
            if (!DateTime.TryParse(Text("workDate"), CultureInfo.InvariantCulture, DateTimeStyles.None, out var workDate))
                return BadRequest("The record has no valid workDate.");

            var recordedAt = DateTime.UtcNow;
            if (DateTime.TryParse(Text("createdAt"), CultureInfo.InvariantCulture,
                    DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out var parsedAt))
                recordedAt = parsedAt;

            // The person who made the record (the name saved is "J. Santos", not the user id)
            var user = await _db.MainUseraccounts.AsNoTracking()
                .Where(u => u.UserId.ToString() == userIdText && u.Status == "Active")
                .Select(u => new { u.Branch, u.Firstname, u.Lastname })
                .FirstOrDefaultAsync();
            if (user == null) return StatusCode(403, "Unknown or inactive user.");
            var who = RovingNames.ShortName(user.Firstname, user.Lastname, userIdText);

            using (var transaction = await _db.Database.BeginTransactionAsync())
            {
                try
                {
                    var record = await _db.RovingRecord.FindAsync(id);
                    if (record == null)
                    {
                        record = new RovingRecord { Id = id, CreatedBy = who, CreatedAt = DateTime.UtcNow };
                        _db.RovingRecord.Add(record);
                    }

                    // Photo -> Google Cloud Storage (same way as the sales order proof)
                    if (photo != null && photo.Length > 0)
                    {
                        var guid = string.IsNullOrEmpty(record.PhotoGuid)
                            ? Guid.NewGuid().ToString() + DateTime.Now.ToString("MM-dd-yyyy-HH-mm")
                            : record.PhotoGuid;
                        var objectName = "Roving Attachment/" + guid + "/Photo.jpg";

                        using (var memoryStream = new MemoryStream())
                        {
                            await photo.CopyToAsync(memoryStream);
                            memoryStream.Position = 0;

                            var storageClient = StorageClient.Create(GoogleCredential.FromJson(GoogleCloudStorage.jsoncredential));
                            var uploadObjectOptions = new UploadObjectOptions
                            {
                                ChunkSize = UploadObjectOptions.MinimumChunkSize
                            };
                            await storageClient.UploadObjectAsync(GoogleCloudStorage.bucket, objectName, "image/jpeg", memoryStream, uploadObjectOptions).ConfigureAwait(true);
                        }

                        record.PhotoGuid = guid;
                        record.PhotoPath = objectName;
                    }

                    record.Branch = user.Branch;
                    record.RecordType = type;
                    record.WorkDate = workDate.Date;
                    record.Mill = mill;
                    record.Shift = shift;
                    record.AssetCode = assetCode;
                    record.AssetName = Text("assetName");
                    record.Location = Text("location");
                    record.OperatorId = Text("operatorId");
                    record.OperatorName = who;
                    record.RecordedAt = recordedAt;
                    record.Data = json.ToString(Formatting.None);
                    record.ModifiedBy = who;
                    record.ModifiedAt = DateTime.UtcNow;

                    // SaveChanges1Async = without the audit log (the table already has created_by / modified_by)
                    await _db.SaveChanges1Async();
                    await transaction.CommitAsync();
                    return Ok(new { id = record.Id, photoPath = record.PhotoPath });
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    return StatusCode(500, $"An error occurred: {ex.Message}");
                }
            }
        }
    }
}
