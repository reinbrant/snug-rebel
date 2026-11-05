using backend.DTO;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[Route("api/[controller]")]
[ApiController]
public class CategoryController : ControllerBase
{
    private readonly AppDbContext _context;

    public CategoryController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetCategories()
    {
        try
        {
            var categories = await _context.Categories
                .OrderBy(c => c.CategoryName)
                .ToListAsync();

            return Ok(categories);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"=== GET CATEGORIES CRASH ===\n{ex}");
            return StatusCode(500, new { error = "InternalServerError", message = ex.Message, stackTrace = ex.ToString() });
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetCategoryById(string id)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(id))
                return BadRequest(new { error = "InvalidCategoryId", message = "The categoryId parameter cannot be null or empty." });

            var category = await _context.Categories
                .FirstOrDefaultAsync(c => c.PkCategoryId == id);

            if (category == null)
                return NotFound(new { error = "CategoryNotFound", message = $"Category with ID '{id}' was not found." });

            return Ok(category);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"=== GET CATEGORY BY ID CRASH ===\n{ex}");
            return StatusCode(500, new { error = "InternalServerError", message = ex.Message, stackTrace = ex.ToString() });
        }
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> CreateCategory([FromBody] CategoryRequest request)
    {
        try
        {
            if (request == null)
                return BadRequest(new { error = "NullRequestBody", message = "Request body cannot be null." });

            if (string.IsNullOrWhiteSpace(request.CategoryName))
                return BadRequest(new { error = "InvalidCategoryName", message = "Category name is required." });

            if (string.IsNullOrWhiteSpace(request.Slug))
                request.Slug = Regex.Replace(request.CategoryName.Trim().ToLowerInvariant(), @"[^\p{L}\p{N}]+", "-").Trim('-');

            var exists = await _context.Categories.AnyAsync(c => c.Slug == request.Slug || c.CategoryName == request.CategoryName);
            if (exists)
                return Conflict(new { error = "CategoryExists", message = "A category with the same name or slug already exists." });

            var category = new Category
            {
                CategoryName = request.CategoryName, Slug = request.Slug!, Description = request.Description,
                IsActive = request.IsActive, FkParentCategoryId = request.FkParentCategoryId
            };
            _context.Categories.Add(category);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetCategoryById), new { id = category.PkCategoryId }, category);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"=== CREATE CATEGORY CRASH ===\n{ex}");
            return StatusCode(500, new { error = "InternalServerError", message = ex.Message, stackTrace = ex.ToString() });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> UpdateCategory(string id, [FromBody] CategoryRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(id))
                return BadRequest(new { error = "InvalidCategoryId", message = "The categoryId parameter cannot be null or empty." });

            if (request == null)
                return BadRequest(new { error = "NullRequestBody", message = "Request body cannot be null." });

            var category = await _context.Categories.FirstOrDefaultAsync(c => c.PkCategoryId == id);
            if (category == null)
                return NotFound(new { error = "CategoryNotFound", message = $"Category with ID '{id}' was not found." });

            if (string.IsNullOrWhiteSpace(request.CategoryName)) return BadRequest(new { message = "Name is required." });
            category.CategoryName = request.CategoryName.Trim();
            category.Slug = string.IsNullOrWhiteSpace(request.Slug) ? Regex.Replace(request.CategoryName.Trim().ToLowerInvariant(), @"[^\p{L}\p{N}]+", "-").Trim('-') : request.Slug;
            category.Description = request.Description;
            category.IsActive = request.IsActive;
            category.FkParentCategoryId = request.FkParentCategoryId;

            await _context.SaveChangesAsync();
            return Ok(category);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"=== UPDATE CATEGORY CRASH ===\n{ex}");
            return StatusCode(500, new { error = "InternalServerError", message = ex.Message, stackTrace = ex.ToString() });
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> DeleteCategory(string id)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(id))
                return BadRequest(new { error = "InvalidCategoryId", message = "The categoryId parameter cannot be null or empty." });

            var category = await _context.Categories
                .Include(c => c.Products)
                .FirstOrDefaultAsync(c => c.PkCategoryId == id);

            if (category == null)
                return NotFound(new { error = "CategoryNotFound", message = $"Category with ID '{id}' was not found." });

            if (category.Products.Any())
                return Conflict(new { error = "CategoryInUse", message = "This category cannot be deleted because it is assigned to one or more products." });

            _context.Categories.Remove(category);
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Category '{id}' deleted successfully." });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"=== DELETE CATEGORY CRASH ===\n{ex}");
            return StatusCode(500, new { error = "InternalServerError", message = ex.Message, stackTrace = ex.ToString() });
        }
    }
}
