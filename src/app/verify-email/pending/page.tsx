import Link from "next/link";

export default function PendingVerificationPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[var(--background-default)]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Check Your Email
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[var(--surface-default)] py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-[var(--border-default)] text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">We sent you a verification link</h3>
          <p className="text-[var(--text-secondary)] mb-6 text-sm leading-relaxed">
            Please check your inbox (and spam folder) and click the link to verify your email address. 
            Once verified, you'll be able to log in to your account.
          </p>

          <Link 
            href="/login" 
            className="flex w-full justify-center rounded-md border border-transparent bg-[var(--primary-main)] py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-[var(--primary-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-main)] focus:ring-offset-2"
          >
            Return to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
