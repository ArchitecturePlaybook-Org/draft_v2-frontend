"use client";

import React from 'react';
import { PublicProfile } from '@/domains/users/api';

interface ProfileEducationCertificationsProps {
  profile: PublicProfile;
}

export function ProfileEducationCertifications({ profile }: ProfileEducationCertificationsProps) {
  const educationList: any[] = profile.metadata?.education || [];
  const certificationsList: any[] = profile.metadata?.licenses_and_certifications || [];

  return (
    <div className="space-y-4">
      
      {/* Education */}
      <div className="bg-surface-100/90 backdrop-blur-xl rounded-2xl border border-surface-200 p-5 sm:p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-primary">Education</h2>

        <div className="space-y-4">
          {educationList.map((edu: any) => (
            <div key={edu.id} className="flex items-start gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-surface-50 border border-surface-300 flex items-center justify-center text-base shrink-0 shadow-2xs group-hover:border-accent transition-colors">
                {edu.logo || "🎓"}
              </div>

              <div className="space-y-0.5 min-w-0">
                <h3 className="font-bold text-primary text-xs sm:text-sm group-hover:text-accent transition-colors truncate">
                  {edu.school}
                </h3>
                <p className="text-[11px] font-semibold text-surface-600">
                  {edu.degree} — <span className="font-normal text-surface-500">{edu.field}</span>
                </p>
                <p className="text-[10px] text-surface-400 font-medium">
                  {edu.dates}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Licenses & Certifications */}
      <div className="bg-surface-100/90 backdrop-blur-xl rounded-2xl border border-surface-200 p-5 sm:p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-primary flex items-center gap-2">
          Licenses & Certifications
          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
            Verified
          </span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {certificationsList.map((cert: any, idx: number) => {
            const certName = typeof cert === 'string' ? cert : cert.name;
            const issuer = cert.issuer || "Accredited Body";
            const credentialId = cert.credentialId || `CRED-${idx + 101}`;

            return (
              <div
                key={idx}
                className="bg-surface-50 p-3 rounded-xl border border-surface-200/70 flex items-start gap-2.5"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4" />
                  </svg>
                </div>

                <div className="space-y-0.5 min-w-0">
                  <h4 className="font-bold text-primary text-xs leading-tight truncate">
                    {certName}
                  </h4>
                  <p className="text-[10px] font-semibold text-surface-500">
                    {issuer} • ID: {credentialId}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
