using System.ComponentModel.DataAnnotations;

namespace backend.DTO;

public class ShipmentRequest
{
    [Required, MaxLength(100)] public string Courier { get; set; } = "";
    [Required, MaxLength(100)] public string TrackingNumber { get; set; } = "";
}
