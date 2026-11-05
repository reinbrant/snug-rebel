using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using System.IO;
using System.Threading.Tasks;

namespace backend.Services;

public class CloudinaryService
{
    private readonly Cloudinary? _cloudinary;
    private readonly IWebHostEnvironment _environment;
    private readonly IConfiguration _configuration;

    public CloudinaryService(IConfiguration configuration, IWebHostEnvironment environment)
    {
        _configuration = configuration;
        _environment = environment;
        if (string.IsNullOrWhiteSpace(configuration["Cloudinary:CloudName"]) ||
            string.IsNullOrWhiteSpace(configuration["Cloudinary:ApiKey"]) ||
            string.IsNullOrWhiteSpace(configuration["Cloudinary:ApiSecret"])) return;
        var account = new Account(
            _configuration["Cloudinary:CloudName"],
            _configuration["Cloudinary:ApiKey"],
            _configuration["Cloudinary:ApiSecret"]
        );
        _cloudinary = new Cloudinary(account);
    }

    public async Task<(string url, long fileSize)> Upload3DModel(Stream fileStream, string fileName, string folder)
    {
        try
        {
            if (_cloudinary == null) return await StoreLocal(fileStream, fileName, "models");
            var uploadParams = new RawUploadParams()
            {
                File = new FileDescription(fileName, fileStream),
                Folder = folder,
                UseFilename = true,
                UniqueFilename = true
            };

            var uploadResult = await _cloudinary.UploadAsync(uploadParams);

            if (uploadResult.Error != null)
            {
                throw new Exception($"Cloudinary upload failed: {uploadResult.Error.Message}");
            }

            return (uploadResult.SecureUrl.ToString(), uploadResult.Bytes);
        }
        catch (Exception ex)
        {
            throw new Exception($"3D model upload error: {ex.Message}", ex);
        }
    }

    public async Task<(string url, long fileSize)> UploadPreviewImage(Stream fileStream, string fileName, string folder)
    {
        try
        {
            if (_cloudinary == null) return await StoreLocal(fileStream, fileName, "images");
            var uploadParams = new ImageUploadParams()
            {
                File = new FileDescription(fileName, fileStream),
                Folder = folder,
                UseFilename = true,
                UniqueFilename = true
            };

            var uploadResult = await _cloudinary.UploadAsync(uploadParams);

            if (uploadResult.Error != null)
            {
                throw new Exception($"Cloudinary upload failed: {uploadResult.Error.Message}");
            }

            return (uploadResult.SecureUrl.ToString(), uploadResult.Bytes);
        }
        catch (Exception ex)
        {
            throw new Exception($"Preview image upload error: {ex.Message}", ex);
        }
    }

    private async Task<(string url, long fileSize)> StoreLocal(Stream stream, string fileName, string kind)
    {
        var root = _environment.WebRootPath ?? Path.Combine(_environment.ContentRootPath, "wwwroot");
        var directory = Path.Combine(root, "uploads", kind);
        Directory.CreateDirectory(directory);
        var name = $"{Guid.NewGuid():N}{Path.GetExtension(fileName).ToLowerInvariant()}";
        await using var output = File.Create(Path.Combine(directory, name));
        await stream.CopyToAsync(output);
        return ($"/uploads/{kind}/{name}", output.Length);
    }

    public async Task<bool> DeleteFile(string publicId)
    {
        try
        {
            if (_cloudinary == null) return false;
            var deleteParams = new DeletionParams(publicId) { ResourceType = ResourceType.Raw };
            var deleteResult = await _cloudinary.DestroyAsync(deleteParams);
            return deleteResult.Result == "ok";
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error deleting file: {ex.Message}");
            return false;
        }
    }
}
