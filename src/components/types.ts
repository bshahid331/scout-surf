import React from 'react';
// Shared type definitions

export interface User {
  address: string;
  provider: any;
  /* Add other user properties as needed */
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export interface NavLinkProps {
  to: string;
  label: string;
}

export interface FooterLinkProps {
  to: string;
  label: string;
  small?: boolean;
}

export interface SocialIconProps {
  icon: 'twitter' | 'discord' | 'github';
}

export interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export interface AdminPageProps {
  adminAddresses: string[];
}
