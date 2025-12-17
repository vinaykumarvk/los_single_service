import { useEffect, useState } from 'react';
import { ClipboardCheck, Database, Settings, Shield, Package, Users, Zap } from 'lucide-react';
import PersonaMenu from '../../components/PersonaMenu';
import { personaConfigs } from '../../persona/config';
import { apiClient } from '../../shared/lib/api-client';
import Spinner from '../../components/ui/Spinner';

const adminPersona = personaConfigs.find((persona) => persona.id === 'admin');

interface AdminStats {
  products: number;
  activePersonas: number;
  totalApplications: number;
}

export default function AdminWorkspace() {
  const [stats, setStats] = useState<AdminStats>({
    products: 0,
    activePersonas: 3, // RM, Ops, Admin
    totalApplications: 0,
  });
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      
      // Fetch products count
      const productsRes = await apiClient.get('/api/masters/products');
      const productsList = Array.isArray(productsRes.data) ? productsRes.data : [];
      setProducts(productsList);
      
      // Fetch total applications count
      const appsRes = await apiClient.get('/api/applications', { params: { limit: 1 } });
      const totalApps = appsRes.data?.pagination?.total || appsRes.data?.applications?.length || 0;

      setStats({
        products: productsList.length,
        activePersonas: 3,
        totalApplications: totalApps,
      });
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <PersonaMenu className="lg:w-72" />

          <div className="flex-1 space-y-8">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800 p-6">
              <div className="flex flex-col gap-3">
                <p className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  LOS Portal
                </p>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Admin Console
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Configure products, masters, rules, access control, and automation monitor for all
                  LOS services.
                </p>
              </div>
              {loading ? (
                <div className="mt-6 flex justify-center py-4">
                  <Spinner />
                </div>
              ) : (
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <AdminStat label="Products" value={stats.products.toString()} icon={Package} />
                  <AdminStat label="Active Personas" value={stats.activePersonas.toString()} icon={Users} />
                  <AdminStat label="Total Applications" value={stats.totalApplications.toString()} icon={Zap} />
                </div>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {adminPersona?.features.map((feature) => (
                <div
                  key={feature.title}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-900/40 dark:text-orange-200">
                      <Settings className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {feature.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Products List */}
            {!loading && products.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Database className="h-5 w-5 text-orange-600" />
                    Product Catalog
                  </h2>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {products.slice(0, 6).map((product: any) => (
                    <div
                      key={product.product_code}
                      className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {product.name || product.product_code}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {product.product_code}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Amount Range</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            ₹{product.min_amount?.toLocaleString() || 'N/A'} - ₹{product.max_amount?.toLocaleString() || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {products.length > 6 && (
                  <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                    +{products.length - 6} more products
                  </p>
                )}
              </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Demo Playbook
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Use the existing LOS modules to showcase configuration-to-execution journeys:
              </p>
              <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-200">
                <li>
                  <span className="font-semibold">Masters:</span> Show product catalog & rule store
                  using the masters service (API + DB tables).
                </li>
                <li>
                  <span className="font-semibold">Access Control:</span> Highlight persona-based
                  routing (RM/Ops/Admin) and Supabase-auth roles.
                </li>
                <li>
                  <span className="font-semibold">Automation:</span> Reference the outbox,
                  notification publisher, and CRON workers for alerts.
                </li>
                <li>
                  <span className="font-semibold">Monitoring:</span> Use Supabase logs + Grafana
                  dashboards (if connected) for SLA tracking.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminStat({ 
  label, 
  value, 
  icon: Icon 
}: { 
  label: string; 
  value: string; 
  icon: any;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 p-4 bg-white dark:bg-gray-900/40">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
        </div>
        <div className="p-2 rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

