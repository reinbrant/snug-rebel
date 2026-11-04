using backend.Data;
using backend.DTO;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[Route("api/[controller]")]
[ApiController]
public class ReviewController : ControllerBase
{
    private readonly AppDbContext _context;

    public ReviewController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("product/{productId}")]
    public async Task<IActionResult> GetReviewsByProductId(string productId)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(productId))
                return BadRequest(new { error = "InvalidProductId", message = "The productId parameter cannot be null or empty." });

            var reviews = await _context.Reviews
                .Include(r => r.FkUser)
                .Where(r => r.FkProductId == productId)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new ReviewDTO
                {
                    PkReviewId = r.PkReviewId,
                    FkProductId = r.FkProductId,
                    FkUserId = r.FkUserId,
                    FkOrderItemId = r.FkOrderItemId,
                    Rating = r.Rating,
                    Body = r.Body,
                    CreatedAt = r.CreatedAt,
                    UserDisplayName = r.FkUser.FirstName + " " + r.FkUser.LastName
                })
                .ToListAsync();

            return Ok(reviews);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"=== GET REVIEWS BY PRODUCT CRASH ===\n{ex}");
            return StatusCode(500, new { error = "InternalServerError", message = ex.Message, stackTrace = ex.ToString() });
        }
    }

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetReviewsByUserId(string userId)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(userId))
                return BadRequest(new { error = "InvalidUserId", message = "The userId parameter cannot be null or empty." });

            var reviews = await _context.Reviews
                .Include(r => r.FkProduct)
                .Where(r => r.FkUserId == userId)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return Ok(reviews);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"=== GET REVIEWS BY USER CRASH ===\n{ex}");
            return StatusCode(500, new { error = "InternalServerError", message = ex.Message, stackTrace = ex.ToString() });
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateReview([FromBody] CreateReviewRequest request)
    {
        try
        {
            if (request == null)
                return BadRequest(new { error = "NullRequestBody", message = "Request body cannot be null." });

            if (string.IsNullOrWhiteSpace(request.ProductId))
                return BadRequest(new { error = "InvalidProductId", message = "ProductId is required." });

            if (string.IsNullOrWhiteSpace(request.UserId))
                return BadRequest(new { error = "InvalidUserId", message = "UserId is required." });

            if (string.IsNullOrWhiteSpace(request.OrderItemId))
                return BadRequest(new { error = "InvalidOrderItemId", message = "OrderItemId is required." });

            if (request.Rating < 1 || request.Rating > 5)
                return BadRequest(new { error = "InvalidRating", message = "Rating must be between 1 and 5." });

            var productExists = await _context.Products.AnyAsync(p => p.PkProductId == request.ProductId);
            if (!productExists)
                return NotFound(new { error = "ProductNotFound", message = $"Product with ID '{request.ProductId}' was not found." });

            var userExists = await _context.Users.AnyAsync(u => u.PkUserId == request.UserId);
            if (!userExists)
                return NotFound(new { error = "UserNotFound", message = $"User with ID '{request.UserId}' was not found." });

            var orderItem = await _context.OrderItems
                .Include(oi => oi.FkOrder)
                .Include(oi => oi.FkProductVariant)
                .FirstOrDefaultAsync(oi => oi.PkOrderItemId == request.OrderItemId);

            if (orderItem == null)
                return NotFound(new { error = "OrderItemNotFound", message = $"Order item with ID '{request.OrderItemId}' was not found." });

            if (orderItem.FkOrder.FkUserId != request.UserId)
                return BadRequest(new { error = "InvalidOrderItemOwner", message = "The specified order item does not belong to this user." });

            if (orderItem.FkProductVariant?.FkProductId != request.ProductId)
                return BadRequest(new { error = "InvalidOrderItemProduct", message = "The specified order item does not belong to this product." });

            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var review = new Review
                {
                    FkProductId = request.ProductId,
                    FkUserId = request.UserId,
                    FkOrderItemId = request.OrderItemId,
                    Rating = request.Rating,
                    Body = request.Body,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Reviews.Add(review);
                await _context.SaveChangesAsync();

                var product = await _context.Products.FirstOrDefaultAsync(p => p.PkProductId == request.ProductId);
                if (product != null)
                {
                    var reviews = await _context.Reviews.Where(r => r.FkProductId == request.ProductId).ToListAsync();
                    product.ReviewCount = reviews.Count;
                    product.AvgRating = reviews.Any() ? (decimal)reviews.Average(r => r.Rating) : 0m;
                    await _context.SaveChangesAsync();
                }

                await transaction.CommitAsync();

                return CreatedAtAction(nameof(GetReviewsByProductId), new { productId = request.ProductId }, review);
            }
            catch (Exception dbEx)
            {
                await transaction.RollbackAsync();
                throw dbEx;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"=== CREATE REVIEW CRASH ===\n{ex}");
            return StatusCode(500, new { error = "InternalServerError", message = ex.Message, stackTrace = ex.ToString() });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteReview(string id)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(id))
                return BadRequest(new { error = "InvalidReviewId", message = "The reviewId parameter cannot be null or empty." });

            var review = await _context.Reviews.FirstOrDefaultAsync(r => r.PkReviewId == id);
            if (review == null)
                return NotFound(new { error = "ReviewNotFound", message = $"Review with ID '{id}' was not found." });

            _context.Reviews.Remove(review);
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Review '{id}' deleted successfully." });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"=== DELETE REVIEW CRASH ===\n{ex}");
            return StatusCode(500, new { error = "InternalServerError", message = ex.Message, stackTrace = ex.ToString() });
        }
    }
}
