using System.Collections.Generic;

namespace backend.Models;

public partial class Courier
{
    public string PkCourierId { get; set; } = null!;
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public decimal Fee { get; set; }
    public short DaysMin { get; set; }
    public short DaysMax { get; set; }
    public bool IsActive { get; set; } = true;

    public virtual ICollection<Shipment> Shipments { get; set; } = new List<Shipment>();
}