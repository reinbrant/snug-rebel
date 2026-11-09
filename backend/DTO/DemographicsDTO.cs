using System.ComponentModel.DataAnnotations;

namespace backend.DTO;

public class DemographicsRequest : IValidatableObject
{
    public bool ShareForAnalytics { get; set; }
    [MaxLength(20)] public string? AgeRange { get; set; }
    [MaxLength(20)] public string? Gender { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!ShareForAnalytics) yield break;
        if (AgeRange is not (null or "under18" or "18-24" or "25-34" or "35-44" or "45-54" or "55+"))
            yield return new ValidationResult("Choose a listed age range.", [nameof(AgeRange)]);
        if (Gender is not (null or "woman" or "man" or "nonbinary" or "another"))
            yield return new ValidationResult("Choose a listed gender option.", [nameof(Gender)]);
        if (AgeRange == null && Gender == null)
            yield return new ValidationResult("Choose at least one answer, or turn off sharing to remove your answers.");
    }
}

public record DemographicsDTO(bool ShareForAnalytics, string? AgeRange, string? Gender);
