import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Role } from '@/types/domain';

interface RoleContextValue {
  role: Role;
  setRole: (role: Role) => void;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRole] = useState<Role>('CLIENT');
  const value = useMemo(() => ({ role, setRole }), [role]);
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};

export const useRole = () => {
  const value = useContext(RoleContext);
  if (!value) {
    throw new Error('useRole must be used inside RoleProvider');
  }
  return value;
};
