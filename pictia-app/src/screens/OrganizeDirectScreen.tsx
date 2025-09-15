import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '@/store/hooks';
import { selectIsLocalMode } from '@/store/selectors/authSelectors';
import OrganizeScreen from './OrganizeScreen';
import LocalOrganizeScreen from './LocalOrganizeScreen';

/**
 * Direct organize screen that launches organization mode immediately
 * This is used for the dedicated "Organize" tab in bottom navigation
 */
const OrganizeDirectScreen: React.FC = () => {
  const isLocalMode = useAppSelector(selectIsLocalMode);
  
  // Return the appropriate organize screen based on mode
  return isLocalMode ? <LocalOrganizeScreen /> : <OrganizeScreen />;
};

export default OrganizeDirectScreen;