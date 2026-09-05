import React, { useState, useEffect, useRef } from 'react';
import { Search, X, UserPlus, Users, Building2, Contact, Handshake, ClipboardCheck, ArrowRight } from 'lucide-react';
import { searchApi } from '../../api/crmApi';
import { useNavigate } from 'react-router-dom';

export default function GlobalSearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchApi.globalSearch(query);
        if (res.data.success) {
          setResults(res.data.data);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const handleNavigate = (path) => {
    onClose();
    navigate(path);
  };

  const hasResults = results && Object.values(results).some((arr) => arr && arr.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 animate-scaleIn">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search leads, deals, customers, companies, contacts, tasks..."
            className="flex-1 bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm font-medium"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {loading && (
            <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
              Searching database...
            </div>
          )}

          {!loading && results && !hasResults && (
            <div className="py-8 text-center text-sm text-slate-400">
              No matching records found for "{query}".
            </div>
          )}

          {!loading && !results && !query && (
            <div className="py-6 text-center text-xs text-slate-400">
              Type at least 2 characters to search across all CRM modules.
            </div>
          )}

          {/* Categorized results */}
          {!loading && results && (
            <>
              {/* LEADS */}
              {results.leads?.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">
                    <UserPlus className="w-3.5 h-3.5 text-blue-500" /> Leads
                  </div>
                  <div className="space-y-1">
                    {results.leads.map((l) => (
                      <div
                        key={l.id}
                        onClick={() => handleNavigate(`/leads/${l.id}`)}
                        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{l.title}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{l.subtitle} • {l.status}</div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CUSTOMERS */}
              {results.customers?.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">
                    <Users className="w-3.5 h-3.5 text-emerald-500" /> Customers
                  </div>
                  <div className="space-y-1">
                    {results.customers.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => handleNavigate(`/customers`)}
                        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{c.title}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{c.subtitle} • {c.customer_type}</div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DEALS */}
              {results.deals?.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">
                    <Handshake className="w-3.5 h-3.5 text-amber-500" /> Deals
                  </div>
                  <div className="space-y-1">
                    {results.deals.map((d) => (
                      <div
                        key={d.id}
                        onClick={() => handleNavigate(`/deals`)}
                        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{d.title}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{d.subtitle} • ₹{Number(d.amount).toLocaleString('en-IN')}</div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* COMPANIES */}
              {results.companies?.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">
                    <Building2 className="w-3.5 h-3.5 text-purple-500" /> Companies
                  </div>
                  <div className="space-y-1">
                    {results.companies.map((comp) => (
                      <div
                        key={comp.id}
                        onClick={() => handleNavigate(`/companies`)}
                        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{comp.title}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{comp.subtitle} • {comp.city}</div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CONTACTS */}
              {results.contacts?.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">
                    <Contact className="w-3.5 h-3.5 text-cyan-500" /> Contacts
                  </div>
                  <div className="space-y-1">
                    {results.contacts.map((cnt) => (
                      <div
                        key={cnt.id}
                        onClick={() => handleNavigate(`/contacts`)}
                        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{cnt.title}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{cnt.subtitle} • {cnt.email}</div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TASKS */}
              {results.tasks?.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">
                    <ClipboardCheck className="w-3.5 h-3.5 text-rose-500" /> Tasks
                  </div>
                  <div className="space-y-1">
                    {results.tasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => handleNavigate(`/tasks`)}
                        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t.title}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{t.subtitle} • Due {t.due_date}</div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
