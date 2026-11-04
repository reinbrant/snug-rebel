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

// Database configuration
// NOTE: enums are NOT mapped as native Postgres enums. The existing tables store them as plain
// integers (see InitialCreate and the SQL seed scripts), so EF writes them as int by default.
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);

var dataSource = dataSourceBuilder.Build();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(dataSource));

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

app.UseCors();
app.UseAuthorization();

app.MapHealthChecks("/health");
app.MapControllers();

app.Run();