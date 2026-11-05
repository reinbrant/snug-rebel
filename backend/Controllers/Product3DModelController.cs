using Microsoft.AspNetCore.Authorization;
using backend.Data;
using backend.Models;
using backend.DTO;
using backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[Route("api/[controller]")]
[ApiController]
public class Product3DModelController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly CloudinaryService _cloudinaryService;

    public Product3DModelController(AppDbContext context, CloudinaryService cloudinaryService)
    {
        _context = context;
        _cloudinaryService = cloudinaryService;
    }

    [HttpGet("product/{productId}")]
    public async Task<IActionResult> GetProduct3DModels(string productId)
    {
        try
        {
            var models = await _context.Product3DModels
                .Where(m => m.FkProductId == productId && m.IsActive)
                .Select(m => new Product3DModelDTO
                {
                    Id = m.PkProduct3DModelId,
                    ProductId = m.FkProductId,
                    ModelUrl = m.ModelUrl,
                    PreviewImageUrl = m.PreviewImageUrl,
                    ModelName = m.ModelName,
                    FileSizeBytes = m.FileSizeBytes,
                    IsActive = m.IsActive,
                    CreatedAt = m.CreatedAt,
                    UpdatedAt = m.UpdatedAt
                })
                .ToListAsync();

            return Ok(models);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"=== GET 3D MODELS CRASH ===\n{ex}");
            return StatusCode(500, new { error = "InternalServerError", message = ex.Message });
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetProduct3DModelById(string id)
    {
        try
        {
            var model = await _context.Product3DModels.FindAsync(id);
            if (model == null) return NotFound();

            var dto = new Product3DModelDTO
            {
                Id = model.PkProduct3DModelId,
                ProductId = model.FkProductId,
                ModelUrl = model.ModelUrl,
                PreviewImageUrl = model.PreviewImageUrl,
                ModelName = model.ModelName,
                FileSizeBytes = model.FileSizeBytes,
                IsActive = model.IsActive,
                CreatedAt = model.CreatedAt,
                UpdatedAt = model.UpdatedAt
            };

            return Ok(dto);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"=== GET 3D MODEL BY ID CRASH ===\n{ex}");
            return StatusCode(500, new { error = "InternalServerError", message = ex.Message });
        }
    }

    [HttpPost("upload")]
    [Authorize(Roles = "Admin,Staff")]
    [RequestSizeLimit(60 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 60 * 1024 * 1024)]
    public async Task<IActionResult> Upload3DModel()
    {
        try
        {
            var productId = HttpContext.Request.Form["productId"].ToString();
            var modelName = HttpContext.Request.Form["modelName"].ToString();
            var modelFile = HttpContext.Request.Form.Files.GetFile("modelFile");
            var previewFile = HttpContext.Request.Form.Files.GetFile("previewFile");

            if (string.IsNullOrEmpty(productId) || modelFile == null)
            {
                return BadRequest(new { error = "Missing required fields: productId, modelFile" });
            }

            if (Path.GetExtension(modelFile.FileName).ToLowerInvariant() != ".glb" || modelFile.Length == 0 || modelFile.Length > 50 * 1024 * 1024)
                return BadRequest(new { message = "Select a .glb model up to 50 MB." });
            if (modelName.Length > 255) return BadRequest(new { message = "Model name must be at most 255 characters." });
            if (previewFile != null && !ProductImageController.IsValidImage(previewFile))
                return BadRequest(new { message = "Select a JPEG, PNG, GIF or WebP preview up to 5 MB." });
            var product = await _context.Products.FindAsync(productId);
            if (product == null)
            {
                return NotFound(new { error = "Product not found" });
            }

            // Upload 3D model
            string modelUrl;
            long fileSizeBytes;
            using (var stream = modelFile.OpenReadStream())
            {
                (modelUrl, fileSizeBytes) = await _cloudinaryService.Upload3DModel(
                    stream,
                    modelFile.FileName,
                    $"products/{productId}/3d-models"
                );
            }

            // Upload preview image if provided
            string? previewImageUrl = null;
            if (previewFile != null)
            {
                using (var stream = previewFile.OpenReadStream())
                {
                    (previewImageUrl, _) = await _cloudinaryService.UploadPreviewImage(
                        stream,
                        previewFile.FileName,
                        $"products/{productId}/3d-previews"
                    );
                }
            }

            var model3D = new Product3DModel
            {
                FkProductId = productId,
                ModelUrl = modelUrl,
                PreviewImageUrl = previewImageUrl,
                ModelName = !string.IsNullOrEmpty(modelName) ? modelName : Path.GetFileNameWithoutExtension(modelFile.FileName),
                FileSizeBytes = fileSizeBytes,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            if (model3D.PreviewImageUrl != null && !await _context.ProductImages.AnyAsync(i => i.FkProductId == model3D.FkProductId && i.Url == model3D.PreviewImageUrl))
                _context.ProductImages.Add(new ProductImage
                {
                    FkProductId = model3D.FkProductId, Url = model3D.PreviewImageUrl, AltText = model3D.ModelName,
                    IsPrimary = !await _context.ProductImages.AnyAsync(i => i.FkProductId == model3D.FkProductId && i.IsPrimary),
                    SortOrder = await _context.ProductImages.CountAsync(i => i.FkProductId == model3D.FkProductId)
                });
            _context.Product3DModels.Add(model3D);
            await _context.SaveChangesAsync();

            var response = new Product3DModelDTO
            {
                Id = model3D.PkProduct3DModelId,
                ProductId = model3D.FkProductId,
                ModelUrl = model3D.ModelUrl,
                PreviewImageUrl = model3D.PreviewImageUrl,
                ModelName = model3D.ModelName,
                FileSizeBytes = model3D.FileSizeBytes,
                IsActive = model3D.IsActive,
                CreatedAt = model3D.CreatedAt,
                UpdatedAt = model3D.UpdatedAt
            };

            return CreatedAtAction(nameof(GetProduct3DModelById), new { id = model3D.PkProduct3DModelId }, response);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"=== UPLOAD 3D MODEL CRASH ===\n{ex}");
            return StatusCode(500, new { error = "InternalServerError", message = ex.Message, stackTrace = ex.ToString() });
        }
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> Create3DModel([FromBody] CreateProduct3DModelRequest request)
    {
        try
        {
            var product = await _context.Products.FindAsync(request.ProductId);
            if (product == null)
            {
                return NotFound(new { error = "Product not found" });
            }

            var model3D = new Product3DModel
            {
                FkProductId = request.ProductId,
                ModelUrl = request.ModelUrl,
                PreviewImageUrl = request.PreviewImageUrl,
                ModelName = request.ModelName,
                FileSizeBytes = request.FileSizeBytes,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            if (model3D.PreviewImageUrl != null && !await _context.ProductImages.AnyAsync(i => i.FkProductId == model3D.FkProductId && i.Url == model3D.PreviewImageUrl))
                _context.ProductImages.Add(new ProductImage
                {
                    FkProductId = model3D.FkProductId, Url = model3D.PreviewImageUrl, AltText = model3D.ModelName,
                    IsPrimary = !await _context.ProductImages.AnyAsync(i => i.FkProductId == model3D.FkProductId && i.IsPrimary),
                    SortOrder = await _context.ProductImages.CountAsync(i => i.FkProductId == model3D.FkProductId)
                });
            _context.Product3DModels.Add(model3D);
            await _context.SaveChangesAsync();

            var response = new Product3DModelDTO
            {
                Id = model3D.PkProduct3DModelId,
                ProductId = model3D.FkProductId,
                ModelUrl = model3D.ModelUrl,
                PreviewImageUrl = model3D.PreviewImageUrl,
                ModelName = model3D.ModelName,
                FileSizeBytes = model3D.FileSizeBytes,
                IsActive = model3D.IsActive,
                CreatedAt = model3D.CreatedAt,
                UpdatedAt = model3D.UpdatedAt
            };

            return CreatedAtAction(nameof(GetProduct3DModelById), new { id = model3D.PkProduct3DModelId }, response);
        }
        catch (DbUpdateException dbEx)
        {
            var dbError = dbEx.InnerException?.Message ?? dbEx.Message;
            Console.WriteLine($"=== CREATE 3D MODEL DB CRASH ===\n{dbEx}");
            return StatusCode(500, new { error = "DatabaseUpdateFailed", details = dbError, stackTrace = dbEx.ToString() });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"=== CREATE 3D MODEL CRASH ===\n{ex}");
            return StatusCode(500, new { error = "InternalServerError", message = ex.Message, stackTrace = ex.ToString() });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> Update3DModel(string id, [FromBody] Product3DModelDTO request)
    {
        try
        {
            var model = await _context.Product3DModels.FindAsync(id);
            if (model == null) return NotFound();

            model.ModelName = request.ModelName ?? model.ModelName;
            model.PreviewImageUrl = request.PreviewImageUrl ?? model.PreviewImageUrl;
            model.IsActive = request.IsActive;
            model.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return NoContent();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"=== UPDATE 3D MODEL CRASH ===\n{ex}");
            return StatusCode(500, new { error = "InternalServerError", message = ex.Message, stackTrace = ex.ToString() });
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> Delete3DModel(string id)
    {
        try
        {
            var model = await _context.Product3DModels.FindAsync(id);
            if (model == null) return NotFound();

            _context.Product3DModels.Remove(model);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"=== DELETE 3D MODEL CRASH ===\n{ex}");
            return StatusCode(500, new { error = "InternalServerError", message = ex.Message, stackTrace = ex.ToString() });
        }
    }
}
