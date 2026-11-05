using Microsoft.AspNetCore.Authorization;
using backend.Data;
using backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[Authorize(Roles = "Admin,Staff")]
[ApiController]
[Route("api/[controller]")]
public class ProductImageController(CloudinaryService storage) : ControllerBase
{
    public static bool IsValidImage(IFormFile file) => file.Length is > 0 and <= 5 * 1024 * 1024 &&
        (Path.GetExtension(file.FileName).ToLowerInvariant(), file.ContentType.ToLowerInvariant()) is
            (".jpg" or ".jpeg", "image/jpeg") or (".png", "image/png") or
            (".gif", "image/gif") or (".webp", "image/webp");

    [HttpPost("upload")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> Upload([FromForm] IFormFile imageFile)
    {
        if (!IsValidImage(imageFile))
            return BadRequest(new { message = "Select a JPEG, PNG, GIF or WebP image up to 5 MB." });
        await using var stream = imageFile.OpenReadStream();
        var (url, _) = await storage.UploadPreviewImage(stream, imageFile.FileName, "products/images");
        // The product save attaches the URL to product_images in the same transaction as inventory.
        return Ok(new { url });
    }
}
