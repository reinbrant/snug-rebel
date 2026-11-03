using Microsoft.EntityFrameworkCore;
using Npgsql;
using backend.Data;
using backend.Models;
using backend.Services;
using Scalar.AspNetCore;
using System.Text.Json.Serialization;

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
});
builder.Services.AddProblemDetails();   // consistent error shape (from the standards)
builder.Services.AddHealthChecks();
builder.Services.AddOpenApi();          // built-in OpenAPI document
builder.Services.AddAuthorization();
builder.Services.AddScoped<CloudinaryService>();

// Lets the React dev server (Vite) call the API. Override in appsettings per environment.
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                     ?? ["http://localhost:5173"];
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()));

// Database and Enum Configuration
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);

dataSourceBuilder.MapEnum<AddressType>("address_type");
dataSourceBuilder.MapEnum<DiscountType>("discount_type");
dataSourceBuilder.MapEnum<OrderStatus>("order_status");
dataSourceBuilder.MapEnum<PaymentMethod>("payment_method");
dataSourceBuilder.MapEnum<PaymentStatus>("payment_status");
dataSourceBuilder.MapEnum<ShipmentStatus>("shipment_status");
dataSourceBuilder.MapEnum<UserRole>("user_role");

var dataSource = dataSourceBuilder.Build();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(dataSource, o =>
    {
        o.MapEnum<AddressType>("address_type");
        o.MapEnum<DiscountType>("discount_type");
        o.MapEnum<OrderStatus>("order_status");
        o.MapEnum<PaymentMethod>("payment_method");
        o.MapEnum<PaymentStatus>("payment_status");
        o.MapEnum<ShipmentStatus>("shipment_status");
        o.MapEnum<UserRole>("user_role");
    }));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

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

app.UseCors();
app.UseAuthorization();

app.MapHealthChecks("/health");
app.MapControllers();

app.Run();