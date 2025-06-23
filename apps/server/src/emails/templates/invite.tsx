export interface InviteEmailData {
  inviterName: string;
  inviterEmail: string;
  organizationName: string;
  inviteUrl: string;
  recipientEmail: string;
  role: string;
}

export const InviteEmail = ({
  inviterName,
  inviterEmail,
  organizationName,
  inviteUrl,
  recipientEmail,
  role,
}: InviteEmailData) => (
  <html>
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Organization Invite</title>
    </head>
    <body style={bodyStyle}>
      <div style={containerStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>You're Invited! 🎉</h1>
        </div>

        <div style={contentStyle}>
          <div style={messageBoxStyle}>
            <p style={messageStyle}>
              <strong>{inviterName}</strong> ({inviterEmail}) has invited you to
              join <strong>{organizationName}</strong> as a{" "}
              <strong>{role}</strong>.
            </p>
          </div>

          <div style={buttonContainerStyle}>
            <a href={inviteUrl} style={buttonStyle}>
              Accept Invitation
            </a>
          </div>

          <div style={noteBoxStyle}>
            <p style={noteStyle}>
              <strong>Note:</strong> This invitation will expire in 7 days. If
              you don't have an account, you'll be able to create one during the
              acceptance process.
            </p>
          </div>

          <hr style={dividerStyle} />

          <div style={footerStyle}>
            <p style={footerTextStyle}>
              If the button doesn't work, copy and paste this link into your
              browser:
            </p>
            <p style={linkStyle}>{inviteUrl}</p>
            <p style={footerTextStyle}>
              If you didn't expect this invitation, you can safely ignore this
              email.
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
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
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
  margin: "0",
};

const buttonContainerStyle = {
  textAlign: "center" as const,
  margin: "30px 0",
};

const buttonStyle = {
  backgroundColor: "#667eea",
  color: "white",
  padding: "15px 30px",
  textDecoration: "none",
  borderRadius: "8px",
  fontWeight: "600",
  fontSize: "16px",
  display: "inline-block",
};

const noteBoxStyle = {
  backgroundColor: "#fff3cd",
  border: "1px solid #ffeaa7",
  padding: "15px",
  borderRadius: "6px",
  margin: "25px 0",
};

const noteStyle = {
  margin: "0",
  fontSize: "14px",
  color: "#856404",
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

const linkStyle = {
  wordBreak: "break-all" as const,
  backgroundColor: "#f5f5f5",
  padding: "10px",
  borderRadius: "4px",
  margin: "10px 0",
};
