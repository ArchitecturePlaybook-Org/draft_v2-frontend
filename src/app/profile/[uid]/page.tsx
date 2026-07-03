import React from 'react';
import ProfileDetailClient from './ProfileDetailClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Public Profile | Architecture Playbook',
  description: 'View professional profile and portfolios.',
};

export default function ProfilePage() {
  return <ProfileDetailClient />;
}
