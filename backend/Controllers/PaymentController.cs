using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.DTO;
using backend.Models;

namespace backend.Controllers;

[Route("api/[controller]")]
[ApiController]
public class PaymentController : ControllerBase
{
    private readonly AppDbContext _context;

    public PaymentController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost("process")]
    public async Task<IActionResult> ProcessPayment([FromBody] ProcessPaymentRequest request)
    {
        try
        {
            var order = await _context.Orders.FirstOrDefaultAsync(o => o.PkOrderId == request.OrderId);
            if (order == null) return NotFound(new { error = "OrderNotFound", message = "Order does not exist." });

            await using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                if (order.Status != OrderStatus.Pending)
                {
                    await transaction.RollbackAsync();
                    return BadRequest(new { error = "InvalidOrderStatus", message = $"Order cannot be paid. Current status: {order.Status}" });
                }

                // 1. Find existing pending payment created at checkout or create a new one
                var payment = await _context.Payments
                    .FirstOrDefaultAsync(p => p.FkOrderId == order.PkOrderId && p.Status == PaymentStatus.Pending);

                if (payment != null)
                {
                    payment.Method = request.Method;
                    payment.Status = PaymentStatus.Paid;
                    payment.ProviderReference = request.ProviderReference;
                    payment.PaidAt = DateTime.UtcNow;
                }
                else
                {
                    payment = new Payment
                    {
                        FkOrderId = order.PkOrderId,
                        Method = request.Method,
                        Status = PaymentStatus.Paid,
                        Amount = order.TotalAmount,
                        ProviderReference = request.ProviderReference,
                        PaidAt = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.Payments.Add(payment);
                }

                // 2. Update Order Status
                order.Status = OrderStatus.Paid;
                order.UpdatedAt = DateTime.UtcNow;

                // 3. Log Status Change in History
                var history = new OrderStatusHistory
                {
                    FkOrderId = order.PkOrderId,
                    Status = OrderStatus.Paid,
                    ChangedBy = order.FkUserId, // Null for guests
                    ChangedAt = DateTime.UtcNow
                };
                _context.OrderStatusHistories.Add(history);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { message = "Payment successful.", paymentId = payment.PkPaymentId, orderId = order.PkOrderId });
            }
            catch (Exception dbEx)
            {
                await transaction.RollbackAsync();
                throw dbEx;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"=== PAYMENT CRASH ===\n{ex}");
            return StatusCode(500, new { error = "InternalServerError", message = ex.Message, stackTrace = ex.ToString() });
        }
    }
}