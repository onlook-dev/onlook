import { createContext, useContext } from 'react';
import { UserManager } from './manager';

export const userManager = new UserManager();
const UserContext = createContext(userManager);
export const useUserManager = () => useContext(UserContext);
