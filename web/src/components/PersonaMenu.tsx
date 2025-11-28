import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { personaConfigs } from '../persona/config';

interface PersonaMenuProps {
  className?: string;
}

export default function PersonaMenu({ className }: PersonaMenuProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const activePersona =
    personaConfigs.find((persona) => location.pathname.startsWith(persona.path)) ||
    personaConfigs[0];

  return (
    <div className={className}>
      {/* Desktop / tablet side menu */}
      <div className="hidden lg:flex flex-col gap-3 sticky top-24">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Workspaces
        </div>
        {personaConfigs.map((persona) => {
          const isActive = location.pathname.startsWith(persona.path);
          return (
            <button
              key={persona.id}
              onClick={() => navigate(persona.path)}
              className={`text-left rounded-2xl border transition-all duration-200 p-4 shadow-sm ${
                isActive
                  ? 'border-transparent bg-gradient-to-br text-white ' + persona.accent
                  : 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-800 dark:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold tracking-wide">{persona.label}</div>
                <span
                  className={`text-xs font-bold uppercase tracking-wide ${
                    isActive ? 'text-white/80' : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {persona.shortLabel}
                </span>
              </div>
              <p
                className={`mt-2 text-sm ${
                  isActive ? 'text-white/90' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {persona.description}
              </p>
              <div
                className={`mt-4 inline-flex items-center text-xs font-semibold uppercase tracking-wide ${
                  isActive ? 'text-white' : 'text-blue-600 dark:text-blue-300'
                }`}
              >
                Explore {persona.shortLabel}
                <ArrowRight className="ml-1 h-3 w-3" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Mobile horizontal selector */}
      <div className="lg:hidden mb-6 -mx-2 px-2 overflow-x-auto">
        <div className="flex gap-3">
          {personaConfigs.map((persona) => {
            const isActive = location.pathname.startsWith(persona.path);
            return (
              <button
                key={persona.id}
                onClick={() => navigate(persona.path)}
                className={`flex-shrink-0 px-4 py-3 rounded-2xl text-left border transition-colors min-w-[220px] ${
                  isActive
                    ? 'border-transparent bg-gradient-to-br text-white ' + persona.accent
                    : 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-800 dark:text-gray-100'
                }`}
              >
                <div className="text-xs font-semibold uppercase tracking-wide">
                  {persona.shortLabel}
                </div>
                <div className="text-sm font-semibold">{persona.label}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

