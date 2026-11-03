using backend.Models;

namespace backend.DTO;

public class CreateAddressRequest
{
    public string? FkUserId { get; set; }
    public string RecipientName { get; set; } = null!;
    public string Phone { get; set; } = null!;
    public string Line1 { get; set; } = null!;
    public string? Line2 { get; set; }
    public string Barangay { get; set; } = null!;
    public string City { get; set; } = null!;
    public string Province { get; set; } = null!;
    public string PostalCode { get; set; } = null!;
    public string Country { get; set; } = "PH";
    public bool IsDefault { get; set; }
    public AddressType AddressType { get; set; }
}