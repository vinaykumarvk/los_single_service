import { useState, useEffect } from 'react';
import { User, logout } from '../lib/auth';
import { User as UserIcon, LogOut } from 'lucide-react';
import Button from './ui/Button';

export default function UserMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    import('../lib/auth').then(({ getUser }) => {
      getUser().then(setUser);
    });
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100"
      >
        <UserIcon className="h-5 w-5" />
        <span className="text-sm">{user.profile?.email || user.profile?.name || 'User'}</span>
      </button>
      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-sm"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

