# React + Vite

## Internal staff login

The HR workspace uses Supabase Auth for approved staff email/password accounts. There is no public sign-up screen.

1. Create a Supabase project.
2. In **Authentication > Providers > Email**, turn off **Allow new users to sign up**. This is what makes access invite/admin-only.
3. In **Authentication > URL Configuration**, set the production Site URL and add these redirect URLs:

```text
http://localhost:5174/reset-password
https://your-production-domain.com/reset-password
```

4. Copy `.env.example` to `.env.local` and add the project URL and publishable key. Use the legacy anon key as `VITE_SUPABASE_ANON_KEY` if the project does not show a publishable key.
5. In **Authentication > Users**, use **Add user** to create or invite each internal staff account.
6. Add the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` values to the deployment environment, then redeploy.

Never place a Supabase secret or service-role key in a `VITE_` variable. Password reset emails are sent by Supabase; configure custom SMTP in Supabase before production use.

### Document storage

HR documents are stored in a private Supabase Storage bucket instead of browser storage. In the Supabase dashboard, open **SQL Editor**, paste the contents of `supabase/document-storage.sql`, and run it once. The script creates the private bucket, document metadata table, and authenticated-staff access policies. The bucket accepts files up to 50 MB.

## PDF export on Vercel

The app exports the filled Word contract as a PDF through ConvertAPI when it is deployed.

Add this environment variable in Vercel:

```text
CONVERTAPI_TOKEN=your_convertapi_token
```

Then redeploy the project. Keep this token only in Vercel environment variables; do not put it in frontend code.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
