using Microsoft.EntityFrameworkCore;
using Npgsql;
using backend.Data;
using backend.Models;
using backend.Services;
using Scalar.AspNetCore;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication;
using System.Security.Claims;
using System.Threading.RateLimiting;

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
});
builder.Services.AddProblemDetails();   // consistent error shape (from the standards)
builder.Services.AddHealthChecks();
builder.Services.AddOpenApi();          // built-in OpenAPI document
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(options =>
{
    options.Cookie.Name = "snug-admin";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = builder.Environment.IsDevelopment() ? SameSiteMode.Lax : SameSiteMode.None;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
    options.Events.OnRedirectToLogin = context => { context.Response.StatusCode = 401; return Task.CompletedTask; };
    options.Events.OnRedirectToAccessDenied = context => { context.Response.StatusCode = 403; return Task.CompletedTask; };
    options.Events.OnValidatePrincipal = async context =>
    {
        var id = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
        var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
        var user = id == null ? null : await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.PkUserId == id);
        if (user == null || !user.IsActive || (user.EmailVerificationRequired && user.EmailVerifiedAt == null)
            || context.Principal?.FindFirstValue(PasswordSession.ClaimType) != PasswordSession.Version(user.PasswordHash))
        {
            context.RejectPrincipal();
            await context.HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        }
        else if (context.Principal?.FindFirstValue(ClaimTypes.Role) != user.Role.ToString())
        {
            var identity = (ClaimsIdentity)context.Principal!.Identity!;
            var role = identity.FindFirst(ClaimTypes.Role);
            if (role != null) identity.RemoveClaim(role);
            identity.AddClaim(new Claim(ClaimTypes.Role, user.Role.ToString()));
            context.ShouldRenew = true;
        }
    };
});
builder.Services.AddAuthorization();
builder.Services.AddScoped<CloudinaryService>();
builder.Services.AddScoped<CustomerCartService>();
builder.Services.AddScoped<EmailVerificationService>();
builder.Services.AddScoped<EmailOtpService>();
builder.Services.AddHttpClient<VerificationEmailSender>(client =>
{
    // A local provider stub can be used in Development without sending email.
    const string endpoint = "https://api.brevo.com/";
    var providerUrl = builder.Environment.IsDevelopment()
        ? builder.Configuration["Email:DevelopmentApiUrl"] ?? endpoint : endpoint;
    client.BaseAddress = new Uri(providerUrl);
    client.Timeout = TimeSpan.FromSeconds(10);
});
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    foreach (var (name, limit) in new[] { ("verification-send", 20), ("verification-confirm", 30) })
        options.AddPolicy(name, context => RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = limit, Window = TimeSpan.FromMinutes(1), QueueLimit = 0
            }));
    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.Headers.RetryAfter = "60";
        await context.HttpContext.Response.WriteAsJsonAsync(new { message = "Too many requests. Please wait a minute and try again." }, cancellationToken);
    };
});

// Lets the React dev server (Vite) call the API. Override in appsettings per environment.
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                     ?? ["http://localhost:5173"];
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

// Database configuration
// NOTE: enums are NOT mapped as native Postgres enums. The existing tables store them as plain
// integers (see InitialCreate and the SQL seed scripts), so EF writes them as int by default.
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Configure ConnectionStrings:DefaultConnection with the Neon connection string.");
var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);

var dataSource = dataSourceBuilder.Build();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(dataSource));

Directory.CreateDirectory(Path.Combine(builder.Environment.ContentRootPath, "wwwroot", "uploads"));
builder.Environment.WebRootPath = Path.Combine(builder.Environment.ContentRootPath, "wwwroot");
var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.MapOpenApi();                   // Generates the raw JSON
    app.MapScalarApiReference();        // Serves the interactive UI
}    
else
    app.UseHttpsRedirection();

// Model previews fetch uploaded GLB files from the admin origin.
app.UseCors();
app.UseRateLimiter();
app.UseStaticFiles(new StaticFileOptions
{
    ContentTypeProvider = new Microsoft.AspNetCore.StaticFiles.FileExtensionContentTypeProvider
    {
        Mappings = { [".glb"] = "model/gltf-binary" }
    }
});
app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health");
app.MapControllers();

app.Run();
