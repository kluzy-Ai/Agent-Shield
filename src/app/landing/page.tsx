'use client';

import { LandingPage } from '@/components/LandingPage';
import { useRouter } from 'next/navigation';

export default function LandingRoute() {
  const router = useRouter();

  return (
    <LandingPage
      onEnterConsole={() => router.push('/overview')}
      onStartOnboarding={() => router.push('/overview')}
      onAddAgent={() => router.push('/add-agent')}
    />
  );
}

