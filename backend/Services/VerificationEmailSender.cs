using System.Net;
using System.Net.Mail;

namespace backend.Services;

public class VerificationEmailSender(HttpClient client, IConfiguration config, IHostEnvironment environment,
    ILogger<VerificationEmailSender> logger)
{
    public bool IsConfigured => !string.IsNullOrWhiteSpace(config["Email:BrevoApiKey"])
        && MailAddress.TryCreate(config["Email:From"], out _)
        && Uri.TryCreate(config["Email:StorefrontUrl"], UriKind.Absolute, out var url)
        && (url.Scheme == "https" || (environment.IsDevelopment() && url.IsLoopback && url.Scheme == "http"))
        && url.AbsolutePath == "/" && string.IsNullOrEmpty(url.Query) && string.IsNullOrEmpty(url.Fragment)
        && string.IsNullOrEmpty(url.UserInfo);

    public Task Send(string email, string token, string code, CancellationToken cancellationToken)
    {
        var link = config["Email:StorefrontUrl"]!.TrimEnd('/') + "/verify-email#token=" + Uri.EscapeDataString(token);
        return Deliver(email, "Verify your Snug Rebel email",
            $"<h1>Welcome to Snug Rebel</h1><p>Enter this code to verify your email address:</p><p style=\"font-size:32px;letter-spacing:6px\"><strong>{code}</strong></p><p>The code expires in 10 minutes. Do not share it.</p><p>Or <a href=\"{WebUtility.HtmlEncode(link)}\">verify your email using this link</a> (valid for 1 hour).</p><p>If you didn't create this account, ignore this email.</p>",
            cancellationToken);
    }

    public Task SendSignIn(string email, string code, CancellationToken cancellationToken) => Deliver(email,
        "Your Snug Rebel sign-in code",
        $"<h1>Sign in to Snug Rebel</h1><p>Your one-time sign-in code:</p><p style=\"font-size:32px;letter-spacing:6px\"><strong>{code}</strong></p><p>This code expires in 10 minutes. Do not share it. If you didn't request it, ignore this email.</p>",
        cancellationToken);

    private async Task Deliver(string email, string subject, string html, CancellationToken cancellationToken)
    {
        if (!IsConfigured) throw new EmailDeliveryException();
        using var request = new HttpRequestMessage(HttpMethod.Post, "v3/smtp/email");
        var from = new MailAddress(config["Email:From"]!);
        request.Headers.Add("api-key", config["Email:BrevoApiKey"]);
        request.Content = JsonContent.Create(new
        {
            sender = new { email = from.Address, name = from.DisplayName },
            to = new[] { new { email } }, subject, htmlContent = html
        });
        try
        {
            using var response = await client.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                // Provider response bodies can contain addresses or verification links.
                logger.LogWarning("Verification email provider returned HTTP {Status}", (int)response.StatusCode);
                throw new EmailDeliveryException();
            }
        }
        catch (HttpRequestException)
        {
            logger.LogWarning("Verification email provider could not be reached");
            throw new EmailDeliveryException();
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            logger.LogWarning("Verification email provider timed out");
            throw new EmailDeliveryException();
        }
    }
}

public class EmailDeliveryException : Exception;
