import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@pooflabs/web';
import { AuthContextType, AdminPageProps } from '@/components/types';

export const AdminPage: React.FC<AdminPageProps> = ({ adminAddresses }) => {
  // Get the current user's address - this would need to be implemented based on your auth system
  const { user } = useAuth() as AuthContextType;

  // Check if current user is an admin
  const isAdmin = adminAddresses.includes(user?.address || '');

  // If not an admin, don't show the page content
  if (!isAdmin) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className='py-20'
      >
        <div className='container mx-auto px-4'>
          <p className='text-xl text-muted-foreground mb-12'>
            You don't have permission to view this page
          </p>
        </div>
      </motion.div>
    );
  }

  // Show admin content if user is an admin
  /* This page can be used to show admin-only content. */
  /* This area is meant to house admin-only actions in our tarobase app. */
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className='py-20'
    >
      <div className='container mx-auto px-4'>
        <p className='text-xl text-muted-foreground mb-12'>This is the admin page</p>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          {adminAddresses.map((address) => (
            <div
              key={address}
              className='bg-background border rounded-xl p-6 hover:shadow-md transition-shadow'
            >
              <p className='text-muted-foreground'>{address}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default AdminPage;
