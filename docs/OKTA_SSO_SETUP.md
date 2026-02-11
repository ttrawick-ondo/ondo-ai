# Okta SSO Setup Instructions (for IT)

## Overview

We need an OIDC (OpenID Connect) application configured in Okta for single sign-on to our internal AI chat tool.

---

## Step 1: Create OIDC Application in Okta

1. Log into Okta Admin Console
2. Navigate to **Applications** → **Applications**
3. Click **Create App Integration**
4. Select:
   - **Sign-in method:** OIDC - OpenID Connect
   - **Application type:** Web Application
5. Click **Next**

---

## Step 2: Configure Application Settings

| Setting | Value |
|---------|-------|
| **App integration name** | `Ondo AI` (or preferred name) |
| **Grant type** | ✅ Authorization Code |
| **Sign-in redirect URIs** | `https://<your-domain>/api/auth/callback/okta` |
| **Sign-out redirect URIs** | `https://<your-domain>` |
| **Controlled access** | Assign to appropriate groups |

**For local development, also add:**
- Sign-in redirect: `http://localhost:3000/api/auth/callback/okta`
- Sign-out redirect: `http://localhost:3000`

---

## Step 3: Configure Scopes

Ensure these scopes are enabled:
- ✅ `openid` (required)
- ✅ `profile` (for name)
- ✅ `email` (for email address)

---

## Step 4: Provide Values to Dev Team

After creating the application, provide these values:

| Value | Where to Find |
|-------|---------------|
| **Client ID** | Application → General → Client Credentials |
| **Client Secret** | Application → General → Client Credentials |
| **Okta Domain** | Your Okta URL (e.g., `dev-123456.okta.com` or `yourcompany.okta.com`) |

---

## Step 5: User Assignment

Assign users/groups who should have access:
1. Go to **Applications** → **Ondo AI** → **Assignments**
2. Click **Assign** → **Assign to People** or **Assign to Groups**
3. Select users/groups and click **Assign**

---

## Environment Variables (for Dev Team)

Dev team will configure these in the application:

```bash
OKTA_CLIENT_ID=<Client ID from Step 4>
OKTA_CLIENT_SECRET=<Client Secret from Step 4>
OKTA_ISSUER=https://<okta-domain>/oauth2/default
```

---

## Optional: Custom Claims

If you need additional user attributes (department, title, etc.), configure custom claims:

1. Go to **Security** → **API** → **Authorization Servers**
2. Select **default** (or create custom)
3. Go to **Claims** tab
4. Add claims as needed (e.g., `department`, `groups`)

---

## Optional: Groups Claim (for Role-Based Access)

To pass Okta groups to the application for role-based permissions:

1. Go to **Security** → **API** → **Authorization Servers**
2. Select **default** → **Claims** tab
3. Click **Add Claim**
4. Configure:
   - **Name:** `groups`
   - **Include in token type:** ID Token (Always)
   - **Value type:** Groups
   - **Filter:** Matches regex `.*` (or specific pattern like `^ondo-.*`)
5. Click **Create**

---

## Testing Checklist

- [ ] Application created in Okta
- [ ] Redirect URIs configured (prod + local dev)
- [ ] Users/groups assigned
- [ ] Client ID and Secret provided to dev team
- [ ] Test user can log in successfully

---

## Contact

Questions? Contact: [Dev team contact]
