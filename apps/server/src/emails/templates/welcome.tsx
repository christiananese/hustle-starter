export interface WelcomeEmailData {
  userName: string;
  userEmail: string;
  organizationName: string;
  role: string;
  dashboardUrl: string;
}

export const WelcomeEmail = ({
  userName,
  userEmail,
  organizationName,
  role,
  dashboardUrl,
}: WelcomeEmailData) => (
  <html>
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Welcome</title>
    </head>
    <body style={bodyStyle}>
      <div style={containerStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>Welcome! 🚀</h1>
        </div>

        <div style={contentStyle}>
          <div style={messageBoxStyle}>
            <p style={messageStyle}>
              Hi <strong>{userName}</strong>,
            </p>
            <p style={messageStyle}>
              You've successfully joined <strong>{organizationName}</strong> as
              a <strong>{role}</strong>. You can now access the dashboard and
              start collaborating with your team.
            </p>
          </div>

          <div style={buttonContainerStyle}>
            <a href={dashboardUrl} style={buttonStyle}>
              Go to Dashboard
            </a>
          </div>

          <hr style={dividerStyle} />

          <div style={footerStyle}>
            <p style={footerTextStyle}>
              Need help getting started? Check out our documentation or contact
              support.
            </p>
          </div>
        </div>
      </div>
    </body>
  </html>
);

const bodyStyle = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  lineHeight: "1.6",
  color: "#333",
  maxWidth: "600px",
  margin: "0 auto",
  padding: "20px",
  backgroundColor: "#f6f9fc",
};

const containerStyle = {
  backgroundColor: "#ffffff",
  borderRadius: "10px",
  overflow: "hidden",
  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
};

const headerStyle = {
  background: "linear-gradient(135deg, #4CAF50 0%, #45a049 100%)",
  padding: "30px",
  textAlign: "center" as const,
};

const titleStyle = {
  color: "white",
  margin: "0",
  fontSize: "28px",
  fontWeight: "bold",
};

const contentStyle = {
  padding: "30px",
};

const messageBoxStyle = {
  backgroundColor: "#f8f9fa",
  padding: "25px",
  borderRadius: "8px",
  marginBottom: "25px",
};

const messageStyle = {
  fontSize: "16px",
  margin: "0 0 15px 0",
};

const buttonContainerStyle = {
  textAlign: "center" as const,
  margin: "30px 0",
};

const buttonStyle = {
  backgroundColor: "#4CAF50",
  color: "white",
  padding: "15px 30px",
  textDecoration: "none",
  borderRadius: "8px",
  fontWeight: "600",
  fontSize: "16px",
  display: "inline-block",
};

const dividerStyle = {
  border: "none",
  borderTop: "1px solid #e0e0e0",
  margin: "30px 0",
};

const footerStyle = {
  fontSize: "12px",
  color: "#666",
  textAlign: "center" as const,
};

const footerTextStyle = {
  margin: "10px 0",
};
