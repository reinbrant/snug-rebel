namespace backend.Services;

// Default lookup rows keep stock and historical order references intact when an
// option doesn't apply. No schema change is needed in the existing Neon database.
public static class ProductOptions
{
    public const string DefaultSize = "One size";
    public const string DefaultColor = "Standard";
}
